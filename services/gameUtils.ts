import { Ticket, Game, TicketGenerationOptions, Prize } from '../types';

/**
 * Generates a single 3x9 Tambola (Housie) ticket with numbers.
 * @param options - Optional parameters to customize ticket generation.
 * @returns A 2D array representing the ticket, with numbers and nulls for empty cells.
 */
export const generateTambolaTicket = (options: TicketGenerationOptions = {}): (number | null)[][] => {
    const { numbersPerRow = 5 } = options;

    if (numbersPerRow < 3 || numbersPerRow > 7) {
        throw new Error('numbersPerRow must be between 3 and 7 for a valid ticket.');
    }

    const totalNumbers = numbersPerRow * 3;

    const getColumnDistribution = (): { single: number, double: number, triple: number } => {
        if (totalNumbers === 15) {
            // Standard Tambola ticket layout
            return { single: 3, double: 6, triple: 0 };
        }
        
        // Fallback logic for other numbersPerRow values
        const d_plus_2t = totalNumbers - 9;
        // Start with the maximum possible number of triple columns (most clustered)
        for (let t = Math.floor(d_plus_2t / 2); t >= 0; t--) {
            const d = d_plus_2t - 2 * t;
            const s = 9 - d - t;
            if (s >= 0) {
                return { single: s, double: d, triple: t };
            }
        }
        throw new Error(`Could not find a valid column distribution for ${numbersPerRow} numbers per row.`);
    };

    let ticket: (number | null)[][];
    let rowCounts: number[];
    let currentTotalNumbers: number;

    do {
        ticket = Array.from({ length: 3 }, () => Array(9).fill(null));
        rowCounts = [0, 0, 0];
        currentTotalNumbers = 0;

        const { single, double, triple } = getColumnDistribution();
        
        const colCounts = Array(9).fill(0);
        const indices = [0, 1, 2, 3, 4, 5, 6, 7, 8];
        
        // Randomly assign column types (single, double, triple)
        const shuffledIndices = [...indices].sort(() => 0.5 - Math.random());
        
        shuffledIndices.slice(0, triple).forEach(i => colCounts[i] = 3);
        shuffledIndices.slice(triple, triple + double).forEach(i => colCounts[i] = 2);
        shuffledIndices.slice(triple + double).forEach(i => colCounts[i] = 1);

        const numbersByCol = colCounts.map((count, colIndex) => {
            if (count === 0) return [];
            const colNumbers = new Set<number>();
            const min = colIndex * 10;
            if (colIndex === 0) { // 1-9
                while (colNumbers.size < count) {
                    colNumbers.add(Math.floor(Math.random() * 9) + 1);
                }
            } else if (colIndex === 8) { // 80-90
                while (colNumbers.size < count) {
                    colNumbers.add(Math.floor(Math.random() * 11) + 80);
                }
            } else { // 10-19, 20-29, etc.
                while (colNumbers.size < count) {
                    colNumbers.add(Math.floor(Math.random() * 10) + min);
                }
            }
            return Array.from(colNumbers);
        });

        let positions: number[] = [];
        for (let c = 0; c < 9; c++) {
            for (let i = 0; i < colCounts[c]; i++) {
                positions.push(c);
            }
        }
        
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }

        let possible = true;
        for (const col of positions) {
            if (numbersByCol[col].length > 0) {
                // Find all rows that can accept this number. This is more efficient than random guessing.
                const availableRows = [0, 1, 2].filter(r => ticket[r][col] === null && rowCounts[r] < numbersPerRow);

                if (availableRows.length > 0) {
                    // Prioritize placing numbers in rows that are less full to improve the success rate of generation.
                    availableRows.sort((a, b) => rowCounts[a] - rowCounts[b]);
                    const r = availableRows[0]; // Choose the row with the minimum numbers currently.

                    ticket[r][col] = numbersByCol[col].pop()!;
                    rowCounts[r]++;
                    currentTotalNumbers++;
                } else {
                    // This ticket configuration is impossible, break early to restart the whole process.
                    possible = false;
                    break;
                }
            }
        }

        // If the loop broke because a placement was impossible, force the do-while condition to fail and retry.
        if (!possible) {
            currentTotalNumbers = -1;
        }
        
    } while (currentTotalNumbers !== totalNumbers || !rowCounts.every(c => c === numbersPerRow));

    for (let c = 0; c < 9; c++) {
        const colNums: number[] = [];
        for (let r = 0; r < 3; r++) {
            if (ticket[r][c] !== null) {
                colNums.push(ticket[r][c] as number);
            }
        }
        colNums.sort((a, b) => a - b);
        let numIndex = 0;
        for (let r = 0; r < 3; r++) {
            if (ticket[r][c] !== null) {
                ticket[r][c] = colNums[numIndex++];
            }
        }
    }

    return ticket;
};


// --- Prize Validation Helpers ---

const check = (numbers: number[], calledNumbers: number[]): boolean => {
    if (!numbers || numbers.length === 0) {
        return false;
    }
    return numbers.every(n => n && calledNumbers.includes(n));
};

const validateEarlyPrize = (prizeName: string, allTicketNumbers: number[], calledNumbers: number[]): boolean => {
    const earlyPrizeMatch = prizeName.match(/^(quick|early)\s*(\d+)/);
    if (earlyPrizeMatch) {
        const countNeeded = parseInt(earlyPrizeMatch[2], 10);
        const calledOnTicket = allTicketNumbers.filter(n => calledNumbers.includes(n));
        return calledOnTicket.length >= countNeeded;
    }
    return false;
};

const validateSpecialPrize = (prizeName: string, ticket: Ticket, calledNumbers: number[], allTicketNumbers: number[]): boolean => {
    const getRowNumbers = (row: number): number[] => ticket.numbers[row].filter(n => n !== null) as number[];

    switch (prizeName) {
        case 'anda (egg)': {
            const andaNumbers = allTicketNumbers.filter(n => String(n).includes('0'));
            return andaNumbers.length > 0 && check(andaNumbers, calledNumbers);
        }
        case 'panda (stick)': {
            const pandaNumbers = allTicketNumbers.filter(n => String(n).includes('1'));
            return pandaNumbers.length > 0 && check(pandaNumbers, calledNumbers);
        }
        case 'ugly ducklings': {
            const ducklingNumbers = allTicketNumbers.filter(n => String(n).includes('2'));
            return ducklingNumbers.length > 0 && check(ducklingNumbers, calledNumbers);
        }
        case 'fat ladies': {
            const fatLadyNumbers = allTicketNumbers.filter(n => String(n).includes('8'));
            return fatLadyNumbers.length > 0 && check(fatLadyNumbers, calledNumbers);
        }
        case 'star': {
            const topRow = getRowNumbers(0);
            const middleRow = getRowNumbers(1);
            const bottomRow = getRowNumbers(2);

            if (topRow.length === 0 || middleRow.length === 0 || bottomRow.length === 0) return false;

            const starNumbers = [
                topRow[0],
                topRow.length > 1 ? topRow[topRow.length - 1] : undefined,
                middleRow[Math.floor(middleRow.length / 2)],
                bottomRow[0],
                bottomRow.length > 1 ? bottomRow[bottomRow.length - 1] : undefined,
            ];

            const uniqueStarNumbers = [...new Set(starNumbers.filter(n => typeof n === 'number'))] as number[];
            return uniqueStarNumbers.length > 0 && check(uniqueStarNumbers, calledNumbers);
        }
        default:
            return false;
    }
};

const validateSheetPrize = (prizeName: string, ticket: Ticket, game: Game, allTickets: Ticket[], calledNumbers: number[]): boolean => {
    const sheetSize = prizeName === 'half sheet' ? 3 : 6;
    const playerId = ticket.player;
    if (!playerId) return false;

    const playerTickets = allTickets.filter(t => t.player === playerId && t.game === game._id)
                                    .sort((a, b) => a.serialNumber - b.serialNumber);
    if (playerTickets.length < sheetSize) return false;

    for (let i = 0; i <= playerTickets.length - sheetSize; i++) {
        const potentialSheet = playerTickets.slice(i, i + sheetSize);
        
        let isConsecutive = true;
        for (let j = 0; j < sheetSize - 1; j++) {
            if (potentialSheet[j+1].serialNumber !== potentialSheet[j].serialNumber + 1) {
                isConsecutive = false;
                break;
            }
        }

        if (isConsecutive) {
            const isWinner = potentialSheet.every(sheetTicket => {
                const numbersOnTicket = (sheetTicket.numbers.flat().filter(n => n !== null) as number[]);
                const calledOnThisTicket = numbersOnTicket.filter(n => calledNumbers.includes(n));
                return calledOnThisTicket.length >= 2;
            });

            if (isWinner) return true;
        }
    }
    return false;
};

// --- Main Validation Function ---

export const validateClaim = (ticket: Ticket, calledNumbers: number[], prizeName: string, game: Game, allTickets: Ticket[]): boolean | null => {
    if (!ticket || !Array.isArray(ticket.numbers)) {
        return false;
    }

    const getRowNumbers = (row: number): number[] => (ticket.numbers?.[row] || []).filter(n => n !== null) as number[];
    const allTicketNumbers = (ticket.numbers?.flat() || []).filter(n => n !== null) as number[];
    const trimmedPrizeName = prizeName.toLowerCase().trim();

    // Handle Early/Quick prizes first
    if (trimmedPrizeName.startsWith('quick') || trimmedPrizeName.startsWith('early')) {
        return validateEarlyPrize(trimmedPrizeName, allTicketNumbers, calledNumbers);
    }

    // Handle sheet prizes
    if (trimmedPrizeName === 'half sheet' || trimmedPrizeName === 'full sheet') {
        return validateSheetPrize(trimmedPrizeName, ticket, game, allTickets, calledNumbers);
    }
    
    // Handle standard and special prizes
    switch (trimmedPrizeName) {
        case 'full house':
            return check(allTicketNumbers, calledNumbers);
        case 'second house': {
            const fullHousePrize = game.prizes.find(p => p.name.toLowerCase() === 'full house');
            if (!fullHousePrize || fullHousePrize.claimedBy.length === 0) return false;
            // FIX: The check for a full house was missing arguments. This has been corrected.
            if (!check(allTicketNumbers, calledNumbers)) return false;
            
            const fullHouseWinnerIds = fullHousePrize.claimedBy.map(winner => winner.playerId);
            if (ticket.player && fullHouseWinnerIds.includes(ticket.player)) return false;
            
            return true;
        }
        case 'top line':
        case 'first line':
            return check(getRowNumbers(0), calledNumbers);
        case 'middle line':
        case 'second line':
            return check(getRowNumbers(1), calledNumbers);
        case 'bottom line':
        case 'third line':
            return check(getRowNumbers(2), calledNumbers);
        case 'anda (egg)':
        case 'panda (stick)':
        case 'ugly ducklings':
        case 'fat ladies':
        case 'star':
            return validateSpecialPrize(trimmedPrizeName, ticket, calledNumbers, allTicketNumbers);
        default:
            return null; // Unknown custom prize, cannot be auto-validated
    }
};
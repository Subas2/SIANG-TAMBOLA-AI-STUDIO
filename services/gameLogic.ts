import { Game, Prize, Ticket, User } from '../types';
import { validateClaim } from './gameUtils';
import { dbService } from './db';

// --- GAME CYCLE LOGIC ---
// This logic was moved from mockApi.ts and now uses dbService.
// Note: Real-time updates are handled by Firestore listeners in components,
// so this service focuses on the game state updates.

const checkForWinners = async (
    game: Game, 
    newCalledNumber: number,
    allGameTickets: Ticket[],
    allUsers: User[]
): Promise<{ 
    newWinners: { prizeName: string; winnerInfo: { name: string; ticketId: number; playerId: string; } }[], 
    finalPrizesState: Prize[] 
}> => {
    const updatedCalledNumbers = [...game.calledNumbers, newCalledNumber];

    const newWinners: { prizeName: string; winnerInfo: { name: string; ticketId: number; playerId: string; } }[] = [];

    // Create a deep copy of the game's prizes to modify during this check cycle.
    const tempPrizesState: Prize[] = JSON.parse(JSON.stringify(game.prizes));

    // Define a prize order for dependency resolution. 'Full House' must be checked before 'Second House'.
    const prizeOrder = ['full house', 'second house'];

    const sortedPrizes = [...game.prizes].sort((a, b) => {
        const aIndex = prizeOrder.indexOf(a.name.toLowerCase());
        const bIndex = prizeOrder.indexOf(b.name.toLowerCase());
        const finalAIndex = aIndex === -1 ? Infinity : aIndex;
        const finalBIndex = bIndex === -1 ? Infinity : bIndex;
        return finalAIndex - finalBIndex;
    });
    
    const playersWhoWonSheetPrizeThisCycle = new Set<string>();

    for (const prize of sortedPrizes) {
        const originalPrizeState = game.prizes.find(p => p.name === prize.name);
        if (originalPrizeState && (originalPrizeState.claimedBy || []).length > 0) {
            continue;
        }

        const isSheetPrize = prize.name.toLowerCase().includes('sheet');

        for (const ticket of allGameTickets) {
            if (!ticket.player) continue;

            const currentPrizeState = tempPrizesState.find(p => p.name === prize.name);
            const hasPlayerAlreadyWonThisPrize = currentPrizeState?.claimedBy.some(c => c.playerId === ticket.player);
            if (hasPlayerAlreadyWonThisPrize) {
                continue;
            }

            if (isSheetPrize && playersWhoWonSheetPrizeThisCycle.has(ticket.player)) {
                continue;
            }

            const tempGameForValidation = { ...game, prizes: tempPrizesState };
            
            const isValid = validateClaim(ticket, updatedCalledNumbers, prize.name, tempGameForValidation, allGameTickets);
            
            if (isValid) {
                const player = allUsers.find(u => u._id === ticket.player);
                if (player) {
                    if (isSheetPrize) {
                        playersWhoWonSheetPrizeThisCycle.add(player._id);
                    }
                    
                    const winnerInfo = {
                        name: player.name,
                        ticketId: ticket.serialNumber,
                        playerId: player._id,
                    };
                    newWinners.push({ prizeName: prize.name, winnerInfo });

                    const prizeToUpdateInTempState = tempPrizesState.find((p: Prize) => p.name === prize.name);
                    if (prizeToUpdateInTempState) {
                        if (!prizeToUpdateInTempState.claimedBy.some(c => c.ticketId === winnerInfo.ticketId)) {
                            prizeToUpdateInTempState.claimedBy.push(winnerInfo);
                        }
                    }
                }
            }
        }
    }
    
    return { newWinners, finalPrizesState: tempPrizesState };
};

export const gameLogic = {
    checkForWinners,
    // Other game logic functions will be moved here
};

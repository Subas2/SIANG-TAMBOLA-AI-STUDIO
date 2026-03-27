import { User, Theme, Game, Ticket, Claim, TrackedTicket, TicketRequest, Settings, AgentRequest, Prize, Payment, TicketGenerationOptions, ChatMessage, HistoryEntry } from '../types';
import { generateTambolaTicket, validateClaim } from './gameUtils';
import { generateBannerImage } from './geminiService';
import { rhymes } from '../constants';
import { dbService } from './db';
import { auth } from '../firebase';
import { where } from 'firebase/firestore';

export const mockDB: {
    users: User[];
    games: Game[];
    tickets: Ticket[];
    claims: Claim[];
    settings: Settings;
    payments: Payment[];
    ticketRequests: TicketRequest[];
    agentRequests: AgentRequest[];
    prizes: Prize[];
    chatMessages: ChatMessage[];
    themes: Theme[];
    trackedTickets: TrackedTicket[];
} = {
    users: [
        {
            _id: 'default_admin_id',
            name: 'Admin',
            username: 'admin',
            password: 'password',
            role: 'admin',
            isBookingAllowed: true,
            isBlocked: false,
            photo: 'https://i.pravatar.cc/150?u=admin'
        },
        {
            _id: 'default_agent_id',
            name: 'Default Agent',
            username: 'agent',
            password: 'password',
            role: 'agent',
            isBookingAllowed: true,
            isBlocked: false,
            photo: 'https://i.pravatar.cc/150?u=agent'
        }
    ],
    games: [],
    tickets: [],
    claims: [],
    settings: { 
        id: 'settings_id',
        isPlayerTicketRequestEnabled: true,
        isAgentBookingEnabled: true,
        isChatEnabled: true,
        autoVerifyClaims: false,
        callMode: 'auto',
        callDelay: 5,
        voiceURI: '',
        useRhymes: true
    },
    payments: [],
    ticketRequests: [],
    agentRequests: [],
    prizes: [],
    chatMessages: [],
    themes: [],
    trackedTickets: []
};

export const isUsingMockData = false;

let activeSubscriptions: (() => void)[] = [];

export const initializeData = async (userRole?: string) => {
    if (isUsingMockData) return;

    // Clear existing subscriptions to prevent duplicates on role change
    activeSubscriptions.forEach(unsubscribe => unsubscribe());
    activeSubscriptions = [];

    try {
        const firebaseUser = auth.currentUser;
        const isValidAdmin = userRole === 'admin' && firebaseUser;
        const isValidAgent = userRole === 'agent' && firebaseUser;

        // Initial fetch for all collections to populate mockDB
        const fetchCollection = async (name: string, target: keyof typeof mockDB) => {
            try {
                const data = await dbService.getCollection(name);
                if (data) (mockDB as any)[target] = data.map((item: any) => ({ ...item, _id: String(item.id) }));
            } catch (err) {
                console.warn(`Failed to fetch collection ${name}:`, err);
            }
        };

        const fetchDocument = async (name: string, id: string, target: keyof typeof mockDB) => {
            try {
                const data = await dbService.getDocument(name, id);
                if (data) (mockDB as any)[target] = { ...(mockDB as any)[target], ...data };
            } catch (err) {
                console.warn(`Failed to fetch document ${name}/${id}:`, err);
            }
        };

        const fetchPromises = [
            fetchCollection('games', 'games'),
            fetchCollection('tickets', 'tickets'),
            fetchCollection('claims', 'claims'),
            fetchDocument('settings', 'settings_id', 'settings'),
            fetchCollection('themes', 'themes')
        ];

        if (firebaseUser) {
            if (isValidAdmin || isValidAgent) {
                fetchPromises.push(fetchCollection('users', 'users'));
            } else {
                // Players only fetch agents and themselves
                fetchPromises.push(
                    (async () => {
                        const agents = await dbService.queryCollection('users', [where('role', '==', 'agent')]);
                        const self = await dbService.getDocument('users', firebaseUser.uid);
                        const combined = [...(agents || [])];
                        if (self && !combined.find(u => u.id === self.id)) {
                            combined.push(self);
                        }
                        mockDB.users = combined.map((item: any) => ({ ...item, _id: String(item.id) })) as unknown as User[];
                    })()
                );
            }

            if (isValidAdmin) {
                fetchPromises.push(fetchCollection('tracked_tickets', 'trackedTickets'));
            } else {
                fetchPromises.push(
                    (async () => {
                        const data = await dbService.queryCollection('tracked_tickets', [where('userId', '==', firebaseUser.uid)]);
                        if (data) mockDB.trackedTickets = data.map((item: any) => ({ ...item, _id: String(item.id) })) as unknown as TrackedTicket[];
                    })()
                );
            }

            if (isValidAdmin) {
                fetchPromises.push(
                    fetchCollection('payments', 'payments'),
                    fetchCollection('ticket_requests', 'ticketRequests'),
                    fetchCollection('agent_requests', 'agentRequests')
                );
            } else if (isValidAgent) {
                // Agents only fetch their own data
                fetchPromises.push(
                    (async () => {
                        const data = await dbService.queryCollection('payments', [where('agentId', '==', firebaseUser.uid)]);
                        if (data) mockDB.payments = data.map((item: any) => ({ ...item, _id: String(item.id) })) as unknown as Payment[];
                    })(),
                    (async () => {
                        const data = await dbService.queryCollection('ticket_requests', [where('agentId', '==', firebaseUser.uid)]);
                        if (data) mockDB.ticketRequests = data.map((item: any) => ({ ...item, _id: String(item.id) })) as unknown as TicketRequest[];
                    })()
                );
            } else if (userRole === 'player') {
                fetchPromises.push(
                    (async () => {
                        const data = await dbService.queryCollection('ticket_requests', [where('playerId', '==', firebaseUser.uid)]);
                        if (data) mockDB.ticketRequests = data.map((item: any) => ({ ...item, _id: String(item.id) })) as unknown as TicketRequest[];
                    })()
                );
            }
        }

        await Promise.all(fetchPromises);

        notifyDbChanges();

        // Set up real-time subscriptions for all collections
        activeSubscriptions.push(dbService.subscribeToCollection('games', (data) => {
            mockDB.games = data.map(g => ({ ...g, _id: String(g.id) })) as unknown as Game[];
            notifyDbChanges();
        }));
        activeSubscriptions.push(dbService.subscribeToCollection('tickets', (data) => {
            mockDB.tickets = data.map(t => ({ ...t, _id: String(t.id) })) as unknown as Ticket[];
            notifyDbChanges();
        }));
        activeSubscriptions.push(dbService.subscribeToCollection('claims', (data) => {
            mockDB.claims = data.map(c => ({ ...c, _id: String(c.id) })) as unknown as Claim[];
            notifyDbChanges();
        }));
        activeSubscriptions.push(dbService.subscribeToDocument('settings', 'settings_id', (data) => {
            if (data) {
                mockDB.settings = { ...data, _id: String(data.id) } as unknown as Settings;
                notifyDbChanges();
            }
        }));
        activeSubscriptions.push(dbService.subscribeToCollection('themes', (data) => {
            mockDB.themes = data.map(t => ({ ...t, _id: String(t.id) })) as unknown as Theme[];
            notifyDbChanges();
        }));

        if (firebaseUser) {
            if (isValidAdmin || isValidAgent) {
                activeSubscriptions.push(dbService.subscribeToCollection('users', (data) => {
                    mockDB.users = data.map(u => ({ ...u, _id: String(u.id) })) as unknown as User[];
                    notifyDbChanges();
                }));
            } else {
                // Players only subscribe to agents and themselves
                activeSubscriptions.push(dbService.subscribeToQuery('users', [where('role', '==', 'agent')], (data) => {
                    const self = mockDB.users.find(u => u._id === firebaseUser.uid);
                    const agents = data.map(u => ({ ...u, _id: String(u.id) })) as unknown as User[];
                    mockDB.users = self ? [self, ...agents.filter(a => a._id !== self._id)] : agents;
                    notifyDbChanges();
                }));
                activeSubscriptions.push(dbService.subscribeToDocument('users', firebaseUser.uid, (data) => {
                    if (data) {
                        const self = { ...data, _id: String(data.id) } as unknown as User;
                        const others = mockDB.users.filter(u => u._id !== self._id);
                        const combined = [self, ...others];
                        notifyDbChanges();
                    }
                }));
            }

            if (isValidAdmin) {
                activeSubscriptions.push(dbService.subscribeToCollection('tracked_tickets', (data) => {
                    mockDB.trackedTickets = data.map(tt => ({ ...tt, _id: String(tt.id) })) as unknown as TrackedTicket[];
                    notifyDbChanges();
                }));
                activeSubscriptions.push(dbService.subscribeToCollection('payments', (data) => {
                    mockDB.payments = data.map(p => ({ ...p, _id: String(p.id) })) as unknown as Payment[];
                    notifyDbChanges();
                }));
                activeSubscriptions.push(dbService.subscribeToCollection('ticket_requests', (data) => {
                    mockDB.ticketRequests = data.map(tr => ({ ...tr, _id: String(tr.id) })) as unknown as TicketRequest[];
                    notifyDbChanges();
                }));
                activeSubscriptions.push(dbService.subscribeToCollection('agent_requests', (data) => {
                    mockDB.agentRequests = data.map(ar => ({ ...ar, _id: String(ar.id) })) as unknown as AgentRequest[];
                    notifyDbChanges();
                }));
            } else if (isValidAgent) {
                activeSubscriptions.push(dbService.subscribeToQuery('payments', [where('agentId', '==', firebaseUser.uid)], (data) => {
                    mockDB.payments = data.map(p => ({ ...p, _id: String(p.id) })) as unknown as Payment[];
                    notifyDbChanges();
                }));
                activeSubscriptions.push(dbService.subscribeToQuery('ticket_requests', [where('agentId', '==', firebaseUser.uid)], (data) => {
                    mockDB.ticketRequests = data.map(tr => ({ ...tr, _id: String(tr.id) })) as unknown as TicketRequest[];
                    notifyDbChanges();
                }));
            } else if (userRole === 'player') {
                activeSubscriptions.push(dbService.subscribeToQuery('tracked_tickets', [where('userId', '==', firebaseUser.uid)], (data) => {
                    mockDB.trackedTickets = data.map(tt => ({ ...tt, _id: String(tt.id) })) as unknown as TrackedTicket[];
                    notifyDbChanges();
                }));
                activeSubscriptions.push(dbService.subscribeToQuery('ticket_requests', [where('playerId', '==', firebaseUser.uid)], (data) => {
                    mockDB.ticketRequests = data.map(tr => ({ ...tr, _id: String(tr.id) })) as unknown as TicketRequest[];
                    notifyDbChanges();
                }));
            }
        }

    } catch (error) {
        console.error("Error initializing data from Firestore:", error);
    }
};

export const notifyDbChanges = () => {
    // Simple pub/sub for notifying components outside of React's state flow about DB changes.
    window.dispatchEvent(new CustomEvent('db-changed'));
};

export const subscribeToDbChanges = (callback: () => void) => {
    window.addEventListener('db-changed', callback);
    return () => window.removeEventListener('db-changed', callback);
};

// --- GAME CYCLE LOGIC ---
const gameLoops: { [gameId: string]: ReturnType<typeof setInterval> } = {};
const isRunning: { [gameId: string]: boolean } = {};
const lastCallTimes: { [gameId: string]: number } = {};

const checkForWinners = async (
    game: Game, 
    newCalledNumber: number
): Promise<{ 
    newWinners: { prizeName: string; winnerInfo: { name: string; ticketId: number; playerId: string; } }[], 
    finalPrizesState: Prize[] 
}> => {
    const allGameTickets = mockDB.tickets.filter(t => t.game === game._id && t.status === 'booked');
    const updatedCalledNumbers = [...game.calledNumbers, newCalledNumber];

    const newWinners: { prizeName: string; winnerInfo: { name: string; ticketId: number; playerId: string; } }[] = [];

    // Create a deep copy of the game's prizes to modify during this check cycle.
    // This allows us to check for dependencies like Second House within the same turn.
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
    
    // For sheet prizes, keep track of players who have won in this cycle to avoid duplicate announcements.
    const playersWhoWonSheetPrizeThisCycle = new Set<string>();

    // For each prize, in sorted order...
    for (const prize of sortedPrizes) {
        // If a prize has already been claimed by someone in a previous turn, it can't be claimed again.
        // We check the ORIGINAL game state for this, not the temp state.
        const originalPrizeState = game.prizes.find(p => p.name === prize.name);
        if (originalPrizeState && (originalPrizeState.claimedBy || []).length > 0) {
            continue;
        }

        const isSheetPrize = prize.name.toLowerCase().includes('sheet');

        // Find all tickets that can now claim this prize
        for (const ticket of allGameTickets) {
            if (!ticket.player) continue;

            // This player shouldn't have already won this prize.
            const currentPrizeState = tempPrizesState.find(p => p.name === prize.name);
            const hasPlayerAlreadyWonThisPrize = currentPrizeState?.claimedBy.some(c => c.playerId === ticket.player);
            if (hasPlayerAlreadyWonThisPrize) {
                continue;
            }

            // If it's a sheet prize and this player has already been marked as a winner for it IN THIS CYCLE, skip subsequent tickets.
            if (isSheetPrize && playersWhoWonSheetPrizeThisCycle.has(ticket.player)) {
                continue;
            }

            // Create a temporary game object with the intermediate prize state for validation
            const tempGameForValidation = { ...game, prizes: tempPrizesState };
            
            const isValid = validateClaim(ticket, updatedCalledNumbers, prize.name, tempGameForValidation, allGameTickets);
            
            if (isValid) {
                const player = mockDB.users.find(u => u._id === ticket.player);
                if (player) {
                    // If it's a sheet prize, add player to our set to prevent re-adding them for their other sheet tickets.
                    if (isSheetPrize) {
                        playersWhoWonSheetPrizeThisCycle.add(player._id);
                    }
                    
                    const winnerInfo = {
                        name: player.name,
                        ticketId: ticket.serialNumber,
                        playerId: player._id,
                    };
                    newWinners.push({ prizeName: prize.name, winnerInfo });

                    // CRUCIAL: Update the temporary prize state so subsequent checks in this same cycle see this new winner.
                    const prizeToUpdateInTempState = tempPrizesState.find((p: Prize) => p.name === prize.name);
                    if (prizeToUpdateInTempState) {
                        // Ensure we don't add the same winner twice if multiple conditions match (though unlikely with current logic)
                        if (!prizeToUpdateInTempState.claimedBy.some(c => c.ticketId === winnerInfo.ticketId)) {
                            prizeToUpdateInTempState.claimedBy.push(winnerInfo);
                        }
                    }
                }
            }
        }
    }
    
    if ((newWinners || []).length === 0) {
        return { newWinners, finalPrizesState: game.prizes };
    }
    
    // Return the final state based on the temporary one which contains all winners from this cycle.
    return { newWinners, finalPrizesState: tempPrizesState };
};

const gameCycle = async (gameId: string) => {
    const game = mockDB.games.find(g => g._id === gameId);
    
    if (!game || !game.isAutoCalling || game.status !== 'ongoing') {
        if (gameLoops[gameId]) {
            clearInterval(gameLoops[gameId]);
            delete gameLoops[gameId];
            isRunning[gameId] = false;
        }
        return;
    }
    
    if (game.isPausedForAnnouncement) {
        return;
    }

    if (game.cycleEndsAt && Date.now() < game.cycleEndsAt) {
        return;
    }

    // Prevent double calls due to realtime race conditions
    const minDelay = Math.min((mockDB.settings.callDelay || 5) * 1000 - 500, 2000);
    if (lastCallTimes[gameId] && Date.now() - lastCallTimes[gameId] < minDelay) {
        return;
    }

    const availableNumbers = Array.from({ length: 90 }, (_, i) => i + 1).filter(
        n => !game.calledNumbers.includes(n)
    );

    if ((availableNumbers || []).length === 0) {
        await api.admin.endGame(gameId);
        return;
    }
    
    let nextNumber: number | undefined;
    let newManualQueue = [...(game.manualQueue || [])];

    // --- Reworked Logic for Number Selection ---
    const currentCallMode = game.callMode || 'mix'; // Fallback to 'mix' if undefined
    if (currentCallMode === 'auto') {
        // 'auto' mode: Exclusively select a random number from those available.
        const randomIndex = Math.floor(Math.random() * (availableNumbers || []).length);
        nextNumber = availableNumbers[randomIndex];
        // The manual queue is intentionally not modified.
    } else if (currentCallMode === 'mix') {
        // 'mix' mode: Prioritize numbers from the manual queue.
        while ((newManualQueue || []).length > 0 && game.calledNumbers.includes(newManualQueue[0])) {
            newManualQueue.shift(); // Remove already called numbers
        }
        if ((newManualQueue || []).length > 0) {
            nextNumber = newManualQueue.shift(); // Take from the front of the queue
        } else {
            // If the queue is empty, fall back to a random number.
            const randomIndex = Math.floor(Math.random() * (availableNumbers || []).length);
            nextNumber = availableNumbers[randomIndex];
        }
    }
    
    if (nextNumber === undefined) {
        // Ultimate fallback to ensure the game doesn't get stuck
        const randomIndex = Math.floor(Math.random() * (availableNumbers || []).length);
        nextNumber = availableNumbers[randomIndex];
    }

    lastCallTimes[gameId] = Date.now();

    const shouldAutoDetect = game.autoVerifyClaims ?? mockDB.settings.autoVerifyClaims ?? true;

    if (shouldAutoDetect) {
        const { newWinners, finalPrizesState } = await checkForWinners(game, nextNumber);
        
        if ((newWinners || []).length > 0) {
            const winnersByPrize: { [prizeName: string]: string[] } = {};
            newWinners.forEach(win => {
                if (!winnersByPrize[win.prizeName]) {
                    winnersByPrize[win.prizeName] = [];
                }
                winnersByPrize[win.prizeName].push(win.winnerInfo.name);
            });

            const announcementTimestamp = Date.now();
            const newAnnouncements = Object.entries(winnersByPrize).map(([prizeName, winnerNames]) => {
                let namesString;
                if ((winnerNames || []).length === 1) {
                    namesString = winnerNames[0];
                } else if ((winnerNames || []).length === 2) {
                    namesString = `${winnerNames[0]} and ${winnerNames[1]}`;
                } else {
                    const allButLast = winnerNames.slice(0, -1).join(', ');
                    const last = winnerNames[(winnerNames || []).length - 1];
                    namesString = `${allButLast}, and ${last}`;
                }
                const verb = (winnerNames || []).length > 1 ? 'have' : 'has';
                return {
                    text: `Congratulations! ${namesString} ${verb} won ${prizeName}!`,
                    timestamp: announcementTimestamp
                };
            });
            
            const allPrizesClaimed = finalPrizesState.every(p => (p.claimedBy || []).length > 0);
            console.log("Checking all prizes claimed:", allPrizesClaimed, "Prizes:", finalPrizesState.map(p => ({name: p.name, claimed: (p.claimedBy || []).length > 0})));

            if (allPrizesClaimed) {
                console.log("All prizes claimed! Completing game.");
                const gameOverAnnouncement = {
                    text: 'All prizes have been claimed! The game will now stop.',
                    timestamp: Date.now()
                };
                const finalUpdatePayload: Partial<Game> = {
                    calledNumbers: [...game.calledNumbers, nextNumber],
                    prizes: finalPrizesState,
                    isAutoCalling: false, // Stop the game loop
                    status: 'completed',
                    cycleEndsAt: null,
                    cycleStartedAt: null,
                    announcements: [...newAnnouncements, gameOverAnnouncement],
                };
                await api.admin.updateGame(gameId, finalUpdatePayload);
                return; // Stop cycle
            } else {
                const fullMessage = newAnnouncements.map(a => a.text).join(' ');
                const pausePayload: Partial<Game> = {
                    calledNumbers: [...game.calledNumbers, nextNumber],
                    prizes: finalPrizesState,
                    announcements: newAnnouncements,
                    isPausedForAnnouncement: true,
                    cycleEndsAt: null, // Timer disappears while paused
                    cycleStartedAt: null,
                };
                await api.admin.updateGame(gameId, pausePayload);
                return; // Return to let the interval continue, gameCycle's internal timer will handle the pause
            }
        }
    }
    
    // Default action: No winner, just call the number.
    const totalCycleDuration = mockDB.settings.callDelay * 1000;

    const updatePayload: Partial<Game> = {
        calledNumbers: [...game.calledNumbers, nextNumber],
        manualQueue: newManualQueue,
        cycleEndsAt: Date.now() + totalCycleDuration,
        cycleStartedAt: Date.now(),
        announcements: [],
    };
    await api.admin.updateGame(gameId, updatePayload);
};

const manageAdminGameLoop = (game: Game | null) => {
    if (!game || game.status !== 'ongoing' || !game.isAutoCalling) {
        Object.keys(gameLoops).forEach(gameId => {
            clearInterval(gameLoops[gameId]);
            delete gameLoops[gameId];
            isRunning[gameId] = false;
        });
        return;
    }

    // Stop loops for OTHER games
    Object.keys(gameLoops).forEach(gameId => {
        if (gameId !== game._id) {
            clearInterval(gameLoops[gameId]);
            delete gameLoops[gameId];
            isRunning[gameId] = false;
        }
    });

    // Start loop for THIS game if not already started
    if (!gameLoops[game._id]) {
        gameLoops[game._id] = setInterval(async () => {
            if (isRunning[game._id]) return;
            isRunning[game._id] = true;
            try {
                await gameCycle(game._id);
            } finally {
                isRunning[game._id] = false;
            }
        }, 100);
    }
};

export const api = {
    admin: {
        manageGameLoop: manageAdminGameLoop,
        getGames: async () => mockDB.games,
        createGame: async (gameData: Partial<Game>) => {
            const isMockMode = isUsingMockData;
            
            const newGamePayload: Game = {
                _id: isMockMode ? `mock_game_${Date.now()}` : (undefined as any), // Supabase will assign an ID
                title: gameData.title || 'New Game',
                place: gameData.place || 'Online',
                subTitle: gameData.subTitle || '',
                ticketLimit: gameData.ticketLimit || 100,
                ticketPrice: gameData.ticketPrice || 10,
                date: gameData.date || new Date().toISOString().split('T')[0],
                time: gameData.time || '19:00',
                theme: gameData.theme || 'theme5',
                fontFamily: gameData.fontFamily || 'Roboto',
                bannerStyle: gameData.bannerStyle || 'modern',
                ticketTheme: gameData.ticketTheme || 'default',
                description: gameData.description || '',
                backgroundImage: gameData.backgroundImage,
                ticketBackgroundImage: gameData.ticketBackgroundImage,
                website: gameData.website,
                useBannerBackgroundOnTickets: gameData.useBannerBackgroundOnTickets ?? true,
                ticketBackgroundSettings: gameData.ticketBackgroundSettings ?? { dimOverlay: 20, blur: 0 },
                ticketGenerationOptions: gameData.ticketGenerationOptions ?? { numbersPerRow: 5 },
                ticketBundleDesign: gameData.ticketBundleDesign || 'default',
                prizes: gameData.prizes || [], 
                agentCommission: gameData.agentCommission || 10,
                autoVerifyClaims: gameData.autoVerifyClaims ?? mockDB.settings.autoVerifyClaims ?? true,
                callMode: mockDB.settings.callMode,
                isBookingOpen: true, 
                status: 'upcoming',
                tickets: [],
                calledNumbers: [],
                isAutoCalling: false,
                manualQueue: [],
                cycleEndsAt: null,
                cycleStartedAt: null,
                chatMessages: [],
            };

            if (isMockMode) {
                mockDB.games.push(newGamePayload);
                notifyDbChanges();
                return newGamePayload;
            }

            // Remove _id for Firebase insert to let it generate the ID
            const { _id, cycleStartedAt, isPausedForAnnouncement, remainingTimeOnPause, ...firebasePayload } = newGamePayload as any;

            console.log("Attempting to insert game into Firebase:", firebasePayload);
            const createdGame = await dbService.addDocument('games', firebasePayload);
            
            if (createdGame) {
                console.log("Game created successfully in Firebase:", createdGame);
                // Normalize ID: DB uses 'id', app uses '_id'
                const normalizedGame = { ...createdGame, _id: String(createdGame.id || createdGame._id) };
                
                // Update local cache immediately for instant UI feedback
                const existingIndex = mockDB.games.findIndex(g => g._id === normalizedGame._id);
                if (existingIndex !== -1) {
                    mockDB.games[existingIndex] = normalizedGame;
                } else {
                    mockDB.games.push(normalizedGame);
                }
                
                notifyDbChanges();
                return normalizedGame;
            }
            return createdGame;
        },
        updateGame: async (gameId: string, gameData: Partial<Game>) => {
            // Optimistic update for local cache to prevent race conditions with the game loop.
            const gameIndex = mockDB.games.findIndex(g => g._id === gameId);
            if (gameIndex !== -1) {
                mockDB.games[gameIndex] = { ...mockDB.games[gameIndex], ...gameData };
                notifyDbChanges();
            }

            const isMockMode = isUsingMockData;
            if (isMockMode) return mockDB.games[gameIndex];

            // Strip _id and map to id for Firebase
            const { _id, cycleStartedAt, isPausedForAnnouncement, remainingTimeOnPause, ...firebasePayload } = gameData as any;
            
            if (Object.keys(firebasePayload || {}).length === 0) {
                return mockDB.games[gameIndex];
            }

            await dbService.updateDocument('games', gameId, firebasePayload);
            return { ...mockDB.games[gameIndex], ...firebasePayload };
        },
        deleteGame: async (gameId: string) => {
            const isMockMode = isUsingMockData;
            
            if (!isMockMode) {
                await dbService.deleteDocument('games', gameId);
            }
            
            mockDB.games = mockDB.games.filter(g => g._id !== gameId);
            mockDB.tickets = mockDB.tickets.filter(t => t.game !== gameId);
            mockDB.claims = mockDB.claims.filter(c => c.game !== gameId);
            mockDB.payments = mockDB.payments.filter(p => p.gameId !== gameId);

            notifyDbChanges();
            return { success: true };
        },
        generateTicketsForGame: async ({ gameId }: { gameId: string }) => {
            const game = mockDB.games.find(g => g._id === gameId);
            if (!game) throw new Error("Game not found");

            const allExistingTicketsForGame = mockDB.tickets.filter(t => t.game === gameId);
            const bookedTicketSerials = new Set(
                allExistingTicketsForGame
                    .filter(t => t.status === 'booked')
                    .map(t => t.serialNumber)
            );

            if (isUsingMockData) {
                // Mock mode: update mockDB directly
                mockDB.tickets = mockDB.tickets.filter(t => !(t.game === gameId && t.status === 'available'));
                
                const newTicketsToCreate: Ticket[] = [];
                for (let i = 1; i <= game.ticketLimit; i++) {
                    if (!bookedTicketSerials.has(i)) {
                        newTicketsToCreate.push({
                            _id: `mock_ticket_${Date.now()}_${i}`,
                            game: gameId,
                            serialNumber: i,
                            numbers: generateTambolaTicket(),
                            status: 'available',
                            player: null,
                            bookedByAgent: null,
                            commission: null,
                        });
                    }
                }
                mockDB.tickets.push(...newTicketsToCreate);
                
                const updatedGame = { ...game, tickets: [...Array.from(bookedTicketSerials), ...newTicketsToCreate.map(t => t.serialNumber)] as any };
                const gameIndex = mockDB.games.findIndex(g => g._id === gameId);
                if (gameIndex !== -1) mockDB.games[gameIndex] = updatedGame;
                
                notifyDbChanges();
                return { success: true, message: `Generated ${(newTicketsToCreate || []).length} new tickets.` };
            }

            // Step 2: Delete all current 'available' tickets for this game from Firebase.
            const existingTickets = await dbService.queryCollection('tickets', [
                where('game', '==', gameId),
                where('status', '==', 'available')
            ]);
            if (existingTickets && existingTickets.length > 0) {
                await Promise.all(existingTickets.map(ticket => dbService.deleteDocument('tickets', ticket.id)));
            }

            // Step 3: Generate new tickets for serial numbers that are not currently booked.
            const newTicketsToCreate: Omit<Ticket, '_id'>[] = [];
            for (let i = 1; i <= game.ticketLimit; i++) {
                if (!bookedTicketSerials.has(i)) {
                    newTicketsToCreate.push({
                        game: game._id,
                        serialNumber: i,
                        numbers: generateTambolaTicket(game.ticketGenerationOptions),
                        status: 'available',
                        player: null,
                        bookedByAgent: null,
                        commission: null,
                    });
                }
            }

            // Step 4: Insert the newly generated available tickets.
            if (newTicketsToCreate.length > 0) {
                await Promise.all(newTicketsToCreate.map(ticket => dbService.addDocument('tickets', ticket)));
            }
            
            // Step 5: Update the game object with the correct list of ALL ticket IDs.
            // To do this reliably, we must refetch all tickets for the game.
            const allFinalTickets = await dbService.queryCollection('tickets', [
                where('game', '==', gameId)
            ]);

            const allFinalTicketIds = allFinalTickets ? allFinalTickets.map(t => String(t.id)) : [];

            if (allFinalTickets) {
                const normalizedTickets = allFinalTickets.map(t => ({ ...t, _id: String(t.id) })) as unknown as Ticket[];
                mockDB.tickets = [
                    ...mockDB.tickets.filter(t => t.game !== gameId),
                    ...normalizedTickets
                ];
                notifyDbChanges();
            }

            const updatedGame = await dbService.updateDocument('games', gameId, { tickets: allFinalTicketIds });
            
            if (updatedGame) {
                const normalizedGame = { ...updatedGame, _id: String(updatedGame.id) };
                const gameIndex = mockDB.games.findIndex(g => g._id === gameId);
                if (gameIndex !== -1) {
                    mockDB.games[gameIndex] = normalizedGame;
                    notifyDbChanges();
                }
            }

            // The realtime subscription should handle updating mockDB. 
            // The caller will also trigger a refresh.
            return updatedGame;
        },
        toggleAutoCall: async ({ gameId }: { gameId: string }) => {
            const game = mockDB.games.find(g => g._id === gameId);
            if (!game) return null;

            const newAutoCallingState = !game.isAutoCalling;
            let updatedData: Partial<Game> = { isAutoCalling: newAutoCallingState };

            if (newAutoCallingState) { 
                updatedData.status = 'ongoing';
                if ((game.calledNumbers || []).length === 0) {
                    if (mockDB.settings.autoCloseBookingOnGameStart) {
                        updatedData.isBookingOpen = false;
                    }
                    const initialDelay = (mockDB.settings.callDelay || 5) * 1000;
                    updatedData.cycleEndsAt = Date.now() + initialDelay;
                    updatedData.cycleStartedAt = Date.now();
                } else {
                    const resumeDelay = game.remainingTimeOnPause || ((mockDB.settings.callDelay || 5) * 1000);
                    updatedData.cycleEndsAt = Date.now() + resumeDelay;
                    updatedData.cycleStartedAt = Date.now();
                }
                updatedData.remainingTimeOnPause = null;
            } else {
                const timeRemaining = game.cycleEndsAt ? game.cycleEndsAt - Date.now() : 0;
                updatedData.remainingTimeOnPause = timeRemaining > 0 ? timeRemaining : null;
                updatedData.cycleEndsAt = null;
                updatedData.cycleStartedAt = null;
            }
            return api.admin.updateGame(gameId, updatedData);
        },
        getTicketRequests: async () => mockDB.ticketRequests,
        getAgentRequests: async () => mockDB.agentRequests.filter(r => r.status === 'pending'),
        clearAnnouncement: async () => {
            await api.admin.updateSettings({ announcement: null });
            return { success: true };
        },
        sendAnnouncement: async (text: string) => {
            const announcementPayload = { text, id: Date.now() };
            await api.admin.updateSettings({ announcement: announcementPayload });
            
            const ongoingGame = mockDB.games.find(g => g.status === 'ongoing');
            if (ongoingGame) {
                const newMessages = [...ongoingGame.chatMessages, {
                    senderId: 'system', senderName: 'Game Host', message: text, timestamp: Date.now(),
                }];
                await api.admin.updateGame(ongoingGame._id, { chatMessages: newMessages });
            }
            return { success: true };
        },
        toggleBooking: async ({ gameId }: { gameId: string }) => {
            const game = mockDB.games.find(g => g._id === gameId);
            if (game) {
                return await api.admin.updateGame(gameId, { isBookingOpen: !game.isBookingOpen });
            }
            return null;
        },
        resetGame: async (gameId: string) => {
            const claims = await dbService.queryCollection('claims', [where('game', '==', gameId)]);
            for (const claim of claims) {
                await dbService.deleteDocument('claims', claim.id);
            }
            
            return await api.admin.updateGame(gameId, {
                calledNumbers: [],
                prizes: mockDB.games.find(g => g._id === gameId)?.prizes.map(p => ({ ...p, claimedBy: [] })) || [],
                status: 'upcoming', isAutoCalling: false, cycleEndsAt: null, cycleStartedAt: null, manualQueue: [], chatMessages: [],
                remainingTimeOnPause: null,
            });
        },
        endGame: async (gameId: string) => {
            return await api.admin.updateGame(gameId, { status: 'completed', isAutoCalling: false, cycleEndsAt: null, cycleStartedAt: null });
        },
        manualCallNumber: async ({ gameId, number }: { gameId: string, number: number }) => {
            const game = mockDB.games.find(g => g._id === gameId);
            if (game && !game.calledNumbers.includes(number)) {
                return await api.admin.updateGame(gameId, { calledNumbers: [...game.calledNumbers, number] });
            }
            return game;
        },
        toggleManualQueueNumber: async ({ gameId, number }: { gameId: string, number: number }) => {
            const game = mockDB.games.find(g => g._id === gameId);
            if (game) {
                if (game.calledNumbers.includes(number)) {
                    return game; // Don't add to queue if already called
                }
                const currentQueue = game.manualQueue || [];
                const newQueue = currentQueue.includes(number)
                    ? currentQueue.filter(n => n !== number)
                    : [...currentQueue, number];
                return await api.admin.updateGame(gameId, { manualQueue: newQueue });
            }
            return game;
        },
        clearManualQueue: async (gameId: string) => {
            return await api.admin.updateGame(gameId, { manualQueue: [] });
        },
        getClaims: async (gameId: string) => mockDB.claims.filter(c => c.game === gameId),
        approveClaim: async ({ claimId }: { claimId: string }) => {
            const claim = mockDB.claims.find(c => c._id === claimId);
            if (!claim) return { success: false };

            await dbService.updateDocument('claims', claimId, { status: 'approved' });

            const game = mockDB.games.find(g => g._id === claim.game);
            const prize = game?.prizes.find(p => p.name.trim().toLowerCase() === claim.prizeName.trim().toLowerCase());
            const player = mockDB.users.find(u => u._id === claim.player);
            const ticket = mockDB.tickets.find(t => t._id === claim.ticket);

            if (game && prize && player && ticket && !prize.claimedBy.some(p => p.playerId === player._id)) {
                const updatedPrizes = game.prizes.map(p => {
                    if (p.name.trim().toLowerCase() === claim.prizeName.trim().toLowerCase()) {
                        return {
                            ...p,
                            claimedBy: [...p.claimedBy, { name: player.name, ticketId: ticket.serialNumber, playerId: player._id }]
                        };
                    }
                    return p;
                });
                
                const announcementText = `Congratulations! ${player.name} has won ${prize.name}!`;
                const newAnnouncement = { text: announcementText, timestamp: Date.now() };

                const callRate = mockDB.settings.callRate ?? 1;
                const estimatedSpeechTime = (((announcementText || '').split(' ') || []).length * 450 + 2500) / callRate;
                
                const allPrizesClaimed = updatedPrizes.every(p => (p.claimedBy || []).length > 0);
                console.log("Checking all prizes claimed in approveClaim:", allPrizesClaimed, "Prizes:", updatedPrizes.map(p => ({name: p.name, claimed: (p.claimedBy || []).length > 0})));
                
                const updatePayload: Partial<Game> = {
                    prizes: updatedPrizes,
                    announcements: [newAnnouncement, ...(game.announcements || [])],
                    isPausedForAnnouncement: true,
                };
                
                if (allPrizesClaimed) {
                    console.log("All prizes claimed in approveClaim! Completing game.");
                    updatePayload.status = 'completed';
                    updatePayload.isAutoCalling = false;
                    updatePayload.cycleEndsAt = null;
                    updatePayload.cycleStartedAt = null;
                    updatePayload.announcements = [
                        { text: 'All prizes have been claimed! The game will now stop.', timestamp: Date.now() },
                        ...updatePayload.announcements!
                    ];
                } else if (game.isAutoCalling) {
                    updatePayload.cycleEndsAt = null;
                    updatePayload.cycleStartedAt = null;
                }

                await api.admin.updateGame(game._id, updatePayload);
                return { success: true, player, prize };
            }
            return { success: false };
        },
        rejectClaim: async ({ claimId }: { claimId: string }) => {
            await dbService.updateDocument('claims', claimId, { status: 'rejected' });
            return { success: true };
        },
        unbookTicket: async ({ ticketId }: { ticketId: string }) => {
            const ticket = mockDB.tickets.find(t => t._id === ticketId);
            if (!ticket) throw new Error("Ticket not found.");
            
            const sheetId = ticket.sheetId;
            let ticketsToUnbook = [ticket];
            if (sheetId) {
                ticketsToUnbook = mockDB.tickets.filter(t => t.sheetId === sheetId && t.player === ticket.player);
            }

            const unbookPayload = { status: 'available', player: null, bookedByAgent: null, commission: null };
            for (const t of ticketsToUnbook) {
                await dbService.updateDocument('tickets', t._id, unbookPayload);
            }
            
            const ticketIdsToUnbookSet = new Set(ticketsToUnbook.map(t => t._id));
            const payment = mockDB.payments.find(p => p.playerId === ticket.player && p.agentId === ticket.bookedByAgent && p.gameId === ticket.game);
            if (payment) {
                const remainingTicketIds = (payment.ticketIds || []).filter(id => !ticketIdsToUnbookSet.has(id));
                if ((remainingTicketIds || []).length === 0) {
                    await dbService.deleteDocument('payments', payment._id);
                } else {
                    const game = mockDB.games.find(g => g._id === payment.gameId);
                    const ticketPrice = game?.ticketPrice || 0;
                    const newAmount = (remainingTicketIds || []).length * ticketPrice;
                    await dbService.updateDocument('payments', payment._id, { ticketIds: remainingTicketIds, amount: newAmount });
                }
            }
            return { success: true };
        },
        addAgent: async (agentData: Omit<User, '_id' | 'role'>) => {
            if (mockDB.users.some(u => u.username.toLowerCase() === agentData.username.toLowerCase())) {
                throw new Error("Username already exists. Please choose a different one.");
            }

            const newAgent: Omit<User, '_id'> = {
                ...agentData, role: 'agent', isBookingAllowed: true, isBlocked: false, isVisibleToPlayers: true,
            };
            
            const createdAgent = await dbService.addDocument('users', newAgent);
            
            // Manually push to the local cache for an immediate UI update.
            // The realtime subscription handler also has a check to prevent duplicates.
            if (!mockDB.users.some(u => u._id === createdAgent.id)) {
                mockDB.users.push({ ...createdAgent, _id: createdAgent.id });
            }
            
            return { ...createdAgent, _id: createdAgent.id };
        },
        rejectAgentRequest: async ({ requestId }: { requestId: string }) => {
            await dbService.updateDocument('agent_requests', requestId, { status: 'rejected' });
            
            mockDB.agentRequests = mockDB.agentRequests.map(req =>
                req._id === requestId ? { ...req, status: 'rejected' } : req
            );
            return { success: true };
        },
        approveAgentRequest: async ({ requestId, username, password }: { requestId: string; username: string; password: string }) => {
            const request = mockDB.agentRequests.find(r => r._id === requestId);
            if (!request) throw new Error("Request not found.");
            
            await api.admin.addAgent({
                name: request.name, username, password, phone: request.phone, address: request.address, email: request.email, photo: request.photo
            });
            await dbService.updateDocument('agent_requests', requestId, { status: 'approved' });

            mockDB.agentRequests = mockDB.agentRequests.map(req =>
                req._id === requestId ? { ...req, status: 'approved' } : req
            );
            return { success: true };
        },
        toggleAgentBookingStatus: async ({ agentId }: { agentId: string }) => {
            const agent = mockDB.users.find(u => u._id === agentId && u.role === 'agent');
            if (!agent) throw new Error("Agent not found.");
            const newStatus = !(agent.isBookingAllowed ?? true);
            
            await dbService.updateDocument('users', agentId, { isBookingAllowed: newStatus });
            
            return { success: true, agent: { ...agent, isBookingAllowed: newStatus } };
        },
        toggleAgentVisibility: async ({ agentId }: { agentId: string }) => {
            const agent = mockDB.users.find(u => u._id === agentId && u.role === 'agent');
            if (!agent) throw new Error("Agent not found.");
            const newStatus = !(agent.isVisibleToPlayers ?? true);
            
            await dbService.updateDocument('users', agentId, { isVisibleToPlayers: newStatus });
            
            return { success: true, agent: { ...agent, isVisibleToPlayers: newStatus } };
        },
        deleteAgent: async ({ agentId }: { agentId: string }) => {
            const payments = await dbService.queryCollection('payments', [where('agentId', '==', agentId)]);
            for (const payment of payments) {
                await dbService.deleteDocument('payments', payment.id);
            }
        
            await dbService.deleteDocument('users', agentId);
        
            mockDB.users = mockDB.users.filter(u => u._id !== agentId);
            mockDB.payments = mockDB.payments.filter(p => p.agentId !== agentId);
            notifyDbChanges();
        
            return { success: true };
        },
        updateAgent: async (agentId: string, agentData: Partial<User>) => {
            if (agentData.username) {
                if (mockDB.users.some(u => u.username.toLowerCase() === agentData.username!.toLowerCase() && u._id !== agentId)) {
                    throw new Error("Username already exists. Please choose a different one.");
                }
            }
            
            const updatedAgent = await dbService.updateDocument('users', agentId, agentData);
            
            const index = mockDB.users.findIndex(u => u._id === agentId);
            if (index !== -1) {
                mockDB.users[index] = { ...mockDB.users[index], ...agentData };
                notifyDbChanges();
            }
            
            return { success: true, agent: updatedAgent || mockDB.users[index] };
        },
        updateAgentCredentials: async ({ agentId, newUsername, newPassword }: { agentId: string, newUsername: string, newPassword: string }) => {
            if (mockDB.users.some(u => u.username.toLowerCase() === newUsername.toLowerCase() && u._id !== agentId)) {
                throw new Error("Username already exists. Please choose a different one.");
            }
            
            const updatedAgent = await dbService.updateDocument('users', agentId, { username: newUsername, password: newPassword });
            
            const index = mockDB.users.findIndex(u => u._id === agentId);
            if (index !== -1) {
                mockDB.users[index] = { ...mockDB.users[index], username: newUsername, password: newPassword };
                notifyDbChanges();
            }
            
            return { success: true, agent: updatedAgent || mockDB.users[index] };
        },
        approveRequest: async ({ requestId }: { requestId: string }) => {
            const request = mockDB.ticketRequests.find(r => r._id === requestId);
            if (!request) throw new Error("Request not found.");

            // Update request status
            const historyEntry: HistoryEntry = { action: 'APPROVED', by: 'ADMIN', timestamp: Date.now() };
            const updatedRequest = await dbService.updateDocument('ticket_requests', requestId, { 
                status: 'approved',
                history: [...(request.history || []), historyEntry]
            });

            // Actually book the tickets if not already booked
            if (request.ticketIds && request.ticketIds.length > 0) {
                try {
                    await api.agent.bookTickets({
                        ticketIds: request.ticketIds,
                        playerId: request.playerId,
                        agentId: 'temp_admin_bypass' // Use admin bypass for direct admin approval
                    });
                } catch (error) {
                    console.error("Failed to book tickets during request approval:", error);
                }
            }

            if (updatedRequest) {
                mockDB.ticketRequests = mockDB.ticketRequests.map(req =>
                    req._id === requestId ? { ...req, status: 'approved', history: [...(req.history || []), historyEntry] } : req
                );
                notifyDbChanges();
            }
            return { success: true };
        },
        rejectRequest: async ({ requestId, reason }: { requestId: string; reason?: string }) => {
            const request = mockDB.ticketRequests.find(r => r._id === requestId);
            if (!request) throw new Error("Request not found.");

            // If it was already approved, we need to unbook the tickets (Override)
            if (request.status === 'approved' && request.ticketIds && request.ticketIds.length > 0) {
                try {
                    for (const ticketId of request.ticketIds) {
                        await api.admin.unbookTicket({ ticketId });
                    }
                } catch (error) {
                    console.error("Failed to unbook tickets during request rejection:", error);
                }
            }

            const historyEntry: HistoryEntry = { action: 'REJECTED', by: 'ADMIN', timestamp: Date.now(), reason };
            const updatedRequest = await dbService.updateDocument('ticket_requests', requestId, { 
                status: 'rejected_by_admin',
                rejectionReason: reason,
                history: [...(request.history || []), historyEntry]
            });

            if (updatedRequest) {
            mockDB.ticketRequests = mockDB.ticketRequests.map(req =>
                    req._id === requestId ? { ...req, status: 'rejected_by_admin', rejectionReason: reason, history: [...(req.history || []), historyEntry] } : req
                );
                notifyDbChanges();
            }
            return { success: true };
        },
        togglePlayerBlockStatus: async ({ userId }: { userId: string }) => {
             const player = mockDB.users.find(u => u._id === userId && u.role === 'player');
            if (!player) throw new Error("Player not found.");
            const newStatus = !(player.isBlocked ?? false);
            const updatedPlayer = await dbService.updateDocument('users', userId, { isBlocked: newStatus });
            
            const index = mockDB.users.findIndex(u => u._id === userId);
            if (index !== -1) {
                mockDB.users[index] = { ...player, isBlocked: newStatus };
                notifyDbChanges();
            }

            return { success: true, player: updatedPlayer || mockDB.users[index] };
        },
        getPendingPayments: async () => mockDB.payments.filter(p => p.status === 'paid_by_agent' || p.status === 'pending_agent_confirmation'),
        approvePayment: async ({ paymentId }: { paymentId: string }) => {
            await dbService.updateDocument('payments', paymentId, { status: 'approved' });
            mockDB.payments = mockDB.payments.map(p => p._id === paymentId ? { ...p, status: 'approved' } : p);
            notifyDbChanges();
            return { success: true };
        },
        rejectPayment: async ({ paymentId }: { paymentId: string }) => {
            await dbService.updateDocument('payments', paymentId, { status: 'rejected' });
            mockDB.payments = mockDB.payments.map(p => p._id === paymentId ? { ...p, status: 'rejected' } : p);
            notifyDbChanges();
            return { success: true };
        },
        generateBannerImage: async (prompt: string): Promise<string> => {
            return generateBannerImage(prompt);
        },
        getSettings: async () => {
            const settings = await dbService.getDocument('settings', 'settings_id');
            if (settings) {
                let settingsData = settings as any;
                if (settingsData.isPlayerTicketRequestEnabled === false && settingsData.isAgentBookingEnabled === false && settingsData.isChatEnabled === false) {
                    settingsData.isPlayerTicketRequestEnabled = true;
                    settingsData.isAgentBookingEnabled = true;
                    settingsData.isChatEnabled = true;
                    await dbService.updateDocument('settings', 'settings_id', { isPlayerTicketRequestEnabled: true, isAgentBookingEnabled: true, isChatEnabled: true });
                }
                mockDB.settings = settingsData;
                return settingsData;
            }
            return mockDB.settings;
        },
        updateSettings: async (settingsData: Partial<Settings>) => {
            const upsertPayload: any = { ...mockDB.settings, ...settingsData };
            delete upsertPayload._id;
            
            const updatedSettings = await dbService.upsertDocument('settings', 'settings_id', upsertPayload);
            
            mockDB.settings = updatedSettings;
            return updatedSettings;
        },
    },
    agent: {
        bookTickets: async ({ ticketIds, playerId, agentId }: { ticketIds: string[], playerId: string, agentId: string }) => {
            let agent = mockDB.users.find(u => u._id === agentId);
            
            // Handle the hardcoded admin bypass user
            if (!agent && agentId === 'temp_admin_bypass') {
                agent = {
                    _id: 'temp_admin_bypass',
                    name: 'Admin',
                    username: 'admin',
                    password: 'password',
                    role: 'admin',
                    isBookingAllowed: true,
                    isBlocked: false
                } as User;
            }

            const isGlobalBookingEnabled = mockDB.settings.isAgentBookingEnabled ?? true;

            if (!agent) throw new Error("Agent not found.");

            // Admins can always book if they want, but agents are subject to both global and per-agent settings.
            if (agent.role !== 'admin') {
                if (!isGlobalBookingEnabled) throw new Error("Ticket booking is currently disabled by admin.");
                if (!(agent.isBookingAllowed ?? true)) throw new Error("Your booking access has been blocked by admin.");
            }
            
            const firstTicket = mockDB.tickets.find(t => t._id === ticketIds[0]);
            if (!firstTicket) throw new Error("No tickets found to book.");
            
            // Check if any of the tickets are already booked
            const ticketsToBook = mockDB.tickets.filter(t => ticketIds.includes(t._id));
            if (ticketsToBook.some(t => t.status === 'booked')) {
                throw new Error("One or more tickets are already booked.");
            }

            const game = mockDB.games.find(g => g._id === firstTicket.game);
            if (!game) throw new Error("Game not found.");

            const sheetId = firstTicket.sheetId || `sheet${Date.now()}${Math.random()}`;
            const bookPayload = { status: 'booked', player: playerId, bookedByAgent: agentId, commission: game.ticketPrice * (game.agentCommission / 100), sheetId: (ticketIds || []).length > 1 ? sheetId : null };
            
            for (const ticketId of ticketIds) {
                await dbService.updateDocument('tickets', ticketId, bookPayload);
            }
            
            // Instant UI update
            mockDB.tickets = mockDB.tickets.map(t => 
                ticketIds.includes(t._id) ? { ...t, status: 'booked', player: playerId, bookedByAgent: agentId, sheetId: bookPayload.sheetId } : t
            );
            notifyDbChanges();

            const totalAmount = (ticketIds || []).length * game.ticketPrice;
            const existingPayment = mockDB.payments.find(p => p.playerId === playerId && p.gameId === game._id && p.agentId === agentId && p.status === 'pending_agent_confirmation');

            if (existingPayment) {
                const newTicketIds = [...existingPayment.ticketIds, ...ticketIds];
                const newAmount = existingPayment.amount + totalAmount;
                await dbService.updateDocument('payments', existingPayment._id, { ticketIds: newTicketIds, amount: newAmount });
                
                const index = mockDB.payments.findIndex(p => p._id === existingPayment._id);
                if (index !== -1) {
                    mockDB.payments[index] = { ...existingPayment, ticketIds: newTicketIds, amount: newAmount };
                    notifyDbChanges();
                }
            } else {
                 const player = mockDB.users.find(u => u._id === playerId);
                 const newPayment = { playerId, playerName: player?.name || 'N/A', gameId: game._id, agentId, ticketIds, amount: totalAmount, status: 'pending_agent_confirmation', created_at: new Date().toISOString() };
                 const createdPayment = await dbService.addDocument('payments', newPayment);
                 
                 if (createdPayment) {
                     mockDB.payments.push({ ...createdPayment, _id: createdPayment.id });
                     notifyDbChanges();
                 }
            }
            return { success: true };
        },
        getTicketRequests: async () => {
            const firebaseUser = auth.currentUser;
            if (!firebaseUser) return [];
            return mockDB.ticketRequests.filter(r => r.agentId === firebaseUser.uid && r.status === 'pending');
        },
        approveRequest: async ({ requestId }: { requestId: string }) => {
            const request = mockDB.ticketRequests.find(r => r._id === requestId);
            if (!request) throw new Error("Request not found.");

            const historyEntry: HistoryEntry = { action: 'APPROVED', by: 'AGENT', timestamp: Date.now() };
            const updatedRequest = await dbService.updateDocument('ticket_requests', requestId, { 
                status: 'approved',
                history: [...(request.history || []), historyEntry]
            });

            // Book the tickets on agent approval
            if (request.ticketIds && request.ticketIds.length > 0) {
                try {
                    await api.agent.bookTickets({
                        ticketIds: request.ticketIds,
                        playerId: request.playerId,
                        agentId: request.agentId
                    });
                } catch (error) {
                    console.error("Failed to book tickets during agent request approval:", error);
                }
            }

            if (updatedRequest) {
                mockDB.ticketRequests = mockDB.ticketRequests.map(req =>
                    req._id === requestId ? { ...req, status: 'approved', history: [...(req.history || []), historyEntry] } : req
                );
                notifyDbChanges();
            }
            return { success: true };
        },
        rejectRequest: async ({ requestId, reason }: { requestId: string; reason?: string }) => {
            const request = mockDB.ticketRequests.find(r => r._id === requestId);
            if (!request) throw new Error("Request not found.");

            const historyEntry: HistoryEntry = { action: 'REJECTED', by: 'AGENT', timestamp: Date.now(), reason };
            const updatedRequest = await dbService.updateDocument('ticket_requests', requestId, { 
                status: 'rejected',
                rejectionReason: reason,
                history: [...(request.history || []), historyEntry]
            });

            if (updatedRequest) {
            mockDB.ticketRequests = mockDB.ticketRequests.map(req =>
                    req._id === requestId ? { ...req, status: 'rejected', rejectionReason: reason, history: [...(req.history || []), historyEntry] } : req
                );
                notifyDbChanges();
            }
            return { success: true };
        },
        markAsPaid: async ({ paymentId }: { paymentId: string }) => {
            const payment = mockDB.payments.find(p => p._id === paymentId);
            if (payment && payment.status === 'pending_agent_confirmation') {
                await dbService.updateDocument('payments', paymentId, { status: 'paid_by_agent' });
                
                const index = mockDB.payments.findIndex(p => p._id === paymentId);
                if (index !== -1) {
                    mockDB.payments[index] = { ...payment, status: 'paid_by_agent' };
                    notifyDbChanges();
                }
                return { success: true };
            }
            throw new Error("Payment not found or cannot be marked as paid.");
        },
        getMyBookings: async (agentId: string) => mockDB.payments.filter(p => p.agentId === agentId).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        unbookTickets: async ({ ticketIds }: { ticketIds: string[] }) => {
            for (const ticketId of ticketIds) {
                await api.admin.unbookTicket({ ticketId });
            }
            return { success: true };
        },
    },
    player: {
        getMyTickets: async (playerId: string) => mockDB.tickets.filter(t => t.player === playerId),
        requestTickets: async (requestData: Omit<TicketRequest, '_id' | 'status' | 'history'>) => {
            const newRequestPayload = { 
                status: 'pending', 
                ...requestData,
                history: [{ action: 'REQUESTED', by: 'PLAYER', timestamp: Date.now() }],
                created_at: new Date().toISOString()
            };
            const createdRequest = await dbService.addDocument('ticket_requests', newRequestPayload);
            const newRequest = { ...createdRequest, _id: createdRequest.id } as TicketRequest;
            mockDB.ticketRequests = [...mockDB.ticketRequests, newRequest];
            notifyDbChanges();
            return newRequest;
        },
        getMyTicketRequests: async (playerId: string) => {
            const requests = await dbService.queryCollection('ticket_requests', [where('playerId', '==', playerId)]);
            return (requests || []).map((r: any) => ({ ...r, _id: String(r.id) })) as TicketRequest[];
        },
        getMyAgentRequests: async (playerId: string) => {
            const requests = await dbService.queryCollection('agent_requests', [where('playerId', '==', playerId)]);
            return (requests || []).map((r: any) => ({ ...r, _id: String(r.id) })) as AgentRequest[];
        },
        requestAgentRole: async (requestData: Omit<AgentRequest, '_id' | 'status'>) => {
            const newRequestPayload = { status: 'pending', ...requestData, created_at: new Date().toISOString() };
            const createdRequest = await dbService.addDocument('agent_requests', newRequestPayload);
            const newRequest = { ...createdRequest, _id: createdRequest.id } as AgentRequest;
            if (newRequest) {
                mockDB.agentRequests = [...mockDB.agentRequests, newRequest];
                notifyDbChanges();
            }
            return newRequest;
        },
        claimPrize: async ({ playerId, gameId, ticketId, prizeName }: { playerId: string, gameId: string, ticketId: string, prizeName: string }) => {
            const game = mockDB.games.find(g => g._id === gameId);
            const ticket = mockDB.tickets.find(t => t._id === ticketId);
            if (!game || !ticket) throw new Error("Game or ticket not found.");
            
            const prize = game.prizes.find(p => p.name.trim().toLowerCase() === prizeName.trim().toLowerCase());
            
            if (!prize) {
                throw new Error(`Prize '${prizeName}' not found in this game.`);
            }
            if (prize.claimedBy.some(c => c.playerId === playerId)) {
                throw new Error(`You have already claimed '${prizeName}'.`);
            }
            if ((prize.claimedBy || []).length > 0 && prize.name.toLowerCase().trim() !== 'second house') {
                throw new Error(`Prize '${prizeName}' has already been claimed.`);
            }

            const existingPendingClaim = mockDB.claims.find(c => 
                c.game === gameId && 
                c.prizeName.toLowerCase().trim() === prizeName.toLowerCase().trim() && 
                c.status === 'pending' &&
                (c.player === playerId || prize.name.toLowerCase().trim() !== 'second house')
            );
            
            if (existingPendingClaim) {
                if (existingPendingClaim.player === playerId) {
                    throw new Error(`You already have a pending claim for '${prizeName}'.`);
                } else {
                    throw new Error(`Someone else is currently claiming '${prizeName}'.`);
                }
            }

            const isValid = validateClaim(ticket, game.calledNumbers, prizeName, game, mockDB.tickets);
            
            if (isValid === true || isValid === null) {
                const shouldAutoApprove = (game.autoVerifyClaims ?? mockDB.settings.autoVerifyClaims ?? false) && isValid === true;
                const newStatus = shouldAutoApprove ? 'approved' : 'pending';
                const newClaimPayload = { player: playerId, game: gameId, ticket: ticketId, prizeName, status: newStatus, created_at: new Date().toISOString() };
                
                const createdClaim = await dbService.addDocument('claims', newClaimPayload);
                if (!createdClaim) throw new Error("Claim could not be saved.");

                const newClaim = { ...createdClaim, _id: createdClaim.id };

                if (shouldAutoApprove) {
                    const player = mockDB.users.find(u => u._id === playerId);
                    const gameToUpdate = mockDB.games.find(g => g._id === gameId);
                    if (gameToUpdate && prize && player && ticket) {
                        const updatedPrizes = gameToUpdate.prizes.map(p => {
                            if (p.name.trim().toLowerCase() === prizeName.trim().toLowerCase()) {
                                return {
                                    ...p,
                                    claimedBy: [...p.claimedBy, { name: player.name, ticketId: ticket.serialNumber, playerId: player._id }]
                                };
                            }
                            return p;
                        });

                        const announcementText = `Congratulations! ${player.name} has won ${prizeName}!`;
                        const newAnnouncement = { text: announcementText, timestamp: Date.now() };

                        const allPrizesClaimed = updatedPrizes.every(p => (p.claimedBy || []).length > 0);
                        
                        const updatePayload: Partial<Game> = {
                            prizes: updatedPrizes,
                            announcements: [newAnnouncement, ...(gameToUpdate.announcements || [])],
                            isPausedForAnnouncement: true,
                        };

                        if (allPrizesClaimed) {
                            updatePayload.status = 'completed';
                            updatePayload.isAutoCalling = false;
                            updatePayload.cycleEndsAt = null;
                            updatePayload.cycleStartedAt = null;
                            updatePayload.announcements = [
                                { text: 'All prizes have been claimed! The game will now stop.', timestamp: Date.now() },
                                ...updatePayload.announcements!
                            ];
                        }

                        await api.admin.updateGame(gameId, updatePayload);
                    }
                    return { success: true, message: 'Claim approved!', claim: newClaim };
                } else {
                    return { success: true, message: 'Claim submitted for verification.', claim: newClaim };
                }
            } else {
                throw new Error("This claim is not valid.");
            }
        },
        sendChatMessage: ({ gameId, senderId, senderName, message }: { gameId: string; senderId: string; senderName: string; message: string; }) => {
            const gameIndex = mockDB.games.findIndex(g => g._id === gameId);
            
            if (gameIndex !== -1) {
                const game = mockDB.games[gameIndex];
                const sender = mockDB.users.find(u => u._id === senderId);
                const newMessage: ChatMessage = { 
                    senderId, 
                    senderName, 
                    message, 
                    timestamp: Date.now(), 
                    senderAvatar: sender?.photo 
                };
                
                const newMessages = [...game.chatMessages, newMessage];
                const updatedGame = { ...game, chatMessages: newMessages };
                mockDB.games[gameIndex] = updatedGame;
                
                (async () => {
                    try {
                        await api.admin.updateGame(gameId, { chatMessages: newMessages });
                    } catch (error) {
                        console.error("Failed to persist chat message:", error);
                    }
                })();
            }
        },
        setTyping: async ({ gameId, senderId, senderName, isTyping }: { gameId: string; senderId: string; senderName: string; isTyping: boolean; }) => {
            // This logic is now handled by Supabase broadcast and presence.
            // The function is kept to avoid breaking existing calls, but does nothing.
        },
        resumeGame: async ({ gameId }: { gameId: string }) => {
            await api.admin.updateGame(gameId, { isPausedForAnnouncement: false });
            return { success: true };
        },
    },
    user: {
        getMyTrackedTickets: async (userId: string): Promise<string[]> => {
            return mockDB.trackedTickets
                .filter(t => t.userId === userId)
                .map(t => t.ticketId);
        },
        addToMyTickets: async ({ userId, ticketId }: { userId: string, ticketId: string }) => {
            if (!mockDB.trackedTickets.some(t => t.userId === userId && t.ticketId === ticketId)) {
                const newTrackedTicket = { userId, ticketId, created_at: new Date().toISOString() };
                await dbService.addDocument('tracked_tickets', newTrackedTicket);
                
                mockDB.trackedTickets.push(newTrackedTicket);
                notifyDbChanges();
            }
            return { success: true };
        },
        removeFromMyTickets: async ({ userId, ticketId }: { userId: string, ticketId: string }) => {
            const docs = await dbService.queryCollection('tracked_tickets', [
                where('userId', '==', userId),
                where('ticketId', '==', ticketId)
            ]);
            
            for (const doc of docs) {
                await dbService.deleteDocument('tracked_tickets', doc.id);
            }
            
            mockDB.trackedTickets = mockDB.trackedTickets.filter(t => !(t.userId === userId && t.ticketId === ticketId));
            notifyDbChanges();
            return { success: true };
        },
        findOrCreatePlayer: async (playerName: string, playerPhone: string): Promise<User> => {
            let player = mockDB.users.find(u => u.phone === playerPhone && u.role === 'player');

            if (player) {
                if (player.name !== playerName && playerName && !playerName.toLowerCase().includes('guest')) {
                    const updatedPlayer = await dbService.updateDocument('users', player._id, { name: playerName });
                    
                    const index = mockDB.users.findIndex(u => u._id === updatedPlayer.id || u._id === updatedPlayer._id);
                    if (index !== -1) {
                        mockDB.users[index] = { ...updatedPlayer, _id: updatedPlayer.id || updatedPlayer._id };
                        notifyDbChanges();
                    }
                    return mockDB.users[index] || updatedPlayer; 
                }
                return player; 
            }

            const newPlayerPayload: Omit<User, '_id'> = {
                name: playerName,
                username: `player${Date.now()}`,
                phone: playerPhone,
                role: 'player',
                isBookingAllowed: true,
                isBlocked: false,
                photo: `https://i.pravatar.cc/150?u=${playerPhone}`
            };

            const createdPlayer = await dbService.addDocument('users', newPlayerPayload);

            if (createdPlayer) {
                const normalizedPlayer = { ...createdPlayer, _id: createdPlayer.id };
                mockDB.users.push(normalizedPlayer);
                notifyDbChanges();
                return normalizedPlayer;
            }

            throw new Error("Failed to create or find player.");
        },
    },
};
import { dbService } from './db';
import { Game, Ticket } from '../types';
import { where } from 'firebase/firestore';

export const gameService = {
  async startGame(gameId: string) {
    const countdownDuration = 10000;
    const preGameCountdownEndsAt = Date.now() + countdownDuration;
    await dbService.updateDocument('games', gameId, {
      status: 'ongoing',
      isAutoCalling: true,
      preGameCountdownEndsAt,
      announcements: [{ text: 'Game will start now, get ready everyone', timestamp: Date.now() }]
    });
  },

  async pauseGame(gameId: string) {
    const game = await dbService.getDocument('games', gameId) as Game;
    const remainingTime = game.cycleEndsAt ? game.cycleEndsAt - Date.now() : null;
    await dbService.updateDocument('games', gameId, { 
      isAutoCalling: false,
      remainingTimeOnPause: remainingTime
    });
  },

  async resumeGame(gameId: string) {
    const game = await dbService.getDocument('games', gameId) as Game;
    const newCycleEndsAt = game.remainingTimeOnPause ? Date.now() + game.remainingTimeOnPause : Date.now() + (game.callDelay || 5) * 1000;
    await dbService.updateDocument('games', gameId, { 
      isAutoCalling: true, 
      isPausedForAnnouncement: false,
      cycleEndsAt: newCycleEndsAt,
      cycleStartedAt: Date.now(),
      remainingTimeOnPause: null
    });
  },

  async callNumberManually(gameId: string, number: number) {
    const game = await dbService.getDocument('games', gameId) as Game;
    if (!game || (game.calledNumbers || []).includes(number)) return;
    const newQueue = [...(game.manualQueue || []), number];
    await dbService.updateDocument('games', gameId, { manualQueue: newQueue });
  },

  async endGame(gameId: string) {
    await dbService.updateDocument('games', gameId, { status: 'completed', isAutoCalling: false });
  },

  async updateGame(gameId: string, updatePayload: Partial<Game>) {
    await dbService.updateDocument('games', gameId, updatePayload);
  },

  async toggleManualQueueNumber(gameId: string, number: number) {
    const game = await dbService.getDocument('games', gameId) as Game & { id: string };
    if (!game) return;
    
    let newManualQueue = [...(game.manualQueue || [])];
    if (newManualQueue.includes(number)) {
      newManualQueue = newManualQueue.filter(n => n !== number);
    } else {
      newManualQueue.push(number);
    }
    await dbService.updateDocument('games', gameId, { manualQueue: newManualQueue });
  },

  async clearManualQueue(gameId: string) {
    await dbService.updateDocument('games', gameId, { manualQueue: [] });
  },

  async sendChatMessage(messageData: any) {
    await dbService.addDocument('chat_messages', messageData);
  },

  async sendAnnouncement(text: string) {
    await dbService.upsertDocument('settings', 'settings_id', { announcement: { text, id: Date.now() } });
  },

  async toggleAutoCall(gameId: string) {
    const game = await dbService.getDocument('games', gameId) as Game & { id: string };
    if (!game) return;
    await dbService.updateDocument('games', gameId, { isAutoCalling: !game.isAutoCalling });
  },

  async toggleBooking(gameId: string) {
    const game = await dbService.getDocument('games', gameId) as Game & { id: string };
    if (!game) return;
    await dbService.updateDocument('games', gameId, { isBookingOpen: !game.isBookingOpen });
  },

  async deleteGame(gameId: string) {
    await dbService.deleteDocument('games', gameId);
  },

  async unbookTicket(ticketId: string) {
    await dbService.updateDocument('tickets', ticketId, { status: 'available', player: null, bookedByAgent: null, commission: null });
  },

  async getClaims(gameId: string) {
    return await dbService.queryCollection('claims', [where('game', '==', gameId)]);
  },

  async approveClaim(claimId: string) {
    const claim = await dbService.getDocument('claims', claimId) as any;
    if (!claim) return { success: false };
    await dbService.updateDocument('claims', claimId, { status: 'approved' });
    return { success: true, player: { name: 'Player' }, prize: { name: claim.prizeName } };
  },

  async rejectClaim(claimId: string) {
    await dbService.updateDocument('claims', claimId, { status: 'rejected' });
  },

  async manualCallNumber(gameId: string, number: number) {
    const game = await dbService.getDocument('games', gameId) as Game & { id: string };
    if (!game) return;
    await dbService.updateDocument('games', gameId, { calledNumbers: [...(game.calledNumbers || []), number] });
  },

  async resetGame(gameId: string) {
    await dbService.updateDocument('games', gameId, { calledNumbers: [], status: 'upcoming', prizes: [], isAutoCalling: false });
  },

  async updateSettings(settings: any) {
    await dbService.upsertDocument('settings', 'settings_id', settings);
  },

  async getMyTickets(userId: string): Promise<Ticket[]> {
    return await dbService.queryCollection('tickets', [where('player', '==', userId)]) as unknown as Ticket[];
  },

  async getMyTrackedTickets(userId: string): Promise<string[]> {
    const tracked = await dbService.queryCollection('tracked_tickets', [where('userId', '==', userId)]);
    return tracked.map((t: any) => t.ticketId);
  },

  async addToMyTickets(data: { userId: string, ticketId: string }) {
    await dbService.addDocument('tracked_tickets', data);
  },

  async removeFromMyTickets(data: { userId: string, ticketId: string }) {
    const tracked = await dbService.queryCollection('tracked_tickets', [
      where('userId', '==', data.userId),
      where('ticketId', '==', data.ticketId)
    ]);
    for (const t of tracked) {
      await dbService.deleteDocument('tracked_tickets', t.id);
    }
  },

  async claimPrize(data: any) {
    await dbService.addDocument('claims', { ...data, status: 'pending', created_at: new Date().toISOString() });
    return { message: 'Claim submitted!' };
  }
};

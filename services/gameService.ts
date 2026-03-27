import { dbService } from './db';
import { Game, Ticket } from '../types';
import { where } from 'firebase/firestore';

export const gameService = {
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
    const settings = await dbService.getCollection('settings');
    if (settings.length > 0) {
      await dbService.updateDocument('settings', settings[0].id, { announcement: { text, id: Date.now() } });
    }
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
    const settingsList = await dbService.getCollection('settings');
    if (settingsList.length > 0) {
      await dbService.updateDocument('settings', settingsList[0].id, settings);
    }
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

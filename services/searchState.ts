import { Ticket } from '../types';

// Helper functions to interact with sessionStorage safely
const getAddedTickets = (): Ticket[] => {
    try {
        const item = sessionStorage.getItem('searchState_addedTickets');
        return item ? JSON.parse(item) : [];
    } catch (error) {
        console.error("Failed to parse added tickets from sessionStorage", error);
        return [];
    }
};

const setAddedTickets = (tickets: Ticket[]): void => {
    try {
        sessionStorage.setItem('searchState_addedTickets', JSON.stringify(tickets));
    } catch (error) {
        console.error("Failed to save added tickets to sessionStorage", error);
    }
};


/**
 * Global state for tickets added via the SearchTicket component.
 * This persists the list of added tickets across component unmounts and page reloads
 * for the duration of the session by using sessionStorage.
 */
export const searchState = {
  get addedTickets(): Ticket[] {
    return getAddedTickets();
  },
  set addedTickets(newTickets: Ticket[]) {
    setAddedTickets(newTickets);
  },
  clear: () => {
    sessionStorage.removeItem('searchState_addedTickets');
  }
};

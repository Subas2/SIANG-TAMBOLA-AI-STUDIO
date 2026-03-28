export interface User {
  _id: string;
  name: string;
  username: string;
  role: 'admin' | 'agent' | 'player';
  phone?: string;
  address?: string;
  email?: string;
  password?: string;
  photo?: string;
  isBookingAllowed?: boolean;
  isBlocked?: boolean;
  isVisibleToPlayers?: boolean;
}

export interface Theme {
  _id: string;
  name:string;
  gradient: string;
  textColor: string;
  cardTextColor: string;
  hue?: number;
}

export interface Prize {
  name: string;
  value: string | number;
  claimedBy: { name: string; ticketId: number; playerId: string; }[];
}

export interface ChatMessage {
    senderId: string;
    senderName: string;
    message: string;
    timestamp: number;
    senderAvatar?: string;
}

export interface Game {
  _id: string;
  title: string;
  place: string;
  subTitle: string;
  ticketLimit: number;
  ticketPrice: number;
  date: string;
  time: string;
  theme: string;
  fontFamily?: string;
  bannerStyle?: string;
  ticketTheme?: string;
  ticketBundleDesign?: 'default' | 'stack' | 'grid' | 'circular-fan' | 'waterfall' | 'angled-stack' | 'scattered' | 'book-view' | 'concertina-h' | 'single-file-h' | 'perspective' | 'arch' | 'offset-stack';
  description: string;
  backgroundImage?: string;
  ticketBackgroundImage?: string;
  useBannerBackgroundOnTickets?: boolean;
  ticketBackgroundSettings?: {
    dimOverlay: number; // 0-100
    blur: number; // 0-10px
  };
  ticketGenerationOptions?: TicketGenerationOptions;
  prizes: Prize[];
  status: 'upcoming' | 'ongoing' | 'completed';
  tickets: string[];
  calledNumbers: number[];
  isAutoCalling: boolean;
  callMode: 'auto' | 'manual' | 'mix';
  callDelay: number;
  useRhymes: boolean;
  manualQueue: number[];
  cycleEndsAt: number | null;
  cycleStartedAt?: number | null;
  isBookingOpen: boolean;
  agentCommission: number;
  remainingTimeOnPause?: number | null;
  isPausedForAnnouncement?: boolean;
  preGameCountdownEndsAt?: number | null;
  autoVerifyClaims?: boolean;
  chatMessages: ChatMessage[];
  announcements?: { text: string; timestamp: number }[];
  website?: string;
}

export interface Ticket {
  _id: string;
  game: string;
  serialNumber: number;
  numbers: (number | null)[][];
  status: 'available' | 'booked';
  player: string | null;
  bookedByAgent: string | null;
  commission: number | null;
  sheetId?: string;
}

export interface Claim {
  _id: string;
  player: string;
  game: string;
  ticket: string;
  prizeName: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface TrackedTicket {
    userId: string;
    ticketId: string;
}

export interface HistoryEntry {
    action: 'REQUESTED' | 'APPROVED' | 'REJECTED';
    by: 'PLAYER' | 'AGENT' | 'ADMIN';
    timestamp: number;
    reason?: string;
}

export interface TicketRequest {
    _id: string;
    playerId: string;
    playerName: string;
    playerPhone: string;
    ticketIds: string[];
    agentId: string;
    status: 'pending' | 'approved' | 'rejected' | 'rejected_by_admin';
    rejectionReason?: string;
    history: HistoryEntry[];
    created_at?: string;
}

export interface AgentRequest {
    _id: string;
    playerId: string;
    name: string;
    newUsername: string;
    password: string;
    phone: string;
    address: string;
    email: string;
    photo: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at?: string;
}

export interface Payment {
    _id: string;
    playerId: string;
    playerName: string;
    gameId: string;
    agentId: string;
    ticketIds: string[];
    amount: number;
    status: 'pending_agent_confirmation' | 'paid_by_agent' | 'approved' | 'rejected';
    created_at: string;
}

export interface Settings {
    id: string;
    callMode: 'auto' | 'manual' | 'mix';
    callDelay: number;
    voiceURI: string | null;
    callPitch?: number;
    callRate?: number;
    useRhymes: boolean;
    whatsappLink?: string;
    facebookLink?: string;
    youtubeLink?: string;
    instagramLink?: string;
    websiteLink?: string;
    autoCloseBookingOnGameStart?: boolean;
    autoVerifyClaims?: boolean;
    hostName?: string;
    contactNumber?: string;
    upiId?: string;
    universalLink?: string;
    adminLink?: string;
    agentLink?: string;
    playerLink?: string;
    isChatEnabled?: boolean;
    isPlayerTicketRequestEnabled?: boolean;
    isAgentBookingEnabled?: boolean;
    announcement?: { text: string; id: number } | null;
    activeThemeId?: string | null;
    customThemeHue?: number | null;
    loginBackgroundImage?: string;
}

/**
 * Options for customizing the generation of a Tambola ticket.
 */
export interface TicketGenerationOptions {
    /**
     * Number of filled cells per row. Must be between 3 and 7 for a valid 3x9 ticket.
     * Defaults to 5.
     */
    numbersPerRow?: number;
}
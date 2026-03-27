-- SQL Schema for Tambola Game
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS agent_requests CASCADE;
DROP TABLE IF EXISTS ticket_requests CASCADE;
DROP TABLE IF EXISTS tracked_tickets CASCADE;
DROP TABLE IF EXISTS claims CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS themes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('admin', 'agent', 'player')) NOT NULL,
    phone TEXT,
    address TEXT,
    email TEXT UNIQUE,
    password TEXT,
    photo TEXT,
    "isBookingAllowed" BOOLEAN DEFAULT true,
    "isBlocked" BOOLEAN DEFAULT false,
    "isVisibleToPlayers" BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Themes Table
CREATE TABLE themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    gradient TEXT,
    "textColor" TEXT,
    "cardTextColor" TEXT,
    hue INTEGER
);

-- Games Table
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    place TEXT,
    "subTitle" TEXT,
    "ticketLimit" INTEGER,
    "ticketPrice" NUMERIC,
    date TEXT,
    time TEXT,
    theme TEXT,
    "fontFamily" TEXT,
    "bannerStyle" TEXT,
    "ticketTheme" TEXT,
    "ticketBundleDesign" TEXT,
    description TEXT,
    "backgroundImage" TEXT,
    "ticketBackgroundImage" TEXT,
    "useBannerBackgroundOnTickets" BOOLEAN DEFAULT false,
    "ticketBackgroundSettings" JSONB,
    "ticketGenerationOptions" JSONB,
    prizes JSONB,
    status TEXT CHECK (status IN ('upcoming', 'ongoing', 'completed')) NOT NULL,
    tickets JSONB,
    "calledNumbers" JSONB,
    "isAutoCalling" BOOLEAN DEFAULT false,
    "callMode" TEXT CHECK ("callMode" IN ('auto', 'mix')),
    "manualQueue" JSONB,
    "cycleEndsAt" TIMESTAMP WITH TIME ZONE,
    "cycleStartedAt" TIMESTAMP WITH TIME ZONE,
    "isBookingOpen" BOOLEAN DEFAULT false,
    "agentCommission" NUMERIC,
    "remainingTimeOnPause" INTEGER,
    "isPausedForAnnouncement" BOOLEAN DEFAULT false,
    "autoVerifyClaims" BOOLEAN DEFAULT false,
    "chatMessages" JSONB,
    announcements JSONB,
    website TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tickets Table
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game UUID,
    "serialNumber" INTEGER NOT NULL,
    numbers JSONB NOT NULL,
    status TEXT CHECK (status IN ('available', 'booked')) NOT NULL,
    player UUID,
    "bookedByAgent" UUID,
    commission NUMERIC,
    "sheetId" TEXT
);

-- Claims Table
CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player UUID,
    game UUID,
    ticket UUID,
    "prizeName" TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tracked Tickets Table
CREATE TABLE tracked_tickets (
    "userId" UUID,
    "ticketId" UUID,
    PRIMARY KEY ("userId", "ticketId")
);

-- Ticket Requests Table
CREATE TABLE ticket_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "playerId" UUID,
    "playerName" TEXT NOT NULL,
    "playerPhone" TEXT NOT NULL,
    "ticketIds" JSONB NOT NULL,
    "agentId" UUID,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL,
    "rejectionReason" TEXT,
    history JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Agent Requests Table
CREATE TABLE agent_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "playerId" UUID,
    name TEXT NOT NULL,
    "newUsername" TEXT NOT NULL,
    password TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    email TEXT NOT NULL,
    photo TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "playerId" UUID,
    "playerName" TEXT NOT NULL,
    "gameId" UUID,
    "agentId" UUID,
    "ticketIds" JSONB NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT CHECK (status IN ('pending_agent_confirmation', 'paid_by_agent', 'approved', 'rejected')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Settings Table
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "callMode" TEXT CHECK ("callMode" IN ('auto', 'mix')),
    "callDelay" INTEGER,
    "voiceURI" TEXT,
    "callPitch" INTEGER,
    "callRate" INTEGER,
    "useRhymes" BOOLEAN DEFAULT false,
    "whatsappLink" TEXT,
    "facebookLink" TEXT,
    "youtubeLink" TEXT,
    "instagramLink" TEXT,
    "websiteLink" TEXT,
    "autoCloseBookingOnGameStart" BOOLEAN DEFAULT false,
    "autoVerifyClaims" BOOLEAN DEFAULT false,
    "hostName" TEXT,
    "contactNumber" TEXT,
    "upiId" TEXT,
    "universalLink" TEXT,
    "adminLink" TEXT,
    "agentLink" TEXT,
    "playerLink" TEXT,
    "isChatEnabled" BOOLEAN DEFAULT true,
    "isPlayerTicketRequestEnabled" BOOLEAN DEFAULT true,
    "isAgentBookingEnabled" BOOLEAN DEFAULT true,
    announcement JSONB,
    "activeThemeId" UUID,
    "customThemeHue" INTEGER,
    "loginBackgroundImage" TEXT
);

-- Add Foreign Key Constraints
ALTER TABLE tickets ADD CONSTRAINT fk_tickets_game FOREIGN KEY (game) REFERENCES games(id);
ALTER TABLE tickets ADD CONSTRAINT fk_tickets_player FOREIGN KEY (player) REFERENCES users(id);
ALTER TABLE tickets ADD CONSTRAINT fk_tickets_agent FOREIGN KEY ("bookedByAgent") REFERENCES users(id);

ALTER TABLE claims ADD CONSTRAINT fk_claims_player FOREIGN KEY (player) REFERENCES users(id);
ALTER TABLE claims ADD CONSTRAINT fk_claims_game FOREIGN KEY (game) REFERENCES games(id);
ALTER TABLE claims ADD CONSTRAINT fk_claims_ticket FOREIGN KEY (ticket) REFERENCES tickets(id);

ALTER TABLE tracked_tickets ADD CONSTRAINT fk_tracked_user FOREIGN KEY ("userId") REFERENCES users(id);
ALTER TABLE tracked_tickets ADD CONSTRAINT fk_tracked_ticket FOREIGN KEY ("ticketId") REFERENCES tickets(id);

ALTER TABLE ticket_requests ADD CONSTRAINT fk_req_player FOREIGN KEY ("playerId") REFERENCES users(id);
ALTER TABLE ticket_requests ADD CONSTRAINT fk_req_agent FOREIGN KEY ("agentId") REFERENCES users(id);

ALTER TABLE agent_requests ADD CONSTRAINT fk_agent_req_player FOREIGN KEY ("playerId") REFERENCES users(id);

ALTER TABLE payments ADD CONSTRAINT fk_pay_player FOREIGN KEY ("playerId") REFERENCES users(id);
ALTER TABLE payments ADD CONSTRAINT fk_pay_game FOREIGN KEY ("gameId") REFERENCES games(id);
ALTER TABLE payments ADD CONSTRAINT fk_pay_agent FOREIGN KEY ("agentId") REFERENCES users(id);

ALTER TABLE settings ADD CONSTRAINT fk_settings_theme FOREIGN KEY ("activeThemeId") REFERENCES themes(id);

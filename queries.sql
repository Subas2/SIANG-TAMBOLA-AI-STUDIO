-- Common DML Queries for Tambola Game

-- 1. Fetch all available tickets for a game
-- Replace '00000000-0000-0000-0000-000000000000' with a valid UUID
SELECT * FROM tickets WHERE game_id = '00000000-0000-0000-0000-000000000000' AND status = 'available';

-- 2. Book a ticket (Update ticket status and assign player/agent)
UPDATE tickets 
SET status = 'booked', 
    player_id = '00000000-0000-0000-0000-000000000000', 
    booked_by_agent_id = '00000000-0000-0000-0000-000000000000' 
WHERE id = '00000000-0000-0000-0000-000000000000';

-- 3. Request tickets (Insert into ticket_requests)
INSERT INTO ticket_requests (player_id, player_name, player_phone, ticket_ids, agent_id, status, history)
VALUES ('00000000-0000-0000-0000-000000000000', 'Player Name', '1234567890', '["00000000-0000-0000-0000-000000000000", "00000000-0000-0000-0000-000000000000"]', '00000000-0000-0000-0000-000000000000', 'pending', '[{"action": "REQUESTED", "by": "PLAYER", "timestamp": 1711234567890}]');

-- 4. Track a ticket
INSERT INTO tracked_tickets (user_id, ticket_id)
VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (user_id, ticket_id) DO NOTHING;

-- 5. Claim a prize
INSERT INTO claims (player_id, game_id, ticket_id, prize_name, status)
VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'First House', 'pending');

-- 6. Update game status
UPDATE games SET status = 'ongoing' WHERE id = '00000000-0000-0000-0000-000000000000';

-- 7. Update settings
UPDATE settings SET call_mode = 'auto', call_delay = 10 WHERE id = '00000000-0000-0000-0000-000000000000';

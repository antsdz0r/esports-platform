-- Double elimination support for the GAMES (matches) table.
-- Adds bracket classification and explicit progression links so winners/losers
-- can be routed to the correct next match (upper bracket, lower bracket, grand final).

ALTER TABLE GAMES
  ADD COLUMN bracket ENUM('upper','lower','grand') NOT NULL DEFAULT 'upper' AFTER round,
  ADD COLUMN winner_to_match INT NULL AFTER scheduled_time,
  ADD COLUMN winner_to_slot TINYINT NULL AFTER winner_to_match,
  ADD COLUMN loser_to_match INT NULL AFTER winner_to_slot,
  ADD COLUMN loser_to_slot TINYINT NULL AFTER loser_to_match;

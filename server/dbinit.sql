CREATE DATABASE IF NOT EXISTS project_db;
USE project_db;

DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS entities;

CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    gamer_tag VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    passwordHash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'player') NOT NULL DEFAULT 'player',
    isActive TINYINT(1) DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    full_name VARCHAR(100) NOT NULL,
    profile_picture TEXT
);

CREATE TABLE GAME_CATALOG(
game_id INT AUTO_INCREMENT PRIMARY KEY,
name VARCHAR(100) NOT NULL,
tag VARCHAR(255) NOT NULL,
genre VARCHAR(50) NOT NULL,
max_players INT NOT NULL,
image_url VARCHAR(500) NULL
);

CREATE TABLE TEAMS(
    team_id INT AUTO_INCREMENT PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL,
    tag VARCHAR(10) NOT NULL UNIQUE,
    logo VARCHAR(1000) NOT NULL DEFAULT '',
    description TEXT
);

CREATE TABLE TOURNAMENTS(
    tournamentid INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    format ENUM('single_elim', 'double_elim', 'round_robin') NOT NULL,
    max_teams INT NOT NULL,
    registration_deadline DATETIME NOT NULL,
    prize_pool DECIMAL(10, 2) DEFAULT 0.00,
    status ENUM('open', 'locked', 'ongoing', 'completed') DEFAULT 'open',
    image_url VARCHAR(512) NULL,
    FOREIGN KEY (game_id) REFERENCES GAME_CATALOG(game_id) ON DELETE CASCADE
);

CREATE TABLE GAMES(
    game_id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    team1_id INT NULL,
    team2_id INT NULL,
    round INT NOT NULL,
    bracket ENUM('upper','lower','grand') NOT NULL DEFAULT 'upper',
    score VARCHAR(10) DEFAULT '0:0',
    status ENUM('scheduled', 'ongoing', 'completed') DEFAULT 'scheduled',
    winner_team_id INT NULL,
    scheduled_time DATETIME NULL,
    winner_to_match INT NULL,
    winner_to_slot TINYINT NULL,
    loser_to_match INT NULL,
    loser_to_slot TINYINT NULL,
    FOREIGN KEY (tournament_id) REFERENCES TOURNAMENTS(tournamentid) ON DELETE CASCADE,
    FOREIGN KEY (team1_id) REFERENCES TEAMS(team_id),
    FOREIGN KEY (team2_id) REFERENCES TEAMS(team_id),
    FOREIGN KEY (winner_team_id) REFERENCES TEAMS(team_id)
);
--relacija 1 :
CREATE TABLE TEAM_MEMBERS(
    team_id INT NOT NULL,
    player_id INT unsigned NOT NULL,
    role ENUM('captain', 'member') NOT NULL DEFAULT 'member',
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, player_id),
    FOREIGN KEY (team_id) REFERENCES TEAMS(team_id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE
);
--relacija 2 :
CREATE TABLE TOURNAMENT_REGISTRATIONS(
    tournament_id INT NOT NULL,
    team_id INT NOT NULL,
    registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending','confirmed','disqualified') DEFAULT 'pending',
    seed int NULL,
    PRIMARY KEY (team_id, tournament_id),
    FOREIGN KEY (tournament_id) REFERENCES TOURNAMENTS(tournamentid) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES TEAMS(team_id) ON DELETE CASCADE
);
--relacija 3 :
CREATE TABLE MATCH_PLAYERS(
    game_id int NOT NULL,
    player_id int unsigned NOT NULL,
    team_id int NOT NULL,
    performance_notes TEXT,
    PRIMARY KEY (game_id, player_id),
    FOREIGN KEY (game_id) REFERENCES GAMES(game_id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES TEAMS(team_id) ON DELETE CASCADE
);
--relacija 4 :
CREATE TABLE USER_WATCHLIST(
    user_id INT unsigned NOT NULL,
    tournament_id INT NOT NULL,
    added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, tournament_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tournament_id) REFERENCES TOURNAMENTS(tournamentid) ON DELETE CASCADE
);
--relacija 5 :
CREATE TABLE TEAM_INVITES (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  team_id      INT NOT NULL,
  inviter_id   INT UNSIGNED NOT NULL,
  invitee_id   INT UNSIGNED NOT NULL,
  status       ENUM('pending', 'accepted', 'declined') NOT NULL DEFAULT 'pending',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id)    REFERENCES TEAMS(team_id)  ON DELETE CASCADE,
  FOREIGN KEY (inviter_id) REFERENCES users(id)       ON DELETE CASCADE,
  FOREIGN KEY (invitee_id) REFERENCES users(id)       ON DELETE CASCADE
);

CREATE TABLE AUDIT_LOGS (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NULL,
  action      VARCHAR(100) NOT NULL,
  entity      VARCHAR(50)  NULL,
  entity_id   INT          NULL,
  description TEXT         NULL,
  ip_address  VARCHAR(45)  NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

--relacija 6 :
-- Vise stream izvora po mecu (GAMES). Cuvamo samo referencu (kanal / video id)
-- iz koje klijent gradi ZVANICNI embed plejer platforme. Ne skladistimo video.
CREATE TABLE MATCH_STREAMS(
    stream_id  INT AUTO_INCREMENT PRIMARY KEY,
    game_id    INT NOT NULL,
    platform   ENUM('twitch', 'youtube', 'kick') NOT NULL,
    channel    VARCHAR(200) NOT NULL,
    type       ENUM('official', 'cocast', 'caster') NOT NULL DEFAULT 'official',
    language   VARCHAR(10)  NOT NULL DEFAULT 'en',
    title      VARCHAR(150) NULL,
    is_active  TINYINT(1)   NOT NULL DEFAULT 1,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES GAMES(game_id) ON DELETE CASCADE
);

-- ── PRO (external) module ────────────────────────────────────
-- Izolovane tabele za pro turnire povucene sa eksternog izvora (PandaScore).
-- Namerno NE koriste postojece TOURNAMENTS/GAMES/TEAMS da jezgro ostane netaknuto.
CREATE TABLE PRO_MATCHES(
    id              INT AUTO_INCREMENT PRIMARY KEY,
    external_id     VARCHAR(60)  NOT NULL UNIQUE,
    game_slug       VARCHAR(40)  NOT NULL,
    league_name     VARCHAR(150) NULL,
    serie_name      VARCHAR(150) NULL,
    tournament_name VARCHAR(150) NULL,
    stage           VARCHAR(150) NULL,
    team1_name      VARCHAR(120) NULL,
    team1_logo      VARCHAR(500) NULL,
    team2_name      VARCHAR(120) NULL,
    team2_logo      VARCHAR(500) NULL,
    team1_score     INT NOT NULL DEFAULT 0,
    team2_score     INT NOT NULL DEFAULT 0,
    best_of         INT NULL,
    status          ENUM('upcoming', 'live', 'finished', 'canceled') NOT NULL DEFAULT 'upcoming',
    scheduled_at    DATETIME NULL,
    tournament_external_id VARCHAR(60) NULL,
    round           INT NULL,
    position        INT NULL,
    synced_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pro_matches_status (status),
    INDEX idx_pro_matches_scheduled (scheduled_at),
    INDEX idx_pro_matches_tournament (tournament_external_id)
);

CREATE TABLE PRO_STREAMS(
    id           INT AUTO_INCREMENT PRIMARY KEY,
    pro_match_id INT NOT NULL,
    platform     ENUM('twitch', 'youtube', 'kick') NOT NULL,
    channel      VARCHAR(200) NOT NULL,
    language     VARCHAR(10)  NOT NULL DEFAULT 'en',
    is_official  TINYINT(1)   NOT NULL DEFAULT 1,
    source       VARCHAR(20)  NOT NULL DEFAULT 'pandascore',
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pro_match_id) REFERENCES PRO_MATCHES(id) ON DELETE CASCADE
);

-- ── PRO struktura turnira (League -> Serie -> Tournament) sa PandaScore ──
CREATE TABLE PRO_LEAGUES(
    id          INT AUTO_INCREMENT PRIMARY KEY,
    external_id VARCHAR(60)  NOT NULL UNIQUE,
    game_slug   VARCHAR(40)  NOT NULL,
    name        VARCHAR(150) NOT NULL,
    slug        VARCHAR(150) NULL,
    image_url   VARCHAR(500) NULL,
    synced_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pro_leagues_game (game_slug)
);

CREATE TABLE PRO_SERIES(
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    external_id        VARCHAR(60)  NOT NULL UNIQUE,
    league_external_id VARCHAR(60)  NULL,
    game_slug          VARCHAR(40)  NOT NULL,
    full_name          VARCHAR(200) NOT NULL,
    name               VARCHAR(150) NULL,
    year               INT NULL,
    begin_at           DATETIME NULL,
    end_at             DATETIME NULL,
    synced_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pro_series_league (league_external_id),
    INDEX idx_pro_series_game (game_slug)
);

CREATE TABLE PRO_TOURNAMENTS(
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    external_id        VARCHAR(60)  NOT NULL UNIQUE,
    serie_external_id  VARCHAR(60)  NULL,
    league_external_id VARCHAR(60)  NULL,
    game_slug          VARCHAR(40)  NOT NULL,
    name               VARCHAR(150) NOT NULL,
    slug               VARCHAR(200) NULL,
    tier               VARCHAR(10)  NULL,
    has_bracket        TINYINT(1)   NOT NULL DEFAULT 0,
    prizepool          VARCHAR(100) NULL,
    status             ENUM('upcoming', 'running', 'finished') NOT NULL DEFAULT 'upcoming',
    begin_at           DATETIME NULL,
    end_at             DATETIME NULL,
    synced_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pro_tour_serie (serie_external_id),
    INDEX idx_pro_tour_league (league_external_id),
    INDEX idx_pro_tour_game (game_slug),
    INDEX idx_pro_tour_status (status)
);

CREATE TABLE PRO_STANDINGS(
    id                     INT AUTO_INCREMENT PRIMARY KEY,
    tournament_external_id VARCHAR(60)  NOT NULL,
    rank_pos               INT NULL,
    team_name              VARCHAR(120) NULL,
    team_logo              VARCHAR(500) NULL,
    wins                   INT NOT NULL DEFAULT 0,
    losses                 INT NOT NULL DEFAULT 0,
    ties                   INT NOT NULL DEFAULT 0,
    synced_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pro_standings_tour (tournament_external_id)
);




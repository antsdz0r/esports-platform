USE project_db;

CREATE TABLE MATCH_STREAMS (
  stream_id   INT AUTO_INCREMENT PRIMARY KEY,
  game_id     INT NOT NULL,
  platform    ENUM('twitch','youtube','kick') NOT NULL,
  channel     VARCHAR(200) NOT NULL,
  type        ENUM('official','cocast','caster') NOT NULL DEFAULT 'official',
  language    VARCHAR(10)  NOT NULL DEFAULT 'en',
  title       VARCHAR(150) NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES GAMES(game_id) ON DELETE CASCADE
);

CREATE TABLE PRO_MATCHES (
  id INT AUTO_INCREMENT PRIMARY KEY,
  external_id VARCHAR(60) NOT NULL UNIQUE,
  game_slug VARCHAR(40) NOT NULL,
  league_name VARCHAR(150) NULL, serie_name VARCHAR(150) NULL,
  tournament_name VARCHAR(150) NULL, stage VARCHAR(150) NULL,
  team1_name VARCHAR(120) NULL, team1_logo VARCHAR(500) NULL,
  team2_name VARCHAR(120) NULL, team2_logo VARCHAR(500) NULL,
  team1_score INT NOT NULL DEFAULT 0, team2_score INT NOT NULL DEFAULT 0,
  best_of INT NULL,
  status ENUM('upcoming','live','finished','canceled') NOT NULL DEFAULT 'upcoming',
  scheduled_at DATETIME NULL,
  synced_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pro_matches_status (status),
  INDEX idx_pro_matches_scheduled (scheduled_at)
);

CREATE TABLE PRO_STREAMS (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pro_match_id INT NOT NULL,
  platform ENUM('twitch','youtube','kick') NOT NULL,
  channel VARCHAR(200) NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  is_official TINYINT(1) NOT NULL DEFAULT 1,
  source VARCHAR(20) NOT NULL DEFAULT 'pandascore',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pro_match_id) REFERENCES PRO_MATCHES(id) ON DELETE CASCADE
);
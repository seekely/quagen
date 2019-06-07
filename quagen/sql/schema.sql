CREATE TABLE IF NOT EXISTS game (
    game_id             TEXT        NOT NULL,
    data                TEXT        NOT NULL,
    time_created        INTEGER     NOT NULL,
    time_completed      INTEGER     DEFAULT NULL,
    time_started        INTEGER     DEFAULT NULL,
    time_updated        INTEGER     NOT NULL,

    PRIMARY KEY(game_id)
);

CREATE TABLE IF NOT EXISTS game_event (
    event_id            TEXT        NOT NULL,
    game_id             TEXT        NOT NULL,
    data                TEXT        NOT NULL,
    processed           INTEGER     DEFAULT 0,
    time_created        INTEGER     NOT NULL,

    PRIMARY KEY(event_id),
    FOREIGN KEY(game_id) REFERENCES game(game_id)
);

CREATE INDEX idx_processed ON game_event(processed);

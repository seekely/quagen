CREATE TABLE IF NOT EXISTS game (
    game_id             TEXT        NOT NULL,
    data                TEXT        NOT NULL,
    time_created        INTEGER     NOT NULL,
    time_completed      INTEGER     DEFAULT NULL,
    time_started        INTEGER     DEFAULT NULL,

    PRIMARY KEY(game_id)
);

CREATE TABLE IF NOT EXISTS game (
    game_id             TEXT        NOT NULL,
    data                TEXT        NOT NULL,
    time_created        INTEGER     NOT NULL,
    time_completed      INTEGER     DEFAULT NULL,
    time_started        INTEGER     DEFAULT NULL,
    time_updated        INTEGER     NOT NULL,

    PRIMARY KEY(game_id)
);

CREATE TABLE IF NOT EXISTS game_move (
    event_id            TEXT        NOT NULL,
    game_id             TEXT        NOT NULL,
    player_id           TEXT        NOT NULL,
    turn                SMALLINT    NOT NULL,
    x                   SMALLINT    NOT NULL,
    y                   SMALLINT    NOT NULL,
    time_created        INTEGER     NOT NULL,

    PRIMARY KEY(event_id),
    UNIQUE(game_id, player_id, turn),
    FOREIGN KEY(game_id) REFERENCES game(game_id)
);


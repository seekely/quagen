CREATE TABLE IF NOT EXISTS game (
    game_id             TEXT        NOT NULL,
    board               TEXT        DEFAULT NULL,
    dimension_x         INTEGER     DEFAULT 20 NOT NULL,
    dimension_y         INTEGER     DEFAULT 20 NOT NULL,
    player_count        INTEGER     DEFAULT 2 NOT NULL,              
    turn_number         INTEGER     DEFAULT 0 NOT NULL,
    time_created        INTEGER     NOT NULL,
    time_completed      INTEGER     DEFAULT NULL,
    time_started        INTEGER     DEFAULT NULL,

    PRIMARY KEY(game_id)
);

CREATE TABLE IF NOT EXISTS game_player (
    game_id             TEXT        NOT NULL,
    player_id           TEXT        NOT NULL,
    player_color        INTEGER     NOT NULL,
    PRIMARY KEY(game_id, player_id)
);

CREATE TABLE IF NOT EXISTS game_move (
    game_id             TEXT        NOT NULL,
    player_id           TEXT        NOT NULL,
    turn_number         INTEGER     NOT NULL,
    spot                INTEGER     NOT NULL,
    time_created        INTEGER     DEFAULT 0 NOT NULL,

    PRIMARY KEY(game_id, player_id, turn_number)
);

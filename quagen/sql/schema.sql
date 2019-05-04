CREATE TABLE IF NOT EXISTS game (
    game_id             TEXT        NOT NULL,
    board               TEXT        DEFAULT NULL,
    dimension_x         INTEGER     DEFAULT 20 NOT NULL,
    dimension_y         INTEGER     DEFAULT 20 NOT NULL,
    player_count        INTEGER     DEFAULT 2 NOT NULL,              
    time_created        INTEGER     NOT NULL,
    time_completed      INTEGER     DEFAULT NULL,
    time_started        INTEGER     DEFAULT NULL,
    turn_number         INTEGER     DEFAULT 0 NOT NULL,

    PRIMARY KEY(game_id)
);

CREATE TABLE IF NOT EXISTS CREATE TABLE game_player (
    game_id             INTEGER     NOT NULL,
    player_id           INTEGER     NOT NULL,

    PRIMARY KEY(game_id, player_id)
);

CREATE TABLE IF NOT EXISTS CREATE TABLE game_turn (
    game_id             INTEGER     NOT NULL,
    player_id           INTEGER     NOT NULL,
    turn_number         INTEGER     NOT NULL,
    move                TEXT        NOT NULL,
    time_created        INTEGER     DEFAULT 0 NOT NULL,

    PRIMARY KEY(game_id, player_id, turn)
);

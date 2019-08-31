'use strict';

export function createGame(playerCount, aiCount, aiStrength) {

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "player_count": playerCount,
        "ai_count": aiCount,
        "ai_strength": aiStrength,
      })
    };

    fetch(`/api/v1/game/new`, options)
      .then((response) => {
        if (200 == response.status) {
          return response.json();
        } else {
          throw response.statusText;
        }
      })
      .then((data) => {
        const gameId = data['game']['game_id'];
        window.location.href = `/game/${ gameId }`;
      }) 
      .catch((error) => {
        return;
      });

}

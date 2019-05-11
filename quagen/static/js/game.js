var projected = false;

function grabGame(gameId) {

  if (projected) {
    return;
  }

  var xhr = new XMLHttpRequest();
  xhr.responseType = 'json';
  xhr.open("GET", "/api/v1/game/" + gameId, true);
  xhr.onload = function (e) {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        const game = xhr.response['game'];
        updateBoard(game['board'], game['settings']);
        updateGame(game);
      } else {
        console.error(xhr.statusText);
      }
    }
  };
  xhr.onerror = function (e) {
    console.error(xhr.statusText);
  };
  xhr.send(null);

}

function grabProjected(gameId) {

  var xhr = new XMLHttpRequest();
  xhr.responseType = 'json';
  xhr.open("GET", "/api/v1/game/" + gameId + "/projected", true);
  xhr.onload = function (e) {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        const game = xhr.response['game'];
        updateBoard(game['board'], game['settings']);
      } else {
        console.error(xhr.statusText);
      }
    }
  };
  xhr.onerror = function (e) {
    console.error(xhr.statusText);
  };
  xhr.send(null);

}

function updateGame(game) {
  
  for (var i = 0; i < game['scores'].length; i++) {
    const titles = ['controlled', 'pressuring', 'projected'];
    
    for (let title of titles) {
      const score = document.getElementById('player-' + title + '-' + i);
      score.innerHTML = game['scores'][i][title];
    }
  }

}

function updateBoard(board, settings) {

  for (let x = 0; x < board.length; x++) {
    for (let y = 0; y < board[x].length; y++) { 

      const spot = document.getElementById('spot-' + x + '-' + y);

      const maxPower = settings['power'];

      const curColor = parseInt(spot.getAttribute('data-color'));
      const curPower = parseInt(spot.getAttribute('data-power'));
      const newColor = board[x][y]['color']
      const newPower = board[x][y]['power'];

      if (curColor != newColor) {
        spot.classList.remove('player-color-' + curColor);
        spot.classList.add('player-color-' + newColor);
      }

      if (maxPower == newPower) {
        spot.disabled = true;
        spot.style.opacity = 1
      } else if (0 <= newColor) {
        spot.disabled = false;
        spot.style.opacity = (.60 / maxPower) * newPower;
      } else {
        spot.disabled = false;
        spot.style.opacity = 1
      }

      spot.setAttribute('data-color', newColor);
      spot.setAttribute('data-power', newPower);

    }
  }
}


document.addEventListener('DOMContentLoaded', function() {

  const board = document.getElementById('board');
  const gameId = board.getAttribute('data-game-id');
  const buttons = document.getElementsByClassName('button');

  for (let button of buttons) {

    button.addEventListener('mouseup', () => {
      const spotX = button.getAttribute('data-x');
      const spotY = button.getAttribute('data-y');

      var xhr = new XMLHttpRequest();
      xhr.open("GET", "/api/v1/game/" + gameId + "/move/" + spotX + "/" + spotY, true);
      xhr.onload = function (e) {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            console.log(xhr.responseText);
          } else {
            console.error(xhr.statusText);
          }
        }
      };
      xhr.onerror = function (e) {
        console.error(xhr.statusText);
      };
      xhr.send(null);

    });

  }

  grabGame(gameId);

  setInterval(

    () => {
      grabGame(gameId);
    }

    , 5000);


  const optionProjected = document.getElementById('option-projected');
  optionProjected.addEventListener('mouseup', () => {

    if (optionProjected.checked) {
      projected = false;
      grabGame(gameId);
    } else {
      projected = true;
      grabProjected(gameId);
    }

  });

});


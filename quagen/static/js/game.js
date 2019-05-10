function grabGame(gameId) {

  var xhr = new XMLHttpRequest();
  xhr.responseType = 'json';
  xhr.open("GET", "/api/v1/game/" + gameId, true);
  xhr.onload = function (e) {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        const game = xhr.response['game'];
        updateBoard(game['board']);
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

function updateGame(game) {
  
  for (var i = 0; i < game['scores'].length; i++) {
    const titles = ['controlled', 'pressuring', 'projected'];
    
    for (let title of titles) {
      const score = document.getElementById('player-' + title + '-' + i);
      score.innerHTML = game['scores'][i][title];
    }
  }

}

function updateBoard(board) {

  for (let x = 0; x < board.length; x++) {
    for (let y = 0; y < board[x].length; y++) { 

      const spot = document.getElementById('spot-' + x + '-' + y);
      const color = board[x][y]['color']
      const power = board[x][y]['power'];
      const trans = [.10, .30, .50, 1];
      if (1 == color) {
        spot.classList.remove('black');
        spot.classList.remove('blue');
        spot.classList.add('red');
        spot.style.opacity = trans[power - 1];
      } else if (2 == color) {
        spot.classList.remove('black');
        spot.classList.remove('red');
        spot.classList.add('blue');
        spot.style.opacity = trans[power - 1];
      } else if (0 == color) {
        spot.classList.remove('blue');
        spot.classList.remove('red');
        spot.classList.add('black');
        spot.style.opacity = trans[power - 1];
      }

      if (4 == power) {
        spot.disabled = true;
      }
    }
  }
}


document.addEventListener('DOMContentLoaded', function() {

  const board = document.getElementById('board');
  const gameId = board.getAttribute('data-gameId');
  const buttons = document.getElementsByClassName('button');

  for (let button of buttons) {

    button.addEventListener('mouseup', () => {
      const spot_x = button.getAttribute('data-spotX');
      const spot_y = button.getAttribute('data-spotY');

      var xhr = new XMLHttpRequest();
      xhr.open("GET", "/api/v1/game/" + gameId + "/move/" + spot_x + "/" + spot_y, true);
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



});


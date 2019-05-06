
function updateBoard(board) {
  console.log('BOARD STATE ' + board);

  for (var i = 0; i < board.length; i += 2) {
    const spotId = i / 2;
    const spot = document.getElementById('spot' + spotId);
    const level = parseInt(board.charAt(i + 1));
    if ('1' == board.charAt(i)) {
      spot.classList.add('blue');
      spot.classList.remove('red');
      spot.style.opacity = level * .25;
    } else if ('2' == board.charAt(i)) {
      spot.classList.add('red');
      spot.classList.remove('blue');
      spot.style.opacity = level * .25;
    } else if ('9' == board.charAt(i)) {
      spot.classList.add('black');
    }
  }
}


document.addEventListener('DOMContentLoaded', function() {

  const game = document.getElementById('board');
  const gameId = game.getAttribute('data-game');
  const board = game.getAttribute('data-board');
  const buttons = document.getElementsByClassName('button');

  updateBoard(board);

  for (let button of buttons) {

    button.addEventListener('mouseup', () => {
      const spot = button.getAttribute('data-spot');

      var xhr = new XMLHttpRequest();
      xhr.open("GET", "/api/v1/game/" + gameId + "/move/" + spot, true);
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


  setInterval(

    () => {

      var xhr = new XMLHttpRequest();
      xhr.responseType = 'json';
      xhr.open("GET", "/api/v1/game/" + gameId, true);
      xhr.onload = function (e) {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            const game = xhr.response['game'];
            updateBoard(game['board']);
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

    , 5000);



});


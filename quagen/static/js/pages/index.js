'use strict';

export function init() {

  const form = document.getElementById('create-game');

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const formData = new FormData(form);

    const xhr = new XMLHttpRequest();
    xhr.responseType = 'json';
    xhr.open('POST', '/api/v1/game/new');

    xhr.addEventListener('load', function(event) {
      const game = xhr.response['game'];
      window.location.href = `/game/${ game['game_id'] }`;
    });

    xhr.addEventListener('error', function(event) {
    });

    xhr.send(formData);

  });

}




document.addEventListener('DOMContentLoaded', function() {

  var form = document.getElementById("create-game");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var formData = new FormData(form);
    var xhr = new XMLHttpRequest();
    xhr.responseType = 'json';

    xhr.addEventListener("load", function(event) {
      const game = xhr.response['game'];
      window.location.href = "/game/" + game['game_id'];

    });

    xhr.addEventListener("error", function(event) {
      alert('Oops! Something went wrong.');
    });

    xhr.open("POST", "/api/v1/game/new");
    xhr.send(formData);

  });




});
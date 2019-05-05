

document.addEventListener('DOMContentLoaded', function() {

  const buttons = document.getElementsByClassName('button')

  for (let button of buttons) {

    button.addEventListener('mouseup', () => {
      const spot = button.getAttribute('data-spot');
    });

  }

});





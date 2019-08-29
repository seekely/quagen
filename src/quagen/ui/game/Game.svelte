<script>
	import Board from './Board.svelte';
    import Scores from './Scores.svelte';

    export let gameId = 0;
    let init = false;
    let spotsCurrent = [];
    let spotsProjected = [];
    let moveHistory = [];
    let scores = {};
    let turnCompleted = 0;
    let turnMoved = 0;
    let settings = {};
    let timeUpdated = 0;

    $: allowMove = turnCompleted <= turnMoved;


    function updateState (properties) {

        spotsCurrent = properties['board'];
        spotsProjected = properties['projected'];
        scores = properties['scores']; 
        settings = properties['settings'];
        turnCompleted = properties['turn_completed']; 
        timeUpdated = properties['time_updated'];
        moveHistory = properties['history'];     
        init = true;
      }


    class GamePoll {

      constructor() {
        this.inFlight = false;
        this.timeBetweenPoll = 1000;
      }

      start() {

        const self = this;
        setInterval(() => {
            self.poll();
          }
          , self.timeBetweenPoll
        );
      }

      poll() {

        // do not fire off a new request while we still have one in motion
        if (this.inFlight) {
          return;
        }

        this.inFlight = true;
        const self = this;

        // @rseekely @hack AHHHHH timeUpdatd should come from the game state and not just set to 0 
        const timeUpdated = 0;
        const queryString = `?updatedAfter=${ timeUpdated }`;

        const xhr = new XMLHttpRequest();
        xhr.responseType = 'json';
        xhr.open('GET', `/api/v1/game/${ gameId }${ queryString }`);

        xhr.addEventListener('load', (event) => {
          
          if (200 == xhr.status && timeUpdated < xhr.response['game']['time_updated']) {
            const gameDict = xhr.response['game'];
            updateState(updateState);
          }
           
          self.inFlight = false;
        });

        xhr.addEventListener('error', (event) => {
          self.inFlight = false;
        });

        xhr.send(null);
      }
    }

    const gamePoll = new GamePoll();
    gamePoll.poll();
    gamePoll.start();

</script>

<style>
</style>

<h1>Hello everyone!</h1>

<Scores players={2} />
<Board init={init}
       allowMove={allowMove}
       height={20}
       width={20}
       moveHistory={moveHistory}
       spotsCurrent={spotsCurrent} 
       spotsProjected={spotsProjected} />

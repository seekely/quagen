var ui = (function (exports) {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function createEventDispatcher() {
        const component = current_component;
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, value) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /**
     * Non component specific game UI controllers
     */

    /**
     * Holds on to and answers basic questions about the game state data received
     * from the backend API. We try to treat this object as immutable so to not
     * introduce any state discrepancy between client and server.
     *
     * @property {String} gameId          Game tracked by this object
     * @property {Bool}   init            If the game state has received inital data
     *                                    from backend API
     * @property {Bool}   completed       If the game has ended
     * @property {Array}  moveHistory     Every move made by all players. Looks like:
     *                                    [[(color0, x, y), (color1, x, y)]]
     * @property {Array}  moveLast        Last moves made by all players. Looks like:
     *                                    [(color0, x, y), (color1, x, y)]
     * @property {Object} players         All the players in the game. Looks like:
     *                                    {"id1": {"id": "id1", "ai": false, "color": 0}}
     * @property {Array}  scores          Scores for each player. Looks like:
     *                                    [{"controlled": 0, "pressuring": 0, "projected": 0}]
     * @property {Object} settings        Dictionary of key value pairs for the game settings
     * @property {Array}  spotsCurrent    [x][y] arrays containing data for each spot on the board.
     *                                    Each spot looks like {"color": 0, "power": 3, "pressures":[]}
     * @property {Array}  spotsProjected  [x][y] arrays containing projected data for each spot on the board.
     * @property {Int}    turnCompleted   Number of turns completed in the game.
     * @property {Int}    timeCompleted   Epoch time when game ended.
     * @property {Int}    timeCreated     Epoch time when game was created.
     * @property {Int}    timeStarted     Epoch time when game started.
     * @property {Int}    timeUpdated     Epoch time when game last updated/changed state.
     */
    class GameState {
      /**
       * Constructor
       * @param  {String} gameId Game tracked by this object
       */
      constructor(gameId) {
        this.gameId = gameId;
        this.init = false;
        this.completed = false;
        this.moveHistory = [];
        this.moveLast = [];
        this.players = {};
        this.scores = [];
        this.settings = {};
        this.spotsCurrent = [];
        this.spotsProjected = [];
        this.turnCompleted = 0;
        this.timeCompleted = null;
        this.timeCreated = 0;
        this.timeStarted = null;
        this.timeUpdated = 0;
      }

      /**
       * Update the game state with the new state received from the backend API.
       * @param  {Object} state New game state
       */
      update(state) {
        this.completed = "completed" in state ? state["completed"] : this.completed;
        this.players = "players" in state ? state["players"] : this.players;
        this.scores = "scores" in state ? state["scores"] : this.scores;
        this.settings = "settings" in state ? state["settings"] : this.settings;
        this.spotsCurrent = "board" in state ? state["board"] : this.spotsCurrent;
        this.spotsProjected =
          "projected" in state ? state["projected"] : this.spotsProjected;
        this.turnCompleted =
          "turn_completed" in state ? state["turn_completed"] : this.turnCompleted;
        this.timeCompleted =
          "time_completed" in state ? state["time_completed"] : this.timeCompleted;
        this.timeCreated =
          "time_created" in state ? state["time_created"] : this.timeCreated;
        this.timeStarted =
          "time_started" in state ? state["time_started"] : this.timeStarted;
        this.timeUpdated =
          "time_updated" in state ? state["time_updated"] : this.timeUpdated;

        // From the list of all moves, extract out the latest moves made by each
        // player
        this.moveHistory = "history" in state ? state["history"] : this.moveHistory;
        if (0 < this.moveHistory.length) {
          this.moveLast = this.moveHistory.slice(-1)[0];
        }

        // Mark this object as ready to be consumed by the UI
        this.init = true;
      }

      /**
       * Retrieves a game setting
       * @param  {String} key Setting key
       * @return (mixed) Setting value
       * @throws {Exception} If setting does not exist
       */
      getSetting(key) {
        if (!(key in this.settings)) {
          throw `Setting '${key}'' does not exist`;
        }

        return this.settings[key];
      }

      /**
       * If there is more than one human player in the game
       * @return {Bool} True when at least one opponent is human
       */
      isVsHuman() {
        const aiCount = this.getSetting("ai_count");
        const playerCount = this.getSetting("player_count");
        const humanCount = playerCount - aiCount;
        return humanCount > 1;
      }

      /**
       * If there is an AI in the game
       * @return {Bool} True when at least one opponent is AI
       */
      isVsAI() {
        const aiCount = this.getSetting("ai_count");
        return aiCount > 0;
      }
    }

    /**
     * A short poll to grab the latest game state from the backend API and
     * repopulate a GameState object.
     */
    class GamePoll {
      /**
       * Constructor
       * @param  {GameState} gameState instance to update
       * @param  {Function} optional callback called after update to gameState
       */
      constructor(gameState, callback = null) {
        this._gameState = gameState;
        this._callback = callback;
        this._inFlight = false;
        this._timeBetweenPoll = 1000;
        this._interval = null;
      }

      /**
       * Starts the continuous short poll to the backend API
       */
      async start() {
        const self = this;

        if (self._interval == null) {
          self._interval = setInterval(() => {
            self._poll();
          }, self._timeBetweenPoll);

          return self._poll();
        }
      }

      /**
       * Stops the short poll
       */
      stop() {
        if (null != this._interval) {
          clearInterval(this._interval);
          this._interval = null;
        }
      }

      /**
       * Makes the backend call to the API for the latest game state and updates
       * the GameState object.
       */
      async _poll() {
        // do not fire off a new request while we still have one in motion
        if (this._inFlight) {
          return;
        }

        this._inFlight = true;
        const self = this;

        // Tells the API to only return the full game state if the game state
        // has changed since our last update.
        const timeUpdated = self._gameState.timeUpdated;
        const queryString = `?updatedAfter=${timeUpdated}`;

        return fetch(`/api/v1/game/${self._gameState.gameId}${queryString}`)
          .then(response => {
            self._inFlight = false;
            if (200 == response.status) {
              return response.json();
            } else {
              throw response.statusText;
            }
          })
          .then(data => {
            // If the game state has new info, update and make the user
            // callback
            if (timeUpdated < data["game"]["time_updated"]) {
              self._gameState.update(data["game"]);

              if (null != this._callback) {
                this._callback();
              }
            }
          })
          .catch(() => {
            self._inFlight = false;
          });
      }
    }

    /* src/quagen/ui/game/Spot.svelte generated by Svelte v3.9.1 */

    const file = "src/quagen/ui/game/Spot.svelte";

    function create_fragment(ctx) {
    	var button, button_disabled_value, dispose;

    	return {
    		c: function create() {
    			button = element("button");
    			attr(button, "type", "button");
    			set_style(button, "background-color", toRGBA(ctx.buttonColor, ctx.buttonOpacity));
    			button.disabled = button_disabled_value = !ctx.buttonEnabled;
    			attr(button, "class", "svelte-1spi4vf");
    			toggle_class(button, "outline", ctx.lastMove || ctx.pendingMove || ctx.selected);
    			toggle_class(button, "pulse", !ctx.pendingMove && !ctx.lastMove && ctx.buttonEnabled);
    			toggle_class(button, "selected", ctx.selected && !ctx.pendingMove && !ctx.lastMove && ctx.buttonEnabled);
    			add_location(button, file, 138, 0, 3244);
    			dispose = listen(button, "mouseup", ctx.handleSelected);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, button, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.buttonColor || changed.buttonOpacity) {
    				set_style(button, "background-color", toRGBA(ctx.buttonColor, ctx.buttonOpacity));
    			}

    			if ((changed.buttonEnabled) && button_disabled_value !== (button_disabled_value = !ctx.buttonEnabled)) {
    				button.disabled = button_disabled_value;
    			}

    			if ((changed.lastMove || changed.pendingMove || changed.selected)) {
    				toggle_class(button, "outline", ctx.lastMove || ctx.pendingMove || ctx.selected);
    			}

    			if ((changed.pendingMove || changed.lastMove || changed.buttonEnabled)) {
    				toggle_class(button, "pulse", !ctx.pendingMove && !ctx.lastMove && ctx.buttonEnabled);
    			}

    			if ((changed.selected || changed.pendingMove || changed.lastMove || changed.buttonEnabled)) {
    				toggle_class(button, "selected", ctx.selected && !ctx.pendingMove && !ctx.lastMove && ctx.buttonEnabled);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(button);
    			}

    			dispose();
    		}
    	};
    }

    function toRGBA(color, opacity) {
      return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity})`;
    }

    function instance($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();

      // Possible background colors for a spot based on state
      const BG_COLOR_DEFAULT = [231, 231, 231];
      const BG_COLOR_SELECTED = [240, 255, 0];
      const BG_COLORS_PLAYER = [
        [0, 0, 0],
        [0, 140, 186],
        [244, 67, 54],
        [22, 215, 79],
        [255, 195, 0]
      ];

      // Coordinates of this spot on the board
      let { x, y, color = -1, pressures = [], power = 0, maxPower = 4, selected = false, allowMove = true, pendingMove = false, lastMove = false } = $$props;

      // The background color of the button based on current state
      let buttonColor = BG_COLOR_DEFAULT;
      let buttonOpacity = 1;

      /**
       * Dispatches an event to the parent when this spot was selected by the
       * player. Depending on the settings, we may want to wait for a double
       * click before making this a move.
       */
      function handleSelected() {
        dispatch("selected", { x: x, y: y });
      }

    	const writable_props = ['x', 'y', 'color', 'pressures', 'power', 'maxPower', 'selected', 'allowMove', 'pendingMove', 'lastMove'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Spot> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('x' in $$props) $$invalidate('x', x = $$props.x);
    		if ('y' in $$props) $$invalidate('y', y = $$props.y);
    		if ('color' in $$props) $$invalidate('color', color = $$props.color);
    		if ('pressures' in $$props) $$invalidate('pressures', pressures = $$props.pressures);
    		if ('power' in $$props) $$invalidate('power', power = $$props.power);
    		if ('maxPower' in $$props) $$invalidate('maxPower', maxPower = $$props.maxPower);
    		if ('selected' in $$props) $$invalidate('selected', selected = $$props.selected);
    		if ('allowMove' in $$props) $$invalidate('allowMove', allowMove = $$props.allowMove);
    		if ('pendingMove' in $$props) $$invalidate('pendingMove', pendingMove = $$props.pendingMove);
    		if ('lastMove' in $$props) $$invalidate('lastMove', lastMove = $$props.lastMove);
    	};

    	let buttonEnabled;

    	$$self.$$.update = ($$dirty = { selected: 1, pendingMove: 1, color: 1, power: 1, maxPower: 1, allowMove: 1 }) => {
    		if ($$dirty.selected || $$dirty.pendingMove || $$dirty.color || $$dirty.power || $$dirty.maxPower) { {
            if (selected || pendingMove) {
              $$invalidate('buttonColor', buttonColor = BG_COLOR_SELECTED);
              $$invalidate('buttonOpacity', buttonOpacity = 1);
            } else if (0 <= color) {
              $$invalidate('buttonColor', buttonColor = BG_COLORS_PLAYER[color]);
              $$invalidate('buttonOpacity', buttonOpacity =
                0 < power && power < maxPower ? (0.75 / maxPower) * power : 1);
            } else {
              $$invalidate('buttonColor', buttonColor = BG_COLOR_DEFAULT);
              $$invalidate('buttonOpacity', buttonOpacity = 1);
            }
          } }
    		if ($$dirty.allowMove || $$dirty.power || $$dirty.maxPower) { $$invalidate('buttonEnabled', buttonEnabled = allowMove && power < maxPower); }
    	};

    	return {
    		x,
    		y,
    		color,
    		pressures,
    		power,
    		maxPower,
    		selected,
    		allowMove,
    		pendingMove,
    		lastMove,
    		buttonColor,
    		buttonOpacity,
    		handleSelected,
    		buttonEnabled
    	};
    }

    class Spot extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["x", "y", "color", "pressures", "power", "maxPower", "selected", "allowMove", "pendingMove", "lastMove"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.x === undefined && !('x' in props)) {
    			console.warn("<Spot> was created without expected prop 'x'");
    		}
    		if (ctx.y === undefined && !('y' in props)) {
    			console.warn("<Spot> was created without expected prop 'y'");
    		}
    	}

    	get x() {
    		throw new Error("<Spot>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set x(value) {
    		throw new Error("<Spot>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get y() {
    		throw new Error("<Spot>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set y(value) {
    		throw new Error("<Spot>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<Spot>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Spot>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pressures() {
    		throw new Error("<Spot>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pressures(value) {
    		throw new Error("<Spot>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get power() {
    		throw new Error("<Spot>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set power(value) {
    		throw new Error("<Spot>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get maxPower() {
    		throw new Error("<Spot>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set maxPower(value) {
    		throw new Error("<Spot>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get selected() {
    		throw new Error("<Spot>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selected(value) {
    		throw new Error("<Spot>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get allowMove() {
    		throw new Error("<Spot>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set allowMove(value) {
    		throw new Error("<Spot>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pendingMove() {
    		throw new Error("<Spot>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pendingMove(value) {
    		throw new Error("<Spot>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get lastMove() {
    		throw new Error("<Spot>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lastMove(value) {
    		throw new Error("<Spot>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /**
     * Utility functions used across the UI
     */

    /**
     * Sets up listeners to detect browser capabilities
     */
    function detectCapabilities() {
      // Detect if the user is interacting with the screen via touching
      window.addEventListener(
        "touchstart",
        function onFirstTouch() {
          window.CAPABILITY_TOUCH = true;

          // Only need to detect human touch one time
          window.removeEventListener("touchstart", onFirstTouch, false);
        },
        false
      );
    }

    /**
     * If the user has interacted with the screen via touch
     * @returns {Bool} True if user has interacted via touch, false otherwise
     */
    function isTouching() {
      return true == window.CAPABILITY_TOUCH;
    }

    /* src/quagen/ui/game/Board.svelte generated by Svelte v3.9.1 */

    const file$1 = "src/quagen/ui/game/Board.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx._ = list[i];
    	child_ctx.x = i;
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx._ = list[i];
    	child_ctx.y = i;
    	return child_ctx;
    }

    // (109:4) {#each { length: width } as _, x}
    function create_each_block_1(ctx) {
    	var current;

    	var spot_spread_levels = [
    		{ x: ctx.x },
    		{ y: ctx.y },
    		{ allowMove: ctx.allowMove },
    		ctx.spots[ctx.x][ctx.y],
    		{ selected: ctx.selectedX == ctx.x && ctx.selectedY == ctx.y },
    		{ lastMove: isLastMove(ctx.lastMoves, ctx.x, ctx.y) },
    		{ pendingMove: ctx.selectedX == ctx.x && ctx.selectedY == ctx.y && ctx.pendingMove }
    	];

    	let spot_props = {};
    	for (var i = 0; i < spot_spread_levels.length; i += 1) {
    		spot_props = assign(spot_props, spot_spread_levels[i]);
    	}
    	var spot = new Spot({ props: spot_props, $$inline: true });
    	spot.$on("selected", ctx.handleSpotSelected);

    	return {
    		c: function create() {
    			spot.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(spot, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var spot_changes = (changed.allowMove || changed.spots || changed.selectedX || changed.selectedY || changed.isLastMove || changed.lastMoves || changed.pendingMove) ? get_spread_update(spot_spread_levels, [
    									spot_spread_levels[0],
    			spot_spread_levels[1],
    			(changed.allowMove) && { allowMove: ctx.allowMove },
    			(changed.spots) && ctx.spots[ctx.x][ctx.y],
    			(changed.selectedX || changed.selectedY) && { selected: ctx.selectedX == ctx.x && ctx.selectedY == ctx.y },
    			(changed.isLastMove || changed.lastMoves) && { lastMove: isLastMove(ctx.lastMoves, ctx.x, ctx.y) },
    			(changed.selectedX || changed.selectedY || changed.pendingMove) && { pendingMove: ctx.selectedX == ctx.x && ctx.selectedY == ctx.y && ctx.pendingMove }
    								]) : {};
    			spot.$set(spot_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(spot.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(spot.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(spot, detaching);
    		}
    	};
    }

    // (108:2) {#each { length: height } as _, y}
    function create_each_block(ctx) {
    	var t, br, current;

    	var each_value_1 = { length: ctx.width };

    	var each_blocks = [];

    	for (var i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c: function create() {
    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			br = element("br");
    			add_location(br, file$1, 119, 4, 3647);
    		},

    		m: function mount(target, anchor) {
    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, t, anchor);
    			insert(target, br, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.allowMove || changed.spots || changed.selectedX || changed.selectedY || changed.isLastMove || changed.lastMoves || changed.pendingMove || changed.width) {
    				each_value_1 = { length: ctx.width };

    				for (var i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(t.parentNode, t);
    					}
    				}

    				group_outros();
    				for (i = each_value_1.length; i < each_blocks.length; i += 1) out(i);
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (var i = 0; i < each_value_1.length; i += 1) transition_in(each_blocks[i]);

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) transition_out(each_blocks[i]);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach(t);
    				detach(br);
    			}
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	var div, current;

    	var each_value = { length: ctx.height };

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c: function create() {
    			div = element("div");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr(div, "class", "container svelte-3bn73f");
    			set_style(div, "min-width", "" + ctx.containerWidth + "px");
    			add_location(div, file$1, 105, 0, 3115);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.width || changed.allowMove || changed.spots || changed.selectedX || changed.selectedY || changed.isLastMove || changed.lastMoves || changed.pendingMove || changed.height) {
    				each_value = { length: ctx.height };

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < each_blocks.length; i += 1) out(i);
    				check_outros();
    			}

    			if (!current || changed.containerWidth) {
    				set_style(div, "min-width", "" + ctx.containerWidth + "px");
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (var i = 0; i < each_value.length; i += 1) transition_in(each_blocks[i]);

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) transition_out(each_blocks[i]);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function isLastMove(moves, x, y) {
      for (let move of moves) {
        if (x == move[0] && y == move[1]) {
          return true;
        }
      }

      return false;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();

      // The turn number completed this board state reflects
      let { turnCompleted = 0, width = 0, height = 0, spots = [], allowMove = true, moveHistory = [] } = $$props;

      /**
       * Handles when  a spot on the board has been selected by the player.
       * Depending on the settings, we may want to wait for a double
       * click before making this a move.
       */
      function handleSpotSelected(event) {
        const eventX = event.detail.x;
        const eventY = event.detail.y;

        // Short circuit getting here when a move should not be allowed according
        // to board/game state
        if (!allowMove) {
          return;
        }

        // if the player is using a mouse, let the first selection made
        // go through. if the player is using a touch screen, make them confirm
        // their selection with another click so they don't accidentally make a move
        // while scrolling/zooming.
        if (!isTouching() || (selectedX == eventX && selectedY == eventY)) {
          $$invalidate('pendingMove', pendingMove = true);
          $$invalidate('allowMove', allowMove = false);
          $$invalidate('selectedX', selectedX = eventX);
          $$invalidate('selectedY', selectedY = eventY);
          dispatch("move", { x: eventX, y: eventY });
        } else {
          $$invalidate('selectedX', selectedX = eventX);
          $$invalidate('selectedY', selectedY = eventY);
        }
      }

    	const writable_props = ['turnCompleted', 'width', 'height', 'spots', 'allowMove', 'moveHistory'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Board> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('turnCompleted' in $$props) $$invalidate('turnCompleted', turnCompleted = $$props.turnCompleted);
    		if ('width' in $$props) $$invalidate('width', width = $$props.width);
    		if ('height' in $$props) $$invalidate('height', height = $$props.height);
    		if ('spots' in $$props) $$invalidate('spots', spots = $$props.spots);
    		if ('allowMove' in $$props) $$invalidate('allowMove', allowMove = $$props.allowMove);
    		if ('moveHistory' in $$props) $$invalidate('moveHistory', moveHistory = $$props.moveHistory);
    	};

    	let selectedX, selectedY, pendingMove, lastMoves, containerWidth;

    	$$self.$$.update = ($$dirty = { turnCompleted: 1, moveHistory: 1, width: 1, containerWidth: 1 }) => {
    		if ($$dirty.turnCompleted) { $$invalidate('selectedX', selectedX = turnCompleted ? -1 : -1); }
    		if ($$dirty.turnCompleted) { $$invalidate('selectedY', selectedY = turnCompleted ? -1 : -1); }
    		if ($$dirty.turnCompleted) { $$invalidate('pendingMove', pendingMove = turnCompleted ? false : false); }
    		if ($$dirty.moveHistory) { $$invalidate('lastMoves', lastMoves = moveHistory.length > 0 ? moveHistory.slice(-1)[0] : []); }
    		if ($$dirty.width) { $$invalidate('containerWidth', containerWidth = width * 26 + 75); }
    		if ($$dirty.width || $$dirty.containerWidth) { {
            const viewport = document.getElementById("viewport");
            if (0 < width && containerWidth > screen.width) {
              viewport.setAttribute("content", `width=${containerWidth}`);
            }
          } }
    	};

    	return {
    		turnCompleted,
    		width,
    		height,
    		spots,
    		allowMove,
    		moveHistory,
    		handleSpotSelected,
    		selectedX,
    		selectedY,
    		pendingMove,
    		lastMoves,
    		containerWidth
    	};
    }

    class Board extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["turnCompleted", "width", "height", "spots", "allowMove", "moveHistory", "handleSpotSelected", "isLastMove"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.handleSpotSelected === undefined && !('handleSpotSelected' in props)) {
    			console.warn("<Board> was created without expected prop 'handleSpotSelected'");
    		}
    		if (ctx.isLastMove === undefined && !('isLastMove' in props)) {
    			console.warn("<Board> was created without expected prop 'isLastMove'");
    		}
    	}

    	get turnCompleted() {
    		throw new Error("<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set turnCompleted(value) {
    		throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get spots() {
    		throw new Error("<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set spots(value) {
    		throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get allowMove() {
    		throw new Error("<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set allowMove(value) {
    		throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get moveHistory() {
    		throw new Error("<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set moveHistory(value) {
    		throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleSpotSelected() {
    		return this.$$.ctx.handleSpotSelected;
    	}

    	set handleSpotSelected(value) {
    		throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isLastMove() {
    		return isLastMove;
    	}

    	set isLastMove(value) {
    		throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/quagen/ui/game/Score.svelte generated by Svelte v3.9.1 */

    const file$2 = "src/quagen/ui/game/Score.svelte";

    // (93:2) {#if crown}
    function create_if_block_1(ctx) {
    	var div, img;

    	return {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			attr(img, "src", "/img/crown.png");
    			attr(img, "width", "35px");
    			attr(img, "alt", "Crown!");
    			add_location(img, file$2, 94, 6, 1743);
    			attr(div, "class", "crown svelte-jyd0vx");
    			add_location(div, file$2, 93, 4, 1717);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, img);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}
    		}
    	};
    }

    // (104:4) {:else}
    function create_else_block(ctx) {
    	var div0, t0, t1, div1, t2, t3, div2, t4;

    	return {
    		c: function create() {
    			div0 = element("div");
    			t0 = text(ctx.controlled);
    			t1 = space();
    			div1 = element("div");
    			t2 = text(ctx.projected);
    			t3 = space();
    			div2 = element("div");
    			t4 = text(ctx.pressuring);
    			add_location(div0, file$2, 104, 6, 2014);
    			add_location(div1, file$2, 105, 6, 2044);
    			add_location(div2, file$2, 106, 6, 2073);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div0, anchor);
    			append(div0, t0);
    			insert(target, t1, anchor);
    			insert(target, div1, anchor);
    			append(div1, t2);
    			insert(target, t3, anchor);
    			insert(target, div2, anchor);
    			append(div2, t4);
    		},

    		p: function update(changed, ctx) {
    			if (changed.controlled) {
    				set_data(t0, ctx.controlled);
    			}

    			if (changed.projected) {
    				set_data(t2, ctx.projected);
    			}

    			if (changed.pressuring) {
    				set_data(t4, ctx.pressuring);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div0);
    				detach(t1);
    				detach(div1);
    				detach(t3);
    				detach(div2);
    			}
    		}
    	};
    }

    // (100:4) {#if key}
    function create_if_block(ctx) {
    	var div0, t1, div1, t3, div2;

    	return {
    		c: function create() {
    			div0 = element("div");
    			div0.textContent = "Controlled";
    			t1 = space();
    			div1 = element("div");
    			div1.textContent = "Projected";
    			t3 = space();
    			div2 = element("div");
    			div2.textContent = "Pressuring";
    			add_location(div0, file$2, 100, 6, 1919);
    			add_location(div1, file$2, 101, 6, 1947);
    			add_location(div2, file$2, 102, 6, 1974);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div0, anchor);
    			insert(target, t1, anchor);
    			insert(target, div1, anchor);
    			insert(target, t3, anchor);
    			insert(target, div2, anchor);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div0);
    				detach(t1);
    				detach(div1);
    				detach(t3);
    				detach(div2);
    			}
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	var div1, t, div0, div0_class_value;

    	var if_block0 = (ctx.crown) && create_if_block_1();

    	function select_block_type(changed, ctx) {
    		if (ctx.key) return create_if_block;
    		return create_else_block;
    	}

    	var current_block_type = select_block_type(null, ctx);
    	var if_block1 = current_block_type(ctx);

    	return {
    		c: function create() {
    			div1 = element("div");
    			if (if_block0) if_block0.c();
    			t = space();
    			div0 = element("div");
    			if_block1.c();
    			attr(div0, "class", div0_class_value = "inner bg-color-" + ctx.color + " svelte-jyd0vx");
    			toggle_class(div0, "crown", ctx.crown);
    			toggle_class(div0, "key", ctx.key);
    			toggle_class(div0, "player", !ctx.key);
    			add_location(div0, file$2, 98, 2, 1820);
    			attr(div1, "class", "container svelte-jyd0vx");
    			add_location(div1, file$2, 90, 0, 1674);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div1, anchor);
    			if (if_block0) if_block0.m(div1, null);
    			append(div1, t);
    			append(div1, div0);
    			if_block1.m(div0, null);
    		},

    		p: function update(changed, ctx) {
    			if (ctx.crown) {
    				if (!if_block0) {
    					if_block0 = create_if_block_1();
    					if_block0.c();
    					if_block0.m(div1, t);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (current_block_type === (current_block_type = select_block_type(changed, ctx)) && if_block1) {
    				if_block1.p(changed, ctx);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);
    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div0, null);
    				}
    			}

    			if ((changed.color) && div0_class_value !== (div0_class_value = "inner bg-color-" + ctx.color + " svelte-jyd0vx")) {
    				attr(div0, "class", div0_class_value);
    			}

    			if ((changed.color || changed.crown)) {
    				toggle_class(div0, "crown", ctx.crown);
    			}

    			if ((changed.color || changed.key)) {
    				toggle_class(div0, "key", ctx.key);
    				toggle_class(div0, "player", !ctx.key);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div1);
    			}

    			if (if_block0) if_block0.d();
    			if_block1.d();
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	/**
       * Displays the score for a single player
       */

      // This scoreboard entry is serving as the key and not a player score
      let { key = false, color = 0, gameOver = false, winner = false } = $$props;

      // The player's current scores
      let { controlled = 0, pressuring = 0, projected = 0 } = $$props;

    	const writable_props = ['key', 'color', 'gameOver', 'winner', 'controlled', 'pressuring', 'projected'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Score> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('key' in $$props) $$invalidate('key', key = $$props.key);
    		if ('color' in $$props) $$invalidate('color', color = $$props.color);
    		if ('gameOver' in $$props) $$invalidate('gameOver', gameOver = $$props.gameOver);
    		if ('winner' in $$props) $$invalidate('winner', winner = $$props.winner);
    		if ('controlled' in $$props) $$invalidate('controlled', controlled = $$props.controlled);
    		if ('pressuring' in $$props) $$invalidate('pressuring', pressuring = $$props.pressuring);
    		if ('projected' in $$props) $$invalidate('projected', projected = $$props.projected);
    	};

    	let crown;

    	$$self.$$.update = ($$dirty = { gameOver: 1, winner: 1 }) => {
    		if ($$dirty.gameOver || $$dirty.winner) { $$invalidate('crown', crown = gameOver && winner); }
    	};

    	return {
    		key,
    		color,
    		gameOver,
    		winner,
    		controlled,
    		pressuring,
    		projected,
    		crown
    	};
    }

    class Score extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, ["key", "color", "gameOver", "winner", "controlled", "pressuring", "projected"]);
    	}

    	get key() {
    		throw new Error("<Score>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<Score>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<Score>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Score>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get gameOver() {
    		throw new Error("<Score>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set gameOver(value) {
    		throw new Error("<Score>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get winner() {
    		throw new Error("<Score>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set winner(value) {
    		throw new Error("<Score>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get controlled() {
    		throw new Error("<Score>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set controlled(value) {
    		throw new Error("<Score>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pressuring() {
    		throw new Error("<Score>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pressuring(value) {
    		throw new Error("<Score>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get projected() {
    		throw new Error("<Score>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set projected(value) {
    		throw new Error("<Score>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/quagen/ui/game/Scores.svelte generated by Svelte v3.9.1 */

    const file$3 = "src/quagen/ui/game/Scores.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.score = list[i];
    	child_ctx.i = i;
    	return child_ctx;
    }

    // (63:2) {#if gameOver}
    function create_if_block$1(ctx) {
    	var div;

    	function select_block_type(changed, ctx) {
    		if (ctx.tied) return create_if_block_1$1;
    		return create_else_block$1;
    	}

    	var current_block_type = select_block_type(null, ctx);
    	var if_block = current_block_type(ctx);

    	return {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr(div, "class", "gameover svelte-n38d5k");
    			add_location(div, file$3, 63, 4, 1269);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			if_block.m(div, null);
    		},

    		p: function update(changed, ctx) {
    			if (current_block_type !== (current_block_type = select_block_type(changed, ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);
    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			if_block.d();
    		}
    	};
    }

    // (67:6) {:else}
    function create_else_block$1(ctx) {
    	var p;

    	return {
    		c: function create() {
    			p = element("p");
    			p.textContent = "This game has ended!";
    			attr(p, "class", "svelte-n38d5k");
    			add_location(p, file$3, 67, 8, 1376);
    		},

    		m: function mount(target, anchor) {
    			insert(target, p, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(p);
    			}
    		}
    	};
    }

    // (65:6) {#if tied}
    function create_if_block_1$1(ctx) {
    	var p;

    	return {
    		c: function create() {
    			p = element("p");
    			p.textContent = "This game has ended in a tie!";
    			attr(p, "class", "svelte-n38d5k");
    			add_location(p, file$3, 65, 8, 1317);
    		},

    		m: function mount(target, anchor) {
    			insert(target, p, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(p);
    			}
    		}
    	};
    }

    // (75:4) {#each scores as score, i}
    function create_each_block$1(ctx) {
    	var current;

    	var score_spread_levels = [
    		{ color: ctx.i },
    		{ gameOver: ctx.gameOver },
    		{ winner: isWinner(ctx.i, ctx.scores) },
    		ctx.score
    	];

    	let score_props = {};
    	for (var i_1 = 0; i_1 < score_spread_levels.length; i_1 += 1) {
    		score_props = assign(score_props, score_spread_levels[i_1]);
    	}
    	var score = new Score({ props: score_props, $$inline: true });

    	return {
    		c: function create() {
    			score.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(score, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var score_changes = (changed.gameOver || changed.isWinner || changed.scores) ? get_spread_update(score_spread_levels, [
    									score_spread_levels[0],
    			(changed.gameOver) && { gameOver: ctx.gameOver },
    			(changed.isWinner || changed.scores) && { winner: isWinner(ctx.i, ctx.scores) },
    			(changed.scores) && ctx.score
    								]) : {};
    			score.$set(score_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(score.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(score.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(score, detaching);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	var div1, t0, div0, t1, current;

    	var if_block = (ctx.gameOver) && create_if_block$1(ctx);

    	var score = new Score({
    		props: { key: true },
    		$$inline: true
    	});

    	var each_value = ctx.scores;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c: function create() {
    			div1 = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			div0 = element("div");
    			score.$$.fragment.c();
    			t1 = space();

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr(div0, "class", "container svelte-n38d5k");
    			add_location(div0, file$3, 72, 2, 1438);
    			add_location(div1, file$3, 60, 0, 1241);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div1, anchor);
    			if (if_block) if_block.m(div1, null);
    			append(div1, t0);
    			append(div1, div0);
    			mount_component(score, div0, null);
    			append(div0, t1);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.gameOver) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(div1, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (changed.gameOver || changed.isWinner || changed.scores) {
    				each_value = ctx.scores;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div0, null);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < each_blocks.length; i += 1) out(i);
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(score.$$.fragment, local);

    			for (var i = 0; i < each_value.length; i += 1) transition_in(each_blocks[i]);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(score.$$.fragment, local);

    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) transition_out(each_blocks[i]);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div1);
    			}

    			if (if_block) if_block.d();

    			destroy_component(score);

    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function isWinner(color, scores) {
      let winner = true;
      const score = scores[color]["controlled"];

      for (let i = 0; i < scores.length; i++) {
        if (i != color && scores[i]["controlled"] >= score) {
          winner = false;
          break;
        }
      }

      return winner;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	// If the game is over
      let { gameOver = false, scores = [], leaders = [] } = $$props;

    	const writable_props = ['gameOver', 'scores', 'leaders'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Scores> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('gameOver' in $$props) $$invalidate('gameOver', gameOver = $$props.gameOver);
    		if ('scores' in $$props) $$invalidate('scores', scores = $$props.scores);
    		if ('leaders' in $$props) $$invalidate('leaders', leaders = $$props.leaders);
    	};

    	let tied;

    	$$self.$$.update = ($$dirty = { gameOver: 1, leaders: 1 }) => {
    		if ($$dirty.gameOver || $$dirty.leaders) { $$invalidate('tied', tied = gameOver && leaders.length > 0); }
    	};

    	return { gameOver, scores, leaders, tied };
    }

    class Scores extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, ["gameOver", "scores", "leaders"]);
    	}

    	get gameOver() {
    		throw new Error("<Scores>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set gameOver(value) {
    		throw new Error("<Scores>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get scores() {
    		throw new Error("<Scores>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set scores(value) {
    		throw new Error("<Scores>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get leaders() {
    		throw new Error("<Scores>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set leaders(value) {
    		throw new Error("<Scores>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/quagen/ui/game/Settings.svelte generated by Svelte v3.9.1 */

    const file$4 = "src/quagen/ui/game/Settings.svelte";

    function create_fragment$4(ctx) {
    	var div, input, t, dispose;

    	return {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			t = text("\n  See projected board");
    			attr(input, "type", "checkbox");
    			add_location(input, file$4, 13, 2, 127);
    			attr(div, "class", "svelte-jy7duu");
    			add_location(div, file$4, 12, 0, 119);
    			dispose = listen(input, "change", ctx.change_handler);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, input);
    			append(div, t);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			dispose();
    		}
    	};
    }

    function instance$4($$self) {
    	function change_handler(event) {
    		bubble($$self, event);
    	}

    	return { change_handler };
    }

    class Settings extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, []);
    	}
    }

    /* src/quagen/ui/game/StartPrompt.svelte generated by Svelte v3.9.1 */

    const file$5 = "src/quagen/ui/game/StartPrompt.svelte";

    // (70:2) {:else}
    function create_else_block$2(ctx) {
    	var p;

    	return {
    		c: function create() {
    			p = element("p");
    			p.textContent = "The game will start when you make your first move.";
    			attr(p, "class", "svelte-1pfd73t");
    			add_location(p, file$5, 70, 4, 1473);
    		},

    		m: function mount(target, anchor) {
    			insert(target, p, anchor);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(p);
    			}
    		}
    	};
    }

    // (62:2) {#if vsHumans}
    function create_if_block$2(ctx) {
    	var p0, t1, p1, span, t2, dispose;

    	return {
    		c: function create() {
    			p0 = element("p");
    			p0.textContent = "The game will start after all players have made their first move. To\n      invite a friend to the game, share the following link:";
    			t1 = space();
    			p1 = element("p");
    			span = element("span");
    			t2 = text(ctx.shareUrl);
    			attr(p0, "class", "svelte-1pfd73t");
    			add_location(p0, file$5, 62, 4, 1209);
    			attr(span, "id", "share-url");
    			attr(span, "class", "svelte-1pfd73t");
    			add_location(span, file$5, 67, 6, 1411);
    			attr(p1, "class", "share svelte-1pfd73t");
    			add_location(p1, file$5, 66, 4, 1362);
    			dispose = listen(p1, "mouseup", handleShare);
    		},

    		m: function mount(target, anchor) {
    			insert(target, p0, anchor);
    			insert(target, t1, anchor);
    			insert(target, p1, anchor);
    			append(p1, span);
    			append(span, t2);
    		},

    		p: function update(changed, ctx) {
    			if (changed.shareUrl) {
    				set_data(t2, ctx.shareUrl);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(p0);
    				detach(t1);
    				detach(p1);
    			}

    			dispose();
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	var div;

    	function select_block_type(changed, ctx) {
    		if (ctx.vsHumans) return create_if_block$2;
    		return create_else_block$2;
    	}

    	var current_block_type = select_block_type(null, ctx);
    	var if_block = current_block_type(ctx);

    	return {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr(div, "class", "svelte-1pfd73t");
    			add_location(div, file$5, 60, 0, 1182);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			if_block.m(div, null);
    		},

    		p: function update(changed, ctx) {
    			if (current_block_type === (current_block_type = select_block_type(changed, ctx)) && if_block) {
    				if_block.p(changed, ctx);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);
    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			if_block.d();
    		}
    	};
    }

    function handleShare() {
      // highlight share url
      const shareElm = document.getElementById("share-url");

      const range = document.createRange();
      range.selectNodeContents(shareElm);

      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      // copy share url to clipboard
      document.execCommand("copy");
    }

    function instance$5($$self, $$props, $$invalidate) {
    	/**
       * Information prompt at the start of the game
       */

      // Unique id of the game
      let { gameId = 0, vsHumans = false } = $$props;

    	const writable_props = ['gameId', 'vsHumans'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<StartPrompt> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('gameId' in $$props) $$invalidate('gameId', gameId = $$props.gameId);
    		if ('vsHumans' in $$props) $$invalidate('vsHumans', vsHumans = $$props.vsHumans);
    	};

    	let shareUrl;

    	$$self.$$.update = ($$dirty = { gameId: 1 }) => {
    		if ($$dirty.gameId) { $$invalidate('shareUrl', shareUrl = `${window.location.protocol}//${window.location.host}/game/${gameId}`); }
    	};

    	return { gameId, vsHumans, shareUrl };
    }

    class StartPrompt extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, ["gameId", "vsHumans"]);
    	}

    	get gameId() {
    		throw new Error("<StartPrompt>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set gameId(value) {
    		throw new Error("<StartPrompt>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get vsHumans() {
    		throw new Error("<StartPrompt>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set vsHumans(value) {
    		throw new Error("<StartPrompt>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/quagen/ui/game/App.svelte generated by Svelte v3.9.1 */

    const file$6 = "src/quagen/ui/game/App.svelte";

    // (93:0) {:else}
    function create_else_block_1(ctx) {
    	var p;

    	return {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Loading...";
    			add_location(p, file$6, 94, 2, 2992);
    		},

    		m: function mount(target, anchor) {
    			insert(target, p, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(p);
    			}
    		}
    	};
    }

    // (73:0) {#if init}
    function create_if_block$3(ctx) {
    	var current_block_type_index, if_block, t0, t1, current;

    	var if_block_creators = [
    		create_if_block_1$2,
    		create_else_block$3
    	];

    	var if_blocks = [];

    	function select_block_type_1(changed, ctx) {
    		if (ctx.turnCompleted == 0) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_1(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	var settings = new Settings({ $$inline: true });
    	settings.$on("change", ctx.handleProjected);

    	var board = new Board({
    		props: {
    		height: ctx.gameState.getSetting('dimension_x'),
    		width: ctx.gameState.getSetting('dimension_y'),
    		moveHistory: ctx.gameState.moveHistory,
    		allowMove: ctx.allowMove,
    		spots: ctx.spots,
    		turnCompleted: ctx.turnCompleted
    	},
    		$$inline: true
    	});
    	board.$on("move", ctx.handleMove);

    	return {
    		c: function create() {
    			if_block.c();
    			t0 = space();
    			settings.$$.fragment.c();
    			t1 = space();
    			board.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, t0, anchor);
    			mount_component(settings, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(board, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(t0.parentNode, t0);
    			}

    			var board_changes = {};
    			if (changed.gameState) board_changes.height = ctx.gameState.getSetting('dimension_x');
    			if (changed.gameState) board_changes.width = ctx.gameState.getSetting('dimension_y');
    			if (changed.gameState) board_changes.moveHistory = ctx.gameState.moveHistory;
    			if (changed.allowMove) board_changes.allowMove = ctx.allowMove;
    			if (changed.spots) board_changes.spots = ctx.spots;
    			if (changed.turnCompleted) board_changes.turnCompleted = ctx.turnCompleted;
    			board.$set(board_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);

    			transition_in(settings.$$.fragment, local);

    			transition_in(board.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(settings.$$.fragment, local);
    			transition_out(board.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach(t0);
    			}

    			destroy_component(settings, detaching);

    			if (detaching) {
    				detach(t1);
    			}

    			destroy_component(board, detaching);
    		}
    	};
    }

    // (79:2) {:else}
    function create_else_block$3(ctx) {
    	var current;

    	var scores = new Scores({
    		props: {
    		gameOver: ctx.gameOver,
    		scores: ctx.gameState.scores
    	},
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			scores.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(scores, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var scores_changes = {};
    			if (changed.gameOver) scores_changes.gameOver = ctx.gameOver;
    			if (changed.gameState) scores_changes.scores = ctx.gameState.scores;
    			scores.$set(scores_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(scores.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(scores.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(scores, detaching);
    		}
    	};
    }

    // (76:2) {#if turnCompleted == 0}
    function create_if_block_1$2(ctx) {
    	var current;

    	var startprompt = new StartPrompt({
    		props: {
    		gameId: ctx.gameState.gameId,
    		vsHumans: ctx.gameState.isVsHuman()
    	},
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			startprompt.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(startprompt, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var startprompt_changes = {};
    			if (changed.gameState) startprompt_changes.gameId = ctx.gameState.gameId;
    			if (changed.gameState) startprompt_changes.vsHumans = ctx.gameState.isVsHuman();
    			startprompt.$set(startprompt_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(startprompt.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(startprompt.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(startprompt, detaching);
    		}
    	};
    }

    function create_fragment$6(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block$3,
    		create_else_block_1
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.init) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	

      // Unique string id for this game
      let { gameId = 0 } = $$props;

      // Contains the current game data/state as retrieved from the backend API
      let gameState = new GameState(gameId);

      // Fires off a repeated call to the backend API to grab the latest game
      // state. Yes, this should be sockets instead of short polling.
      const gamePoll = new GamePoll(gameState, () => {
        // Lets Svelte know the game state has changed so it can re-evaulate
        // all related data bindings.
        $$invalidate('gameState', gameState);
      });
      gamePoll.start();

      /**
       * Fires off a player move request to the backend API initiated from
       * a player interacting with the board.
       * @param  {Event} event Custom event dispatched from the game board
       */
      function handleMove(event) {
        const spotX = event.detail.x;
        const spotY = event.detail.y;
        $$invalidate('allowMove', allowMove = false);
        fetch(`/api/v1/game/${gameId}/move/${spotX}/${spotY}`);
      }

      /**
       * Toggled the player's view of the board between the current game board
       * and the projected board state.
       * @param  {Event} event DOM event
       */
      function handleProjected(event) {
        if (event.target.checked) {
          $$invalidate('allowMove', allowMove = false);
          $$invalidate('spots', spots = gameState.spotsProjected);
        } else {
          $$invalidate('allowMove', allowMove = true);
          $$invalidate('spots', spots = gameState.spotsCurrent);
        }
      }

    	const writable_props = ['gameId'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('gameId' in $$props) $$invalidate('gameId', gameId = $$props.gameId);
    	};

    	let init, gameOver, turnCompleted, allowMove, spots;

    	$$self.$$.update = ($$dirty = { gameState: 1, gameOver: 1 }) => {
    		if ($$dirty.gameState) { $$invalidate('init', init = gameState.init); }
    		if ($$dirty.gameState) { $$invalidate('gameOver', gameOver = gameState.completed); }
    		if ($$dirty.gameState) { $$invalidate('turnCompleted', turnCompleted = gameState.turnCompleted); }
    		if ($$dirty.gameOver || $$dirty.gameState) { $$invalidate('allowMove', allowMove = !gameOver && gameState.timeStarted > 0); }
    		if ($$dirty.gameState) { $$invalidate('spots', spots = gameState.spotsCurrent); }
    	};

    	return {
    		gameId,
    		gameState,
    		handleMove,
    		handleProjected,
    		init,
    		gameOver,
    		turnCompleted,
    		allowMove,
    		spots
    	};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, ["gameId"]);
    	}

    	get gameId() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set gameId(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /**
     * Controller functions for the game's main menu on the home page
     */

    /**
     * Sends a create game request to the backend API. Redirects the browser to
     * the new game on success.
     * @param  {Int} playerCount Number of total players to be in the game
     * @param  {Int} aiCount Number of AI players to be in the game
     * @param  {Int} aiStrength Strength of the AI. Higher is more difficult.
     */
    async function createGame(playerCount, aiCount, aiStrength) {
      // Build the request options
      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          player_count: playerCount,
          ai_count: aiCount,
          ai_strength: aiStrength
        })
      };

      // Fire the new game request
      return fetch(`/api/v1/game/new`, options)
        .then(response => {
          if (200 == response.status) {
            return response.json();
          } else {
            throw response.statusText;
          }
        })
        .then(data => {
          // On successful creation of new game, redirect the browser to the game.
          const gameId = data["game"]["game_id"];
          window.location.assign(`/game/${gameId}`);
        })
        .catch(() => {
          return;
        });
    }

    /* src/quagen/ui/menu/App.svelte generated by Svelte v3.9.1 */

    const file$7 = "src/quagen/ui/menu/App.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.difficulty = list[i];
    	return child_ctx;
    }

    // (116:8) {#each difficulties as difficulty}
    function create_each_block$2(ctx) {
    	var button, t0_value = ctx.difficulty[0] + "", t0, t1, button_difficulty_value, dispose;

    	return {
    		c: function create() {
    			button = element("button");
    			t0 = text(t0_value);
    			t1 = space();
    			attr(button, "class", "button-difficulty svelte-1czfe8e");
    			attr(button, "difficulty", button_difficulty_value = ctx.difficulty[1]);
    			toggle_class(button, "button-difficulty-selected", ctx.aiStrength == ctx.difficulty[1]);
    			add_location(button, file$7, 116, 10, 2246);
    			dispose = listen(button, "mouseup", ctx.changeDifficulty);
    		},

    		m: function mount(target, anchor) {
    			insert(target, button, anchor);
    			append(button, t0);
    			append(button, t1);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.aiStrength || changed.difficulties)) {
    				toggle_class(button, "button-difficulty-selected", ctx.aiStrength == ctx.difficulty[1]);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(button);
    			}

    			dispose();
    		}
    	};
    }

    function create_fragment$7(ctx) {
    	var div6, div0, img, t0, div5, div3, div1, button0, t2, div2, t3, div4, button1, dispose;

    	var each_value = ctx.difficulties;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	return {
    		c: function create() {
    			div6 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div5 = element("div");
    			div3 = element("div");
    			div1 = element("div");
    			button0 = element("button");
    			button0.textContent = "Play AI";
    			t2 = space();
    			div2 = element("div");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			div4 = element("div");
    			button1 = element("button");
    			button1.textContent = "Play Friend";
    			attr(img, "src", "/img/intro.gif");
    			attr(img, "alt", "Demo gif");
    			add_location(img, file$7, 100, 4, 1827);
    			attr(div0, "class", "block svelte-1czfe8e");
    			add_location(div0, file$7, 99, 2, 1803);
    			attr(button0, "class", "button-play button-ai svelte-1czfe8e");
    			add_location(button0, file$7, 108, 8, 1996);
    			add_location(div1, file$7, 107, 6, 1982);
    			attr(div2, "class", "difficulty svelte-1czfe8e");
    			add_location(div2, file$7, 114, 6, 2168);
    			attr(div3, "class", "option-ai svelte-1czfe8e");
    			add_location(div3, file$7, 104, 4, 1907);
    			attr(button1, "class", "button-play button-friend svelte-1czfe8e");
    			add_location(button1, file$7, 129, 6, 2619);
    			attr(div4, "class", "option-friend svelte-1czfe8e");
    			add_location(div4, file$7, 128, 4, 2585);
    			attr(div5, "class", "block svelte-1czfe8e");
    			add_location(div5, file$7, 103, 2, 1883);
    			attr(div6, "class", "container svelte-1czfe8e");
    			add_location(div6, file$7, 98, 0, 1777);

    			dispose = [
    				listen(button0, "mouseup", ctx.playAi),
    				listen(button1, "mouseup", ctx.playFriend)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div6, anchor);
    			append(div6, div0);
    			append(div0, img);
    			append(div6, t0);
    			append(div6, div5);
    			append(div5, div3);
    			append(div3, div1);
    			append(div1, button0);
    			append(div3, t2);
    			append(div3, div2);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			append(div5, t3);
    			append(div5, div4);
    			append(div4, button1);
    		},

    		p: function update(changed, ctx) {
    			if (changed.difficulties || changed.aiStrength) {
    				each_value = ctx.difficulties;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div2, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div6);
    			}

    			destroy_each(each_blocks, detaching);

    			run_all(dispose);
    		}
    	};
    }

    let playerCount = 2;

    function instance$7($$self, $$props, $$invalidate) {
    	// Possible game difficulties for an AI opponent
      const difficulties = [["Easy", 0], ["Medium", 1], ["Hard", 2]];

      // Number of AI players in the game
      let aiCount = 0;

      // Higher AI strength means higher difficulty
      let aiStrength = 0;

      /**
       * Creates a game with a single AI opponent
       */
      function playAi() {
        aiCount = 1;
        createGame(playerCount, aiCount, aiStrength);
      }

      /**
       * Creates a game with a single human opponent
       */
      function playFriend() {
        createGame(playerCount, aiCount, aiStrength);
      }

      /**
       * Changes the AI difficulty based on player button toggle
       * @param  {Event} event DOM event from difficulty buttons
       */
      function changeDifficulty(event) {
        $$invalidate('aiStrength', aiStrength = event.target.getAttribute("difficulty"));
      }

    	return {
    		difficulties,
    		aiStrength,
    		playAi,
    		playFriend,
    		changeDifficulty
    	};
    }

    class App$1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, []);
    	}
    }

    exports.Game = App;
    exports.Menu = App$1;
    exports.detectCapabilities = detectCapabilities;

    return exports;

}({}));
//# sourceMappingURL=ui.js.map

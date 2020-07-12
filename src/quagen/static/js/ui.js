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
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
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
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
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
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
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
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
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
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
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
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
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

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
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
        $capture_state() { }
        $inject_state() { }
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

    /* src/quagen/ui/game/Spot.svelte generated by Svelte v3.24.0 */
    const file = "src/quagen/ui/game/Spot.svelte";

    function create_fragment(ctx) {
    	let button;
    	let button_disabled_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			attr_dev(button, "type", "button");
    			set_style(button, "background-color", toRGBA(/*buttonColor*/ ctx[3], /*buttonOpacity*/ ctx[4]));
    			button.disabled = button_disabled_value = !/*buttonEnabled*/ ctx[5];
    			attr_dev(button, "class", "svelte-1spi4vf");
    			toggle_class(button, "outline", /*lastMove*/ ctx[2] || /*pendingMove*/ ctx[1] || /*selected*/ ctx[0]);
    			toggle_class(button, "pulse", !/*pendingMove*/ ctx[1] && !/*lastMove*/ ctx[2] && /*buttonEnabled*/ ctx[5]);
    			toggle_class(button, "selected", /*selected*/ ctx[0] && !/*pendingMove*/ ctx[1] && !/*lastMove*/ ctx[2] && /*buttonEnabled*/ ctx[5]);
    			add_location(button, file, 138, 0, 3244);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "mouseup", /*handleSelected*/ ctx[6], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*buttonColor, buttonOpacity*/ 24) {
    				set_style(button, "background-color", toRGBA(/*buttonColor*/ ctx[3], /*buttonOpacity*/ ctx[4]));
    			}

    			if (dirty & /*buttonEnabled*/ 32 && button_disabled_value !== (button_disabled_value = !/*buttonEnabled*/ ctx[5])) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}

    			if (dirty & /*lastMove, pendingMove, selected*/ 7) {
    				toggle_class(button, "outline", /*lastMove*/ ctx[2] || /*pendingMove*/ ctx[1] || /*selected*/ ctx[0]);
    			}

    			if (dirty & /*pendingMove, lastMove, buttonEnabled*/ 38) {
    				toggle_class(button, "pulse", !/*pendingMove*/ ctx[1] && !/*lastMove*/ ctx[2] && /*buttonEnabled*/ ctx[5]);
    			}

    			if (dirty & /*selected, pendingMove, lastMove, buttonEnabled*/ 39) {
    				toggle_class(button, "selected", /*selected*/ ctx[0] && !/*pendingMove*/ ctx[1] && !/*lastMove*/ ctx[2] && /*buttonEnabled*/ ctx[5]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function toRGBA(color, opacity) {
    	return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity})`;
    }

    function instance($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();

    	// Possible background colors for a spot based on state
    	const BG_COLOR_DEFAULT = [231, 231, 231];

    	const BG_COLOR_SELECTED = [240, 255, 0];
    	const BG_COLORS_PLAYER = [[0, 0, 0], [0, 140, 186], [244, 67, 54], [22, 215, 79], [255, 195, 0]];
    	let { x } = $$props;
    	let { y } = $$props;
    	let { color = -1 } = $$props;
    	let { pressures = [] } = $$props;
    	let { power = 0 } = $$props;
    	let { maxPower = 4 } = $$props;
    	let { selected = false } = $$props;
    	let { allowMove = true } = $$props;
    	let { pendingMove = false } = $$props;
    	let { lastMove = false } = $$props;

    	// The background color of the button based on current state
    	let buttonColor = BG_COLOR_DEFAULT;

    	let buttonOpacity = 1;

    	/**
     * Dispatches an event to the parent when this spot was selected by the
     * player. Depending on the settings, we may want to wait for a double
     * click before making this a move.
     */
    	function handleSelected() {
    		dispatch("selected", { x, y });
    	}

    	const writable_props = [
    		"x",
    		"y",
    		"color",
    		"pressures",
    		"power",
    		"maxPower",
    		"selected",
    		"allowMove",
    		"pendingMove",
    		"lastMove"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Spot> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Spot", $$slots, []);

    	$$self.$set = $$props => {
    		if ("x" in $$props) $$invalidate(7, x = $$props.x);
    		if ("y" in $$props) $$invalidate(8, y = $$props.y);
    		if ("color" in $$props) $$invalidate(9, color = $$props.color);
    		if ("pressures" in $$props) $$invalidate(10, pressures = $$props.pressures);
    		if ("power" in $$props) $$invalidate(11, power = $$props.power);
    		if ("maxPower" in $$props) $$invalidate(12, maxPower = $$props.maxPower);
    		if ("selected" in $$props) $$invalidate(0, selected = $$props.selected);
    		if ("allowMove" in $$props) $$invalidate(13, allowMove = $$props.allowMove);
    		if ("pendingMove" in $$props) $$invalidate(1, pendingMove = $$props.pendingMove);
    		if ("lastMove" in $$props) $$invalidate(2, lastMove = $$props.lastMove);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		BG_COLOR_DEFAULT,
    		BG_COLOR_SELECTED,
    		BG_COLORS_PLAYER,
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
    		toRGBA,
    		buttonEnabled
    	});

    	$$self.$inject_state = $$props => {
    		if ("x" in $$props) $$invalidate(7, x = $$props.x);
    		if ("y" in $$props) $$invalidate(8, y = $$props.y);
    		if ("color" in $$props) $$invalidate(9, color = $$props.color);
    		if ("pressures" in $$props) $$invalidate(10, pressures = $$props.pressures);
    		if ("power" in $$props) $$invalidate(11, power = $$props.power);
    		if ("maxPower" in $$props) $$invalidate(12, maxPower = $$props.maxPower);
    		if ("selected" in $$props) $$invalidate(0, selected = $$props.selected);
    		if ("allowMove" in $$props) $$invalidate(13, allowMove = $$props.allowMove);
    		if ("pendingMove" in $$props) $$invalidate(1, pendingMove = $$props.pendingMove);
    		if ("lastMove" in $$props) $$invalidate(2, lastMove = $$props.lastMove);
    		if ("buttonColor" in $$props) $$invalidate(3, buttonColor = $$props.buttonColor);
    		if ("buttonOpacity" in $$props) $$invalidate(4, buttonOpacity = $$props.buttonOpacity);
    		if ("buttonEnabled" in $$props) $$invalidate(5, buttonEnabled = $$props.buttonEnabled);
    	};

    	let buttonEnabled;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*selected, pendingMove, color, power, maxPower*/ 6659) {
    			$: {
    				if (selected || pendingMove) {
    					$$invalidate(3, buttonColor = BG_COLOR_SELECTED);
    					$$invalidate(4, buttonOpacity = 1);
    				} else if (0 <= color) {
    					$$invalidate(3, buttonColor = BG_COLORS_PLAYER[color]);

    					$$invalidate(4, buttonOpacity = 0 < power && power < maxPower
    					? 0.75 / maxPower * power
    					: 1);
    				} else {
    					$$invalidate(3, buttonColor = BG_COLOR_DEFAULT);
    					$$invalidate(4, buttonOpacity = 1);
    				}
    			}
    		}

    		if ($$self.$$.dirty & /*allowMove, power, maxPower*/ 14336) {
    			// If the button should be enabled at all based on current state
    			$: $$invalidate(5, buttonEnabled = allowMove && power < maxPower);
    		}
    	};

    	return [
    		selected,
    		pendingMove,
    		lastMove,
    		buttonColor,
    		buttonOpacity,
    		buttonEnabled,
    		handleSelected,
    		x,
    		y,
    		color,
    		pressures,
    		power,
    		maxPower,
    		allowMove
    	];
    }

    class Spot extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			x: 7,
    			y: 8,
    			color: 9,
    			pressures: 10,
    			power: 11,
    			maxPower: 12,
    			selected: 0,
    			allowMove: 13,
    			pendingMove: 1,
    			lastMove: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Spot",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*x*/ ctx[7] === undefined && !("x" in props)) {
    			console.warn("<Spot> was created without expected prop 'x'");
    		}

    		if (/*y*/ ctx[8] === undefined && !("y" in props)) {
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

    /* src/quagen/ui/game/Board.svelte generated by Svelte v3.24.0 */
    const file$1 = "src/quagen/ui/game/Board.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	child_ctx[18] = i;
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	child_ctx[16] = i;
    	return child_ctx;
    }

    // (109:4) {#each { length: width } as _, x}
    function create_each_block_1(ctx) {
    	let spot;
    	let current;

    	const spot_spread_levels = [
    		{ x: /*x*/ ctx[18] },
    		{ y: /*y*/ ctx[16] },
    		{ allowMove: /*allowMove*/ ctx[0] },
    		/*spots*/ ctx[3][/*x*/ ctx[18]][/*y*/ ctx[16]],
    		{
    			selected: /*selectedX*/ ctx[6] == /*x*/ ctx[18] && /*selectedY*/ ctx[7] == /*y*/ ctx[16]
    		},
    		{
    			lastMove: isLastMove(/*lastMoves*/ ctx[9], /*x*/ ctx[18], /*y*/ ctx[16])
    		},
    		{
    			pendingMove: /*selectedX*/ ctx[6] == /*x*/ ctx[18] && /*selectedY*/ ctx[7] == /*y*/ ctx[16] && /*pendingMove*/ ctx[8]
    		}
    	];

    	let spot_props = {};

    	for (let i = 0; i < spot_spread_levels.length; i += 1) {
    		spot_props = assign(spot_props, spot_spread_levels[i]);
    	}

    	spot = new Spot({ props: spot_props, $$inline: true });
    	spot.$on("selected", /*handleSpotSelected*/ ctx[4]);

    	const block = {
    		c: function create() {
    			create_component(spot.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(spot, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const spot_changes = (dirty & /*allowMove, spots, selectedX, selectedY, isLastMove, lastMoves, pendingMove*/ 1001)
    			? get_spread_update(spot_spread_levels, [
    					spot_spread_levels[0],
    					spot_spread_levels[1],
    					dirty & /*allowMove*/ 1 && { allowMove: /*allowMove*/ ctx[0] },
    					dirty & /*spots*/ 8 && get_spread_object(/*spots*/ ctx[3][/*x*/ ctx[18]][/*y*/ ctx[16]]),
    					dirty & /*selectedX, selectedY*/ 192 && {
    						selected: /*selectedX*/ ctx[6] == /*x*/ ctx[18] && /*selectedY*/ ctx[7] == /*y*/ ctx[16]
    					},
    					dirty & /*isLastMove, lastMoves*/ 544 && {
    						lastMove: isLastMove(/*lastMoves*/ ctx[9], /*x*/ ctx[18], /*y*/ ctx[16])
    					},
    					dirty & /*selectedX, selectedY, pendingMove*/ 448 && {
    						pendingMove: /*selectedX*/ ctx[6] == /*x*/ ctx[18] && /*selectedY*/ ctx[7] == /*y*/ ctx[16] && /*pendingMove*/ ctx[8]
    					}
    				])
    			: {};

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

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(109:4) {#each { length: width } as _, x}",
    		ctx
    	});

    	return block;
    }

    // (108:2) {#each { length: height } as _, y}
    function create_each_block(ctx) {
    	let t;
    	let br;
    	let current;
    	let each_value_1 = { length: /*width*/ ctx[1] };
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			br = element("br");
    			add_location(br, file$1, 119, 4, 3647);
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, t, anchor);
    			insert_dev(target, br, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*allowMove, spots, selectedX, selectedY, isLastMove, lastMoves, pendingMove, handleSpotSelected, width*/ 1019) {
    				each_value_1 = { length: /*width*/ ctx[1] };
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(t.parentNode, t);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(br);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(108:2) {#each { length: height } as _, y}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let current;
    	let each_value = { length: /*height*/ ctx[2] };
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "container svelte-3bn73f");
    			set_style(div, "min-width", /*containerWidth*/ ctx[10] + "px");
    			add_location(div, file$1, 105, 0, 3115);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*width, allowMove, spots, selectedX, selectedY, isLastMove, lastMoves, pendingMove, handleSpotSelected, height*/ 1023) {
    				each_value = { length: /*height*/ ctx[2] };
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty & /*containerWidth*/ 1024) {
    				set_style(div, "min-width", /*containerWidth*/ ctx[10] + "px");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
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
    	let { turnCompleted = 0 } = $$props;
    	let { width = 0 } = $$props;
    	let { height = 0 } = $$props;
    	let { spots = [] } = $$props;
    	let { allowMove = true } = $$props;
    	let { moveHistory = [] } = $$props;

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
    		if (!isTouching() || selectedX == eventX && selectedY == eventY) {
    			$$invalidate(8, pendingMove = true);
    			$$invalidate(0, allowMove = false);
    			$$invalidate(6, selectedX = eventX);
    			$$invalidate(7, selectedY = eventY);
    			dispatch("move", { x: eventX, y: eventY });
    		} else {
    			$$invalidate(6, selectedX = eventX);
    			$$invalidate(7, selectedY = eventY);
    		}
    	}

    	const writable_props = ["turnCompleted", "width", "height", "spots", "allowMove", "moveHistory"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Board> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Board", $$slots, []);

    	$$self.$set = $$props => {
    		if ("turnCompleted" in $$props) $$invalidate(11, turnCompleted = $$props.turnCompleted);
    		if ("width" in $$props) $$invalidate(1, width = $$props.width);
    		if ("height" in $$props) $$invalidate(2, height = $$props.height);
    		if ("spots" in $$props) $$invalidate(3, spots = $$props.spots);
    		if ("allowMove" in $$props) $$invalidate(0, allowMove = $$props.allowMove);
    		if ("moveHistory" in $$props) $$invalidate(12, moveHistory = $$props.moveHistory);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		Spot,
    		isTouching,
    		turnCompleted,
    		width,
    		height,
    		spots,
    		allowMove,
    		moveHistory,
    		handleSpotSelected,
    		isLastMove,
    		selectedX,
    		selectedY,
    		pendingMove,
    		lastMoves,
    		containerWidth
    	});

    	$$self.$inject_state = $$props => {
    		if ("turnCompleted" in $$props) $$invalidate(11, turnCompleted = $$props.turnCompleted);
    		if ("width" in $$props) $$invalidate(1, width = $$props.width);
    		if ("height" in $$props) $$invalidate(2, height = $$props.height);
    		if ("spots" in $$props) $$invalidate(3, spots = $$props.spots);
    		if ("allowMove" in $$props) $$invalidate(0, allowMove = $$props.allowMove);
    		if ("moveHistory" in $$props) $$invalidate(12, moveHistory = $$props.moveHistory);
    		if ("selectedX" in $$props) $$invalidate(6, selectedX = $$props.selectedX);
    		if ("selectedY" in $$props) $$invalidate(7, selectedY = $$props.selectedY);
    		if ("pendingMove" in $$props) $$invalidate(8, pendingMove = $$props.pendingMove);
    		if ("lastMoves" in $$props) $$invalidate(9, lastMoves = $$props.lastMoves);
    		if ("containerWidth" in $$props) $$invalidate(10, containerWidth = $$props.containerWidth);
    	};

    	let selectedX;
    	let selectedY;
    	let pendingMove;
    	let lastMoves;
    	let containerWidth;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*turnCompleted*/ 2048) {
    			// This player's selected spot on the board, or -1 if none
    			$: $$invalidate(6, selectedX = turnCompleted ? -1 : -1);
    		}

    		if ($$self.$$.dirty & /*turnCompleted*/ 2048) {
    			$: $$invalidate(7, selectedY = turnCompleted ? -1 : -1);
    		}

    		if ($$self.$$.dirty & /*turnCompleted*/ 2048) {
    			// if we sent off a move from this player to the backend API
    			$: $$invalidate(8, pendingMove = turnCompleted ? false : false);
    		}

    		if ($$self.$$.dirty & /*moveHistory*/ 4096) {
    			// the last set of moves made by each player in the format of
    			// [(color0, x, y), (color1, x, y)]
    			$: $$invalidate(9, lastMoves = moveHistory.length > 0 ? moveHistory.slice(-1)[0] : []);
    		}

    		if ($$self.$$.dirty & /*width*/ 2) {
    			// Change the viewport of a mobile device so the whole board is visible
    			// on page load
    			$: $$invalidate(10, containerWidth = width * 26 + 75);
    		}

    		if ($$self.$$.dirty & /*width, containerWidth*/ 1026) {
    			$: {
    				const viewport = document.getElementById("viewport");

    				if (0 < width && containerWidth > screen.width) {
    					viewport.setAttribute("content", `width=${containerWidth}`);
    				}
    			}
    		}
    	};

    	return [
    		allowMove,
    		width,
    		height,
    		spots,
    		handleSpotSelected,
    		isLastMove,
    		selectedX,
    		selectedY,
    		pendingMove,
    		lastMoves,
    		containerWidth,
    		turnCompleted,
    		moveHistory
    	];
    }

    class Board extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			turnCompleted: 11,
    			width: 1,
    			height: 2,
    			spots: 3,
    			allowMove: 0,
    			moveHistory: 12,
    			handleSpotSelected: 4,
    			isLastMove: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Board",
    			options,
    			id: create_fragment$1.name
    		});
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
    		return this.$$.ctx[4];
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

    /* src/quagen/ui/game/Score.svelte generated by Svelte v3.24.0 */

    const file$2 = "src/quagen/ui/game/Score.svelte";

    // (93:2) {#if crown}
    function create_if_block_1(ctx) {
    	let div;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			if (img.src !== (img_src_value = "/img/crown.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "width", "35px");
    			attr_dev(img, "alt", "Crown!");
    			add_location(img, file$2, 94, 6, 1743);
    			attr_dev(div, "class", "crown svelte-jyd0vx");
    			add_location(div, file$2, 93, 4, 1717);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(93:2) {#if crown}",
    		ctx
    	});

    	return block;
    }

    // (104:4) {:else}
    function create_else_block(ctx) {
    	let div0;
    	let t0;
    	let t1;
    	let div1;
    	let t2;
    	let t3;
    	let div2;
    	let t4;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = text(/*controlled*/ ctx[2]);
    			t1 = space();
    			div1 = element("div");
    			t2 = text(/*projected*/ ctx[4]);
    			t3 = space();
    			div2 = element("div");
    			t4 = text(/*pressuring*/ ctx[3]);
    			add_location(div0, file$2, 104, 6, 2014);
    			add_location(div1, file$2, 105, 6, 2044);
    			add_location(div2, file$2, 106, 6, 2073);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*controlled*/ 4) set_data_dev(t0, /*controlled*/ ctx[2]);
    			if (dirty & /*projected*/ 16) set_data_dev(t2, /*projected*/ ctx[4]);
    			if (dirty & /*pressuring*/ 8) set_data_dev(t4, /*pressuring*/ ctx[3]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(104:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (100:4) {#if key}
    function create_if_block(ctx) {
    	let div0;
    	let t1;
    	let div1;
    	let t3;
    	let div2;

    	const block = {
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
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div2, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(100:4) {#if key}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div1;
    	let t;
    	let div0;
    	let div0_class_value;
    	let if_block0 = /*crown*/ ctx[5] && create_if_block_1(ctx);

    	function select_block_type(ctx, dirty) {
    		if (/*key*/ ctx[0]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block1 = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			if (if_block0) if_block0.c();
    			t = space();
    			div0 = element("div");
    			if_block1.c();
    			attr_dev(div0, "class", div0_class_value = "inner bg-color-" + /*color*/ ctx[1] + " svelte-jyd0vx");
    			toggle_class(div0, "crown", /*crown*/ ctx[5]);
    			toggle_class(div0, "key", /*key*/ ctx[0]);
    			toggle_class(div0, "player", !/*key*/ ctx[0]);
    			add_location(div0, file$2, 98, 2, 1820);
    			attr_dev(div1, "class", "container svelte-jyd0vx");
    			add_location(div1, file$2, 90, 0, 1674);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div1, t);
    			append_dev(div1, div0);
    			if_block1.m(div0, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*crown*/ ctx[5]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(div1, t);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div0, null);
    				}
    			}

    			if (dirty & /*color*/ 2 && div0_class_value !== (div0_class_value = "inner bg-color-" + /*color*/ ctx[1] + " svelte-jyd0vx")) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			if (dirty & /*color, crown*/ 34) {
    				toggle_class(div0, "crown", /*crown*/ ctx[5]);
    			}

    			if (dirty & /*color, key*/ 3) {
    				toggle_class(div0, "key", /*key*/ ctx[0]);
    			}

    			if (dirty & /*color, key*/ 3) {
    				toggle_class(div0, "player", !/*key*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block0) if_block0.d();
    			if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { key = false } = $$props;
    	let { color = 0 } = $$props;
    	let { gameOver = false } = $$props;
    	let { winner = false } = $$props;
    	let { controlled = 0 } = $$props;
    	let { pressuring = 0 } = $$props;
    	let { projected = 0 } = $$props;
    	const writable_props = ["key", "color", "gameOver", "winner", "controlled", "pressuring", "projected"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Score> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Score", $$slots, []);

    	$$self.$set = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("color" in $$props) $$invalidate(1, color = $$props.color);
    		if ("gameOver" in $$props) $$invalidate(6, gameOver = $$props.gameOver);
    		if ("winner" in $$props) $$invalidate(7, winner = $$props.winner);
    		if ("controlled" in $$props) $$invalidate(2, controlled = $$props.controlled);
    		if ("pressuring" in $$props) $$invalidate(3, pressuring = $$props.pressuring);
    		if ("projected" in $$props) $$invalidate(4, projected = $$props.projected);
    	};

    	$$self.$capture_state = () => ({
    		key,
    		color,
    		gameOver,
    		winner,
    		controlled,
    		pressuring,
    		projected,
    		crown
    	});

    	$$self.$inject_state = $$props => {
    		if ("key" in $$props) $$invalidate(0, key = $$props.key);
    		if ("color" in $$props) $$invalidate(1, color = $$props.color);
    		if ("gameOver" in $$props) $$invalidate(6, gameOver = $$props.gameOver);
    		if ("winner" in $$props) $$invalidate(7, winner = $$props.winner);
    		if ("controlled" in $$props) $$invalidate(2, controlled = $$props.controlled);
    		if ("pressuring" in $$props) $$invalidate(3, pressuring = $$props.pressuring);
    		if ("projected" in $$props) $$invalidate(4, projected = $$props.projected);
    		if ("crown" in $$props) $$invalidate(5, crown = $$props.crown);
    	};

    	let crown;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*gameOver, winner*/ 192) {
    			// We give the winner of the game a crown
    			$: $$invalidate(5, crown = gameOver && winner);
    		}
    	};

    	return [key, color, controlled, pressuring, projected, crown, gameOver, winner];
    }

    class Score extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			key: 0,
    			color: 1,
    			gameOver: 6,
    			winner: 7,
    			controlled: 2,
    			pressuring: 3,
    			projected: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Score",
    			options,
    			id: create_fragment$2.name
    		});
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

    /* src/quagen/ui/game/Scores.svelte generated by Svelte v3.24.0 */
    const file$3 = "src/quagen/ui/game/Scores.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	child_ctx[6] = i;
    	return child_ctx;
    }

    // (63:2) {#if gameOver}
    function create_if_block$1(ctx) {
    	let div;

    	function select_block_type(ctx, dirty) {
    		if (/*tied*/ ctx[2]) return create_if_block_1$1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "gameover svelte-n38d5k");
    			add_location(div, file$3, 63, 4, 1269);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(63:2) {#if gameOver}",
    		ctx
    	});

    	return block;
    }

    // (67:6) {:else}
    function create_else_block$1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "This game has ended!";
    			attr_dev(p, "class", "svelte-n38d5k");
    			add_location(p, file$3, 67, 8, 1376);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(67:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (65:6) {#if tied}
    function create_if_block_1$1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "This game has ended in a tie!";
    			attr_dev(p, "class", "svelte-n38d5k");
    			add_location(p, file$3, 65, 8, 1317);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(65:6) {#if tied}",
    		ctx
    	});

    	return block;
    }

    // (75:4) {#each scores as score, i}
    function create_each_block$1(ctx) {
    	let score;
    	let current;

    	const score_spread_levels = [
    		{ color: /*i*/ ctx[6] },
    		{ gameOver: /*gameOver*/ ctx[0] },
    		{
    			winner: isWinner(/*i*/ ctx[6], /*scores*/ ctx[1])
    		},
    		/*score*/ ctx[4]
    	];

    	let score_props = {};

    	for (let i = 0; i < score_spread_levels.length; i += 1) {
    		score_props = assign(score_props, score_spread_levels[i]);
    	}

    	score = new Score({ props: score_props, $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(score.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(score, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const score_changes = (dirty & /*gameOver, isWinner, scores*/ 3)
    			? get_spread_update(score_spread_levels, [
    					score_spread_levels[0],
    					dirty & /*gameOver*/ 1 && { gameOver: /*gameOver*/ ctx[0] },
    					dirty & /*isWinner, scores*/ 2 && {
    						winner: isWinner(/*i*/ ctx[6], /*scores*/ ctx[1])
    					},
    					dirty & /*scores*/ 2 && get_spread_object(/*score*/ ctx[4])
    				])
    			: {};

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

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(75:4) {#each scores as score, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div1;
    	let t0;
    	let div0;
    	let score;
    	let t1;
    	let current;
    	let if_block = /*gameOver*/ ctx[0] && create_if_block$1(ctx);
    	score = new Score({ props: { key: true }, $$inline: true });
    	let each_value = /*scores*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			div0 = element("div");
    			create_component(score.$$.fragment);
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "container svelte-n38d5k");
    			add_location(div0, file$3, 72, 2, 1438);
    			add_location(div1, file$3, 60, 0, 1241);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			if (if_block) if_block.m(div1, null);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			mount_component(score, div0, null);
    			append_dev(div0, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*gameOver*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(div1, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*gameOver, isWinner, scores*/ 3) {
    				each_value = /*scores*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div0, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(score.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(score.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    			destroy_component(score);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
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
    	let { gameOver = false } = $$props;
    	let { scores = [] } = $$props;
    	let { leaders = [] } = $$props;
    	const writable_props = ["gameOver", "scores", "leaders"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Scores> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Scores", $$slots, []);

    	$$self.$set = $$props => {
    		if ("gameOver" in $$props) $$invalidate(0, gameOver = $$props.gameOver);
    		if ("scores" in $$props) $$invalidate(1, scores = $$props.scores);
    		if ("leaders" in $$props) $$invalidate(3, leaders = $$props.leaders);
    	};

    	$$self.$capture_state = () => ({
    		Score,
    		gameOver,
    		scores,
    		leaders,
    		isWinner,
    		tied
    	});

    	$$self.$inject_state = $$props => {
    		if ("gameOver" in $$props) $$invalidate(0, gameOver = $$props.gameOver);
    		if ("scores" in $$props) $$invalidate(1, scores = $$props.scores);
    		if ("leaders" in $$props) $$invalidate(3, leaders = $$props.leaders);
    		if ("tied" in $$props) $$invalidate(2, tied = $$props.tied);
    	};

    	let tied;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*gameOver, leaders*/ 9) {
    			// When the game has ended with a tie score
    			$: $$invalidate(2, tied = gameOver && leaders.length > 0);
    		}
    	};

    	return [gameOver, scores, tied, leaders];
    }

    class Scores extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { gameOver: 0, scores: 1, leaders: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Scores",
    			options,
    			id: create_fragment$3.name
    		});
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

    /* src/quagen/ui/game/Settings.svelte generated by Svelte v3.24.0 */

    const file$4 = "src/quagen/ui/game/Settings.svelte";

    function create_fragment$4(ctx) {
    	let div;
    	let input;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			t = text("\n  See projected board");
    			attr_dev(input, "type", "checkbox");
    			add_location(input, file$4, 13, 2, 127);
    			attr_dev(div, "class", "svelte-jy7duu");
    			add_location(div, file$4, 12, 0, 119);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);
    			append_dev(div, t);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*change_handler*/ ctx[0], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Settings> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Settings", $$slots, []);

    	function change_handler(event) {
    		bubble($$self, event);
    	}

    	return [change_handler];
    }

    class Settings extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Settings",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/quagen/ui/game/StartPrompt.svelte generated by Svelte v3.24.0 */

    const file$5 = "src/quagen/ui/game/StartPrompt.svelte";

    // (70:2) {:else}
    function create_else_block$2(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "The game will start when you make your first move.";
    			attr_dev(p, "class", "svelte-1pfd73t");
    			add_location(p, file$5, 70, 4, 1473);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(70:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (62:2) {#if vsHumans}
    function create_if_block$2(ctx) {
    	let p0;
    	let t1;
    	let p1;
    	let span;
    	let t2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			p0.textContent = "The game will start after all players have made their first move. To\n      invite a friend to the game, share the following link:";
    			t1 = space();
    			p1 = element("p");
    			span = element("span");
    			t2 = text(/*shareUrl*/ ctx[1]);
    			attr_dev(p0, "class", "svelte-1pfd73t");
    			add_location(p0, file$5, 62, 4, 1209);
    			attr_dev(span, "id", "share-url");
    			attr_dev(span, "class", "svelte-1pfd73t");
    			add_location(span, file$5, 67, 6, 1411);
    			attr_dev(p1, "class", "share svelte-1pfd73t");
    			add_location(p1, file$5, 66, 4, 1362);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, span);
    			append_dev(span, t2);

    			if (!mounted) {
    				dispose = listen_dev(p1, "mouseup", handleShare, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*shareUrl*/ 2) set_data_dev(t2, /*shareUrl*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(62:2) {#if vsHumans}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div;

    	function select_block_type(ctx, dirty) {
    		if (/*vsHumans*/ ctx[0]) return create_if_block$2;
    		return create_else_block$2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "svelte-1pfd73t");
    			add_location(div, file$5, 60, 0, 1182);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
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
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
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
    	let { gameId = 0 } = $$props;
    	let { vsHumans = false } = $$props;
    	const writable_props = ["gameId", "vsHumans"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<StartPrompt> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("StartPrompt", $$slots, []);

    	$$self.$set = $$props => {
    		if ("gameId" in $$props) $$invalidate(2, gameId = $$props.gameId);
    		if ("vsHumans" in $$props) $$invalidate(0, vsHumans = $$props.vsHumans);
    	};

    	$$self.$capture_state = () => ({ gameId, vsHumans, handleShare, shareUrl });

    	$$self.$inject_state = $$props => {
    		if ("gameId" in $$props) $$invalidate(2, gameId = $$props.gameId);
    		if ("vsHumans" in $$props) $$invalidate(0, vsHumans = $$props.vsHumans);
    		if ("shareUrl" in $$props) $$invalidate(1, shareUrl = $$props.shareUrl);
    	};

    	let shareUrl;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*gameId*/ 4) {
    			// Url to share this game with others
    			$: $$invalidate(1, shareUrl = `${window.location.protocol}//${window.location.host}/game/${gameId}`);
    		}
    	};

    	return [vsHumans, shareUrl, gameId];
    }

    class StartPrompt extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { gameId: 2, vsHumans: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "StartPrompt",
    			options,
    			id: create_fragment$5.name
    		});
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

    /* src/quagen/ui/game/App.svelte generated by Svelte v3.24.0 */
    const file$6 = "src/quagen/ui/game/App.svelte";

    // (93:0) {:else}
    function create_else_block_1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Loading...";
    			add_location(p, file$6, 94, 2, 2992);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(93:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (73:0) {#if init}
    function create_if_block$3(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let t0;
    	let settings;
    	let t1;
    	let board;
    	let current;
    	const if_block_creators = [create_if_block_1$2, create_else_block$3];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*turnCompleted*/ ctx[3] == 0) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_1(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	settings = new Settings({ $$inline: true });
    	settings.$on("change", /*handleProjected*/ ctx[7]);

    	board = new Board({
    			props: {
    				height: /*gameState*/ ctx[0].getSetting("dimension_x"),
    				width: /*gameState*/ ctx[0].getSetting("dimension_y"),
    				moveHistory: /*gameState*/ ctx[0].moveHistory,
    				allowMove: /*allowMove*/ ctx[4],
    				spots: /*spots*/ ctx[5],
    				turnCompleted: /*turnCompleted*/ ctx[3]
    			},
    			$$inline: true
    		});

    	board.$on("move", /*handleMove*/ ctx[6]);

    	const block = {
    		c: function create() {
    			if_block.c();
    			t0 = space();
    			create_component(settings.$$.fragment);
    			t1 = space();
    			create_component(board.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(settings, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(board, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
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

    			const board_changes = {};
    			if (dirty & /*gameState*/ 1) board_changes.height = /*gameState*/ ctx[0].getSetting("dimension_x");
    			if (dirty & /*gameState*/ 1) board_changes.width = /*gameState*/ ctx[0].getSetting("dimension_y");
    			if (dirty & /*gameState*/ 1) board_changes.moveHistory = /*gameState*/ ctx[0].moveHistory;
    			if (dirty & /*allowMove*/ 16) board_changes.allowMove = /*allowMove*/ ctx[4];
    			if (dirty & /*spots*/ 32) board_changes.spots = /*spots*/ ctx[5];
    			if (dirty & /*turnCompleted*/ 8) board_changes.turnCompleted = /*turnCompleted*/ ctx[3];
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
    			if (detaching) detach_dev(t0);
    			destroy_component(settings, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(board, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(73:0) {#if init}",
    		ctx
    	});

    	return block;
    }

    // (79:2) {:else}
    function create_else_block$3(ctx) {
    	let scores;
    	let current;

    	scores = new Scores({
    			props: {
    				gameOver: /*gameOver*/ ctx[2],
    				scores: /*gameState*/ ctx[0].scores
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(scores.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(scores, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const scores_changes = {};
    			if (dirty & /*gameOver*/ 4) scores_changes.gameOver = /*gameOver*/ ctx[2];
    			if (dirty & /*gameState*/ 1) scores_changes.scores = /*gameState*/ ctx[0].scores;
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

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$3.name,
    		type: "else",
    		source: "(79:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (76:2) {#if turnCompleted == 0}
    function create_if_block_1$2(ctx) {
    	let startprompt;
    	let current;

    	startprompt = new StartPrompt({
    			props: {
    				gameId: /*gameState*/ ctx[0].gameId,
    				vsHumans: /*gameState*/ ctx[0].isVsHuman()
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(startprompt.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(startprompt, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const startprompt_changes = {};
    			if (dirty & /*gameState*/ 1) startprompt_changes.gameId = /*gameState*/ ctx[0].gameId;
    			if (dirty & /*gameState*/ 1) startprompt_changes.vsHumans = /*gameState*/ ctx[0].isVsHuman();
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

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(76:2) {#if turnCompleted == 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$3, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*init*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
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
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { gameId = 0 } = $$props;

    	// Contains the current game data/state as retrieved from the backend API
    	let gameState = new GameState(gameId);

    	// Fires off a repeated call to the backend API to grab the latest game
    	// state. Yes, this should be sockets instead of short polling.
    	const gamePoll = new GamePoll(gameState,
    	() => {
    			// Lets Svelte know the game state has changed so it can re-evaulate
    			// all related data bindings.
    			$$invalidate(0, gameState);
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
    		$$invalidate(4, allowMove = false);
    		fetch(`/api/v1/game/${gameId}/move/${spotX}/${spotY}`);
    	}

    	/**
     * Toggled the player's view of the board between the current game board
     * and the projected board state.
     * @param  {Event} event DOM event
     */
    	function handleProjected(event) {
    		if (event.target.checked) {
    			$$invalidate(4, allowMove = false);
    			$$invalidate(5, spots = gameState.spotsProjected);
    		} else {
    			$$invalidate(4, allowMove = true);
    			$$invalidate(5, spots = gameState.spotsCurrent);
    		}
    	}

    	const writable_props = ["gameId"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$set = $$props => {
    		if ("gameId" in $$props) $$invalidate(8, gameId = $$props.gameId);
    	};

    	$$self.$capture_state = () => ({
    		GameState,
    		GamePoll,
    		Board,
    		Scores,
    		Settings,
    		StartPrompt,
    		gameId,
    		gameState,
    		gamePoll,
    		handleMove,
    		handleProjected,
    		init,
    		gameOver,
    		turnCompleted,
    		allowMove,
    		spots
    	});

    	$$self.$inject_state = $$props => {
    		if ("gameId" in $$props) $$invalidate(8, gameId = $$props.gameId);
    		if ("gameState" in $$props) $$invalidate(0, gameState = $$props.gameState);
    		if ("init" in $$props) $$invalidate(1, init = $$props.init);
    		if ("gameOver" in $$props) $$invalidate(2, gameOver = $$props.gameOver);
    		if ("turnCompleted" in $$props) $$invalidate(3, turnCompleted = $$props.turnCompleted);
    		if ("allowMove" in $$props) $$invalidate(4, allowMove = $$props.allowMove);
    		if ("spots" in $$props) $$invalidate(5, spots = $$props.spots);
    	};

    	let init;
    	let gameOver;
    	let turnCompleted;
    	let allowMove;
    	let spots;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*gameState*/ 1) {
    			// If the game state has completed the initial population from the
    			// backend API -- don't want to show some elements until data exists.
    			$: $$invalidate(1, init = gameState.init);
    		}

    		if ($$self.$$.dirty & /*gameState*/ 1) {
    			// If the game has ended and no more play is allowed. This propagates
    			// to various components so an end game state can be shown.
    			$: $$invalidate(2, gameOver = gameState.completed);
    		}

    		if ($$self.$$.dirty & /*gameState*/ 1) {
    			// Number of turns completed/processed in this game.
    			$: $$invalidate(3, turnCompleted = gameState.turnCompleted);
    		}

    		if ($$self.$$.dirty & /*gameOver, gameState*/ 5) {
    			// If the player should be allowed to make a move on the board
    			$: $$invalidate(4, allowMove = !gameOver && gameState.timeStarted > 0);
    		}

    		if ($$self.$$.dirty & /*gameState*/ 1) {
    			// The data representation for every spot on the board -- the player can
    			// toggle different views (e.g. looking at the projected board).
    			$: $$invalidate(5, spots = gameState.spotsCurrent);
    		}
    	};

    	return [
    		gameState,
    		init,
    		gameOver,
    		turnCompleted,
    		allowMove,
    		spots,
    		handleMove,
    		handleProjected,
    		gameId
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { gameId: 8 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$6.name
    		});
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

    /* src/quagen/ui/menu/App.svelte generated by Svelte v3.24.0 */
    const file$7 = "src/quagen/ui/menu/App.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    // (116:8) {#each difficulties as difficulty}
    function create_each_block$2(ctx) {
    	let button;
    	let t0_value = /*difficulty*/ ctx[7][0] + "";
    	let t0;
    	let t1;
    	let button_difficulty_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(button, "class", "button-difficulty svelte-1czfe8e");
    			attr_dev(button, "difficulty", button_difficulty_value = /*difficulty*/ ctx[7][1]);
    			toggle_class(button, "button-difficulty-selected", /*aiStrength*/ ctx[0] == /*difficulty*/ ctx[7][1]);
    			add_location(button, file$7, 116, 10, 2246);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t0);
    			append_dev(button, t1);

    			if (!mounted) {
    				dispose = listen_dev(button, "mouseup", /*changeDifficulty*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*aiStrength, difficulties*/ 3) {
    				toggle_class(button, "button-difficulty-selected", /*aiStrength*/ ctx[0] == /*difficulty*/ ctx[7][1]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(116:8) {#each difficulties as difficulty}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let div6;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div5;
    	let div3;
    	let div1;
    	let button0;
    	let t2;
    	let div2;
    	let t3;
    	let div4;
    	let button1;
    	let mounted;
    	let dispose;
    	let each_value = /*difficulties*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
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

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			div4 = element("div");
    			button1 = element("button");
    			button1.textContent = "Play Friend";
    			if (img.src !== (img_src_value = "/img/intro.gif")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Demo gif");
    			add_location(img, file$7, 100, 4, 1827);
    			attr_dev(div0, "class", "block svelte-1czfe8e");
    			add_location(div0, file$7, 99, 2, 1803);
    			attr_dev(button0, "class", "button-play button-ai svelte-1czfe8e");
    			add_location(button0, file$7, 108, 8, 1996);
    			add_location(div1, file$7, 107, 6, 1982);
    			attr_dev(div2, "class", "difficulty svelte-1czfe8e");
    			add_location(div2, file$7, 114, 6, 2168);
    			attr_dev(div3, "class", "option-ai svelte-1czfe8e");
    			add_location(div3, file$7, 104, 4, 1907);
    			attr_dev(button1, "class", "button-play button-friend svelte-1czfe8e");
    			add_location(button1, file$7, 129, 6, 2619);
    			attr_dev(div4, "class", "option-friend svelte-1czfe8e");
    			add_location(div4, file$7, 128, 4, 2585);
    			attr_dev(div5, "class", "block svelte-1czfe8e");
    			add_location(div5, file$7, 103, 2, 1883);
    			attr_dev(div6, "class", "container svelte-1czfe8e");
    			add_location(div6, file$7, 98, 0, 1777);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div0);
    			append_dev(div0, img);
    			append_dev(div6, t0);
    			append_dev(div6, div5);
    			append_dev(div5, div3);
    			append_dev(div3, div1);
    			append_dev(div1, button0);
    			append_dev(div3, t2);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			append_dev(div5, t3);
    			append_dev(div5, div4);
    			append_dev(div4, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "mouseup", /*playAi*/ ctx[2], false, false, false),
    					listen_dev(button1, "mouseup", /*playFriend*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*difficulties, aiStrength, changeDifficulty*/ 19) {
    				each_value = /*difficulties*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
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
    			if (detaching) detach_dev(div6);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	const difficulties = [["Easy", 0], ["Medium", 1], ["Hard", 2]];

    	// Number of total players in the game
    	let playerCount = 2;

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
    		$$invalidate(0, aiStrength = event.target.getAttribute("difficulty"));
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$capture_state = () => ({
    		createGame,
    		difficulties,
    		playerCount,
    		aiCount,
    		aiStrength,
    		playAi,
    		playFriend,
    		changeDifficulty
    	});

    	$$self.$inject_state = $$props => {
    		if ("playerCount" in $$props) playerCount = $$props.playerCount;
    		if ("aiCount" in $$props) aiCount = $$props.aiCount;
    		if ("aiStrength" in $$props) $$invalidate(0, aiStrength = $$props.aiStrength);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [aiStrength, difficulties, playAi, playFriend, changeDifficulty];
    }

    class App$1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    exports.Game = App;
    exports.Menu = App$1;
    exports.detectCapabilities = detectCapabilities;

    return exports;

}({}));
//# sourceMappingURL=ui.js.map

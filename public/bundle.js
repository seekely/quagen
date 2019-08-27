
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
    'use strict';

    function noop() { }
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
    function set_style(node, key, value) {
        node.style.setProperty(key, value);
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
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
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

    const globals = (typeof window !== 'undefined' ? window : global);
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

    /* src\Spot.svelte generated by Svelte v3.8.0 */
    const { console: console_1 } = globals;

    const file = "src\\Spot.svelte";

    function create_fragment(ctx) {
    	var button, button_disabled_value, dispose;

    	return {
    		c: function create() {
    			button = element("button");
    			attr(button, "type", "button");
    			attr(button, "class", "spot svelte-8j2x3o");
    			button.disabled = button_disabled_value = !ctx.active;
    			toggle_class(button, "pending", ctx.pending);
    			add_location(button, file, 47, 0, 822);
    			dispose = listen(button, "mouseup", ctx.handleMouseUp);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, button, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.active) && button_disabled_value !== (button_disabled_value = !ctx.active)) {
    				button.disabled = button_disabled_value;
    			}

    			if (changed.pending) {
    				toggle_class(button, "pending", ctx.pending);
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

    function instance($$self, $$props, $$invalidate) {
    	let { x, y, pending = false, active = true } = $$props;

        const dispatch = createEventDispatcher();

        function handleMouseUp(event) {

            dispatch('move', {x: x, y: y});
            console.log(event);
            console.log(this);
            console.log(this.classList);
            $$invalidate('pending', pending = true);
        }

    	const writable_props = ['x', 'y', 'pending', 'active'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console_1.warn(`<Spot> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('x' in $$props) $$invalidate('x', x = $$props.x);
    		if ('y' in $$props) $$invalidate('y', y = $$props.y);
    		if ('pending' in $$props) $$invalidate('pending', pending = $$props.pending);
    		if ('active' in $$props) $$invalidate('active', active = $$props.active);
    	};

    	return { x, y, pending, active, handleMouseUp };
    }

    class Spot extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["x", "y", "pending", "active"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.x === undefined && !('x' in props)) {
    			console_1.warn("<Spot> was created without expected prop 'x'");
    		}
    		if (ctx.y === undefined && !('y' in props)) {
    			console_1.warn("<Spot> was created without expected prop 'y'");
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

    	get pending() {
    		throw new Error("<Spot>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pending(value) {
    		throw new Error("<Spot>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get active() {
    		throw new Error("<Spot>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error("<Spot>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Board.svelte generated by Svelte v3.8.0 */
    const { console: console_1$1 } = globals;

    const file$1 = "src\\Board.svelte";

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

    // (35:8) {#each { length: width } as _, x}
    function create_each_block_1(ctx) {
    	var current;

    	var spot = new Spot({
    		props: {
    		x: ctx.x,
    		y: ctx.y,
    		active: ctx.active
    	},
    		$$inline: true
    	});
    	spot.$on("move", ctx.handleMove);

    	return {
    		c: function create() {
    			spot.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(spot, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var spot_changes = {};
    			if (changed.active) spot_changes.active = ctx.active;
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

    // (34:4) {#each { length: width } as _, y}
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
    			add_location(br, file$1, 37, 8, 859);
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
    			if (changed.active || changed.width) {
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
    	var div, t0, t1, t2, t3, t4, br, t5, current;

    	var each_value = { length: ctx.width };

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
    			t0 = text("I am board of ");
    			t1 = text(ctx.width);
    			t2 = text(" width and ");
    			t3 = text(ctx.height);
    			t4 = text(" height!\n    ");
    			br = element("br");
    			t5 = space();

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			add_location(br, file$1, 31, 4, 671);
    			add_location(div, file$1, 29, 0, 608);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, t1);
    			append(div, t2);
    			append(div, t3);
    			append(div, t4);
    			append(div, br);
    			append(div, t5);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (!current || changed.width) {
    				set_data(t1, ctx.width);
    			}

    			if (!current || changed.height) {
    				set_data(t3, ctx.height);
    			}

    			if (changed.width || changed.active) {
    				each_value = { length: ctx.width };

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

    function instance$1($$self, $$props, $$invalidate) {
    	


        let { width, height, active = true, gameId } = $$props;
        const urlApi = getContext('urlApi');

        function handleMove(event) {
            console.log(event);

            const spotX = event.detail.x;
            const spotY = event.detail.y;

            $$invalidate('active', active = false);
            //button.classList.add('button-pending');
            fetch(`${ urlApi }/api/v1/game/${ gameId }/move/${ spotX }/${ spotY }`,
                {
                    mode: 'no-cors'
                });

        }

    	const writable_props = ['width', 'height', 'active', 'gameId'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console_1$1.warn(`<Board> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('width' in $$props) $$invalidate('width', width = $$props.width);
    		if ('height' in $$props) $$invalidate('height', height = $$props.height);
    		if ('active' in $$props) $$invalidate('active', active = $$props.active);
    		if ('gameId' in $$props) $$invalidate('gameId', gameId = $$props.gameId);
    	};

    	return {
    		width,
    		height,
    		active,
    		gameId,
    		handleMove
    	};
    }

    class Board extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["width", "height", "active", "gameId"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.width === undefined && !('width' in props)) {
    			console_1$1.warn("<Board> was created without expected prop 'width'");
    		}
    		if (ctx.height === undefined && !('height' in props)) {
    			console_1$1.warn("<Board> was created without expected prop 'height'");
    		}
    		if (ctx.gameId === undefined && !('gameId' in props)) {
    			console_1$1.warn("<Board> was created without expected prop 'gameId'");
    		}
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

    	get active() {
    		throw new Error("<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get gameId() {
    		throw new Error("<Board>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set gameId(value) {
    		throw new Error("<Board>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Score.svelte generated by Svelte v3.8.0 */

    const file$2 = "src\\Score.svelte";

    function create_fragment$2(ctx) {
    	var div3, div0, t1, div1, t3, div2;

    	return {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			div0.textContent = "0";
    			t1 = space();
    			div1 = element("div");
    			div1.textContent = "0";
    			t3 = space();
    			div2 = element("div");
    			div2.textContent = "0";
    			add_location(div0, file$2, 3, 4, 32);
    			add_location(div1, file$2, 6, 4, 63);
    			add_location(div2, file$2, 9, 4, 94);
    			set_style(div3, "float", "left");
    			add_location(div3, file$2, 2, 0, 2);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div3, anchor);
    			append(div3, div0);
    			append(div3, t1);
    			append(div3, div1);
    			append(div3, t3);
    			append(div3, div2);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div3);
    			}
    		}
    	};
    }

    class Score extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$2, safe_not_equal, []);
    	}
    }

    /* src\Scores.svelte generated by Svelte v3.8.0 */

    const file$3 = "src\\Scores.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx._ = list[i];
    	child_ctx.i = i;
    	return child_ctx;
    }

    // (24:8) {#each { length: players } as _, i}
    function create_each_block$1(ctx) {
    	var current;

    	var score = new Score({ $$inline: true });

    	return {
    		c: function create() {
    			score.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(score, target, anchor);
    			current = true;
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
    	var div5, t0, div4, div3, div0, t2, div1, t4, div2, t6, t7, t8, div6, current;

    	var score = new Score({ $$inline: true });

    	var each_value = { length: ctx.players };

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c: function create() {
    			div5 = element("div");
    			t0 = text("This is all the scores\n\n    ");
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			div0.textContent = "Controlled";
    			t2 = space();
    			div1 = element("div");
    			div1.textContent = "Projected";
    			t4 = space();
    			div2 = element("div");
    			div2.textContent = "Pressuring";
    			t6 = space();
    			score.$$.fragment.c();
    			t7 = space();

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t8 = space();
    			div6 = element("div");
    			add_location(div0, file$3, 12, 12, 177);
    			add_location(div1, file$3, 15, 12, 241);
    			add_location(div2, file$3, 18, 12, 304);
    			set_style(div3, "float", "left");
    			add_location(div3, file$3, 11, 8, 139);
    			add_location(div4, file$3, 10, 4, 125);
    			add_location(div5, file$3, 7, 0, 86);
    			set_style(div6, "clear", "both");
    			add_location(div6, file$3, 29, 0, 490);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div5, anchor);
    			append(div5, t0);
    			append(div5, div4);
    			append(div4, div3);
    			append(div3, div0);
    			append(div3, t2);
    			append(div3, div1);
    			append(div3, t4);
    			append(div3, div2);
    			append(div4, t6);
    			mount_component(score, div4, null);
    			append(div4, t7);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div4, null);
    			}

    			insert(target, t8, anchor);
    			insert(target, div6, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.players) {
    				const old_length = each_value.length;
    				each_value = { length: ctx.players };

    				for (var i = old_length; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1();
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div4, null);
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
    				detach(div5);
    			}

    			destroy_component(score);

    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach(t8);
    				detach(div6);
    			}
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { players } = $$props;

    	const writable_props = ['players'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Scores> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('players' in $$props) $$invalidate('players', players = $$props.players);
    	};

    	return { players };
    }

    class Scores extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$3, safe_not_equal, ["players"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.players === undefined && !('players' in props)) {
    			console.warn("<Scores> was created without expected prop 'players'");
    		}
    	}

    	get players() {
    		throw new Error("<Scores>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set players(value) {
    		throw new Error("<Scores>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.8.0 */

    const file$4 = "src\\App.svelte";

    function create_fragment$4(ctx) {
    	var h1, t1, t2, current;

    	var scores = new Scores({
    		props: { players: 2 },
    		$$inline: true
    	});

    	var board = new Board({
    		props: {
    		gameId: ctx.gameId,
    		height: 20,
    		width: 20,
    		active: ctx.active
    	},
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Hello everyone!";
    			t1 = space();
    			scores.$$.fragment.c();
    			t2 = space();
    			board.$$.fragment.c();
    			add_location(h1, file$4, 18, 0, 335);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			mount_component(scores, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(board, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var board_changes = {};
    			if (changed.gameId) board_changes.gameId = ctx.gameId;
    			if (changed.active) board_changes.active = ctx.active;
    			board.$set(board_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(scores.$$.fragment, local);

    			transition_in(board.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(scores.$$.fragment, local);
    			transition_out(board.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(h1);
    				detach(t1);
    			}

    			destroy_component(scores, detaching);

    			if (detaching) {
    				detach(t2);
    			}

    			destroy_component(board, detaching);
    		}
    	};
    }

    let turnCompleted = 0;

    let turnMoved = 0;

    function instance$3($$self, $$props, $$invalidate) {
    	

        setContext('urlApi', 'http://localhost:5000');

        let { gameId = 0 } = $$props;

    	const writable_props = ['gameId'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('gameId' in $$props) $$invalidate('gameId', gameId = $$props.gameId);
    	};

    	let active;

    	$$self.$$.update = ($$dirty = { turnCompleted: 1, turnMoved: 1 }) => {
    		if ($$dirty.turnCompleted || $$dirty.turnMoved) { $$invalidate('active', active = turnCompleted <= turnMoved); }
    	};

    	return { gameId, active };
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$4, safe_not_equal, ["gameId"]);
    	}

    	get gameId() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set gameId(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		gameId: '1ba4df75a6a1490f8885306b74cfcf2f'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map

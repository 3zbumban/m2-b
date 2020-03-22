
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
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
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
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
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
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
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.20.1' }, detail)));
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
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
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

    /* src\App.svelte generated by Svelte v3.20.1 */

    const { Object: Object_1, console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	child_ctx[17] = i;
    	return child_ctx;
    }

    // (54:3) {:else}
    function create_else_block_1(ctx) {
    	let span;
    	let t0;
    	let t1_value = /*t*/ ctx[15].type + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text("Error! ");
    			t1 = text(t1_value);
    			t2 = text(" case not found!!");
    			attr_dev(span, "class", "svelte-n3bvnr");
    			add_location(span, file, 54, 4, 1415);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data, currentThema*/ 3 && t1_value !== (t1_value = /*t*/ ctx[15].type + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(54:3) {:else}",
    		ctx
    	});

    	return block;
    }

    // (52:30) 
    function create_if_block_5(ctx) {
    	let span;
    	let t;
    	let img;
    	let img_src_value;
    	let img_alt_value;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("📷");
    			img = element("img");
    			if (img.src !== (img_src_value = /*t*/ ctx[15].link)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*t*/ ctx[15].text);
    			attr_dev(img, "class", "svelte-n3bvnr");
    			add_location(img, file, 52, 12, 1361);
    			attr_dev(span, "class", "svelte-n3bvnr");
    			add_location(span, file, 52, 4, 1353);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    			append_dev(span, img);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data, currentThema*/ 3 && img.src !== (img_src_value = /*t*/ ctx[15].link)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*data, currentThema*/ 3 && img_alt_value !== (img_alt_value = /*t*/ ctx[15].text)) {
    				attr_dev(img, "alt", img_alt_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(52:30) ",
    		ctx
    	});

    	return block;
    }

    // (48:32) 
    function create_if_block_4(ctx) {
    	let span1;
    	let t0;
    	let a;
    	let t1_value = /*t*/ ctx[15].text + "";
    	let t1;
    	let a_href_value;
    	let t2;
    	let span0;
    	let t3;
    	let t4_value = /*t*/ ctx[15].time + "";
    	let t4;
    	let dispose;

    	const block = {
    		c: function create() {
    			span1 = element("span");
    			t0 = text("📹");
    			a = element("a");
    			t1 = text(t1_value);
    			t2 = space();
    			span0 = element("span");
    			t3 = text("@");
    			t4 = text(t4_value);
    			attr_dev(a, "href", a_href_value = /*t*/ ctx[15].link);
    			attr_dev(a, "class", "svelte-n3bvnr");
    			add_location(a, file, 48, 12, 1186);
    			attr_dev(span0, "class", "time svelte-n3bvnr");
    			add_location(span0, file, 49, 4, 1271);
    			attr_dev(span1, "class", "svelte-n3bvnr");
    			add_location(span1, file, 48, 4, 1178);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, span1, anchor);
    			append_dev(span1, t0);
    			append_dev(span1, a);
    			append_dev(a, t1);
    			append_dev(span1, t2);
    			append_dev(span1, span0);
    			append_dev(span0, t3);
    			append_dev(span0, t4);
    			if (remount) dispose();
    			dispose = listen_dev(a, "click", prevent_default(/*click_handler*/ ctx[11]), false, true, false);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data, currentThema*/ 3 && t1_value !== (t1_value = /*t*/ ctx[15].text + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*data, currentThema*/ 3 && a_href_value !== (a_href_value = /*t*/ ctx[15].link)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*data, currentThema*/ 3 && t4_value !== (t4_value = /*t*/ ctx[15].time + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span1);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(48:32) ",
    		ctx
    	});

    	return block;
    }

    // (46:31) 
    function create_if_block_3(ctx) {
    	let span;
    	let t0;
    	let a;
    	let t1_value = /*t*/ ctx[15].text + "";
    	let t1;
    	let a_href_value;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text("🌐");
    			a = element("a");
    			t1 = text(t1_value);
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "rel", "noopener noreferrer");
    			attr_dev(a, "href", a_href_value = /*t*/ ctx[15].link);
    			attr_dev(a, "class", "svelte-n3bvnr");
    			add_location(a, file, 46, 12, 1062);
    			attr_dev(span, "class", "svelte-n3bvnr");
    			add_location(span, file, 46, 4, 1054);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, a);
    			append_dev(a, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data, currentThema*/ 3 && t1_value !== (t1_value = /*t*/ ctx[15].text + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*data, currentThema*/ 3 && a_href_value !== (a_href_value = /*t*/ ctx[15].link)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(46:31) ",
    		ctx
    	});

    	return block;
    }

    // (44:3) {#if t.type === "text"}
    function create_if_block_2(ctx) {
    	let span;
    	let t0;
    	let t1_value = /*t*/ ctx[15].text + "";
    	let t1;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text("📃");
    			t1 = text(t1_value);
    			attr_dev(span, "class", "f2 svelte-n3bvnr");
    			add_location(span, file, 44, 4, 983);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data, currentThema*/ 3 && t1_value !== (t1_value = /*t*/ ctx[15].text + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(44:3) {#if t.type === \\\"text\\\"}",
    		ctx
    	});

    	return block;
    }

    // (62:4) {:else}
    function create_else_block(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "✔";
    			attr_dev(span, "class", "svelte-n3bvnr");
    			add_location(span, file, 62, 5, 1657);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(62:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (58:4) {#if !!t.done}
    function create_if_block_1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "❌";
    			attr_dev(span, "class", "svelte-n3bvnr");
    			add_location(span, file, 58, 5, 1613);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(58:4) {#if !!t.done}",
    		ctx
    	});

    	return block;
    }

    // (42:2) {#each data[themen[currentThema]] as t, i}
    function create_each_block(ctx) {
    	let div;
    	let t0;
    	let span;
    	let t1;
    	let div_class_value;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*t*/ ctx[15].type === "text") return create_if_block_2;
    		if (/*t*/ ctx[15].type === "link") return create_if_block_3;
    		if (/*t*/ ctx[15].type === "video") return create_if_block_4;
    		if (/*t*/ ctx[15].type === "img") return create_if_block_5;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (!!/*t*/ ctx[15].done) return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block1 = current_block_type_1(ctx);

    	function click_handler_1(...args) {
    		return /*click_handler_1*/ ctx[12](/*i*/ ctx[17], ...args);
    	}

    	function click_handler_2(...args) {
    		return /*click_handler_2*/ ctx[13](/*t*/ ctx[15], ...args);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block0.c();
    			t0 = space();
    			span = element("span");
    			if_block1.c();
    			t1 = space();
    			attr_dev(span, "class", "toggler svelte-n3bvnr");
    			add_location(span, file, 56, 4, 1474);
    			attr_dev(div, "class", div_class_value = "" + ((/*active*/ ctx[3] === /*t*/ ctx[15].text ? "active" : "") + " topic " + (/*t*/ ctx[15].done ? "done" : "") + " svelte-n3bvnr"));
    			add_location(div, file, 42, 2, 840);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);
    			if_block0.m(div, null);
    			append_dev(div, t0);
    			append_dev(div, span);
    			if_block1.m(span, null);
    			append_dev(div, t1);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(span, "click", click_handler_1, false, false, false),
    				listen_dev(div, "click", click_handler_2, false, false, false)
    			];
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div, t0);
    				}
    			}

    			if (current_block_type_1 !== (current_block_type_1 = select_block_type_1(ctx))) {
    				if_block1.d(1);
    				if_block1 = current_block_type_1(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(span, null);
    				}
    			}

    			if (dirty & /*active, data, currentThema*/ 11 && div_class_value !== (div_class_value = "" + ((/*active*/ ctx[3] === /*t*/ ctx[15].text ? "active" : "") + " topic " + (/*t*/ ctx[15].done ? "done" : "") + " svelte-n3bvnr"))) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block0.d();
    			if_block1.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(42:2) {#each data[themen[currentThema]] as t, i}",
    		ctx
    	});

    	return block;
    }

    // (83:0) {#if currentVid !== ""}
    function create_if_block(ctx) {
    	let iframe;
    	let iframe_src_value;

    	const block = {
    		c: function create() {
    			iframe = element("iframe");
    			attr_dev(iframe, "title", "player");
    			attr_dev(iframe, "width", "");
    			attr_dev(iframe, "height", "");
    			if (iframe.src !== (iframe_src_value = `https://www.youtube-nocookie.com/embed/${new URL(/*currentVid*/ ctx[2]).search.slice(3)}`)) attr_dev(iframe, "src", iframe_src_value);
    			attr_dev(iframe, "frameborder", "0");
    			attr_dev(iframe, "allow", "autoplay; encrypted-media; picture-in-picture");
    			iframe.allowFullscreen = true;
    			attr_dev(iframe, "class", "svelte-n3bvnr");
    			add_location(iframe, file, 83, 0, 2029);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, iframe, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentVid*/ 4 && iframe.src !== (iframe_src_value = `https://www.youtube-nocookie.com/embed/${new URL(/*currentVid*/ ctx[2]).search.slice(3)}`)) {
    				attr_dev(iframe, "src", iframe_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(iframe);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(83:0) {#if currentVid !== \\\"\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div3;
    	let div0;
    	let p;
    	let t0_value = /*currentThema*/ ctx[1] + 1 + "";
    	let t0;
    	let t1;
    	let t2_value = /*themen*/ ctx[7][/*currentThema*/ ctx[1]] + "";
    	let t2;
    	let t3;
    	let div1;
    	let t4;
    	let div2;
    	let button0;
    	let t5;
    	let span0;
    	let t6_value = /*prev*/ ctx[6] + 1 + "";
    	let t6;
    	let t7;
    	let button1;
    	let t8;
    	let span1;
    	let t9_value = /*next*/ ctx[5] + 1 + "";
    	let t9;
    	let t10;
    	let div4;
    	let t11;
    	let div7;
    	let div5;
    	let textarea;
    	let t12;
    	let div6;
    	let button2;
    	let dispose;
    	let each_value = /*data*/ ctx[0][/*themen*/ ctx[7][/*currentThema*/ ctx[1]]];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block = /*currentVid*/ ctx[2] !== "" && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div3 = element("div");
    			div0 = element("div");
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = text(": ");
    			t2 = text(t2_value);
    			t3 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t4 = space();
    			div2 = element("div");
    			button0 = element("button");
    			t5 = text("←\n\t\t\t\t");
    			span0 = element("span");
    			t6 = text(t6_value);
    			t7 = space();
    			button1 = element("button");
    			t8 = text("→\n\t\t\t\t");
    			span1 = element("span");
    			t9 = text(t9_value);
    			t10 = space();
    			div4 = element("div");
    			if (if_block) if_block.c();
    			t11 = space();
    			div7 = element("div");
    			div5 = element("div");
    			textarea = element("textarea");
    			t12 = space();
    			div6 = element("div");
    			button2 = element("button");
    			button2.textContent = "⚡";
    			attr_dev(p, "class", " svelte-n3bvnr");
    			add_location(p, file, 38, 2, 709);
    			attr_dev(div0, "id", "currentTopic");
    			attr_dev(div0, "class", "svelte-n3bvnr");
    			add_location(div0, file, 37, 1, 683);
    			attr_dev(div1, "id", "themen");
    			attr_dev(div1, "class", "svelte-n3bvnr");
    			add_location(div1, file, 40, 1, 775);
    			attr_dev(span0, "class", " svelte-n3bvnr");
    			add_location(span0, file, 73, 4, 1819);
    			attr_dev(button0, "class", " svelte-n3bvnr");
    			add_location(button0, file, 72, 3, 1775);
    			attr_dev(span1, "class", " svelte-n3bvnr");
    			add_location(span1, file, 76, 4, 1911);
    			attr_dev(button1, "class", " svelte-n3bvnr");
    			add_location(button1, file, 75, 3, 1866);
    			attr_dev(div2, "id", "control");
    			attr_dev(div2, "class", "svelte-n3bvnr");
    			add_location(div2, file, 70, 1, 1736);
    			attr_dev(div3, "id", "material");
    			attr_dev(div3, "class", "svelte-n3bvnr");
    			add_location(div3, file, 36, 0, 662);
    			attr_dev(div4, "id", "video");
    			attr_dev(div4, "class", "svelte-n3bvnr");
    			add_location(div4, file, 81, 0, 1988);
    			attr_dev(textarea, "name", "notes");
    			attr_dev(textarea, "id", "");
    			attr_dev(textarea, "cols", "30");
    			attr_dev(textarea, "rows", "10");
    			attr_dev(textarea, "placeholder", "take notes here...");
    			attr_dev(textarea, "class", "svelte-n3bvnr");
    			add_location(textarea, file, 89, 1, 2301);
    			attr_dev(div5, "id", "pad");
    			attr_dev(div5, "class", "svelte-n3bvnr");
    			add_location(div5, file, 88, 1, 2285);
    			attr_dev(button2, "class", " svelte-n3bvnr");
    			add_location(button2, file, 92, 2, 2449);
    			attr_dev(div6, "id", "pad-controls");
    			attr_dev(div6, "class", "svelte-n3bvnr");
    			add_location(div6, file, 91, 1, 2423);
    			attr_dev(div7, "id", "notes");
    			attr_dev(div7, "class", "svelte-n3bvnr");
    			add_location(div7, file, 87, 0, 2267);
    			attr_dev(main, "class", "svelte-n3bvnr");
    			add_location(main, file, 35, 0, 655);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div3);
    			append_dev(div3, div0);
    			append_dev(div0, p);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    			append_dev(div3, t3);
    			append_dev(div3, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_dev(div3, t4);
    			append_dev(div3, div2);
    			append_dev(div2, button0);
    			append_dev(button0, t5);
    			append_dev(button0, span0);
    			append_dev(span0, t6);
    			append_dev(div2, t7);
    			append_dev(div2, button1);
    			append_dev(button1, t8);
    			append_dev(button1, span1);
    			append_dev(span1, t9);
    			append_dev(main, t10);
    			append_dev(main, div4);
    			if (if_block) if_block.m(div4, null);
    			append_dev(main, t11);
    			append_dev(main, div7);
    			append_dev(div7, div5);
    			append_dev(div5, textarea);
    			set_input_value(textarea, /*notes*/ ctx[4]);
    			append_dev(div7, t12);
    			append_dev(div7, div6);
    			append_dev(div6, button2);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(button0, "click", /*back*/ ctx[8], false, false, false),
    				listen_dev(button1, "click", /*forth*/ ctx[9], false, false, false),
    				listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[14])
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*currentThema*/ 2 && t0_value !== (t0_value = /*currentThema*/ ctx[1] + 1 + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*currentThema*/ 2 && t2_value !== (t2_value = /*themen*/ ctx[7][/*currentThema*/ ctx[1]] + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*active, data, themen, currentThema, clickVid*/ 1163) {
    				each_value = /*data*/ ctx[0][/*themen*/ ctx[7][/*currentThema*/ ctx[1]]];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*prev*/ 64 && t6_value !== (t6_value = /*prev*/ ctx[6] + 1 + "")) set_data_dev(t6, t6_value);
    			if (dirty & /*next*/ 32 && t9_value !== (t9_value = /*next*/ ctx[5] + 1 + "")) set_data_dev(t9, t9_value);

    			if (/*currentVid*/ ctx[2] !== "") {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div4, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*notes*/ 16) {
    				set_input_value(textarea, /*notes*/ ctx[4]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks, detaching);
    			if (if_block) if_block.d();
    			run_all(dispose);
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

    function instance($$self, $$props, $$invalidate) {
    	let { data } = $$props;
    	const themen = Object.keys(data);
    	let currentThema = 0;
    	let currentVid = "";
    	let active = "";

    	function back() {
    		$$invalidate(1, currentThema = prev);
    		console.log(`[i] back: ${currentThema}`);
    	}

    	function forth() {
    		$$invalidate(1, currentThema = next);
    		console.log(`[i] forth: ${currentThema}`);
    	}

    	function clickVid(event) {
    		console.log(event.target.href);
    		$$invalidate(2, currentVid = event.target.href);
    	}

    	const writable_props = ["data"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	const click_handler = event => clickVid(event);

    	const click_handler_1 = i => {
    		$$invalidate(0, data[themen[currentThema]][i].done = !data[themen[currentThema]][i].done, data);
    	};

    	const click_handler_2 = t => {
    		$$invalidate(3, active = t.text);
    	};

    	function textarea_input_handler() {
    		notes = this.value;
    		($$invalidate(4, notes), $$invalidate(1, currentThema));
    	}

    	$$self.$set = $$props => {
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({
    		data,
    		themen,
    		currentThema,
    		currentVid,
    		active,
    		back,
    		forth,
    		clickVid,
    		notes,
    		next,
    		prev
    	});

    	$$self.$inject_state = $$props => {
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    		if ("currentThema" in $$props) $$invalidate(1, currentThema = $$props.currentThema);
    		if ("currentVid" in $$props) $$invalidate(2, currentVid = $$props.currentVid);
    		if ("active" in $$props) $$invalidate(3, active = $$props.active);
    		if ("notes" in $$props) $$invalidate(4, notes = $$props.notes);
    		if ("next" in $$props) $$invalidate(5, next = $$props.next);
    		if ("prev" in $$props) $$invalidate(6, prev = $$props.prev);
    	};

    	let notes;
    	let next;
    	let prev;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*currentThema*/ 2) {
    			 $$invalidate(4, notes = `# ${themen[currentThema]}\n`);
    		}

    		if ($$self.$$.dirty & /*currentThema*/ 2) {
    			 $$invalidate(5, next = currentThema < themen.length - 1 ? currentThema + 1 : 0);
    		}

    		if ($$self.$$.dirty & /*currentThema*/ 2) {
    			 $$invalidate(6, prev = currentThema > 0 ? currentThema - 1 : themen.length - 1);
    		}

    		if ($$self.$$.dirty & /*currentThema*/ 2) {
    			 console.log(`[i] currentThema: ${currentThema}`);
    		}
    	};

    	return [
    		data,
    		currentThema,
    		currentVid,
    		active,
    		notes,
    		next,
    		prev,
    		themen,
    		back,
    		forth,
    		clickVid,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		textarea_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { data: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[0] === undefined && !("data" in props)) {
    			console_1.warn("<App> was created without expected prop 'data'");
    		}
    	}

    	get data() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var data = {
    	"Vorlesung 1/2 - Folgen, Grenzwerte, Stetigkeit": [
    	{
    		text: "Vorlesung 1:",
    		type: "text"
    	},
    	{
    		text: "Folgen",
    		link: "http://www.youtube.com/watch?v=PiBQdcoqk_4",
    		type: "video",
    		time: "14:33"
    	},
    	{
    		text: "beschränkte, monotone Folgen",
    		link: "http://www.youtube.com/watch?v=7j0CRvVy8Zw",
    		type: "video",
    		time: "5:43"
    	},
    	{
    		text: "Konvergenz, bestimmte Divergenz",
    		link: "http://www.youtube.com/watch?v=CPyB1zIyQQU",
    		type: "video",
    		time: "18:41"
    	},
    	{
    		text: "weiter Konvergenz, Grenzwert",
    		link: "http://www.youtube.com/watch?v=nYe1ObOuS3E",
    		type: "video",
    		time: "11:30"
    	},
    	{
    		text: "Grenzwertsätze",
    		link: "http://www.youtube.com/watch?v=zuS0_SVSK-E",
    		type: "video",
    		time: "11:35"
    	},
    	{
    		text: "Vorlesung 2:",
    		type: "text"
    	},
    	{
    		text: "Grenzwerte von Funktionen",
    		link: "http://www.youtube.com/watch?v=OqVcldYJFQ0",
    		type: "video",
    		time: "15:29"
    	},
    	{
    		text: "Stetigkeit, stetig hebbare Definitionslücken",
    		link: "http://www.youtube.com/watch?v=z0J9M-I2DHk",
    		type: "video",
    		time: "24:33"
    	},
    	{
    		text: "Regel von L'Hôpital, Null durch Null",
    		link: "http://www.youtube.com/watch?v=vI_TWcsOoNE",
    		type: "video",
    		time: "14:10"
    	},
    	{
    		text: "Ergänzungen (optional zum Üben und Vertiefen):",
    		type: "text"
    	},
    	{
    		text: "Grenzwertbestimmung für komplizierte Funktion, Grenzwertsätze, Stetigkeit",
    		link: "http://www.youtube.com/watch?v=tvYW502auCM",
    		type: "video",
    		time: "14:01"
    	},
    	{
    		text: "Beispiel für Regel von L'Hôpital",
    		link: "http://www.youtube.com/watch?v=YsbS5KIj29Q",
    		type: "video",
    		time: "5:06"
    	},
    	{
    		text: "null hoch null als Grenzwert; Stetigkeit",
    		link: "http://www.youtube.com/watch?v=VT4d2e4W_B8",
    		type: "video",
    		time: "12:57"
    	},
    	{
    		text: "Grenzwertbetrachtung mit Bruch und Potenzen",
    		link: "http://www.youtube.com/watch?v=QIODLn3XoyI",
    		type: "video",
    		time: "6:01"
    	},
    	{
    		text: "Grenzwertbetrachtung mit Bruch und Wurzel",
    		link: "http://www.youtube.com/watch?v=Yws9aO8cECA",
    		type: "video",
    		time: "9:07"
    	},
    	{
    		text: "Grenzwertbetrachtung mit Bruch und Wurzel, anderes Beispiel",
    		link: "http://www.youtube.com/watch?v=pp6jEA7oXns",
    		type: "video",
    		time: "7:23"
    	},
    	{
    		text: "Grenzwertbetrachtung mit Bruch und Cosinus",
    		link: "http://www.youtube.com/watch?v=MYQlAqMhavo",
    		type: "video",
    		time: "2:21"
    	},
    	{
    		text: "Grenzwertbetrachtung mit Sinus, Bruch und Potenzen",
    		link: "http://www.youtube.com/watch?v=3092sr55CoE",
    		type: "video",
    		time: "1:45"
    	},
    	{
    		text: "Grenzwertbetrachtung; L'Hospital",
    		link: "http://www.youtube.com/watch?v=XZJn0eyMlYo",
    		type: "video",
    		time: "5:25"
    	},
    	{
    		text: "Exponentialfunktion wächst schneller als jedes Polynom",
    		link: "http://www.youtube.com/watch?v=JLuIV1lSfww",
    		type: "video",
    		time: "5:40"
    	},
    	{
    		text: "Logarithmus wächst langsamer als jede Wurzel",
    		link: "http://www.youtube.com/watch?v=GVniFKEdC50",
    		type: "video",
    		time: "5:13"
    	},
    	{
    		text: "Grenzwert n-te Wurzel aus n",
    		link: "http://www.youtube.com/watch?v=JJwE9xbQABY",
    		type: "video",
    		time: "4:38"
    	},
    	{
    		text: "Grenzwertbetrachtung rationale Funktion; L'Hospital",
    		link: "http://www.youtube.com/watch?v=NRmAMkax-io",
    		type: "video",
    		time: "2:35"
    	},
    	{
    		text: "erfundene Regeln und ein zu knapper Beweis",
    		link: "http://www.youtube.com/watch?v=CQG1q4CAn1w",
    		type: "video",
    		time: "11:26"
    	}
    ],
    	"Vorlesung 3/4 - Grundlagen zu Ableitungen und Integralen": [
    	{
    		text: "Vorlesung 3:",
    		type: "text"
    	},
    	{
    		text: "Momentangeschwindigkeit, Ableitung",
    		link: "http://www.youtube.com/watch?v=bI72BQwOXCA",
    		type: "video",
    		time: "8:17"
    	},
    	{
    		text: "Ableitung",
    		link: "http://www.youtube.com/watch?v=gQuZH3ROoGM",
    		type: "video",
    		time: "11:02"
    	},
    	{
    		text: "Ableitungsregeln",
    		link: "http://www.youtube.com/watch?v=c38uE-UGeZI",
    		type: "video",
    		time: "6:03"
    	},
    	{
    		text: "Einschub Schreibweise Ableitung",
    		link: "http://www.youtube.com/watch?v=eBjBUa9zMm0",
    		type: "video",
    		time: "3:23"
    	},
    	{
    		text: "Kettenregel, Ableitung Exponentialfunktionen, Logarithmus",
    		link: "http://www.youtube.com/watch?v=0MJ30ZBdckk",
    		type: "video",
    		time: "8:35"
    	},
    	{
    		text: "Ableitung Potenzen, Wurzeln, Sinus",
    		link: "http://www.youtube.com/watch?v=NAt4-yrFpi0",
    		type: "video",
    		time: "10:00"
    	},
    	{
    		text: "weiter Ableitung Sinus",
    		link: "http://www.youtube.com/watch?v=3SHAqKRF6YI",
    		type: "video",
    		time: "6:27"
    	},
    	{
    		text: "Vorlesung 4:",
    		type: "text"
    	},
    	{
    		text: "Integral, Stammfunktion",
    		link: "http://www.youtube.com/watch?v=CB6iVYz9mQA",
    		type: "video",
    		time: "10:35"
    	},
    	{
    		text: "weiter Stammfunktionen",
    		link: "http://www.youtube.com/watch?v=VIfjoCnHgNY",
    		type: "video",
    		time: "3:02"
    	},
    	{
    		text: "weiter Stammfunktionen",
    		link: "http://www.youtube.com/watch?v=8nOuj76HaCY",
    		type: "video",
    		time: "3:10"
    	},
    	{
    		text: "bestimmtes Integral",
    		link: "http://www.youtube.com/watch?v=tMcEsvhRj2A",
    		type: "video",
    		time: "9:25"
    	},
    	{
    		text: "weiter bestimmtes Integral",
    		link: "http://www.youtube.com/watch?v=6fk-s53-0BE",
    		type: "video",
    		time: "7:09"
    	},
    	{
    		text: "Ergänzungen (optional zum Üben und Vertiefen):",
    		type: "text"
    	},
    	{
    		text: "Kehrwert ableiten",
    		link: "http://www.youtube.com/watch?v=avGYUd7wjrc",
    		type: "video",
    		time: "14:31"
    	},
    	{
    		text: "Wurzel ableiten",
    		link: "http://www.youtube.com/watch?v=YxO6WBteho0",
    		type: "video",
    		time: "14:54"
    	},
    	{
    		text: "Faktor-, Summen- und Produktregel der Ableitung",
    		link: "http://www.youtube.com/watch?v=t2J211GqrKE",
    		type: "video",
    		time: "14:04"
    	},
    	{
    		text: "Quotientenregel",
    		link: "http://www.youtube.com/watch?v=YiUD496LUyw",
    		type: "video",
    		time: "7:39"
    	},
    	{
    		text: "Kettenregel",
    		link: "http://www.youtube.com/watch?v=cPEhaaOWGAI",
    		type: "video",
    		time: "10:34"
    	},
    	{
    		text: "kompliziertere Ableitung",
    		link: "http://www.youtube.com/watch?v=Ovg9nm0gEow",
    		type: "video",
    		time: "4:28"
    	},
    	{
    		text: "Ableitung und Wurfparabel",
    		link: "http://www.youtube.com/watch?v=aJsYr5Raj-A",
    		type: "video",
    		time: "18:05"
    	},
    	{
    		text: "Abstand zweier windschiefer Geraden per Ableitungen",
    		link: "http://www.youtube.com/watch?v=TkSyZEYZbeM",
    		type: "video",
    		time: "29:07"
    	},
    	{
    		text: "Quotientenregel, Kettenregel angewendet",
    		link: "http://www.youtube.com/watch?v=VaTOC5UO7wI",
    		type: "video",
    		time: "6:35"
    	},
    	{
    		text: "Wurzel(52) schätzen, Tangentengerade an Wurzelfunktion",
    		link: "http://www.youtube.com/watch?v=0bhvsfb3n4g",
    		type: "video",
    		time: "21:32"
    	},
    	{
    		text: "Fläche unter Sinus-Halbwelle",
    		link: "http://www.youtube.com/watch?v=4dDhaLUb7AY",
    		type: "video",
    		time: "5:19"
    	},
    	{
    		text: "Strecke aus Geschwindigkeitsverlauf, Integral, Stammfunktion, Einheiten",
    		link: "http://www.youtube.com/watch?v=8gyxPD5pniw",
    		type: "video",
    		time: "29:13"
    	},
    	{
    		text: "Fläche unter Parabel halbieren, Integral",
    		link: "http://www.youtube.com/watch?v=atd9TBxTYug",
    		type: "video",
    		time: "18:33"
    	},
    	{
    		text: "Schwerpunkt der Fläche unter Parabel, Integral",
    		link: "http://www.youtube.com/watch?v=h0HrR_BsM2o",
    		type: "video",
    		time: "16:05"
    	}
    ],
    	"Vorlesung 5 - Ableitung": [
    	{
    		text: "Vorlesung:",
    		type: "text"
    	},
    	{
    		text: "Ableitung, Tangente, Sekantensteigung",
    		link: "http://www.youtube.com/watch?v=WU45izKSG-I",
    		type: "video",
    		time: "27:10"
    	},
    	{
    		text: "Ableitung von Summen und Produkten",
    		link: "http://www.youtube.com/watch?v=Q7wlFnE4HIA",
    		type: "video",
    		time: "11:25"
    	},
    	{
    		text: "Kettenregel",
    		link: "http://www.youtube.com/watch?v=-r7OqgbufNc",
    		type: "video",
    		time: "19:44"
    	},
    	{
    		text: "Quotientenregel",
    		link: "http://www.youtube.com/watch?v=0Q51Cnu2-mQ",
    		type: "video",
    		time: "6:44"
    	},
    	{
    		text: "Ableitung exp, log, Potenz",
    		link: "http://www.youtube.com/watch?v=CypHSa0WhZQ",
    		type: "video",
    		time: "13:25"
    	},
    	{
    		text: "Ableitung sin, cos, arcsin",
    		link: "http://www.youtube.com/watch?v=R7-aDbAOuZQ",
    		type: "video",
    		time: "11:28"
    	},
    	{
    		text: "Ergänzungen (optional zum Üben und Vertiefen):",
    		type: "text"
    	},
    	{
    		text: "Fingerübungen zu Ableitungen; Kettenregel, Potenzregel, Produktregel, Quotientenregel",
    		link: "http://www.youtube.com/watch?v=X78Ysz1A8a4",
    		type: "video",
    		time: "11:58"
    	},
    	{
    		text: "Schätzen mit der Ableitung; Tangentengerade",
    		link: "http://www.youtube.com/watch?v=a4ECi6_k618",
    		type: "video",
    		time: "18:59"
    	},
    	{
    		text: "Nur bei Exponentialfunktionen ist die Ableitung konstantes Vielfaches der Funktion",
    		link: "http://www.youtube.com/watch?v=IC_679y1YTA",
    		type: "video",
    		time: "8:33"
    	},
    	{
    		text: "Ableitung Tangens und Arkustangens",
    		link: "http://www.youtube.com/watch?v=p457QNflMvU",
    		type: "video",
    		time: "20:18"
    	},
    	{
    		text: "Ableitungen, ein paar Fingerübungen",
    		link: "http://www.youtube.com/watch?v=1QJCXJeLIuI",
    		type: "video",
    		time: "22:36"
    	},
    	{
    		text: "zentrale Differenzformeln; Ableitung numerisch",
    		link: "http://www.youtube.com/watch?v=F0elmdI1pfk",
    		type: "video",
    		time: "8:12"
    	},
    	{
    		text: "senkrechter Wurf; Differentialgleichung",
    		link: "http://www.youtube.com/watch?v=luEHOGPujOA",
    		type: "video",
    		time: "23:42"
    	},
    	{
    		text: "Kondensator entladen; Differentialgleichung",
    		link: "http://www.youtube.com/watch?v=GAFeYmi4WUk",
    		type: "video",
    		time: "14:12"
    	}
    ],
    	"Vorlesung 6 - lokale Extrema, Wendepunkte": [
    	{
    		text: "Vorlesung:",
    		type: "text"
    	},
    	{
    		text: "lokale, globale Minima, Maxima",
    		link: "http://www.youtube.com/watch?v=abJDU87xPxA",
    		type: "video",
    		time: "15:59"
    	},
    	{
    		text: "lokale Minima und Maxima, Kriterien",
    		link: "http://www.youtube.com/watch?v=NC6fLHnPrRo",
    		type: "video",
    		time: "14:26"
    	},
    	{
    		text: "Wendepunkte",
    		link: "http://www.youtube.com/watch?v=cUh1BZLMht0",
    		type: "video",
    		time: "11:11"
    	},
    	{
    		text: "Ableitungen",
    		link: "http://commons.wikimedia.org/wiki/File%3AAbleitungsss.svg",
    		type: "img"
    	},
    	{
    		text: "Ergänzungen (optional zum Üben und Vertiefen):",
    		type: "text"
    	},
    	{
    		text: "Beispiel lokales Maximum, lokales Minimum",
    		link: "http://www.youtube.com/watch?v=E-xuYg8DpBk",
    		type: "video",
    		time: "12:59"
    	},
    	{
    		text: "Ableitung größer null, streng monoton",
    		link: "http://www.youtube.com/watch?v=_cfOn92GRb4",
    		type: "video",
    		time: "7:30"
    	},
    	{
    		text: "optimale Dose, maximales Volumen, minimale Oberfläche, Ableitung",
    		link: "http://www.youtube.com/watch?v=J-YLyBaAt4c",
    		type: "video",
    		time: "35:52"
    	},
    	{
    		text: "schnellste Verbindung, Ableitung, snelliussches Brechungsgesetz der Optik",
    		link: "http://www.youtube.com/watch?v=9hUOolW-894",
    		type: "video",
    		time: "14:32"
    	},
    	{
    		text: "Minimum, Maximum eines Polynoms",
    		link: "http://www.youtube.com/watch?v=m3InoqfXPik",
    		type: "video",
    		time: "8:21"
    	},
    	{
    		text: "Monotonie mit Ableitung nachweisen",
    		link: "http://www.youtube.com/watch?v=4n8LiKv7Z1w",
    		type: "video",
    		time: "5:01"
    	},
    	{
    		text: "Monotonie und Ableitung, Problemfall",
    		link: "http://www.youtube.com/watch?v=NC_Hp7JdF7c",
    		type: "video",
    		time: "5:08"
    	},
    	{
    		text: "Wendepunkte Glockenkurve",
    		link: "http://www.youtube.com/watch?v=x8O6hEVw2_E",
    		type: "video",
    		time: "10:39"
    	},
    	{
    		text: "Polynom mit vorgegebenen Wendepunkten",
    		link: "http://www.youtube.com/watch?v=iHAxP5K2LIE",
    		type: "video",
    		time: "12:57"
    	},
    	{
    		text: "Bildgröße, optimaler Standpunkt",
    		link: "http://www.youtube.com/watch?v=vWnSLLx2ul4",
    		type: "video",
    		time: "13:35"
    	}
    ],
    	"Vorlesung 7 - lineare Näherung samt Anwendungen": [
    	{
    		text: "Vorlesung:",
    		type: "text"
    	},
    	{
    		text: "Lineare Näherung und ihr Fehler",
    		link: "http://www.youtube.com/watch?v=qqjZYTPkvH0",
    		type: "video",
    		time: "29:52"
    	},
    	{
    		text: "Numerische Schätzung 1., 2. Ableitung",
    		link: "http://www.youtube.com/watch?v=dhf15Rc-iio",
    		type: "video",
    		time: "14:09"
    	},
    	{
    		text: "Ergänzungen (optional zum Üben und Vertiefen):",
    		type: "text"
    	},
    	{
    		text: "Ableitung von Messreihen schätzen, numerisches Differenzieren, Fehlerschätzung",
    		link: "http://www.youtube.com/watch?v=o6SOjC6DQx4",
    		type: "video",
    		time: "29:59"
    	},
    	{
    		text: "Tangentengerade an sin(x²)",
    		link: "http://www.youtube.com/watch?v=xnO95NfEm5M",
    		type: "video",
    		time: "15:56"
    	},
    	{
    		text: "ln(3) mit linearer Näherung schätzen",
    		link: "http://www.youtube.com/watch?v=_F3q4jPbq4g",
    		type: "video",
    		time: "8:29"
    	},
    	{
    		text: "Tangentengeraden durch Ursprung an Parabel",
    		link: "http://www.youtube.com/watch?v=VFWV6Ywxt80",
    		type: "video",
    		time: "9:17"
    	},
    	{
    		text: "lineare Näherung für kleine Drehung",
    		link: "http://www.youtube.com/watch?v=1ubfmwDG_18",
    		type: "video",
    		time: "18:41"
    	},
    	{
    		text: "Linsengleichung auflösen; Fehlerrechnung; lineare Näherung",
    		link: "http://www.youtube.com/watch?v=FGwfy0nGCTg",
    		type: "video",
    		time: "10:43"
    	}
    ],
    	"Vorlesung 8 - Integral": [
    	{
    		text: "Vorlesung:",
    		type: "text"
    	},
    	{
    		text: "Idee des Integrals",
    		link: "http://www.youtube.com/watch?v=drITIZEuepg",
    		type: "video",
    		time: "22:41"
    	},
    	{
    		text: "Stammfunktion, unbestimmtes Integral, Hauptsatz",
    		link: "http://www.youtube.com/watch?v=tKEcuQJG9j8",
    		type: "video",
    		time: "21:01"
    	},
    	{
    		text: "Uneigentliche Integrale",
    		link: "http://www.youtube.com/watch?v=Ntkq5u6iYMs",
    		type: "video",
    		time: "15:42"
    	},
    	{
    		text: "optional: Numerische Integration, Trapezregel, Simpson-Regel",
    		link: "http://www.youtube.com/watch?v=cvHUpXNZmlM",
    		type: "video",
    		time: "19:50"
    	},
    	{
    		text: "Bsp. Zerlegung intervall",
    		link: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Riemann_Integral_mit_Obersumme_und_Untersumme.svg/512px-Riemann_Integral_mit_Obersumme_und_Untersumme.svg.png",
    		type: "img"
    	},
    	{
    		text: "Ergänzungen (optional zum Üben und Vertiefen):",
    		type: "text"
    	},
    	{
    		text: "Zusammenfassung bestimmtes Integral, Stammfunktion, Wurzelfunktionund integrieren",
    		link: "http://www.youtube.com/watch?v=LWTtOCj8U4Q",
    		type: "video",
    		time: "11:51"
    	},
    	{
    		text: "Pi mit Integral und Arcustangens berechnen; Leibniz-Reihe",
    		link: "http://www.youtube.com/watch?v=rcLHCzWnTtE",
    		type: "video",
    		time: "13:08"
    	},
    	{
    		text: "numerische Integration, Trapezverfahren, Fehlerschätzung, Romberg, Richardson",
    		link: "http://www.youtube.com/watch?v=wXdOZz2hx3g",
    		type: "video",
    		time: "22:41"
    	},
    	{
    		text: "Integrale mit Sinus und Partialbruchzerlegung",
    		link: "http://www.youtube.com/watch?v=nEsZ2JfZiqI",
    		type: "video",
    		time: "17:41"
    	},
    	{
    		text: "Stammfunktion der Betragsfunktion",
    		link: "http://www.youtube.com/watch?v=HC50zHxf-dA",
    		type: "video",
    		time: "3:48"
    	}
    ],
    	"Vorlesung 9 - Integrationsregeln": [
    	{
    		text: "Vorlesung:",
    		type: "text"
    	},
    	{
    		text: "Partielle Integration",
    		link: "http://www.youtube.com/watch?v=NcIrSbG0q6s",
    		type: "video",
    		time: "17:23"
    	},
    	{
    		text: "Substitutionsregel",
    		link: "http://www.youtube.com/watch?v=T9AeEo6niO0",
    		type: "video",
    		time: "13:22"
    	},
    	{
    		text: "Integration durch Partialbruchzerlegung",
    		link: "http://www.youtube.com/watch?v=aKJNPifcXew",
    		type: "video",
    		time: "21:00"
    	},
    	{
    		text: "Ergänzungen (optional zum Üben und Vertiefen):",
    		type: "text"
    	},
    	{
    		text: "Partielle Integration, Substitutionsregel, Integration durch Partialbruchzerlegung",
    		link: "http://www.youtube.com/watch?v=bqe7Ct14__k",
    		type: "video",
    		time: "19:33"
    	},
    	{
    		text: "Beispiele partielle Integration, Substitutionsregel, Integration durch Partialbruchzerlegung",
    		link: "http://www.youtube.com/watch?v=-MOjddiR7S8",
    		type: "video",
    		time: "37:16"
    	},
    	{
    		text: "partielle Integration; Fingerübung",
    		link: "http://www.youtube.com/watch?v=ER181Gk6gdc",
    		type: "video",
    		time: "7:34"
    	},
    	{
    		text: "partielle Integration; Logarithmus integrieren",
    		link: "http://www.youtube.com/watch?v=ze4O45Ra2kM",
    		type: "video",
    		time: "2:27"
    	},
    	{
    		text: "doppelte partielle Integration; x Quadrat mal Sinus",
    		link: "http://www.youtube.com/watch?v=s5Acs0-aVg4",
    		type: "video",
    		time: "5:38"
    	},
    	{
    		text: "Integration durch Substitution; Fingerübung",
    		link: "http://www.youtube.com/watch?v=EjSEihB7aMY",
    		type: "video",
    		time: "8:04"
    	},
    	{
    		text: "Integration durch Substitution; weitere Fingerübung",
    		link: "http://www.youtube.com/watch?v=thNga_5C0yI",
    		type: "video",
    		time: "9:04"
    	},
    	{
    		text: "drei Wege für Integration durch Substitution",
    		link: "http://www.youtube.com/watch?v=U6LrABJosxI",
    		type: "video",
    		time: "11:27"
    	}
    ],
    	"Vorlesung 10 - Schmiegeparabel, Taylor-Polynome": [
    	{
    		text: "Vorlesung:",
    		type: "text"
    	},
    	{
    		text: "Tangentengerade, Schmiegeparabel, Taylor-Polynome",
    		link: "http://www.youtube.com/watch?v=4dZ2nO8Qpyw",
    		type: "video",
    		time: "14:39"
    	},
    	{
    		text: "Taylor-Polynom für Wurzelfunktion",
    		link: "http://www.youtube.com/watch?v=MFRt_e_IIiw",
    		type: "video",
    		time: "12:45"
    	},
    	{
    		text: "Taylor-Reihe, Potenzreihen, Teil 1",
    		link: "http://www.youtube.com/watch?v=iIwPhunjxtA",
    		type: "video",
    		time: "17:25"
    	},
    	{
    		text: "Taylor-Reihe, Potenzreihen, Teleskopsumme, Teil 2",
    		link: "http://www.youtube.com/watch?v=oBNO2jRr7ck",
    		type: "video",
    		time: "19:41"
    	},
    	{
    		text: "Ergänzungen (optional zum Üben und Vertiefen):",
    		type: "text"
    	},
    	{
    		text: "kubische Wurzel mit Schmiegeparabel nähern, Taylor-Polynom",
    		link: "http://www.youtube.com/watch?v=kPyRgZRLGBA",
    		type: "video",
    		time: "16:21"
    	},
    	{
    		text: "nichtlineare Gleichung mit Schmiegeparabel in quadr. Gleichung umwandeln, Taylor",
    		link: "http://www.youtube.com/watch?v=bTmU0UJPrBk",
    		type: "video",
    		time: "12:14"
    	},
    	{
    		text: "Divergenz der harmonischen Reihe mit Integral zeigen",
    		link: "http://www.youtube.com/watch?v=Z4WQi3CrHfQ",
    		type: "video",
    		time: "6:56"
    	},
    	{
    		text: "Taylor-Näherung für natürlichen Logarithmus",
    		link: "http://www.youtube.com/watch?v=3CvfkdtiozY",
    		type: "video",
    		time: "10:25"
    	},
    	{
    		text: "Wolfram Alpha: Taylor Reihe für beliebige Funktionen mit graphischer Darstellung",
    		link: "http://www.wolframalpha.com/input/?i=taylor+series&lk=4&num=1",
    		type: "link"
    	},
    	{
    		text: "Approximation von sin(x) durch Taylorpolynome Pn vom Grad 1, 3, 5 und 7:",
    		type: "img",
    		link: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Taylor_Approximation_of_sin%28x%29.jpeg/800px-Taylor_Approximation_of_sin%28x%29.jpeg"
    	},
    	{
    		text: "Die Cosinusfunktion um den Punkt 0 entwickelt, in sukzessiver Näherung:",
    		type: "img",
    		link: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Taylor_cos.gif/800px-Taylor_cos.gif"
    	},
    	{
    		text: "Approximation von ln(x) durch Taylorpolynome der Grade 1, 2, 3 bzw. 10 um den Entwicklungspunkt 1. Die Polynome konvergieren nur im Intervall (0, 2]. Der Konvergenzradius ist also 1:",
    		type: "img",
    		link: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Mercator_series.svg/480px-Mercator_series.svg.png"
    	}
    ],
    	"Vorlesung 11 - Rest nach Taylor, Potenzreihen": [
    	{
    		text: "Vorlesung:",
    		type: "text"
    	},
    	{
    		text: "Taylor-Rest, Teil 1",
    		link: "http://www.youtube.com/watch?v=g6lZVsAF3Rk",
    		type: "video",
    		time: "9:30"
    	},
    	{
    		text: "Taylor-Restformel, Teil 2, Abschätzung des Fehlers",
    		link: "http://www.youtube.com/watch?v=zMs7oVBKYuU",
    		type: "video",
    		time: "28:46"
    	},
    	{
    		text: "Taylor-Rest, Beispiel für Fehlerschätzung",
    		link: "http://www.youtube.com/watch?v=KfOvkB63Svc",
    		type: "video",
    		time: "8:55"
    	},
    	{
    		text: "Potenzreihen, Konvergenzradius, Teil 1",
    		link: "http://www.youtube.com/watch?v=7st-QCLyfq0",
    		type: "video",
    		time: "14:54"
    	},
    	{
    		text: "Konvergenzradius, Teil 2",
    		link: "http://www.youtube.com/watch?v=QnQqVcGaWxo",
    		type: "video",
    		time: "18:07"
    	},
    	{
    		text: "Potenzreihen und Analytische Funktionen",
    		link: "http://www.youtube.com/watch?v=COYMPxsM82c",
    		type: "video",
    		time: "12:32"
    	},
    	{
    		text: "wird nicht behandelt: Differentialgleichungen mit Potenzreihen lösen",
    		link: "http://www.youtube.com/watch?v=LuQdyq5biUc",
    		type: "video",
    		time: "12:47"
    	},
    	{
    		text: "Ergänzungen (optional zum Üben und Vertiefen):",
    		type: "text"
    	},
    	{
    		text: "Potenzreihe für Arcustangens; Konvergenzradius",
    		link: "http://www.youtube.com/watch?v=APM6aqo8Vqg",
    		type: "video",
    		time: "42:46"
    	},
    	{
    		text: "Taylor-Näherung und Fehler für Sinusfunktion",
    		link: "http://www.youtube.com/watch?v=zcs_dVezJNo",
    		type: "video",
    		time: "17:20"
    	},
    	{
    		text: "Potenzreihe für Logarithmus aus geometrischer Reihe",
    		link: "http://www.youtube.com/watch?v=8AO6jN1Wjfk",
    		type: "video",
    		time: "4:55"
    	},
    	{
    		text: "Potenzreihenansatz für Differentialgleichung; Beispiel Taylorpolynom",
    		link: "http://www.youtube.com/watch?v=4XG4HKq3LSQ",
    		type: "video",
    		time: "13:26"
    	},
    	{
    		text: "Potenzreihenansatz für Differentialgleichung",
    		link: "http://www.youtube.com/watch?v=7NMraA_oaXQ",
    		type: "video",
    		time: "19:14"
    	},
    	{
    		text: "kubische Wurzel mit Taylorpolynom schätzen; Fehlerschranke",
    		link: "http://www.youtube.com/watch?v=_ZG52A2ZWKU",
    		type: "video",
    		time: "10:34"
    	},
    	{
    		text: "Kreiszahl PI mit Taylorreihe von Arcustangens berechnen: arctan(1) = PI / 4",
    		type: "text"
    	},
    	{
    		text: "http://de.wikipedia.org/wiki/Arcus-Tangens#Reihenentwicklung",
    		link: "http://de.wikipedia.org/wiki/Arcus-Tangens#Reihenentwicklung",
    		type: "link"
    	},
    	{
    		text: "http://de.wikipedia.org/wiki/Kreiszahlberechnung_nach_Leibniz",
    		link: "http://de.wikipedia.org/wiki/Kreiszahlberechnung_nach_Leibniz",
    		type: "link"
    	},
    	{
    		text: "Mit Java 8 die ersten 1000.000.000 Summanden:",
    		link: "http://4.bp.blogspot.com/-6lwKoZmaxsY/U6wmtkTwpRI/AAAAAAAAJzM/n-HzUbhdZdY/s1600/Java8-Taylor-Series.png",
    		type: "img"
    	}
    ],
    	"Vorlesung 12 - Vektorräume": [
    	{
    		text: "Vorlesung:",
    		type: "text"
    	},
    	{
    		text: "optional (nicht alles aus dem Überblick wird bei uns behandelt): Überblick 2. Semester; Lineare Algebra, Differentialgleichungen usw.",
    		link: "http://www.youtube.com/watch?v=MOFfns7LHGM",
    		type: "video",
    		time: "40:28"
    	},
    	{
    		text: "Pfeile, Vektoren, gerichtete Größen",
    		link: "http://www.youtube.com/watch?v=BCtKTw97-Yg",
    		type: "video",
    		time: "17:18"
    	},
    	{
    		text: "Ebene R2 und Raum R3",
    		link: "http://www.youtube.com/watch?v=lnE0d_jY7zA",
    		type: "video",
    		time: "13:38"
    	},
    	{
    		text: "Vektorraum",
    		link: "http://www.youtube.com/watch?v=9324wQg_eu8",
    		type: "video",
    		time: "16:01"
    	},
    	{
    		text: "Basis, Dimension",
    		link: "http://www.youtube.com/watch?v=UfJgVy0W0QU",
    		type: "video",
    		time: "20:51"
    	},
    	{
    		text: "Ergänzungen (optional zum Üben und Vertiefen):",
    		type: "text"
    	},
    	{
    		text: "Vektorraum, Untervektorraum, Basis, Dimension",
    		link: "http://www.youtube.com/watch?v=GGbd_yCvTIQ",
    		type: "video",
    		time: "32:02"
    	},
    	{
    		text: "Dimension von Kurven, Flächen; Hausdorff-Dimension; Fraktal, Koch-Kurve",
    		link: "http://www.youtube.com/watch?v=eWSmQQv2Jbs",
    		type: "video",
    		time: "25:30"
    	},
    	{
    		text: "Begriff Vektorraum; Vektor aus zwei gegebenen Vektoren bilden",
    		link: "http://www.youtube.com/watch?v=tr8Gms3YerM",
    		type: "video",
    		time: "10:29"
    	},
    	{
    		text: "Vektorraum der Polynome; Basis",
    		link: "http://www.youtube.com/watch?v=2zxT8T8eK8E",
    		type: "video",
    		time: "17:04"
    	},
    	{
    		text: "Vektorraum der sinusförmigen Schwingungen; Zerlegung in sin und cos",
    		link: "http://www.youtube.com/watch?v=gyy2X7ZAFKM",
    		type: "video",
    		time: "9:26"
    	}
    ],
    	"Vorlesung 13/14 - Komplexe Zahlen": [
    	{
    		text: "Vorlesung 13 (zwei Teile A und B!) A. Zahlenbereiche (nur Komplexe Zahlen!)",
    		type: "text"
    	},
    	{
    		text: "optional (Wiederholung aus 1.Semester): Natürliche, ganze und rationale Zahlen",
    		link: "http://www.youtube.com/watch?v=hm9wcWSk9fU",
    		type: "video",
    		time: "3:33"
    	},
    	{
    		text: "optional (Wiederholung aus 1.Semester): Reelle Zahlen",
    		link: "http://www.youtube.com/watch?v=7VwHHgLqzAg",
    		type: "video",
    		time: "4:54"
    	},
    	{
    		text: "Komplexe Zahlen",
    		link: "http://www.youtube.com/watch?v=SnmF8FowyFM",
    		type: "video",
    		time: "6:49"
    	},
    	{
    		text: "Real- und Imaginärteil, Länge, Gaußsche Zahlenebene",
    		link: "http://www.youtube.com/watch?v=mPDeWb9U28I",
    		type: "video",
    		time: "6:51"
    	},
    	{
    		text: "Wozu komplexe Zahlen?",
    		link: "http://www.youtube.com/watch?v=8su2_dLFGt8",
    		type: "video",
    		time: "5:31"
    	},
    	{
    		text: "optional (Wiederholung aus 1.Semester): Rechenregeln, Assoziativität, Kommutativität, Distributivität",
    		link: "http://www.youtube.com/watch?v=oE3cpm0ID-M",
    		type: "video",
    		time: "6:14"
    	},
    	{
    		text: "optional: Quaternionen, unendlich große Zahlen",
    		link: "http://www.youtube.com/watch?v=Uu9XIezNzUo",
    		type: "video",
    		time: "4:16"
    	},
    	{
    		text: "optional (Wiederholung aus 1.Semester): 04.06 Intervalle reeller Zahlen",
    		link: "http://www.youtube.com/watch?v=9fRKzAbouWU",
    		type: "video",
    		time: "2:41"
    	},
    	{
    		text: "optional (Wiederholung aus 1.Semester): 04.07 Stellenwertsysteme, Binärsystem",
    		link: "http://www.youtube.com/watch?v=TEYxSXC3PuQ",
    		type: "video",
    		time: "8:51"
    	},
    	{
    		text: "optional (Wiederholung aus 1.Semester): 04.08 Exponentialschreibweise",
    		link: "http://www.youtube.com/watch?v=NAslOP0f5M8",
    		type: "video",
    		time: "5:50"
    	},
    	{
    		text: "B. imaginäre Einheit, Gaußsche Zahlenebene; Betrag, Winkel; komplexe Konjugation; Grundrechenarten für komplexe Zahlen",
    		type: "text"
    	},
    	{
    		text: "Gaußsche Zahlenebene, komplexe Zahlen",
    		link: "http://www.youtube.com/watch?v=l_lzxGxo2S8",
    		type: "video",
    		time: "10:39"
    	},
    	{
    		text: "Betrag, Winkel einer komplexen Zahl",
    		link: "http://www.youtube.com/watch?v=hVGkUCQX5LU",
    		type: "video",
    		time: "12:44"
    	},
    	{
    		text: "Addition, Subtraktion komplexer Zahlen",
    		link: "http://www.youtube.com/watch?v=tVv2kgIk4qc",
    		type: "video",
    		time: "4:32"
    	},
    	{
    		text: "Multiplikation komplexer Zahlen",
    		link: "http://www.youtube.com/watch?v=k4ZIP9vrKCA",
    		type: "video",
    		time: "14:47"
    	},
    	{
    		text: "Division komplexer Zahlen",
    		link: "http://www.youtube.com/watch?v=EP45MD62yXc",
    		type: "video",
    		time: "13:02"
    	},
    	{
    		text: "weiter Division komplexer Zahlen, Winkel bestimmen",
    		link: "http://www.youtube.com/watch?v=1k-ITGa1lJE",
    		type: "video",
    		time: "2:36"
    	},
    	{
    		text: "Vorlesung 14 C. Potenzen und Wurzeln komplexer Zahlen; Eulersche Identität; Additionstheoreme; vollständige Faktorisierung von Polynomen",
    		type: "text"
    	},
    	{
    		text: "Ganzzahlige Potenzen und Wurzeln komplexer Zahlen",
    		link: "http://www.youtube.com/watch?v=ldWsG5RGJcE",
    		type: "video",
    		time: "13:53"
    	},
    	{
    		text: "Wurzeln in Wolfram Alpha",
    		link: "http://www.youtube.com/watch?v=YSMakbCDKL4",
    		type: "video",
    		time: "1:46"
    	},
    	{
    		text: "weiter Wurzeln komplexer Zahlen",
    		link: "http://www.youtube.com/watch?v=m5U76mP0yUY",
    		type: "video",
    		time: "4:17"
    	},
    	{
    		text: "Eulersche Identität e^(ix)=cos(x)+isin(x)",
    		link: "http://www.youtube.com/watch?v=dHIshFK7INM",
    		type: "video",
    		time: "11:42"
    	},
    	{
    		text: "weiter Eulersche Identität",
    		link: "http://www.youtube.com/watch?v=Tz18ZK2hGmE",
    		type: "video",
    		time: "12:51"
    	},
    	{
    		text: "sin, cos, Potenzreihen, Additionstheoreme",
    		link: "http://www.youtube.com/watch?v=aT96lnpCLYs",
    		type: "video",
    		time: "14:19"
    	},
    	{
    		text: "Polardarstellung, Multiplikation, Division, Potenz.avi",
    		link: "http://www.youtube.com/watch?v=3ZLXFp3RnsA",
    		type: "video",
    		time: "7:59"
    	},
    	{
    		text: "weiter Polardarstellung, Wurzel",
    		link: "http://www.youtube.com/watch?v=Lj6dWLPaM2I",
    		type: "video",
    		time: "7:39"
    	},
    	{
    		text: "Fundamentalsatz der Algebra, Nullstellen von Polynomen im Komplexen",
    		link: "http://www.youtube.com/watch?v=7JvTFSRuIY8",
    		type: "video",
    		time: "14:50"
    	},
    	{
    		text: "weiter Fundamentalsatz der Algebra, Nullstellen von Polynomen im Komplexen",
    		link: "http://www.youtube.com/watch?v=JHHTKNHJgY8",
    		type: "video",
    		time: "14:31"
    	},
    	{
    		text: "Ergänzungen (optional zum Üben und Vertiefen):",
    		type: "text"
    	},
    	{
    		text: "Ordinalzahlen, Konstruktion von Zahlen nur aus der leeren Menge",
    		link: "http://www.youtube.com/watch?v=rf6H-BLMhI0",
    		type: "video",
    		time: "13:32"
    	},
    	{
    		text: "Mächtigkeit, 1. und 2. Cantorsches Diagonalverfahren, (Über-)Abzählbarkeit",
    		link: "http://www.youtube.com/watch?v=N3ybfG-e_UA",
    		type: "video",
    		time: "25:46"
    	},
    	{
    		text: "Beispiel für Multiplikation und Division komplexer Zahlen",
    		link: "http://www.youtube.com/watch?v=llMuIMD6hKk",
    		type: "video",
    		time: "8:44"
    	},
    	{
    		text: "Warum i² gleich -1 sein muss",
    		link: "http://www.youtube.com/watch?v=OkdkyS1uQc4",
    		type: "video",
    		time: "13:37"
    	},
    	{
    		text: "Rechnen mit komplexen Zahlen, Multiplikation und Division",
    		link: "http://www.youtube.com/watch?v=Biq15MFlJvo",
    		type: "video",
    		time: "11:28"
    	},
    	{
    		text: "Wurzel aus der imaginären Einheit",
    		link: "http://www.youtube.com/watch?v=7wEt3CoV9Uc",
    		type: "video",
    		time: "19:19"
    	},
    	{
    		text: "quadratische Gleichung mit komplexwertigen Lösungen",
    		link: "http://www.youtube.com/watch?v=j_Rw6whnxtQ",
    		type: "video",
    		time: "4:23"
    	},
    	{
    		text: "rationale Zahlen, periodische Dezimalbrüche, algebraische Gleichungen",
    		link: "http://www.youtube.com/watch?v=QCCpCLJYXh8",
    		type: "video",
    		time: "16:34"
    	},
    	{
    		text: "Fingerübungen mit komplexen Zahlen, Länge, Winkel; Potenzen; Wurzeln von i",
    		link: "http://www.youtube.com/watch?v=cfz0kwHcUI4",
    		type: "video",
    		time: "13:39"
    	},
    	{
    		text: "Die Werte von 1 durch (3+ix) bilden einen Kreis in der Gausschen Zahlenebene",
    		link: "http://www.youtube.com/watch?v=bq4XE08U_Yo",
    		type: "video",
    		time: "16:10"
    	},
    	{
    		text: "Multiplikation komplexer Zahlen algebraisch und geometrisch",
    		link: "http://www.youtube.com/watch?v=nzVckYlx3-Y",
    		type: "video",
    		time: "15:52"
    	},
    	{
    		text: "Division komplexer Zahlen algebraisch und geometrisch",
    		link: "http://www.youtube.com/watch?v=ETnvAiXpAoQ",
    		type: "video",
    		time: "18:38"
    	},
    	{
    		text: "Eulersche Identität, Polardarstellung, Sinus hyperbolicus",
    		link: "http://www.youtube.com/watch?v=QeS2FwbiXlw",
    		type: "video",
    		time: "36:09"
    	},
    	{
    		text: "Multiplikation am Einheitskreis geometrisch, Länge, komplex Konjugiertes",
    		link: "http://www.youtube.com/watch?v=QAxAMJQHOms",
    		type: "video",
    		time: "26:35"
    	},
    	{
    		text: "Gleichungen und pq-Formel mit komplexen Zahlen",
    		link: "http://www.youtube.com/watch?v=Iov-FrXa4nc",
    		type: "video",
    		time: "11:10"
    	},
    	{
    		text: "Zwei hoch die imaginäre Einheit i; imaginäre Einheit hoch die imaginäre Einheit",
    		link: "http://www.youtube.com/watch?v=5fGwt0aN1eM",
    		type: "video",
    		time: "12:07"
    	},
    	{
    		text: "dritte Wurzeln einer komplexen Zahl",
    		link: "http://www.youtube.com/watch?v=WfAQnp_3Hco",
    		type: "video",
    		time: "14:17"
    	},
    	{
    		text: "Gleichung mit komplexen Zahlen; Wurzel aus i",
    		link: "http://www.youtube.com/watch?v=ZXcikjJ0xpY",
    		type: "video",
    		time: "4:52"
    	},
    	{
    		text: "quadratische Gleichung mit komplexen Zahlen",
    		link: "http://www.youtube.com/watch?v=7KGa7TbE8nU",
    		type: "video",
    		time: "3:06"
    	},
    	{
    		text: "Drehungen im R2 über komplexe Zahlen und Eulersche Identität",
    		link: "http://www.youtube.com/watch?v=GMTRgdLodNQ",
    		type: "video",
    		time: "9:30"
    	},
    	{
    		text: "Cosinus von i; Cosinus mit e hoch i phi schreiben",
    		link: "http://www.youtube.com/watch?v=3iBE4cV-CBw",
    		type: "video",
    		time: "12:13"
    	},
    	{
    		text: "Logarithmus einer komplexen Zahl",
    		link: "http://www.youtube.com/watch?v=3fCRZmWHS0E",
    		type: "video",
    		time: "9:43"
    	},
    	{
    		text: "komplexe Linearfaktoren eines Polynoms",
    		link: "http://www.youtube.com/watch?v=Omrs4LfXsss",
    		type: "video",
    		time: "6:19"
    	}
    ],
    	"Vorlesung 15 - Geradengleichung, Skalarprodukt": [
    	{
    		text: "Vorlesung:",
    		type: "text"
    	},
    	{
    		text: "Geradengleichungen in Parameterform",
    		link: "http://www.youtube.com/watch?v=Pa_qbvqWDbA",
    		type: "video",
    		time: "15:09"
    	},
    	{
    		text: "Länge eines Vektors",
    		link: "http://www.youtube.com/watch?v=Z0tpWlBt698",
    		type: "video",
    		time: "10:27"
    	},
    	{
    		text: "Skalarprodukt, Teil 1",
    		link: "http://www.youtube.com/watch?v=_v0FwywZRzI",
    		type: "video",
    		time: "10:05"
    	},
    	{
    		text: "Skalarprodukt Teil 2, Orthogonalität",
    		link: "http://www.youtube.com/watch?v=lEtAVOxM0LY",
    		type: "video",
    		time: "24:49"
    	},
    	{
    		text: "Ergänzungen (optional zum Üben und Vertiefen):",
    		type: "text"
    	},
    	{
    		text: "Probleme der Geradengleichung mx plus b",
    		link: "http://www.youtube.com/watch?v=l5AMf1SsvSg",
    		type: "video",
    		time: "9:35"
    	},
    	{
    		text: "Abstand Gerade vom Ursprung mit Ableitung und mit Normale",
    		link: "http://www.youtube.com/watch?v=NO-aB-VxJDk",
    		type: "video",
    		time: "19:35"
    	},
    	{
    		text: "Abstand Ebene vom Ursprung, aufwendige Form mit Ableitung",
    		link: "http://www.youtube.com/watch?v=SqkUXwAj8II",
    		type: "video",
    		time: "14:51"
    	},
    	{
    		text: "Geraden auf Parallelität prüfen",
    		link: "http://www.youtube.com/watch?v=-nXiY2LyRjw",
    		type: "video",
    		time: "4:25"
    	},
    	{
    		text: "Schnittpunkt zweier Geraden",
    		link: "http://www.youtube.com/watch?v=0LQ_fTlE754",
    		type: "video",
    		time: "11:27"
    	},
    	{
    		text: "Schnittmenge Ebene mit xy-Ebene",
    		link: "http://www.youtube.com/watch?v=x0mlo_T4g_I",
    		type: "video",
    		time: "3:20"
    	},
    	{
    		text: "prüfen, ob Ebene durch Ursprung geht",
    		link: "http://www.youtube.com/watch?v=_qaX4IqO5iE",
    		type: "video",
    		time: "8:54"
    	},
    	{
    		text: "Winkel mittels Skalarprodukt bestimmen",
    		link: "http://www.youtube.com/watch?v=PEPjcTA0BG8",
    		type: "video",
    		time: "5:33"
    	},
    	{
    		text: "Dreieck auf Rechtwinkligkeit prüfen",
    		link: "http://www.youtube.com/watch?v=Y8uNlKCmeVk",
    		type: "video",
    		time: "5:20"
    	},
    	{
    		text: "Vektor in yz-Ebene senkrecht zu gegebenem Vektor",
    		link: "http://www.youtube.com/watch?v=jGUsn5hOdR0",
    		type: "video",
    		time: "7:48"
    	},
    	{
    		text: "Geradengleichung in Normalenform",
    		link: "http://www.youtube.com/watch?v=RgtPSilhZSY",
    		type: "video",
    		time: "12:09"
    	},
    	{
    		text: "Parallelogrammidentität; Diagonalen eines Parallelogramms",
    		link: "http://www.youtube.com/watch?v=jeYYCfo3HPA",
    		type: "video",
    		time: "9:56"
    	},
    	{
    		text: "Winkel zwischen zwei Geraden im R²",
    		link: "http://www.youtube.com/watch?v=t7NojmtkdUk",
    		type: "video",
    		time: "5:50"
    	}
    ],
    	"Vorlesung 16 - Matrizen": [
    	{
    		text: "Vorlesung:",
    		type: "text"
    	},
    	{
    		text: "Matrizen, Transposition, MATLAB(R)",
    		link: "http://www.youtube.com/watch?v=A_jlm3s0F7Y",
    		type: "video",
    		time: "21:59"
    	},
    	{
    		text: "Matrix mal Vektor, Matrix mal Matrix",
    		link: "http://www.youtube.com/watch?v=aaZekvIXczc",
    		type: "video",
    		time: "23:04"
    	},
    	{
    		text: "Skalierung, Drehungsmatrix, Verschiebung",
    		link: "http://www.youtube.com/watch?v=8QnR1V0EMKE",
    		type: "video",
    		time: "29:40"
    	},
    	{
    		text: "Ergänzungen (optional zum Üben und Vertiefen):",
    		type: "text"
    	},
    	{
    		text: "Scherungsmatrix",
    		link: "http://www.youtube.com/watch?v=AXAB8yi555A",
    		type: "video",
    		time: "6:16"
    	},
    	{
    		text: "Rotation um beliebigen Punkt, affine Abbildung, Verschiebungsvektor, Rotationsmatrix",
    		link: "http://www.youtube.com/watch?v=ZghfFjT8BTY",
    		type: "video",
    		time: "14:04"
    	},
    	{
    		text: "geometrische Wirkung einer Matrix; inverse Matrix",
    		link: "http://www.youtube.com/watch?v=24q7TUhEoyM",
    		type: "video",
    		time: "17:54"
    	},
    	{
    		text: "Spiegelung und Drehung nacheinander; Matrizenmultiplikation",
    		link: "http://www.youtube.com/watch?v=4zpWkhGne4A",
    		type: "video",
    		time: "7:20"
    	},
    	{
    		text: "Nichtkommutativität des Matrizenprodukts",
    		link: "http://www.youtube.com/watch?v=Fj-hub2Ando",
    		type: "video",
    		time: "9:03"
    	},
    	{
    		text: "zwei Spiegelungen nacheinander; Reihenfolge; Matrizenmultiplikation",
    		link: "http://www.youtube.com/watch?v=zNBJfm3QMRo",
    		type: "video",
    		time: "12:12"
    	},
    	{
    		text: "achte Potenz einer Matrix; Matrizen und komplexe Zahlen",
    		link: "http://www.youtube.com/watch?v=Yy3W7DW4r5M",
    		type: "video",
    		time: "8:44"
    	},
    	{
    		text: "dritte Potenz einer Matrix ist die Einheitsmatrix",
    		link: "http://www.youtube.com/watch?v=4xZc59ctViY",
    		type: "video",
    		time: "3:30"
    	},
    	{
    		text: "Spiegelungsmatrix aus Spiegelungsachse berechnen",
    		link: "http://www.youtube.com/watch?v=iPc6xPMD9C0",
    		type: "video",
    		time: "11:46"
    	},
    	{
    		text: "Spiegelungsachse aus Punkt und Bild bestimmen",
    		link: "http://www.youtube.com/watch?v=xN1U1EkHBq8",
    		type: "video",
    		time: "5:20"
    	},
    	{
    		text: "Matrix für Drehung um Hauptdiagonale im Raum",
    		link: "http://www.youtube.com/watch?v=aa8uTwR_u9U",
    		type: "video",
    		time: "5:44"
    	},
    	{
    		text: "Rezept für Matrizenprodukt",
    		link: "http://www.youtube.com/watch?v=-bD5AyNKOPg",
    		type: "video",
    		time: "2:33"
    	}
    ],
    	"Vorlesung 17/18 - Lineare Gleichungssysteme, Rang, Kern": [
    	{
    		text: "Extra-Skript",
    		link: "https://drive.google.com/file/d/0B1VFRCi6_vaIOWZsMnBHVUI0WTg/view?usp=sharing",
    		type: "link"
    	},
    	{
    		text: "Vorlesung 17:",
    		type: "text"
    	},
    	{
    		text: "Playlist (3 Videos): Einführung Lineare Gleichungssysteme 1-3 mit",
    		link: "http://www.youtube.com/watch?v=d5R_F-KCzgM&list=PLDkKPlx5HxBejYbNAPZrojKWZRejshNRZ&feature=share",
    		type: "link"
    	},
    	{
    		text: "Extra-Skript",
    		link: "https://drive.google.com/file/d/0B1VFRCi6_vaIOWZsMnBHVUI0WTg/view?usp=sharing",
    		type: "link"
    	},
    	{
    		text: "Lineare Gleichungssysteme, Existenz und Eindeutigkeit von Lösungen",
    		link: "http://www.youtube.com/watch?v=Rr2zXvwsdeU",
    		type: "video",
    		time: "14:08"
    	},
    	{
    		text: "Existenz von Lösungen linearer Gleichungssysteme",
    		link: "http://www.youtube.com/watch?v=tC02Qslu5nw",
    		type: "video",
    		time: "14:42"
    	},
    	{
    		text: "Vorlesung 18:",
    		type: "text"
    	},
    	{
    		text: "Spaltenraum, Bild, Rang einer Matrix",
    		link: "http://www.youtube.com/watch?v=GkxxInaXFxY",
    		type: "video",
    		time: "18:50"
    	},
    	{
    		text: "Eindeutigkeit der Lösung, homogenes Gleichungssystem",
    		link: "http://www.youtube.com/watch?v=kaN5yu_kJTE",
    		type: "video",
    		time: "17:45"
    	},
    	{
    		text: "Kern, Defekt einer Matrix",
    		link: "http://www.youtube.com/watch?v=vYzoKfxoBpY",
    		type: "video",
    		time: "12:25"
    	},
    	{
    		text: "Zeilenrang, Spaltenrang, unter-, überbestimmt",
    		link: "http://www.youtube.com/watch?v=jRxruSBAVa8",
    		type: "video",
    		time: "25:56"
    	},
    	{
    		text: "Ergänzungen (optional zum Üben und Vertiefen):",
    		type: "text"
    	},
    	{
    		text: "Rang, Spaltenraum, Defekt, Kern einer Matrix, lineares Gleichungssystem",
    		link: "http://www.youtube.com/watch?v=wVePh1IL7Jc",
    		type: "video",
    		time: "23:05"
    	},
    	{
    		text: "Lineare Gleichungssysteme; Lösungen nicht existent oder nicht eindeutig",
    		link: "http://www.youtube.com/watch?v=aT0gwU1VaUw",
    		type: "video",
    		time: "9:40"
    	},
    	{
    		text: "Spaltenraum, Rang, Defekt einer 2x3-Matrix",
    		link: "http://www.youtube.com/watch?v=9-q-C0qMKcU",
    		type: "video",
    		time: "21:17"
    	},
    	{
    		text: "Matrix zu gegebenem Spaltenraum finden",
    		link: "http://www.youtube.com/watch?v=3BzQEk460cE",
    		type: "video",
    		time: "2:46"
    	},
    	{
    		text: "Matrix mit Rang 3 mal Matrix mit Rang 1 soll Nullmatrix sein",
    		link: "http://www.youtube.com/watch?v=ZzZ_fMTw7VA",
    		type: "video",
    		time: "13:26"
    	},
    	{
    		text: "Beispiel Spaltenraum, Bild, Rang, Kern, Defekt; lineares Gleichungssystem",
    		link: "http://www.youtube.com/watch?v=o48XiNYq4u4",
    		type: "video",
    		time: "23:03"
    	},
    	{
    		text: "weiteres Beispiel Spaltenraum, Bild, Rang, Kern, Defekt; lineares Gleichungssystem",
    		link: "http://www.youtube.com/watch?v=Q8dspqpZSBQ",
    		type: "video",
    		time: "12:11"
    	}
    ],
    	"Vorlesung 19/20 - Determinante, Spatprodukt, Vektorprodukt, inverse Matrix": [
    	{
    		text: "Vorlesung 19:",
    		type: "text"
    	},
    	{
    		text: "Determinate, Teil 1",
    		link: "http://www.youtube.com/watch?v=1shtuE86BcU",
    		type: "video",
    		time: "14:42"
    	},
    	{
    		text: "Determinante, Teil 2, Parallelepiped",
    		link: "http://www.youtube.com/watch?v=x7JF6GRvpi4",
    		type: "video",
    		time: "18:25"
    	},
    	{
    		text: "Determinante, Teil 3, antisymmetrische Multilinearform",
    		link: "http://www.youtube.com/watch?v=Io22Sn1W43Q",
    		type: "video",
    		time: "15:54"
    	},
    	{
    		text: "Determinante, Teil 4, Entwickeln, Sarrus",
    		link: "http://www.youtube.com/watch?v=94TMIB7AojM",
    		type: "video",
    		time: "28:23"
    	},
    	{
    		text: "Vorlesung 20:",
    		type: "text"
    	},
    	{
    		text: "Spatprodukt",
    		link: "http://www.youtube.com/watch?v=fH4_8jpx1_c",
    		type: "video",
    		time: "3:54"
    	},
    	{
    		text: "Vektorprodukt rechnerisch",
    		link: "http://www.youtube.com/watch?v=kcVghUnWdy0",
    		type: "video",
    		time: "24:57"
    	},
    	{
    		text: "Vektorprodukt geometrisch",
    		link: "http://www.youtube.com/watch?v=bs_uMEtJuIE",
    		type: "video",
    		time: "22:45"
    	},
    	{
    		text: "Produkte mit Vektoren, Zusammenfassung",
    		link: "http://www.youtube.com/watch?v=FX5WbEEOz3o",
    		type: "video",
    		time: "7:14"
    	},
    	{
    		text: "Inverse Matrix",
    		link: "http://www.youtube.com/watch?v=_2Jy1ATTStU",
    		type: "video",
    		time: "15:18"
    	},
    	{
    		text: "Ergänzungen (optional zum Üben und Vertiefen):",
    		type: "text"
    	},
    	{
    		text: "Fläche eines Parallelogramms im R³, Vektorprodukt, Kreuzprodukt",
    		link: "http://www.youtube.com/watch?v=uonDgCu3WAY",
    		type: "video",
    		time: "8:43"
    	},
    	{
    		text: "Vektorprodukt auflösbar oder nicht",
    		link: "http://www.youtube.com/watch?v=3kjFBjhr7-Y",
    		type: "video",
    		time: "3:02"
    	},
    	{
    		text: "Trägheitstensor und Drehimpuls mit Vektorprodukt, Spatprodukt, Skalarprodukt",
    		link: "http://www.youtube.com/watch?v=7M1H_vBKC0Y",
    		type: "video",
    		time: "47:22"
    	},
    	{
    		text: "Fläche eines Parallelograms im R² mittels Determinante",
    		link: "http://www.youtube.com/watch?v=arU1IjUkC0s",
    		type: "video",
    		time: "5:40"
    	},
    	{
    		text: "eine 3x3-Determinante ausrechnen",
    		link: "http://www.youtube.com/watch?v=4mOxkQnnXEc",
    		type: "video",
    		time: "5:06"
    	},
    	{
    		text: "eine 4x4-Determinante ausrechnen",
    		link: "http://www.youtube.com/watch?v=oRXwixlaLYo",
    		type: "video",
    		time: "14:01"
    	},
    	{
    		text: "Fläche eines Dreiecks im Raum",
    		link: "http://www.youtube.com/watch?v=sdFPdDju-TI",
    		type: "video",
    		time: "10:26"
    	},
    	{
    		text: "Vektorprodukt gleich gegebenem Vektor",
    		link: "http://www.youtube.com/watch?v=qZDZRXusxQ4",
    		type: "video",
    		time: "4:29"
    	},
    	{
    		text: "Gerade senkrecht durch Ebene; Abstand Ebene von Ursprung",
    		link: "http://www.youtube.com/watch?v=QOMo3K5QcMw",
    		type: "video",
    		time: "13:19"
    	},
    	{
    		text: "Vektor senkrecht zu drei gegebenen im R^4",
    		link: "http://www.youtube.com/watch?v=eNWj3oBx8Uo",
    		type: "video",
    		time: "6:25"
    	},
    	{
    		text: "doppeltes Vektorprodukt; BAC-CAB-Formel",
    		link: "http://www.youtube.com/watch?v=t1G7EOiGTD0",
    		type: "video",
    		time: "12:40"
    	}
    ],
    	"Vorlesung 21 - Cramer-, Gauss-, Jacobi-Verfahren": [
    	{
    		text: "Vorlesung:",
    		type: "text"
    	},
    	{
    		text: "Cramer-Verfahren",
    		link: "http://www.youtube.com/watch?v=Z8dAxn_UZlU",
    		type: "video",
    		time: "16:30"
    	},
    	{
    		text: "Gaußsches Eliminationsverfahren",
    		link: "http://www.youtube.com/watch?v=Vba_UYJJMco",
    		type: "video",
    		time: "20:48"
    	},
    	{
    		text: "Jacobi-Verfahren, iterative Lösung",
    		link: "http://www.youtube.com/watch?v=cQELGYMBWNQ",
    		type: "video",
    		time: "12:45"
    	},
    	{
    		text: "Lineare Gleichungssysteme mit MATLAB(R) und Wolfram Alpha",
    		link: "http://www.youtube.com/watch?v=ttunNCT5v-s",
    		type: "video",
    		time: "9:09"
    	},
    	{
    		text: "Ergänzungen (optional zum Üben und Vertiefen):",
    		type: "text"
    	},
    	{
    		text: "Lineares Gleichungssystem, Gaußsches Eliminationsverfahren, Cramer-Regel, inverse Matrix",
    		link: "http://www.youtube.com/watch?v=oUqD62R3-mQ",
    		type: "video",
    		time: "26:22"
    	},
    	{
    		text: "mit Cramer-Regel 3x3-Matrix invertieren",
    		link: "http://www.youtube.com/watch?v=TxXkt2Or4-Y",
    		type: "video",
    		time: "10:43"
    	},
    	{
    		text: "inverse Matrix eines Matrixprodukts",
    		link: "http://www.youtube.com/watch?v=pgBlBmJUlpA",
    		type: "video",
    		time: "4:45"
    	},
    	{
    		text: "inverse Matrix einer 2x2-Matrix; Gleichungssystem lösen",
    		link: "http://www.youtube.com/watch?v=XRf7YrXmOIs",
    		type: "video",
    		time: "15:45"
    	},
    	{
    		text: "vier Lösungsverfahren für lineare Gleichungssysteme; Cramer, Gauß, Jacobi, inverse Matrix",
    		link: "http://www.youtube.com/watch?v=O8-Lj40rXQM",
    		type: "video",
    		time: "29:15"
    	},
    	{
    		text: "Gleichungssystem 2x3; Gaußsches Eliminationsverfahren; Bild, Rang, Kern, Defekt",
    		link: "http://www.youtube.com/watch?v=JKm3xIq8TJQ",
    		type: "video",
    		time: "22:07"
    	}
    ],
    	"Vorlesung 22/23 - Eigenvektoren": [
    	{
    		text: "Eigenwerte, Eigenvektoren",
    		link: "http://www.youtube.com/watch?v=WBf8BgPIdFI",
    		type: "video",
    		time: "11:11"
    	},
    	{
    		text: "Anwendungen von Eigenvektoren",
    		link: "http://www.youtube.com/watch?v=7ueepk6pWyU",
    		type: "video",
    		time: "16:51"
    	},
    	{
    		text: "Bestimmung von Eigenwerten",
    		link: "http://www.youtube.com/watch?v=hD3gUWLjtyM",
    		type: "video",
    		time: "25:45"
    	},
    	{
    		text: "Vorlesung 23 (ohne Skript - Üben, Üben, Üben!):",
    		type: "text"
    	},
    	{
    		text: "Eigenwerte, Eigenvektoren bestimmen; charakteristisches Polynom",
    		link: "http://www.youtube.com/watch?v=i0ggTPAe1GU",
    		type: "video",
    		time: "34:21"
    	},
    	{
    		text: "Eigenwerte, Eigenvektoren symmetrischer Matrizen",
    		link: "http://www.youtube.com/watch?v=lyvhmHluQU0",
    		type: "video",
    		time: "10:21"
    	},
    	{
    		text: "Eigenwerte einer 3x3-Matrix",
    		link: "http://www.youtube.com/watch?v=BBbTHOJBHxI",
    		type: "video",
    		time: "15:07"
    	},
    	{
    		text: "Eigenvektoren von 2x2- und 3x3-Matrizen bestimmen",
    		link: "http://www.youtube.com/watch?v=KDx8pOft3FM",
    		type: "video",
    		time: "14:37"
    	},
    	{
    		text: "Matrix zu Eigenvektor und Eigenwert bestimmen",
    		link: "http://www.youtube.com/watch?v=hM3bKfECW5Q",
    		type: "video",
    		time: "5:22"
    	},
    	{
    		text: "Eigenwerte einer 2x2-Drehungsmatrix",
    		link: "http://www.youtube.com/watch?v=NJPJLcxTgk4",
    		type: "video",
    		time: "2:03"
    	},
    	{
    		text: "Eigenwerte und Eigenvektoren einer 3x3-Matrix",
    		link: "http://www.youtube.com/watch?v=Go8LGWvpn28",
    		type: "video",
    		time: "23:15"
    	},
    	{
    		text: "Eigenwerte mit Spur und Determinante prüfen",
    		link: "http://www.youtube.com/watch?v=qzAfwK_T-1I",
    		type: "video",
    		time: "8:32"
    	},
    	{
    		text: "Eigenwerte einer 3x3-Matrix; Test mit Spur und Determinante",
    		link: "http://www.youtube.com/watch?v=ryQ0y9q8EpA",
    		type: "video",
    		time: "5:39"
    	},
    	{
    		text: "Eigenvektor zu einer 3x3-Matrix; Eigenwert gegeben",
    		link: "http://www.youtube.com/watch?v=Kpp30lbPqRU",
    		type: "video",
    		time: "11:36"
    	},
    	{
    		text: "Eigenwerte, Eigenvektoren einer 2x2-Matrix",
    		link: "http://www.youtube.com/watch?v=yMrXgOj3kVA",
    		type: "video",
    		time: "9:06"
    	}
    ],
    	"Vorlesung 24 - Anwendung von EV: Google Page Rank": [
    	{
    		text: "Lesen Sie vorab die Artikel:",
    		type: "text"
    	},
    	{
    		text: "Google's PageRank-Algorithmus zur Bewertung von Webseiten für Suchmaschinen:",
    		type: "text"
    	},
    	{
    		text: "Wikipedia,",
    		link: "http://de.wikipedia.org/wiki/PageRank",
    		type: "link"
    	},
    	{
    		text: "zum Schmökern (optional): Original-Paper der Google-Gründer Larry Page und Sergey Brin",
    		link: "http://infolab.stanford.edu/~backrub/google.html",
    		type: "link"
    	},
    	{
    		text: "Markov-Ketten und stochastische Matrizen: Wikipedia",
    		link: "http://de.wikipedia.org/wiki/%C3%9Cbergangsmatrix",
    		type: "link"
    	},
    	{
    		text: "„PageRank-Beispiel“ von",
    		link: "http://commons.wikimedia.org/wiki/File:PageRank-Beispiel.png#mediaviewer/Datei:PageRank-Beispiel.png",
    		type: "link"
    	},
    	{
    		text: "Zetkin - . Lizenziert unter",
    		link: "https://commons.wikimedia.org/wiki/User:Zetkin",
    		type: "link"
    	},
    	{
    		text: "CC BY-SA 3.0 über",
    		link: "http://creativecommons.org/licenses/by-sa/3.0",
    		type: "link"
    	},
    	{
    		text: "Wikimedia Commons .",
    		link: "https://commons.wikimedia.org/wiki/",
    		type: "link"
    	},
    	{
    		text: "Weiterführend und weitere Anwendungen in der Informatik: https://www.coursera.org/course/matrix",
    		link: "https://www.coursera.org/course/matrix",
    		type: "link"
    	}
    ]
    };

    const app = new App({
    	target: document.body,
    	props: {
    		data
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map

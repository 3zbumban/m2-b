
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

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var defaults = createCommonjsModule(function (module) {
    function getDefaults() {
      return {
        baseUrl: null,
        breaks: false,
        gfm: true,
        headerIds: true,
        headerPrefix: '',
        highlight: null,
        langPrefix: 'language-',
        mangle: true,
        pedantic: false,
        renderer: null,
        sanitize: false,
        sanitizer: null,
        silent: false,
        smartLists: false,
        smartypants: false,
        xhtml: false
      };
    }

    function changeDefaults(newDefaults) {
      module.exports.defaults = newDefaults;
    }

    module.exports = {
      defaults: getDefaults(),
      getDefaults,
      changeDefaults
    };
    });
    var defaults_1 = defaults.defaults;
    var defaults_2 = defaults.getDefaults;
    var defaults_3 = defaults.changeDefaults;

    /**
     * Helpers
     */
    const escapeTest = /[&<>"']/;
    const escapeReplace = /[&<>"']/g;
    const escapeTestNoEncode = /[<>"']|&(?!#?\w+;)/;
    const escapeReplaceNoEncode = /[<>"']|&(?!#?\w+;)/g;
    const escapeReplacements = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    const getEscapeReplacement = (ch) => escapeReplacements[ch];
    function escape(html, encode) {
      if (encode) {
        if (escapeTest.test(html)) {
          return html.replace(escapeReplace, getEscapeReplacement);
        }
      } else {
        if (escapeTestNoEncode.test(html)) {
          return html.replace(escapeReplaceNoEncode, getEscapeReplacement);
        }
      }

      return html;
    }

    const unescapeTest = /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig;

    function unescape(html) {
      // explicitly match decimal, hex, and named HTML entities
      return html.replace(unescapeTest, (_, n) => {
        n = n.toLowerCase();
        if (n === 'colon') return ':';
        if (n.charAt(0) === '#') {
          return n.charAt(1) === 'x'
            ? String.fromCharCode(parseInt(n.substring(2), 16))
            : String.fromCharCode(+n.substring(1));
        }
        return '';
      });
    }

    const caret = /(^|[^\[])\^/g;
    function edit(regex, opt) {
      regex = regex.source || regex;
      opt = opt || '';
      const obj = {
        replace: (name, val) => {
          val = val.source || val;
          val = val.replace(caret, '$1');
          regex = regex.replace(name, val);
          return obj;
        },
        getRegex: () => {
          return new RegExp(regex, opt);
        }
      };
      return obj;
    }

    const nonWordAndColonTest = /[^\w:]/g;
    const originIndependentUrl = /^$|^[a-z][a-z0-9+.-]*:|^[?#]/i;
    function cleanUrl(sanitize, base, href) {
      if (sanitize) {
        let prot;
        try {
          prot = decodeURIComponent(unescape(href))
            .replace(nonWordAndColonTest, '')
            .toLowerCase();
        } catch (e) {
          return null;
        }
        if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0 || prot.indexOf('data:') === 0) {
          return null;
        }
      }
      if (base && !originIndependentUrl.test(href)) {
        href = resolveUrl(base, href);
      }
      try {
        href = encodeURI(href).replace(/%25/g, '%');
      } catch (e) {
        return null;
      }
      return href;
    }

    const baseUrls = {};
    const justDomain = /^[^:]+:\/*[^/]*$/;
    const protocol = /^([^:]+:)[\s\S]*$/;
    const domain = /^([^:]+:\/*[^/]*)[\s\S]*$/;

    function resolveUrl(base, href) {
      if (!baseUrls[' ' + base]) {
        // we can ignore everything in base after the last slash of its path component,
        // but we might need to add _that_
        // https://tools.ietf.org/html/rfc3986#section-3
        if (justDomain.test(base)) {
          baseUrls[' ' + base] = base + '/';
        } else {
          baseUrls[' ' + base] = rtrim(base, '/', true);
        }
      }
      base = baseUrls[' ' + base];
      const relativeBase = base.indexOf(':') === -1;

      if (href.substring(0, 2) === '//') {
        if (relativeBase) {
          return href;
        }
        return base.replace(protocol, '$1') + href;
      } else if (href.charAt(0) === '/') {
        if (relativeBase) {
          return href;
        }
        return base.replace(domain, '$1') + href;
      } else {
        return base + href;
      }
    }

    const noopTest = { exec: function noopTest() {} };

    function merge(obj) {
      let i = 1,
        target,
        key;

      for (; i < arguments.length; i++) {
        target = arguments[i];
        for (key in target) {
          if (Object.prototype.hasOwnProperty.call(target, key)) {
            obj[key] = target[key];
          }
        }
      }

      return obj;
    }

    function splitCells(tableRow, count) {
      // ensure that every cell-delimiting pipe has a space
      // before it to distinguish it from an escaped pipe
      const row = tableRow.replace(/\|/g, (match, offset, str) => {
          let escaped = false,
            curr = offset;
          while (--curr >= 0 && str[curr] === '\\') escaped = !escaped;
          if (escaped) {
            // odd number of slashes means | is escaped
            // so we leave it alone
            return '|';
          } else {
            // add space before unescaped |
            return ' |';
          }
        }),
        cells = row.split(/ \|/);
      let i = 0;

      if (cells.length > count) {
        cells.splice(count);
      } else {
        while (cells.length < count) cells.push('');
      }

      for (; i < cells.length; i++) {
        // leading or trailing whitespace is ignored per the gfm spec
        cells[i] = cells[i].trim().replace(/\\\|/g, '|');
      }
      return cells;
    }

    // Remove trailing 'c's. Equivalent to str.replace(/c*$/, '').
    // /c*$/ is vulnerable to REDOS.
    // invert: Remove suffix of non-c chars instead. Default falsey.
    function rtrim(str, c, invert) {
      const l = str.length;
      if (l === 0) {
        return '';
      }

      // Length of suffix matching the invert condition.
      let suffLen = 0;

      // Step left until we fail to match the invert condition.
      while (suffLen < l) {
        const currChar = str.charAt(l - suffLen - 1);
        if (currChar === c && !invert) {
          suffLen++;
        } else if (currChar !== c && invert) {
          suffLen++;
        } else {
          break;
        }
      }

      return str.substr(0, l - suffLen);
    }

    function findClosingBracket(str, b) {
      if (str.indexOf(b[1]) === -1) {
        return -1;
      }
      const l = str.length;
      let level = 0,
        i = 0;
      for (; i < l; i++) {
        if (str[i] === '\\') {
          i++;
        } else if (str[i] === b[0]) {
          level++;
        } else if (str[i] === b[1]) {
          level--;
          if (level < 0) {
            return i;
          }
        }
      }
      return -1;
    }

    function checkSanitizeDeprecation(opt) {
      if (opt && opt.sanitize && !opt.silent) {
        console.warn('marked(): sanitize and sanitizer parameters are deprecated since version 0.7.0, should not be used and will be removed in the future. Read more here: https://marked.js.org/#/USING_ADVANCED.md#options');
      }
    }

    var helpers = {
      escape,
      unescape,
      edit,
      cleanUrl,
      resolveUrl,
      noopTest,
      merge,
      splitCells,
      rtrim,
      findClosingBracket,
      checkSanitizeDeprecation
    };

    const {
      noopTest: noopTest$1,
      edit: edit$1,
      merge: merge$1
    } = helpers;

    /**
     * Block-Level Grammar
     */
    const block = {
      newline: /^\n+/,
      code: /^( {4}[^\n]+\n*)+/,
      fences: /^ {0,3}(`{3,}(?=[^`\n]*\n)|~{3,})([^\n]*)\n(?:|([\s\S]*?)\n)(?: {0,3}\1[~`]* *(?:\n+|$)|$)/,
      hr: /^ {0,3}((?:- *){3,}|(?:_ *){3,}|(?:\* *){3,})(?:\n+|$)/,
      heading: /^ {0,3}(#{1,6}) +([^\n]*?)(?: +#+)? *(?:\n+|$)/,
      blockquote: /^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/,
      list: /^( {0,3})(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
      html: '^ {0,3}(?:' // optional indentation
        + '<(script|pre|style)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)' // (1)
        + '|comment[^\\n]*(\\n+|$)' // (2)
        + '|<\\?[\\s\\S]*?\\?>\\n*' // (3)
        + '|<![A-Z][\\s\\S]*?>\\n*' // (4)
        + '|<!\\[CDATA\\[[\\s\\S]*?\\]\\]>\\n*' // (5)
        + '|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:\\n{2,}|$)' // (6)
        + '|<(?!script|pre|style)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:\\n{2,}|$)' // (7) open tag
        + '|</(?!script|pre|style)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:\\n{2,}|$)' // (7) closing tag
        + ')',
      def: /^ {0,3}\[(label)\]: *\n? *<?([^\s>]+)>?(?:(?: +\n? *| *\n *)(title))? *(?:\n+|$)/,
      nptable: noopTest$1,
      table: noopTest$1,
      lheading: /^([^\n]+)\n {0,3}(=+|-+) *(?:\n+|$)/,
      // regex template, placeholders will be replaced according to different paragraph
      // interruption rules of commonmark and the original markdown spec:
      _paragraph: /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html)[^\n]+)*)/,
      text: /^[^\n]+/
    };

    block._label = /(?!\s*\])(?:\\[\[\]]|[^\[\]])+/;
    block._title = /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/;
    block.def = edit$1(block.def)
      .replace('label', block._label)
      .replace('title', block._title)
      .getRegex();

    block.bullet = /(?:[*+-]|\d{1,9}\.)/;
    block.item = /^( *)(bull) ?[^\n]*(?:\n(?!\1bull ?)[^\n]*)*/;
    block.item = edit$1(block.item, 'gm')
      .replace(/bull/g, block.bullet)
      .getRegex();

    block.list = edit$1(block.list)
      .replace(/bull/g, block.bullet)
      .replace('hr', '\\n+(?=\\1?(?:(?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$))')
      .replace('def', '\\n+(?=' + block.def.source + ')')
      .getRegex();

    block._tag = 'address|article|aside|base|basefont|blockquote|body|caption'
      + '|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption'
      + '|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe'
      + '|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option'
      + '|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr'
      + '|track|ul';
    block._comment = /<!--(?!-?>)[\s\S]*?-->/;
    block.html = edit$1(block.html, 'i')
      .replace('comment', block._comment)
      .replace('tag', block._tag)
      .replace('attribute', / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/)
      .getRegex();

    block.paragraph = edit$1(block._paragraph)
      .replace('hr', block.hr)
      .replace('heading', ' {0,3}#{1,6} ')
      .replace('|lheading', '') // setex headings don't interrupt commonmark paragraphs
      .replace('blockquote', ' {0,3}>')
      .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
      .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
      .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|!--)')
      .replace('tag', block._tag) // pars can be interrupted by type (6) html blocks
      .getRegex();

    block.blockquote = edit$1(block.blockquote)
      .replace('paragraph', block.paragraph)
      .getRegex();

    /**
     * Normal Block Grammar
     */

    block.normal = merge$1({}, block);

    /**
     * GFM Block Grammar
     */

    block.gfm = merge$1({}, block.normal, {
      nptable: '^ *([^|\\n ].*\\|.*)\\n' // Header
        + ' *([-:]+ *\\|[-| :]*)' // Align
        + '(?:\\n((?:(?!\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)', // Cells
      table: '^ *\\|(.+)\\n' // Header
        + ' *\\|?( *[-:]+[-| :]*)' // Align
        + '(?:\\n *((?:(?!\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)' // Cells
    });

    block.gfm.nptable = edit$1(block.gfm.nptable)
      .replace('hr', block.hr)
      .replace('heading', ' {0,3}#{1,6} ')
      .replace('blockquote', ' {0,3}>')
      .replace('code', ' {4}[^\\n]')
      .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
      .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
      .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|!--)')
      .replace('tag', block._tag) // tables can be interrupted by type (6) html blocks
      .getRegex();

    block.gfm.table = edit$1(block.gfm.table)
      .replace('hr', block.hr)
      .replace('heading', ' {0,3}#{1,6} ')
      .replace('blockquote', ' {0,3}>')
      .replace('code', ' {4}[^\\n]')
      .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
      .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
      .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|!--)')
      .replace('tag', block._tag) // tables can be interrupted by type (6) html blocks
      .getRegex();

    /**
     * Pedantic grammar (original John Gruber's loose markdown specification)
     */

    block.pedantic = merge$1({}, block.normal, {
      html: edit$1(
        '^ *(?:comment *(?:\\n|\\s*$)'
        + '|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)' // closed tag
        + '|<tag(?:"[^"]*"|\'[^\']*\'|\\s[^\'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))')
        .replace('comment', block._comment)
        .replace(/tag/g, '(?!(?:'
          + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub'
          + '|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)'
          + '\\b)\\w+(?!:|[^\\w\\s@]*@)\\b')
        .getRegex(),
      def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
      heading: /^ *(#{1,6}) *([^\n]+?) *(?:#+ *)?(?:\n+|$)/,
      fences: noopTest$1, // fences not supported
      paragraph: edit$1(block.normal._paragraph)
        .replace('hr', block.hr)
        .replace('heading', ' *#{1,6} *[^\n]')
        .replace('lheading', block.lheading)
        .replace('blockquote', ' {0,3}>')
        .replace('|fences', '')
        .replace('|list', '')
        .replace('|html', '')
        .getRegex()
    });

    /**
     * Inline-Level Grammar
     */
    const inline = {
      escape: /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,
      autolink: /^<(scheme:[^\s\x00-\x1f<>]*|email)>/,
      url: noopTest$1,
      tag: '^comment'
        + '|^</[a-zA-Z][\\w:-]*\\s*>' // self-closing tag
        + '|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>' // open tag
        + '|^<\\?[\\s\\S]*?\\?>' // processing instruction, e.g. <?php ?>
        + '|^<![a-zA-Z]+\\s[\\s\\S]*?>' // declaration, e.g. <!DOCTYPE html>
        + '|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>', // CDATA section
      link: /^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/,
      reflink: /^!?\[(label)\]\[(?!\s*\])((?:\\[\[\]]?|[^\[\]\\])+)\]/,
      nolink: /^!?\[(?!\s*\])((?:\[[^\[\]]*\]|\\[\[\]]|[^\[\]])*)\](?:\[\])?/,
      strong: /^__([^\s_])__(?!_)|^\*\*([^\s*])\*\*(?!\*)|^__([^\s][\s\S]*?[^\s])__(?!_)|^\*\*([^\s][\s\S]*?[^\s])\*\*(?!\*)/,
      em: /^_([^\s_])_(?!_)|^\*([^\s*<\[])\*(?!\*)|^_([^\s<][\s\S]*?[^\s_])_(?!_|[^\spunctuation])|^_([^\s_<][\s\S]*?[^\s])_(?!_|[^\spunctuation])|^\*([^\s<"][\s\S]*?[^\s\*])\*(?!\*|[^\spunctuation])|^\*([^\s*"<\[][\s\S]*?[^\s])\*(?!\*)/,
      code: /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,
      br: /^( {2,}|\\)\n(?!\s*$)/,
      del: noopTest$1,
      text: /^(`+|[^`])(?:[\s\S]*?(?:(?=[\\<!\[`*]|\b_|$)|[^ ](?= {2,}\n))|(?= {2,}\n))/
    };

    // list of punctuation marks from common mark spec
    // without ` and ] to workaround Rule 17 (inline code blocks/links)
    inline._punctuation = '!"#$%&\'()*+,\\-./:;<=>?@\\[^_{|}~';
    inline.em = edit$1(inline.em).replace(/punctuation/g, inline._punctuation).getRegex();

    inline._escapes = /\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/g;

    inline._scheme = /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/;
    inline._email = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/;
    inline.autolink = edit$1(inline.autolink)
      .replace('scheme', inline._scheme)
      .replace('email', inline._email)
      .getRegex();

    inline._attribute = /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/;

    inline.tag = edit$1(inline.tag)
      .replace('comment', block._comment)
      .replace('attribute', inline._attribute)
      .getRegex();

    inline._label = /(?:\[[^\[\]]*\]|\\.|`[^`]*`|[^\[\]\\`])*?/;
    inline._href = /<(?:\\[<>]?|[^\s<>\\])*>|[^\s\x00-\x1f]*/;
    inline._title = /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/;

    inline.link = edit$1(inline.link)
      .replace('label', inline._label)
      .replace('href', inline._href)
      .replace('title', inline._title)
      .getRegex();

    inline.reflink = edit$1(inline.reflink)
      .replace('label', inline._label)
      .getRegex();

    /**
     * Normal Inline Grammar
     */

    inline.normal = merge$1({}, inline);

    /**
     * Pedantic Inline Grammar
     */

    inline.pedantic = merge$1({}, inline.normal, {
      strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
      em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/,
      link: edit$1(/^!?\[(label)\]\((.*?)\)/)
        .replace('label', inline._label)
        .getRegex(),
      reflink: edit$1(/^!?\[(label)\]\s*\[([^\]]*)\]/)
        .replace('label', inline._label)
        .getRegex()
    });

    /**
     * GFM Inline Grammar
     */

    inline.gfm = merge$1({}, inline.normal, {
      escape: edit$1(inline.escape).replace('])', '~|])').getRegex(),
      _extended_email: /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/,
      url: /^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/,
      _backpedal: /(?:[^?!.,:;*_~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_~)]+(?!$))+/,
      del: /^~+(?=\S)([\s\S]*?\S)~+/,
      text: /^(`+|[^`])(?:[\s\S]*?(?:(?=[\\<!\[`*~]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@))|(?= {2,}\n|[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@))/
    });

    inline.gfm.url = edit$1(inline.gfm.url, 'i')
      .replace('email', inline.gfm._extended_email)
      .getRegex();
    /**
     * GFM + Line Breaks Inline Grammar
     */

    inline.breaks = merge$1({}, inline.gfm, {
      br: edit$1(inline.br).replace('{2,}', '*').getRegex(),
      text: edit$1(inline.gfm.text)
        .replace('\\b_', '\\b_| {2,}\\n')
        .replace(/\{2,\}/g, '*')
        .getRegex()
    });

    var rules = {
      block,
      inline
    };

    const { defaults: defaults$1 } = defaults;
    const { block: block$1 } = rules;
    const {
      rtrim: rtrim$1,
      splitCells: splitCells$1,
      escape: escape$1
    } = helpers;

    /**
     * Block Lexer
     */
    var Lexer_1 = class Lexer {
      constructor(options) {
        this.tokens = [];
        this.tokens.links = Object.create(null);
        this.options = options || defaults$1;
        this.rules = block$1.normal;

        if (this.options.pedantic) {
          this.rules = block$1.pedantic;
        } else if (this.options.gfm) {
          this.rules = block$1.gfm;
        }
      }

      /**
       * Expose Block Rules
       */
      static get rules() {
        return block$1;
      }

      /**
       * Static Lex Method
       */
      static lex(src, options) {
        const lexer = new Lexer(options);
        return lexer.lex(src);
      };

      /**
       * Preprocessing
       */
      lex(src) {
        src = src
          .replace(/\r\n|\r/g, '\n')
          .replace(/\t/g, '    ');

        return this.token(src, true);
      };

      /**
       * Lexing
       */
      token(src, top) {
        src = src.replace(/^ +$/gm, '');
        let next,
          loose,
          cap,
          bull,
          b,
          item,
          listStart,
          listItems,
          t,
          space,
          i,
          tag,
          l,
          isordered,
          istask,
          ischecked;

        while (src) {
          // newline
          if (cap = this.rules.newline.exec(src)) {
            src = src.substring(cap[0].length);
            if (cap[0].length > 1) {
              this.tokens.push({
                type: 'space'
              });
            }
          }

          // code
          if (cap = this.rules.code.exec(src)) {
            const lastToken = this.tokens[this.tokens.length - 1];
            src = src.substring(cap[0].length);
            // An indented code block cannot interrupt a paragraph.
            if (lastToken && lastToken.type === 'paragraph') {
              lastToken.text += '\n' + cap[0].trimRight();
            } else {
              cap = cap[0].replace(/^ {4}/gm, '');
              this.tokens.push({
                type: 'code',
                codeBlockStyle: 'indented',
                text: !this.options.pedantic
                  ? rtrim$1(cap, '\n')
                  : cap
              });
            }
            continue;
          }

          // fences
          if (cap = this.rules.fences.exec(src)) {
            src = src.substring(cap[0].length);
            this.tokens.push({
              type: 'code',
              lang: cap[2] ? cap[2].trim() : cap[2],
              text: cap[3] || ''
            });
            continue;
          }

          // heading
          if (cap = this.rules.heading.exec(src)) {
            src = src.substring(cap[0].length);
            this.tokens.push({
              type: 'heading',
              depth: cap[1].length,
              text: cap[2]
            });
            continue;
          }

          // table no leading pipe (gfm)
          if (cap = this.rules.nptable.exec(src)) {
            item = {
              type: 'table',
              header: splitCells$1(cap[1].replace(/^ *| *\| *$/g, '')),
              align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
              cells: cap[3] ? cap[3].replace(/\n$/, '').split('\n') : []
            };

            if (item.header.length === item.align.length) {
              src = src.substring(cap[0].length);

              for (i = 0; i < item.align.length; i++) {
                if (/^ *-+: *$/.test(item.align[i])) {
                  item.align[i] = 'right';
                } else if (/^ *:-+: *$/.test(item.align[i])) {
                  item.align[i] = 'center';
                } else if (/^ *:-+ *$/.test(item.align[i])) {
                  item.align[i] = 'left';
                } else {
                  item.align[i] = null;
                }
              }

              for (i = 0; i < item.cells.length; i++) {
                item.cells[i] = splitCells$1(item.cells[i], item.header.length);
              }

              this.tokens.push(item);

              continue;
            }
          }

          // hr
          if (cap = this.rules.hr.exec(src)) {
            src = src.substring(cap[0].length);
            this.tokens.push({
              type: 'hr'
            });
            continue;
          }

          // blockquote
          if (cap = this.rules.blockquote.exec(src)) {
            src = src.substring(cap[0].length);

            this.tokens.push({
              type: 'blockquote_start'
            });

            cap = cap[0].replace(/^ *> ?/gm, '');

            // Pass `top` to keep the current
            // "toplevel" state. This is exactly
            // how markdown.pl works.
            this.token(cap, top);

            this.tokens.push({
              type: 'blockquote_end'
            });

            continue;
          }

          // list
          if (cap = this.rules.list.exec(src)) {
            src = src.substring(cap[0].length);
            bull = cap[2];
            isordered = bull.length > 1;

            listStart = {
              type: 'list_start',
              ordered: isordered,
              start: isordered ? +bull : '',
              loose: false
            };

            this.tokens.push(listStart);

            // Get each top-level item.
            cap = cap[0].match(this.rules.item);

            listItems = [];
            next = false;
            l = cap.length;
            i = 0;

            for (; i < l; i++) {
              item = cap[i];

              // Remove the list item's bullet
              // so it is seen as the next token.
              space = item.length;
              item = item.replace(/^ *([*+-]|\d+\.) */, '');

              // Outdent whatever the
              // list item contains. Hacky.
              if (~item.indexOf('\n ')) {
                space -= item.length;
                item = !this.options.pedantic
                  ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
                  : item.replace(/^ {1,4}/gm, '');
              }

              // Determine whether the next list item belongs here.
              // Backpedal if it does not belong in this list.
              if (i !== l - 1) {
                b = block$1.bullet.exec(cap[i + 1])[0];
                if (bull.length > 1 ? b.length === 1
                  : (b.length > 1 || (this.options.smartLists && b !== bull))) {
                  src = cap.slice(i + 1).join('\n') + src;
                  i = l - 1;
                }
              }

              // Determine whether item is loose or not.
              // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
              // for discount behavior.
              loose = next || /\n\n(?!\s*$)/.test(item);
              if (i !== l - 1) {
                next = item.charAt(item.length - 1) === '\n';
                if (!loose) loose = next;
              }

              if (loose) {
                listStart.loose = true;
              }

              // Check for task list items
              istask = /^\[[ xX]\] /.test(item);
              ischecked = undefined;
              if (istask) {
                ischecked = item[1] !== ' ';
                item = item.replace(/^\[[ xX]\] +/, '');
              }

              t = {
                type: 'list_item_start',
                task: istask,
                checked: ischecked,
                loose: loose
              };

              listItems.push(t);
              this.tokens.push(t);

              // Recurse.
              this.token(item, false);

              this.tokens.push({
                type: 'list_item_end'
              });
            }

            if (listStart.loose) {
              l = listItems.length;
              i = 0;
              for (; i < l; i++) {
                listItems[i].loose = true;
              }
            }

            this.tokens.push({
              type: 'list_end'
            });

            continue;
          }

          // html
          if (cap = this.rules.html.exec(src)) {
            src = src.substring(cap[0].length);
            this.tokens.push({
              type: this.options.sanitize
                ? 'paragraph'
                : 'html',
              pre: !this.options.sanitizer
                && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
              text: this.options.sanitize ? (this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape$1(cap[0])) : cap[0]
            });
            continue;
          }

          // def
          if (top && (cap = this.rules.def.exec(src))) {
            src = src.substring(cap[0].length);
            if (cap[3]) cap[3] = cap[3].substring(1, cap[3].length - 1);
            tag = cap[1].toLowerCase().replace(/\s+/g, ' ');
            if (!this.tokens.links[tag]) {
              this.tokens.links[tag] = {
                href: cap[2],
                title: cap[3]
              };
            }
            continue;
          }

          // table (gfm)
          if (cap = this.rules.table.exec(src)) {
            item = {
              type: 'table',
              header: splitCells$1(cap[1].replace(/^ *| *\| *$/g, '')),
              align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
              cells: cap[3] ? cap[3].replace(/\n$/, '').split('\n') : []
            };

            if (item.header.length === item.align.length) {
              src = src.substring(cap[0].length);

              for (i = 0; i < item.align.length; i++) {
                if (/^ *-+: *$/.test(item.align[i])) {
                  item.align[i] = 'right';
                } else if (/^ *:-+: *$/.test(item.align[i])) {
                  item.align[i] = 'center';
                } else if (/^ *:-+ *$/.test(item.align[i])) {
                  item.align[i] = 'left';
                } else {
                  item.align[i] = null;
                }
              }

              for (i = 0; i < item.cells.length; i++) {
                item.cells[i] = splitCells$1(
                  item.cells[i].replace(/^ *\| *| *\| *$/g, ''),
                  item.header.length);
              }

              this.tokens.push(item);

              continue;
            }
          }

          // lheading
          if (cap = this.rules.lheading.exec(src)) {
            src = src.substring(cap[0].length);
            this.tokens.push({
              type: 'heading',
              depth: cap[2].charAt(0) === '=' ? 1 : 2,
              text: cap[1]
            });
            continue;
          }

          // top-level paragraph
          if (top && (cap = this.rules.paragraph.exec(src))) {
            src = src.substring(cap[0].length);
            this.tokens.push({
              type: 'paragraph',
              text: cap[1].charAt(cap[1].length - 1) === '\n'
                ? cap[1].slice(0, -1)
                : cap[1]
            });
            continue;
          }

          // text
          if (cap = this.rules.text.exec(src)) {
            // Top-level should never reach here.
            src = src.substring(cap[0].length);
            this.tokens.push({
              type: 'text',
              text: cap[0]
            });
            continue;
          }

          if (src) {
            throw new Error('Infinite loop on byte: ' + src.charCodeAt(0));
          }
        }

        return this.tokens;
      };
    };

    const { defaults: defaults$2 } = defaults;
    const {
      cleanUrl: cleanUrl$1,
      escape: escape$2
    } = helpers;

    /**
     * Renderer
     */
    var Renderer_1 = class Renderer {
      constructor(options) {
        this.options = options || defaults$2;
      }

      code(code, infostring, escaped) {
        const lang = (infostring || '').match(/\S*/)[0];
        if (this.options.highlight) {
          const out = this.options.highlight(code, lang);
          if (out != null && out !== code) {
            escaped = true;
            code = out;
          }
        }

        if (!lang) {
          return '<pre><code>'
            + (escaped ? code : escape$2(code, true))
            + '</code></pre>';
        }

        return '<pre><code class="'
          + this.options.langPrefix
          + escape$2(lang, true)
          + '">'
          + (escaped ? code : escape$2(code, true))
          + '</code></pre>\n';
      };

      blockquote(quote) {
        return '<blockquote>\n' + quote + '</blockquote>\n';
      };

      html(html) {
        return html;
      };

      heading(text, level, raw, slugger) {
        if (this.options.headerIds) {
          return '<h'
            + level
            + ' id="'
            + this.options.headerPrefix
            + slugger.slug(raw)
            + '">'
            + text
            + '</h'
            + level
            + '>\n';
        }
        // ignore IDs
        return '<h' + level + '>' + text + '</h' + level + '>\n';
      };

      hr() {
        return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
      };

      list(body, ordered, start) {
        const type = ordered ? 'ol' : 'ul',
          startatt = (ordered && start !== 1) ? (' start="' + start + '"') : '';
        return '<' + type + startatt + '>\n' + body + '</' + type + '>\n';
      };

      listitem(text) {
        return '<li>' + text + '</li>\n';
      };

      checkbox(checked) {
        return '<input '
          + (checked ? 'checked="" ' : '')
          + 'disabled="" type="checkbox"'
          + (this.options.xhtml ? ' /' : '')
          + '> ';
      };

      paragraph(text) {
        return '<p>' + text + '</p>\n';
      };

      table(header, body) {
        if (body) body = '<tbody>' + body + '</tbody>';

        return '<table>\n'
          + '<thead>\n'
          + header
          + '</thead>\n'
          + body
          + '</table>\n';
      };

      tablerow(content) {
        return '<tr>\n' + content + '</tr>\n';
      };

      tablecell(content, flags) {
        const type = flags.header ? 'th' : 'td';
        const tag = flags.align
          ? '<' + type + ' align="' + flags.align + '">'
          : '<' + type + '>';
        return tag + content + '</' + type + '>\n';
      };

      // span level renderer
      strong(text) {
        return '<strong>' + text + '</strong>';
      };

      em(text) {
        return '<em>' + text + '</em>';
      };

      codespan(text) {
        return '<code>' + text + '</code>';
      };

      br() {
        return this.options.xhtml ? '<br/>' : '<br>';
      };

      del(text) {
        return '<del>' + text + '</del>';
      };

      link(href, title, text) {
        href = cleanUrl$1(this.options.sanitize, this.options.baseUrl, href);
        if (href === null) {
          return text;
        }
        let out = '<a href="' + escape$2(href) + '"';
        if (title) {
          out += ' title="' + title + '"';
        }
        out += '>' + text + '</a>';
        return out;
      };

      image(href, title, text) {
        href = cleanUrl$1(this.options.sanitize, this.options.baseUrl, href);
        if (href === null) {
          return text;
        }

        let out = '<img src="' + href + '" alt="' + text + '"';
        if (title) {
          out += ' title="' + title + '"';
        }
        out += this.options.xhtml ? '/>' : '>';
        return out;
      };

      text(text) {
        return text;
      };
    };

    /**
     * Slugger generates header id
     */
    var Slugger_1 = class Slugger {
      constructor() {
        this.seen = {};
      }

      /**
       * Convert string to unique id
       */
      slug(value) {
        let slug = value
          .toLowerCase()
          .trim()
          // remove html tags
          .replace(/<[!\/a-z].*?>/ig, '')
          // remove unwanted chars
          .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
          .replace(/\s/g, '-');

        if (this.seen.hasOwnProperty(slug)) {
          const originalSlug = slug;
          do {
            this.seen[originalSlug]++;
            slug = originalSlug + '-' + this.seen[originalSlug];
          } while (this.seen.hasOwnProperty(slug));
        }
        this.seen[slug] = 0;

        return slug;
      };
    };

    const { defaults: defaults$3 } = defaults;
    const { inline: inline$1 } = rules;
    const {
      findClosingBracket: findClosingBracket$1,
      escape: escape$3
    } = helpers;

    /**
     * Inline Lexer & Compiler
     */
    var InlineLexer_1 = class InlineLexer {
      constructor(links, options) {
        this.options = options || defaults$3;
        this.links = links;
        this.rules = inline$1.normal;
        this.options.renderer = this.options.renderer || new Renderer_1();
        this.renderer = this.options.renderer;
        this.renderer.options = this.options;

        if (!this.links) {
          throw new Error('Tokens array requires a `links` property.');
        }

        if (this.options.pedantic) {
          this.rules = inline$1.pedantic;
        } else if (this.options.gfm) {
          if (this.options.breaks) {
            this.rules = inline$1.breaks;
          } else {
            this.rules = inline$1.gfm;
          }
        }
      }

      /**
       * Expose Inline Rules
       */
      static get rules() {
        return inline$1;
      }

      /**
       * Static Lexing/Compiling Method
       */
      static output(src, links, options) {
        const inline = new InlineLexer(links, options);
        return inline.output(src);
      }

      /**
       * Lexing/Compiling
       */
      output(src) {
        let out = '',
          link,
          text,
          href,
          title,
          cap,
          prevCapZero;

        while (src) {
          // escape
          if (cap = this.rules.escape.exec(src)) {
            src = src.substring(cap[0].length);
            out += escape$3(cap[1]);
            continue;
          }

          // tag
          if (cap = this.rules.tag.exec(src)) {
            if (!this.inLink && /^<a /i.test(cap[0])) {
              this.inLink = true;
            } else if (this.inLink && /^<\/a>/i.test(cap[0])) {
              this.inLink = false;
            }
            if (!this.inRawBlock && /^<(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
              this.inRawBlock = true;
            } else if (this.inRawBlock && /^<\/(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
              this.inRawBlock = false;
            }

            src = src.substring(cap[0].length);
            out += this.renderer.html(this.options.sanitize
              ? (this.options.sanitizer
                ? this.options.sanitizer(cap[0])
                : escape$3(cap[0]))
              : cap[0]);
            continue;
          }

          // link
          if (cap = this.rules.link.exec(src)) {
            const lastParenIndex = findClosingBracket$1(cap[2], '()');
            if (lastParenIndex > -1) {
              const start = cap[0].indexOf('!') === 0 ? 5 : 4;
              const linkLen = start + cap[1].length + lastParenIndex;
              cap[2] = cap[2].substring(0, lastParenIndex);
              cap[0] = cap[0].substring(0, linkLen).trim();
              cap[3] = '';
            }
            src = src.substring(cap[0].length);
            this.inLink = true;
            href = cap[2];
            if (this.options.pedantic) {
              link = /^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(href);

              if (link) {
                href = link[1];
                title = link[3];
              } else {
                title = '';
              }
            } else {
              title = cap[3] ? cap[3].slice(1, -1) : '';
            }
            href = href.trim().replace(/^<([\s\S]*)>$/, '$1');
            out += this.outputLink(cap, {
              href: InlineLexer.escapes(href),
              title: InlineLexer.escapes(title)
            });
            this.inLink = false;
            continue;
          }

          // reflink, nolink
          if ((cap = this.rules.reflink.exec(src))
              || (cap = this.rules.nolink.exec(src))) {
            src = src.substring(cap[0].length);
            link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
            link = this.links[link.toLowerCase()];
            if (!link || !link.href) {
              out += cap[0].charAt(0);
              src = cap[0].substring(1) + src;
              continue;
            }
            this.inLink = true;
            out += this.outputLink(cap, link);
            this.inLink = false;
            continue;
          }

          // strong
          if (cap = this.rules.strong.exec(src)) {
            src = src.substring(cap[0].length);
            out += this.renderer.strong(this.output(cap[4] || cap[3] || cap[2] || cap[1]));
            continue;
          }

          // em
          if (cap = this.rules.em.exec(src)) {
            src = src.substring(cap[0].length);
            out += this.renderer.em(this.output(cap[6] || cap[5] || cap[4] || cap[3] || cap[2] || cap[1]));
            continue;
          }

          // code
          if (cap = this.rules.code.exec(src)) {
            src = src.substring(cap[0].length);
            out += this.renderer.codespan(escape$3(cap[2].trim(), true));
            continue;
          }

          // br
          if (cap = this.rules.br.exec(src)) {
            src = src.substring(cap[0].length);
            out += this.renderer.br();
            continue;
          }

          // del (gfm)
          if (cap = this.rules.del.exec(src)) {
            src = src.substring(cap[0].length);
            out += this.renderer.del(this.output(cap[1]));
            continue;
          }

          // autolink
          if (cap = this.rules.autolink.exec(src)) {
            src = src.substring(cap[0].length);
            if (cap[2] === '@') {
              text = escape$3(this.mangle(cap[1]));
              href = 'mailto:' + text;
            } else {
              text = escape$3(cap[1]);
              href = text;
            }
            out += this.renderer.link(href, null, text);
            continue;
          }

          // url (gfm)
          if (!this.inLink && (cap = this.rules.url.exec(src))) {
            if (cap[2] === '@') {
              text = escape$3(cap[0]);
              href = 'mailto:' + text;
            } else {
              // do extended autolink path validation
              do {
                prevCapZero = cap[0];
                cap[0] = this.rules._backpedal.exec(cap[0])[0];
              } while (prevCapZero !== cap[0]);
              text = escape$3(cap[0]);
              if (cap[1] === 'www.') {
                href = 'http://' + text;
              } else {
                href = text;
              }
            }
            src = src.substring(cap[0].length);
            out += this.renderer.link(href, null, text);
            continue;
          }

          // text
          if (cap = this.rules.text.exec(src)) {
            src = src.substring(cap[0].length);
            if (this.inRawBlock) {
              out += this.renderer.text(this.options.sanitize ? (this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape$3(cap[0])) : cap[0]);
            } else {
              out += this.renderer.text(escape$3(this.smartypants(cap[0])));
            }
            continue;
          }

          if (src) {
            throw new Error('Infinite loop on byte: ' + src.charCodeAt(0));
          }
        }

        return out;
      }

      static escapes(text) {
        return text ? text.replace(InlineLexer.rules._escapes, '$1') : text;
      }

      /**
       * Compile Link
       */
      outputLink(cap, link) {
        const href = link.href,
          title = link.title ? escape$3(link.title) : null;

        return cap[0].charAt(0) !== '!'
          ? this.renderer.link(href, title, this.output(cap[1]))
          : this.renderer.image(href, title, escape$3(cap[1]));
      }

      /**
       * Smartypants Transformations
       */
      smartypants(text) {
        if (!this.options.smartypants) return text;
        return text
          // em-dashes
          .replace(/---/g, '\u2014')
          // en-dashes
          .replace(/--/g, '\u2013')
          // opening singles
          .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
          // closing singles & apostrophes
          .replace(/'/g, '\u2019')
          // opening doubles
          .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
          // closing doubles
          .replace(/"/g, '\u201d')
          // ellipses
          .replace(/\.{3}/g, '\u2026');
      }

      /**
       * Mangle Links
       */
      mangle(text) {
        if (!this.options.mangle) return text;
        const l = text.length;
        let out = '',
          i = 0,
          ch;

        for (; i < l; i++) {
          ch = text.charCodeAt(i);
          if (Math.random() > 0.5) {
            ch = 'x' + ch.toString(16);
          }
          out += '&#' + ch + ';';
        }

        return out;
      }
    };

    /**
     * TextRenderer
     * returns only the textual part of the token
     */
    var TextRenderer_1 = class TextRenderer {
      // no need for block level renderers
      strong(text) {
        return text;
      }

      em(text) {
        return text;
      }

      codespan(text) {
        return text;
      }

      del(text) {
        return text;
      }

      html(text) {
        return text;
      }

      text(text) {
        return text;
      }

      link(href, title, text) {
        return '' + text;
      }

      image(href, title, text) {
        return '' + text;
      }

      br() {
        return '';
      }
    };

    const { defaults: defaults$4 } = defaults;
    const {
      merge: merge$2,
      unescape: unescape$1
    } = helpers;

    /**
     * Parsing & Compiling
     */
    var Parser_1 = class Parser {
      constructor(options) {
        this.tokens = [];
        this.token = null;
        this.options = options || defaults$4;
        this.options.renderer = this.options.renderer || new Renderer_1();
        this.renderer = this.options.renderer;
        this.renderer.options = this.options;
        this.slugger = new Slugger_1();
      }

      /**
       * Static Parse Method
       */
      static parse(tokens, options) {
        const parser = new Parser(options);
        return parser.parse(tokens);
      };

      /**
       * Parse Loop
       */
      parse(tokens) {
        this.inline = new InlineLexer_1(tokens.links, this.options);
        // use an InlineLexer with a TextRenderer to extract pure text
        this.inlineText = new InlineLexer_1(
          tokens.links,
          merge$2({}, this.options, { renderer: new TextRenderer_1() })
        );
        this.tokens = tokens.reverse();

        let out = '';
        while (this.next()) {
          out += this.tok();
        }

        return out;
      };

      /**
       * Next Token
       */
      next() {
        this.token = this.tokens.pop();
        return this.token;
      };

      /**
       * Preview Next Token
       */
      peek() {
        return this.tokens[this.tokens.length - 1] || 0;
      };

      /**
       * Parse Text Tokens
       */
      parseText() {
        let body = this.token.text;

        while (this.peek().type === 'text') {
          body += '\n' + this.next().text;
        }

        return this.inline.output(body);
      };

      /**
       * Parse Current Token
       */
      tok() {
        let body = '';
        switch (this.token.type) {
          case 'space': {
            return '';
          }
          case 'hr': {
            return this.renderer.hr();
          }
          case 'heading': {
            return this.renderer.heading(
              this.inline.output(this.token.text),
              this.token.depth,
              unescape$1(this.inlineText.output(this.token.text)),
              this.slugger);
          }
          case 'code': {
            return this.renderer.code(this.token.text,
              this.token.lang,
              this.token.escaped);
          }
          case 'table': {
            let header = '',
              i,
              row,
              cell,
              j;

            // header
            cell = '';
            for (i = 0; i < this.token.header.length; i++) {
              cell += this.renderer.tablecell(
                this.inline.output(this.token.header[i]),
                { header: true, align: this.token.align[i] }
              );
            }
            header += this.renderer.tablerow(cell);

            for (i = 0; i < this.token.cells.length; i++) {
              row = this.token.cells[i];

              cell = '';
              for (j = 0; j < row.length; j++) {
                cell += this.renderer.tablecell(
                  this.inline.output(row[j]),
                  { header: false, align: this.token.align[j] }
                );
              }

              body += this.renderer.tablerow(cell);
            }
            return this.renderer.table(header, body);
          }
          case 'blockquote_start': {
            body = '';

            while (this.next().type !== 'blockquote_end') {
              body += this.tok();
            }

            return this.renderer.blockquote(body);
          }
          case 'list_start': {
            body = '';
            const ordered = this.token.ordered,
              start = this.token.start;

            while (this.next().type !== 'list_end') {
              body += this.tok();
            }

            return this.renderer.list(body, ordered, start);
          }
          case 'list_item_start': {
            body = '';
            const loose = this.token.loose;
            const checked = this.token.checked;
            const task = this.token.task;

            if (this.token.task) {
              if (loose) {
                if (this.peek().type === 'text') {
                  const nextToken = this.peek();
                  nextToken.text = this.renderer.checkbox(checked) + ' ' + nextToken.text;
                } else {
                  this.tokens.push({
                    type: 'text',
                    text: this.renderer.checkbox(checked)
                  });
                }
              } else {
                body += this.renderer.checkbox(checked);
              }
            }

            while (this.next().type !== 'list_item_end') {
              body += !loose && this.token.type === 'text'
                ? this.parseText()
                : this.tok();
            }
            return this.renderer.listitem(body, task, checked);
          }
          case 'html': {
            // TODO parse inline content if parameter markdown=1
            return this.renderer.html(this.token.text);
          }
          case 'paragraph': {
            return this.renderer.paragraph(this.inline.output(this.token.text));
          }
          case 'text': {
            return this.renderer.paragraph(this.parseText());
          }
          default: {
            const errMsg = 'Token with "' + this.token.type + '" type was not found.';
            if (this.options.silent) {
              console.log(errMsg);
            } else {
              throw new Error(errMsg);
            }
          }
        }
      };
    };

    const {
      merge: merge$3,
      checkSanitizeDeprecation: checkSanitizeDeprecation$1,
      escape: escape$4
    } = helpers;
    const {
      getDefaults,
      changeDefaults,
      defaults: defaults$5
    } = defaults;

    /**
     * Marked
     */
    function marked(src, opt, callback) {
      // throw error in case of non string input
      if (typeof src === 'undefined' || src === null) {
        throw new Error('marked(): input parameter is undefined or null');
      }
      if (typeof src !== 'string') {
        throw new Error('marked(): input parameter is of type '
          + Object.prototype.toString.call(src) + ', string expected');
      }

      if (callback || typeof opt === 'function') {
        if (!callback) {
          callback = opt;
          opt = null;
        }

        opt = merge$3({}, marked.defaults, opt || {});
        checkSanitizeDeprecation$1(opt);
        const highlight = opt.highlight;
        let tokens,
          pending,
          i = 0;

        try {
          tokens = Lexer_1.lex(src, opt);
        } catch (e) {
          return callback(e);
        }

        pending = tokens.length;

        const done = function(err) {
          if (err) {
            opt.highlight = highlight;
            return callback(err);
          }

          let out;

          try {
            out = Parser_1.parse(tokens, opt);
          } catch (e) {
            err = e;
          }

          opt.highlight = highlight;

          return err
            ? callback(err)
            : callback(null, out);
        };

        if (!highlight || highlight.length < 3) {
          return done();
        }

        delete opt.highlight;

        if (!pending) return done();

        for (; i < tokens.length; i++) {
          (function(token) {
            if (token.type !== 'code') {
              return --pending || done();
            }
            return highlight(token.text, token.lang, function(err, code) {
              if (err) return done(err);
              if (code == null || code === token.text) {
                return --pending || done();
              }
              token.text = code;
              token.escaped = true;
              --pending || done();
            });
          })(tokens[i]);
        }

        return;
      }
      try {
        opt = merge$3({}, marked.defaults, opt || {});
        checkSanitizeDeprecation$1(opt);
        return Parser_1.parse(Lexer_1.lex(src, opt), opt);
      } catch (e) {
        e.message += '\nPlease report this to https://github.com/markedjs/marked.';
        if ((opt || marked.defaults).silent) {
          return '<p>An error occurred:</p><pre>'
            + escape$4(e.message + '', true)
            + '</pre>';
        }
        throw e;
      }
    }

    /**
     * Options
     */

    marked.options =
    marked.setOptions = function(opt) {
      merge$3(marked.defaults, opt);
      changeDefaults(marked.defaults);
      return marked;
    };

    marked.getDefaults = getDefaults;

    marked.defaults = defaults$5;

    /**
     * Expose
     */

    marked.Parser = Parser_1;
    marked.parser = Parser_1.parse;

    marked.Renderer = Renderer_1;
    marked.TextRenderer = TextRenderer_1;

    marked.Lexer = Lexer_1;
    marked.lexer = Lexer_1.lex;

    marked.InlineLexer = InlineLexer_1;
    marked.inlineLexer = InlineLexer_1.output;

    marked.Slugger = Slugger_1;

    marked.parse = marked;

    var marked_1 = marked;

    var purify = createCommonjsModule(function (module, exports) {
    (function (global, factory) {
    	 module.exports = factory() ;
    }(commonjsGlobal, (function () {
    function _toConsumableArray$1(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

    var hasOwnProperty = Object.hasOwnProperty;
    var setPrototypeOf = Object.setPrototypeOf;
    var isFrozen = Object.isFrozen;
    var objectKeys = Object.keys;
    var freeze = Object.freeze;
    var seal = Object.seal; // eslint-disable-line import/no-mutable-exports

    var _ref = typeof Reflect !== 'undefined' && Reflect;
    var apply = _ref.apply;
    var construct = _ref.construct;

    if (!apply) {
      apply = function apply(fun, thisValue, args) {
        return fun.apply(thisValue, args);
      };
    }

    if (!freeze) {
      freeze = function freeze(x) {
        return x;
      };
    }

    if (!seal) {
      seal = function seal(x) {
        return x;
      };
    }

    if (!construct) {
      construct = function construct(Func, args) {
        return new (Function.prototype.bind.apply(Func, [null].concat(_toConsumableArray$1(args))))();
      };
    }

    var arrayForEach = unapply(Array.prototype.forEach);
    var arrayIndexOf = unapply(Array.prototype.indexOf);
    var arrayJoin = unapply(Array.prototype.join);
    var arrayPop = unapply(Array.prototype.pop);
    var arrayPush = unapply(Array.prototype.push);
    var arraySlice = unapply(Array.prototype.slice);

    var stringToLowerCase = unapply(String.prototype.toLowerCase);
    var stringMatch = unapply(String.prototype.match);
    var stringReplace = unapply(String.prototype.replace);
    var stringIndexOf = unapply(String.prototype.indexOf);
    var stringTrim = unapply(String.prototype.trim);

    var regExpTest = unapply(RegExp.prototype.test);
    var regExpCreate = unconstruct(RegExp);

    var typeErrorCreate = unconstruct(TypeError);

    function unapply(func) {
      return function (thisArg) {
        for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }

        return apply(func, thisArg, args);
      };
    }

    function unconstruct(func) {
      return function () {
        for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          args[_key2] = arguments[_key2];
        }

        return construct(func, args);
      };
    }

    /* Add properties to a lookup table */
    function addToSet(set, array) {
      if (setPrototypeOf) {
        // Make 'in' and truthy checks like Boolean(set.constructor)
        // independent of any properties defined on Object.prototype.
        // Prevent prototype setters from intercepting set as a this value.
        setPrototypeOf(set, null);
      }

      var l = array.length;
      while (l--) {
        var element = array[l];
        if (typeof element === 'string') {
          var lcElement = stringToLowerCase(element);
          if (lcElement !== element) {
            // Config presets (e.g. tags.js, attrs.js) are immutable.
            if (!isFrozen(array)) {
              array[l] = lcElement;
            }

            element = lcElement;
          }
        }

        set[element] = true;
      }

      return set;
    }

    /* Shallow clone an object */
    function clone(object) {
      var newObject = {};

      var property = void 0;
      for (property in object) {
        if (apply(hasOwnProperty, object, [property])) {
          newObject[property] = object[property];
        }
      }

      return newObject;
    }

    var html = freeze(['a', 'abbr', 'acronym', 'address', 'area', 'article', 'aside', 'audio', 'b', 'bdi', 'bdo', 'big', 'blink', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'center', 'cite', 'code', 'col', 'colgroup', 'content', 'data', 'datalist', 'dd', 'decorator', 'del', 'details', 'dfn', 'dir', 'div', 'dl', 'dt', 'element', 'em', 'fieldset', 'figcaption', 'figure', 'font', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'main', 'map', 'mark', 'marquee', 'menu', 'menuitem', 'meter', 'nav', 'nobr', 'ol', 'optgroup', 'option', 'output', 'p', 'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'section', 'select', 'shadow', 'small', 'source', 'spacer', 'span', 'strike', 'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'tr', 'track', 'tt', 'u', 'ul', 'var', 'video', 'wbr']);

    // SVG
    var svg = freeze(['svg', 'a', 'altglyph', 'altglyphdef', 'altglyphitem', 'animatecolor', 'animatemotion', 'animatetransform', 'audio', 'canvas', 'circle', 'clippath', 'defs', 'desc', 'ellipse', 'filter', 'font', 'g', 'glyph', 'glyphref', 'hkern', 'image', 'line', 'lineargradient', 'marker', 'mask', 'metadata', 'mpath', 'path', 'pattern', 'polygon', 'polyline', 'radialgradient', 'rect', 'stop', 'style', 'switch', 'symbol', 'text', 'textpath', 'title', 'tref', 'tspan', 'video', 'view', 'vkern']);

    var svgFilters = freeze(['feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur', 'feMerge', 'feMergeNode', 'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile', 'feTurbulence']);

    var mathMl = freeze(['math', 'menclose', 'merror', 'mfenced', 'mfrac', 'mglyph', 'mi', 'mlabeledtr', 'mmultiscripts', 'mn', 'mo', 'mover', 'mpadded', 'mphantom', 'mroot', 'mrow', 'ms', 'mspace', 'msqrt', 'mstyle', 'msub', 'msup', 'msubsup', 'mtable', 'mtd', 'mtext', 'mtr', 'munder', 'munderover']);

    var text = freeze(['#text']);

    var html$1 = freeze(['accept', 'action', 'align', 'alt', 'autocomplete', 'background', 'bgcolor', 'border', 'cellpadding', 'cellspacing', 'checked', 'cite', 'class', 'clear', 'color', 'cols', 'colspan', 'controls', 'coords', 'crossorigin', 'datetime', 'default', 'dir', 'disabled', 'download', 'enctype', 'face', 'for', 'headers', 'height', 'hidden', 'high', 'href', 'hreflang', 'id', 'integrity', 'ismap', 'label', 'lang', 'list', 'loop', 'low', 'max', 'maxlength', 'media', 'method', 'min', 'minlength', 'multiple', 'name', 'noshade', 'novalidate', 'nowrap', 'open', 'optimum', 'pattern', 'placeholder', 'poster', 'preload', 'pubdate', 'radiogroup', 'readonly', 'rel', 'required', 'rev', 'reversed', 'role', 'rows', 'rowspan', 'spellcheck', 'scope', 'selected', 'shape', 'size', 'sizes', 'span', 'srclang', 'start', 'src', 'srcset', 'step', 'style', 'summary', 'tabindex', 'title', 'type', 'usemap', 'valign', 'value', 'width', 'xmlns']);

    var svg$1 = freeze(['accent-height', 'accumulate', 'additive', 'alignment-baseline', 'ascent', 'attributename', 'attributetype', 'azimuth', 'basefrequency', 'baseline-shift', 'begin', 'bias', 'by', 'class', 'clip', 'clip-path', 'clip-rule', 'color', 'color-interpolation', 'color-interpolation-filters', 'color-profile', 'color-rendering', 'cx', 'cy', 'd', 'dx', 'dy', 'diffuseconstant', 'direction', 'display', 'divisor', 'dur', 'edgemode', 'elevation', 'end', 'fill', 'fill-opacity', 'fill-rule', 'filter', 'filterunits', 'flood-color', 'flood-opacity', 'font-family', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style', 'font-variant', 'font-weight', 'fx', 'fy', 'g1', 'g2', 'glyph-name', 'glyphref', 'gradientunits', 'gradienttransform', 'height', 'href', 'id', 'image-rendering', 'in', 'in2', 'k', 'k1', 'k2', 'k3', 'k4', 'kerning', 'keypoints', 'keysplines', 'keytimes', 'lang', 'lengthadjust', 'letter-spacing', 'kernelmatrix', 'kernelunitlength', 'lighting-color', 'local', 'marker-end', 'marker-mid', 'marker-start', 'markerheight', 'markerunits', 'markerwidth', 'maskcontentunits', 'maskunits', 'max', 'mask', 'media', 'method', 'mode', 'min', 'name', 'numoctaves', 'offset', 'operator', 'opacity', 'order', 'orient', 'orientation', 'origin', 'overflow', 'paint-order', 'path', 'pathlength', 'patterncontentunits', 'patterntransform', 'patternunits', 'points', 'preservealpha', 'preserveaspectratio', 'primitiveunits', 'r', 'rx', 'ry', 'radius', 'refx', 'refy', 'repeatcount', 'repeatdur', 'restart', 'result', 'rotate', 'scale', 'seed', 'shape-rendering', 'specularconstant', 'specularexponent', 'spreadmethod', 'stddeviation', 'stitchtiles', 'stop-color', 'stop-opacity', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'stroke', 'stroke-width', 'style', 'surfacescale', 'tabindex', 'targetx', 'targety', 'transform', 'text-anchor', 'text-decoration', 'text-rendering', 'textlength', 'type', 'u1', 'u2', 'unicode', 'values', 'viewbox', 'visibility', 'version', 'vert-adv-y', 'vert-origin-x', 'vert-origin-y', 'width', 'word-spacing', 'wrap', 'writing-mode', 'xchannelselector', 'ychannelselector', 'x', 'x1', 'x2', 'xmlns', 'y', 'y1', 'y2', 'z', 'zoomandpan']);

    var mathMl$1 = freeze(['accent', 'accentunder', 'align', 'bevelled', 'close', 'columnsalign', 'columnlines', 'columnspan', 'denomalign', 'depth', 'dir', 'display', 'displaystyle', 'encoding', 'fence', 'frame', 'height', 'href', 'id', 'largeop', 'length', 'linethickness', 'lspace', 'lquote', 'mathbackground', 'mathcolor', 'mathsize', 'mathvariant', 'maxsize', 'minsize', 'movablelimits', 'notation', 'numalign', 'open', 'rowalign', 'rowlines', 'rowspacing', 'rowspan', 'rspace', 'rquote', 'scriptlevel', 'scriptminsize', 'scriptsizemultiplier', 'selection', 'separator', 'separators', 'stretchy', 'subscriptshift', 'supscriptshift', 'symmetric', 'voffset', 'width', 'xmlns']);

    var xml = freeze(['xlink:href', 'xml:id', 'xlink:title', 'xml:space', 'xmlns:xlink']);

    var MUSTACHE_EXPR = seal(/\{\{[\s\S]*|[\s\S]*\}\}/gm); // Specify template detection regex for SAFE_FOR_TEMPLATES mode
    var ERB_EXPR = seal(/<%[\s\S]*|[\s\S]*%>/gm);
    var DATA_ATTR = seal(/^data-[\-\w.\u00B7-\uFFFF]/); // eslint-disable-line no-useless-escape
    var ARIA_ATTR = seal(/^aria-[\-\w]+$/); // eslint-disable-line no-useless-escape
    var IS_ALLOWED_URI = seal(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i // eslint-disable-line no-useless-escape
    );
    var IS_SCRIPT_OR_DATA = seal(/^(?:\w+script|data):/i);
    var ATTR_WHITESPACE = seal(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205f\u3000]/g // eslint-disable-line no-control-regex
    );

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

    function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

    var getGlobal = function getGlobal() {
      return typeof window === 'undefined' ? null : window;
    };

    /**
     * Creates a no-op policy for internal use only.
     * Don't export this function outside this module!
     * @param {?TrustedTypePolicyFactory} trustedTypes The policy factory.
     * @param {Document} document The document object (to determine policy name suffix)
     * @return {?TrustedTypePolicy} The policy created (or null, if Trusted Types
     * are not supported).
     */
    var _createTrustedTypesPolicy = function _createTrustedTypesPolicy(trustedTypes, document) {
      if ((typeof trustedTypes === 'undefined' ? 'undefined' : _typeof(trustedTypes)) !== 'object' || typeof trustedTypes.createPolicy !== 'function') {
        return null;
      }

      // Allow the callers to control the unique policy name
      // by adding a data-tt-policy-suffix to the script element with the DOMPurify.
      // Policy creation with duplicate names throws in Trusted Types.
      var suffix = null;
      var ATTR_NAME = 'data-tt-policy-suffix';
      if (document.currentScript && document.currentScript.hasAttribute(ATTR_NAME)) {
        suffix = document.currentScript.getAttribute(ATTR_NAME);
      }

      var policyName = 'dompurify' + (suffix ? '#' + suffix : '');

      try {
        return trustedTypes.createPolicy(policyName, {
          createHTML: function createHTML(html$$1) {
            return html$$1;
          }
        });
      } catch (error) {
        // Policy creation failed (most likely another DOMPurify script has
        // already run). Skip creating the policy, as this will only cause errors
        // if TT are enforced.
        console.warn('TrustedTypes policy ' + policyName + ' could not be created.');
        return null;
      }
    };

    function createDOMPurify() {
      var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getGlobal();

      var DOMPurify = function DOMPurify(root) {
        return createDOMPurify(root);
      };

      /**
       * Version label, exposed for easier checks
       * if DOMPurify is up to date or not
       */
      DOMPurify.version = '2.0.8';

      /**
       * Array of elements that DOMPurify removed during sanitation.
       * Empty if nothing was removed.
       */
      DOMPurify.removed = [];

      if (!window || !window.document || window.document.nodeType !== 9) {
        // Not running in a browser, provide a factory function
        // so that you can pass your own Window
        DOMPurify.isSupported = false;

        return DOMPurify;
      }

      var originalDocument = window.document;
      var useDOMParser = false;
      var removeTitle = false;

      var document = window.document;
      var DocumentFragment = window.DocumentFragment,
          HTMLTemplateElement = window.HTMLTemplateElement,
          Node = window.Node,
          NodeFilter = window.NodeFilter,
          _window$NamedNodeMap = window.NamedNodeMap,
          NamedNodeMap = _window$NamedNodeMap === undefined ? window.NamedNodeMap || window.MozNamedAttrMap : _window$NamedNodeMap,
          Text = window.Text,
          Comment = window.Comment,
          DOMParser = window.DOMParser,
          trustedTypes = window.trustedTypes;

      // As per issue #47, the web-components registry is inherited by a
      // new document created via createHTMLDocument. As per the spec
      // (http://w3c.github.io/webcomponents/spec/custom/#creating-and-passing-registries)
      // a new empty registry is used when creating a template contents owner
      // document, so we use that as our parent document to ensure nothing
      // is inherited.

      if (typeof HTMLTemplateElement === 'function') {
        var template = document.createElement('template');
        if (template.content && template.content.ownerDocument) {
          document = template.content.ownerDocument;
        }
      }

      var trustedTypesPolicy = _createTrustedTypesPolicy(trustedTypes, originalDocument);
      var emptyHTML = trustedTypesPolicy ? trustedTypesPolicy.createHTML('') : '';

      var _document = document,
          implementation = _document.implementation,
          createNodeIterator = _document.createNodeIterator,
          getElementsByTagName = _document.getElementsByTagName,
          createDocumentFragment = _document.createDocumentFragment;
      var importNode = originalDocument.importNode;


      var hooks = {};

      /**
       * Expose whether this browser supports running the full DOMPurify.
       */
      DOMPurify.isSupported = implementation && typeof implementation.createHTMLDocument !== 'undefined' && document.documentMode !== 9;

      var MUSTACHE_EXPR$$1 = MUSTACHE_EXPR,
          ERB_EXPR$$1 = ERB_EXPR,
          DATA_ATTR$$1 = DATA_ATTR,
          ARIA_ATTR$$1 = ARIA_ATTR,
          IS_SCRIPT_OR_DATA$$1 = IS_SCRIPT_OR_DATA,
          ATTR_WHITESPACE$$1 = ATTR_WHITESPACE;
      var IS_ALLOWED_URI$$1 = IS_ALLOWED_URI;

      /**
       * We consider the elements and attributes below to be safe. Ideally
       * don't add any new ones but feel free to remove unwanted ones.
       */

      /* allowed element names */

      var ALLOWED_TAGS = null;
      var DEFAULT_ALLOWED_TAGS = addToSet({}, [].concat(_toConsumableArray(html), _toConsumableArray(svg), _toConsumableArray(svgFilters), _toConsumableArray(mathMl), _toConsumableArray(text)));

      /* Allowed attribute names */
      var ALLOWED_ATTR = null;
      var DEFAULT_ALLOWED_ATTR = addToSet({}, [].concat(_toConsumableArray(html$1), _toConsumableArray(svg$1), _toConsumableArray(mathMl$1), _toConsumableArray(xml)));

      /* Explicitly forbidden tags (overrides ALLOWED_TAGS/ADD_TAGS) */
      var FORBID_TAGS = null;

      /* Explicitly forbidden attributes (overrides ALLOWED_ATTR/ADD_ATTR) */
      var FORBID_ATTR = null;

      /* Decide if ARIA attributes are okay */
      var ALLOW_ARIA_ATTR = true;

      /* Decide if custom data attributes are okay */
      var ALLOW_DATA_ATTR = true;

      /* Decide if unknown protocols are okay */
      var ALLOW_UNKNOWN_PROTOCOLS = false;

      /* Output should be safe for jQuery's $() factory? */
      var SAFE_FOR_JQUERY = false;

      /* Output should be safe for common template engines.
       * This means, DOMPurify removes data attributes, mustaches and ERB
       */
      var SAFE_FOR_TEMPLATES = false;

      /* Decide if document with <html>... should be returned */
      var WHOLE_DOCUMENT = false;

      /* Track whether config is already set on this instance of DOMPurify. */
      var SET_CONFIG = false;

      /* Decide if all elements (e.g. style, script) must be children of
       * document.body. By default, browsers might move them to document.head */
      var FORCE_BODY = false;

      /* Decide if a DOM `HTMLBodyElement` should be returned, instead of a html
       * string (or a TrustedHTML object if Trusted Types are supported).
       * If `WHOLE_DOCUMENT` is enabled a `HTMLHtmlElement` will be returned instead
       */
      var RETURN_DOM = false;

      /* Decide if a DOM `DocumentFragment` should be returned, instead of a html
       * string  (or a TrustedHTML object if Trusted Types are supported) */
      var RETURN_DOM_FRAGMENT = false;

      /* If `RETURN_DOM` or `RETURN_DOM_FRAGMENT` is enabled, decide if the returned DOM
       * `Node` is imported into the current `Document`. If this flag is not enabled the
       * `Node` will belong (its ownerDocument) to a fresh `HTMLDocument`, created by
       * DOMPurify. */
      var RETURN_DOM_IMPORT = false;

      /* Try to return a Trusted Type object instead of a string, retrun a string in
       * case Trusted Types are not supported  */
      var RETURN_TRUSTED_TYPE = false;

      /* Output should be free from DOM clobbering attacks? */
      var SANITIZE_DOM = true;

      /* Keep element content when removing element? */
      var KEEP_CONTENT = true;

      /* If a `Node` is passed to sanitize(), then performs sanitization in-place instead
       * of importing it into a new Document and returning a sanitized copy */
      var IN_PLACE = false;

      /* Allow usage of profiles like html, svg and mathMl */
      var USE_PROFILES = {};

      /* Tags to ignore content of when KEEP_CONTENT is true */
      var FORBID_CONTENTS = addToSet({}, ['annotation-xml', 'audio', 'colgroup', 'desc', 'foreignobject', 'head', 'iframe', 'math', 'mi', 'mn', 'mo', 'ms', 'mtext', 'noembed', 'noframes', 'plaintext', 'script', 'style', 'svg', 'template', 'thead', 'title', 'video', 'xmp']);

      /* Tags that are safe for data: URIs */
      var DATA_URI_TAGS = addToSet({}, ['audio', 'video', 'img', 'source', 'image']);

      /* Attributes safe for values like "javascript:" */
      var URI_SAFE_ATTRIBUTES = null;
      var DEFAULT_URI_SAFE_ATTRIBUTES = addToSet({}, ['alt', 'class', 'for', 'id', 'label', 'name', 'pattern', 'placeholder', 'summary', 'title', 'value', 'style', 'xmlns']);

      /* Keep a reference to config to pass to hooks */
      var CONFIG = null;

      /* Ideally, do not touch anything below this line */
      /* ______________________________________________ */

      var formElement = document.createElement('form');

      /**
       * _parseConfig
       *
       * @param  {Object} cfg optional config literal
       */
      // eslint-disable-next-line complexity
      var _parseConfig = function _parseConfig(cfg) {
        if (CONFIG && CONFIG === cfg) {
          return;
        }

        /* Shield configuration object from tampering */
        if (!cfg || (typeof cfg === 'undefined' ? 'undefined' : _typeof(cfg)) !== 'object') {
          cfg = {};
        }

        /* Set configuration parameters */
        ALLOWED_TAGS = 'ALLOWED_TAGS' in cfg ? addToSet({}, cfg.ALLOWED_TAGS) : DEFAULT_ALLOWED_TAGS;
        ALLOWED_ATTR = 'ALLOWED_ATTR' in cfg ? addToSet({}, cfg.ALLOWED_ATTR) : DEFAULT_ALLOWED_ATTR;
        URI_SAFE_ATTRIBUTES = 'ADD_URI_SAFE_ATTR' in cfg ? addToSet(clone(DEFAULT_URI_SAFE_ATTRIBUTES), cfg.ADD_URI_SAFE_ATTR) : DEFAULT_URI_SAFE_ATTRIBUTES;
        FORBID_TAGS = 'FORBID_TAGS' in cfg ? addToSet({}, cfg.FORBID_TAGS) : {};
        FORBID_ATTR = 'FORBID_ATTR' in cfg ? addToSet({}, cfg.FORBID_ATTR) : {};
        USE_PROFILES = 'USE_PROFILES' in cfg ? cfg.USE_PROFILES : false;
        ALLOW_ARIA_ATTR = cfg.ALLOW_ARIA_ATTR !== false; // Default true
        ALLOW_DATA_ATTR = cfg.ALLOW_DATA_ATTR !== false; // Default true
        ALLOW_UNKNOWN_PROTOCOLS = cfg.ALLOW_UNKNOWN_PROTOCOLS || false; // Default false
        SAFE_FOR_JQUERY = cfg.SAFE_FOR_JQUERY || false; // Default false
        SAFE_FOR_TEMPLATES = cfg.SAFE_FOR_TEMPLATES || false; // Default false
        WHOLE_DOCUMENT = cfg.WHOLE_DOCUMENT || false; // Default false
        RETURN_DOM = cfg.RETURN_DOM || false; // Default false
        RETURN_DOM_FRAGMENT = cfg.RETURN_DOM_FRAGMENT || false; // Default false
        RETURN_DOM_IMPORT = cfg.RETURN_DOM_IMPORT || false; // Default false
        RETURN_TRUSTED_TYPE = cfg.RETURN_TRUSTED_TYPE || false; // Default false
        FORCE_BODY = cfg.FORCE_BODY || false; // Default false
        SANITIZE_DOM = cfg.SANITIZE_DOM !== false; // Default true
        KEEP_CONTENT = cfg.KEEP_CONTENT !== false; // Default true
        IN_PLACE = cfg.IN_PLACE || false; // Default false
        IS_ALLOWED_URI$$1 = cfg.ALLOWED_URI_REGEXP || IS_ALLOWED_URI$$1;
        if (SAFE_FOR_TEMPLATES) {
          ALLOW_DATA_ATTR = false;
        }

        if (RETURN_DOM_FRAGMENT) {
          RETURN_DOM = true;
        }

        /* Parse profile info */
        if (USE_PROFILES) {
          ALLOWED_TAGS = addToSet({}, [].concat(_toConsumableArray(text)));
          ALLOWED_ATTR = [];
          if (USE_PROFILES.html === true) {
            addToSet(ALLOWED_TAGS, html);
            addToSet(ALLOWED_ATTR, html$1);
          }

          if (USE_PROFILES.svg === true) {
            addToSet(ALLOWED_TAGS, svg);
            addToSet(ALLOWED_ATTR, svg$1);
            addToSet(ALLOWED_ATTR, xml);
          }

          if (USE_PROFILES.svgFilters === true) {
            addToSet(ALLOWED_TAGS, svgFilters);
            addToSet(ALLOWED_ATTR, svg$1);
            addToSet(ALLOWED_ATTR, xml);
          }

          if (USE_PROFILES.mathMl === true) {
            addToSet(ALLOWED_TAGS, mathMl);
            addToSet(ALLOWED_ATTR, mathMl$1);
            addToSet(ALLOWED_ATTR, xml);
          }
        }

        /* Merge configuration parameters */
        if (cfg.ADD_TAGS) {
          if (ALLOWED_TAGS === DEFAULT_ALLOWED_TAGS) {
            ALLOWED_TAGS = clone(ALLOWED_TAGS);
          }

          addToSet(ALLOWED_TAGS, cfg.ADD_TAGS);
        }

        if (cfg.ADD_ATTR) {
          if (ALLOWED_ATTR === DEFAULT_ALLOWED_ATTR) {
            ALLOWED_ATTR = clone(ALLOWED_ATTR);
          }

          addToSet(ALLOWED_ATTR, cfg.ADD_ATTR);
        }

        if (cfg.ADD_URI_SAFE_ATTR) {
          addToSet(URI_SAFE_ATTRIBUTES, cfg.ADD_URI_SAFE_ATTR);
        }

        /* Add #text in case KEEP_CONTENT is set to true */
        if (KEEP_CONTENT) {
          ALLOWED_TAGS['#text'] = true;
        }

        /* Add html, head and body to ALLOWED_TAGS in case WHOLE_DOCUMENT is true */
        if (WHOLE_DOCUMENT) {
          addToSet(ALLOWED_TAGS, ['html', 'head', 'body']);
        }

        /* Add tbody to ALLOWED_TAGS in case tables are permitted, see #286, #365 */
        if (ALLOWED_TAGS.table) {
          addToSet(ALLOWED_TAGS, ['tbody']);
          delete FORBID_TAGS.tbody;
        }

        // Prevent further manipulation of configuration.
        // Not available in IE8, Safari 5, etc.
        if (freeze) {
          freeze(cfg);
        }

        CONFIG = cfg;
      };

      /**
       * _forceRemove
       *
       * @param  {Node} node a DOM node
       */
      var _forceRemove = function _forceRemove(node) {
        arrayPush(DOMPurify.removed, { element: node });
        try {
          node.parentNode.removeChild(node);
        } catch (error) {
          node.outerHTML = emptyHTML;
        }
      };

      /**
       * _removeAttribute
       *
       * @param  {String} name an Attribute name
       * @param  {Node} node a DOM node
       */
      var _removeAttribute = function _removeAttribute(name, node) {
        try {
          arrayPush(DOMPurify.removed, {
            attribute: node.getAttributeNode(name),
            from: node
          });
        } catch (error) {
          arrayPush(DOMPurify.removed, {
            attribute: null,
            from: node
          });
        }

        node.removeAttribute(name);
      };

      /**
       * _initDocument
       *
       * @param  {String} dirty a string of dirty markup
       * @return {Document} a DOM, filled with the dirty markup
       */
      var _initDocument = function _initDocument(dirty) {
        /* Create a HTML document */
        var doc = void 0;
        var leadingWhitespace = void 0;

        if (FORCE_BODY) {
          dirty = '<remove></remove>' + dirty;
        } else {
          /* If FORCE_BODY isn't used, leading whitespace needs to be preserved manually */
          var matches = stringMatch(dirty, /^[\s]+/);
          leadingWhitespace = matches && matches[0];
        }

        var dirtyPayload = trustedTypesPolicy ? trustedTypesPolicy.createHTML(dirty) : dirty;
        /* Use DOMParser to workaround Firefox bug (see comment below) */
        if (useDOMParser) {
          try {
            doc = new DOMParser().parseFromString(dirtyPayload, 'text/html');
          } catch (error) {}
        }

        /* Remove title to fix a mXSS bug in older MS Edge */
        if (removeTitle) {
          addToSet(FORBID_TAGS, ['title']);
        }

        /* Otherwise use createHTMLDocument, because DOMParser is unsafe in
        Safari (see comment below) */
        if (!doc || !doc.documentElement) {
          doc = implementation.createHTMLDocument('');
          var _doc = doc,
              body = _doc.body;

          body.parentNode.removeChild(body.parentNode.firstElementChild);
          body.outerHTML = dirtyPayload;
        }

        if (dirty && leadingWhitespace) {
          doc.body.insertBefore(document.createTextNode(leadingWhitespace), doc.body.childNodes[0] || null);
        }

        /* Work on whole document or just its body */
        return getElementsByTagName.call(doc, WHOLE_DOCUMENT ? 'html' : 'body')[0];
      };

      // Firefox uses a different parser for innerHTML rather than
      // DOMParser (see https://bugzilla.mozilla.org/show_bug.cgi?id=1205631)
      // which means that you *must* use DOMParser, otherwise the output may
      // not be safe if used in a document.write context later.
      //
      // So we feature detect the Firefox bug and use the DOMParser if necessary.
      //
      // Chrome 77 and other versions ship an mXSS bug that caused a bypass to
      // happen. We now check for the mXSS trigger and react accordingly.
      if (DOMPurify.isSupported) {
        (function () {
          try {
            var doc = _initDocument('<svg><p><textarea><img src="</textarea><img src=x abc=1//">');
            if (doc.querySelector('svg img')) {
              useDOMParser = true;
            }
          } catch (error) {}
        })();

        (function () {
          try {
            var doc = _initDocument('<x/><title>&lt;/title&gt;&lt;img&gt;');
            if (regExpTest(/<\/title/, doc.querySelector('title').innerHTML)) {
              removeTitle = true;
            }
          } catch (error) {}
        })();
      }

      /**
       * _createIterator
       *
       * @param  {Document} root document/fragment to create iterator for
       * @return {Iterator} iterator instance
       */
      var _createIterator = function _createIterator(root) {
        return createNodeIterator.call(root.ownerDocument || root, root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT, function () {
          return NodeFilter.FILTER_ACCEPT;
        }, false);
      };

      /**
       * _isClobbered
       *
       * @param  {Node} elm element to check for clobbering attacks
       * @return {Boolean} true if clobbered, false if safe
       */
      var _isClobbered = function _isClobbered(elm) {
        if (elm instanceof Text || elm instanceof Comment) {
          return false;
        }

        if (typeof elm.nodeName !== 'string' || typeof elm.textContent !== 'string' || typeof elm.removeChild !== 'function' || !(elm.attributes instanceof NamedNodeMap) || typeof elm.removeAttribute !== 'function' || typeof elm.setAttribute !== 'function' || typeof elm.namespaceURI !== 'string') {
          return true;
        }

        return false;
      };

      /**
       * _isNode
       *
       * @param  {Node} obj object to check whether it's a DOM node
       * @return {Boolean} true is object is a DOM node
       */
      var _isNode = function _isNode(obj) {
        return (typeof Node === 'undefined' ? 'undefined' : _typeof(Node)) === 'object' ? obj instanceof Node : obj && (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object' && typeof obj.nodeType === 'number' && typeof obj.nodeName === 'string';
      };

      /**
       * _executeHook
       * Execute user configurable hooks
       *
       * @param  {String} entryPoint  Name of the hook's entry point
       * @param  {Node} currentNode node to work on with the hook
       * @param  {Object} data additional hook parameters
       */
      var _executeHook = function _executeHook(entryPoint, currentNode, data) {
        if (!hooks[entryPoint]) {
          return;
        }

        arrayForEach(hooks[entryPoint], function (hook) {
          hook.call(DOMPurify, currentNode, data, CONFIG);
        });
      };

      /**
       * _sanitizeElements
       *
       * @protect nodeName
       * @protect textContent
       * @protect removeChild
       *
       * @param   {Node} currentNode to check for permission to exist
       * @return  {Boolean} true if node was killed, false if left alive
       */
      // eslint-disable-next-line complexity
      var _sanitizeElements = function _sanitizeElements(currentNode) {
        var content = void 0;

        /* Execute a hook if present */
        _executeHook('beforeSanitizeElements', currentNode, null);

        /* Check if element is clobbered or can clobber */
        if (_isClobbered(currentNode)) {
          _forceRemove(currentNode);
          return true;
        }

        /* Now let's check the element's type and name */
        var tagName = stringToLowerCase(currentNode.nodeName);

        /* Execute a hook if present */
        _executeHook('uponSanitizeElement', currentNode, {
          tagName: tagName,
          allowedTags: ALLOWED_TAGS
        });

        /* Take care of an mXSS pattern using p, br inside svg, math */
        if ((tagName === 'svg' || tagName === 'math') && currentNode.querySelectorAll('p, br').length !== 0) {
          _forceRemove(currentNode);
          return true;
        }

        /* Remove element if anything forbids its presence */
        if (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName]) {
          /* Keep content except for black-listed elements */
          if (KEEP_CONTENT && !FORBID_CONTENTS[tagName] && typeof currentNode.insertAdjacentHTML === 'function') {
            try {
              var htmlToInsert = currentNode.innerHTML;
              currentNode.insertAdjacentHTML('AfterEnd', trustedTypesPolicy ? trustedTypesPolicy.createHTML(htmlToInsert) : htmlToInsert);
            } catch (error) {}
          }

          _forceRemove(currentNode);
          return true;
        }

        /* Remove in case a noscript/noembed XSS is suspected */
        if (tagName === 'noscript' && regExpTest(/<\/noscript/i, currentNode.innerHTML)) {
          _forceRemove(currentNode);
          return true;
        }

        if (tagName === 'noembed' && regExpTest(/<\/noembed/i, currentNode.innerHTML)) {
          _forceRemove(currentNode);
          return true;
        }

        /* Convert markup to cover jQuery behavior */
        if (SAFE_FOR_JQUERY && !currentNode.firstElementChild && (!currentNode.content || !currentNode.content.firstElementChild) && regExpTest(/</g, currentNode.textContent)) {
          arrayPush(DOMPurify.removed, { element: currentNode.cloneNode() });
          if (currentNode.innerHTML) {
            currentNode.innerHTML = stringReplace(currentNode.innerHTML, /</g, '&lt;');
          } else {
            currentNode.innerHTML = stringReplace(currentNode.textContent, /</g, '&lt;');
          }
        }

        /* Sanitize element content to be template-safe */
        if (SAFE_FOR_TEMPLATES && currentNode.nodeType === 3) {
          /* Get the element's text content */
          content = currentNode.textContent;
          content = stringReplace(content, MUSTACHE_EXPR$$1, ' ');
          content = stringReplace(content, ERB_EXPR$$1, ' ');
          if (currentNode.textContent !== content) {
            arrayPush(DOMPurify.removed, { element: currentNode.cloneNode() });
            currentNode.textContent = content;
          }
        }

        /* Execute a hook if present */
        _executeHook('afterSanitizeElements', currentNode, null);

        return false;
      };

      /**
       * _isValidAttribute
       *
       * @param  {string} lcTag Lowercase tag name of containing element.
       * @param  {string} lcName Lowercase attribute name.
       * @param  {string} value Attribute value.
       * @return {Boolean} Returns true if `value` is valid, otherwise false.
       */
      // eslint-disable-next-line complexity
      var _isValidAttribute = function _isValidAttribute(lcTag, lcName, value) {
        /* Make sure attribute cannot clobber */
        if (SANITIZE_DOM && (lcName === 'id' || lcName === 'name') && (value in document || value in formElement)) {
          return false;
        }

        /* Allow valid data-* attributes: At least one character after "-"
            (https://html.spec.whatwg.org/multipage/dom.html#embedding-custom-non-visible-data-with-the-data-*-attributes)
            XML-compatible (https://html.spec.whatwg.org/multipage/infrastructure.html#xml-compatible and http://www.w3.org/TR/xml/#d0e804)
            We don't need to check the value; it's always URI safe. */
        if (ALLOW_DATA_ATTR && regExpTest(DATA_ATTR$$1, lcName)) ; else if (ALLOW_ARIA_ATTR && regExpTest(ARIA_ATTR$$1, lcName)) ; else if (!ALLOWED_ATTR[lcName] || FORBID_ATTR[lcName]) {
          return false;

          /* Check value is safe. First, is attr inert? If so, is safe */
        } else if (URI_SAFE_ATTRIBUTES[lcName]) ; else if (regExpTest(IS_ALLOWED_URI$$1, stringReplace(value, ATTR_WHITESPACE$$1, ''))) ; else if ((lcName === 'src' || lcName === 'xlink:href' || lcName === 'href') && lcTag !== 'script' && stringIndexOf(value, 'data:') === 0 && DATA_URI_TAGS[lcTag]) ; else if (ALLOW_UNKNOWN_PROTOCOLS && !regExpTest(IS_SCRIPT_OR_DATA$$1, stringReplace(value, ATTR_WHITESPACE$$1, ''))) ; else if (!value) ; else {
          return false;
        }

        return true;
      };

      /**
       * _sanitizeAttributes
       *
       * @protect attributes
       * @protect nodeName
       * @protect removeAttribute
       * @protect setAttribute
       *
       * @param  {Node} currentNode to sanitize
       */
      // eslint-disable-next-line complexity
      var _sanitizeAttributes = function _sanitizeAttributes(currentNode) {
        var attr = void 0;
        var value = void 0;
        var lcName = void 0;
        var idAttr = void 0;
        var l = void 0;
        /* Execute a hook if present */
        _executeHook('beforeSanitizeAttributes', currentNode, null);

        var attributes = currentNode.attributes;

        /* Check if we have attributes; if not we might have a text node */

        if (!attributes) {
          return;
        }

        var hookEvent = {
          attrName: '',
          attrValue: '',
          keepAttr: true,
          allowedAttributes: ALLOWED_ATTR
        };
        l = attributes.length;

        /* Go backwards over all attributes; safely remove bad ones */
        while (l--) {
          attr = attributes[l];
          var _attr = attr,
              name = _attr.name,
              namespaceURI = _attr.namespaceURI;

          value = stringTrim(attr.value);
          lcName = stringToLowerCase(name);

          /* Execute a hook if present */
          hookEvent.attrName = lcName;
          hookEvent.attrValue = value;
          hookEvent.keepAttr = true;
          hookEvent.forceKeepAttr = undefined; // Allows developers to see this is a property they can set
          _executeHook('uponSanitizeAttribute', currentNode, hookEvent);
          value = hookEvent.attrValue;
          /* Did the hooks approve of the attribute? */
          if (hookEvent.forceKeepAttr) {
            continue;
          }

          /* Remove attribute */
          // Safari (iOS + Mac), last tested v8.0.5, crashes if you try to
          // remove a "name" attribute from an <img> tag that has an "id"
          // attribute at the time.
          if (lcName === 'name' && currentNode.nodeName === 'IMG' && attributes.id) {
            idAttr = attributes.id;
            attributes = arraySlice(attributes, []);
            _removeAttribute('id', currentNode);
            _removeAttribute(name, currentNode);
            if (arrayIndexOf(attributes, idAttr) > l) {
              currentNode.setAttribute('id', idAttr.value);
            }
          } else if (
          // This works around a bug in Safari, where input[type=file]
          // cannot be dynamically set after type has been removed
          currentNode.nodeName === 'INPUT' && lcName === 'type' && value === 'file' && hookEvent.keepAttr && (ALLOWED_ATTR[lcName] || !FORBID_ATTR[lcName])) {
            continue;
          } else {
            // This avoids a crash in Safari v9.0 with double-ids.
            // The trick is to first set the id to be empty and then to
            // remove the attribute
            if (name === 'id') {
              currentNode.setAttribute(name, '');
            }

            _removeAttribute(name, currentNode);
          }

          /* Did the hooks approve of the attribute? */
          if (!hookEvent.keepAttr) {
            continue;
          }

          /* Work around a security issue in jQuery 3.0 */
          if (SAFE_FOR_JQUERY && regExpTest(/\/>/i, value)) {
            _removeAttribute(name, currentNode);
            continue;
          }

          /* Take care of an mXSS pattern using namespace switches */
          if (regExpTest(/svg|math/i, currentNode.namespaceURI) && regExpTest(regExpCreate('</(' + arrayJoin(objectKeys(FORBID_CONTENTS), '|') + ')', 'i'), value)) {
            _removeAttribute(name, currentNode);
            continue;
          }

          /* Sanitize attribute content to be template-safe */
          if (SAFE_FOR_TEMPLATES) {
            value = stringReplace(value, MUSTACHE_EXPR$$1, ' ');
            value = stringReplace(value, ERB_EXPR$$1, ' ');
          }

          /* Is `value` valid for this attribute? */
          var lcTag = currentNode.nodeName.toLowerCase();
          if (!_isValidAttribute(lcTag, lcName, value)) {
            continue;
          }

          /* Handle invalid data-* attribute set by try-catching it */
          try {
            if (namespaceURI) {
              currentNode.setAttributeNS(namespaceURI, name, value);
            } else {
              /* Fallback to setAttribute() for browser-unrecognized namespaces e.g. "x-schema". */
              currentNode.setAttribute(name, value);
            }

            arrayPop(DOMPurify.removed);
          } catch (error) {}
        }

        /* Execute a hook if present */
        _executeHook('afterSanitizeAttributes', currentNode, null);
      };

      /**
       * _sanitizeShadowDOM
       *
       * @param  {DocumentFragment} fragment to iterate over recursively
       */
      var _sanitizeShadowDOM = function _sanitizeShadowDOM(fragment) {
        var shadowNode = void 0;
        var shadowIterator = _createIterator(fragment);

        /* Execute a hook if present */
        _executeHook('beforeSanitizeShadowDOM', fragment, null);

        while (shadowNode = shadowIterator.nextNode()) {
          /* Execute a hook if present */
          _executeHook('uponSanitizeShadowNode', shadowNode, null);

          /* Sanitize tags and elements */
          if (_sanitizeElements(shadowNode)) {
            continue;
          }

          /* Deep shadow DOM detected */
          if (shadowNode.content instanceof DocumentFragment) {
            _sanitizeShadowDOM(shadowNode.content);
          }

          /* Check attributes, sanitize if necessary */
          _sanitizeAttributes(shadowNode);
        }

        /* Execute a hook if present */
        _executeHook('afterSanitizeShadowDOM', fragment, null);
      };

      /**
       * Sanitize
       * Public method providing core sanitation functionality
       *
       * @param {String|Node} dirty string or DOM node
       * @param {Object} configuration object
       */
      // eslint-disable-next-line complexity
      DOMPurify.sanitize = function (dirty, cfg) {
        var body = void 0;
        var importedNode = void 0;
        var currentNode = void 0;
        var oldNode = void 0;
        var returnNode = void 0;
        /* Make sure we have a string to sanitize.
          DO NOT return early, as this will return the wrong type if
          the user has requested a DOM object rather than a string */
        if (!dirty) {
          dirty = '<!-->';
        }

        /* Stringify, in case dirty is an object */
        if (typeof dirty !== 'string' && !_isNode(dirty)) {
          // eslint-disable-next-line no-negated-condition
          if (typeof dirty.toString !== 'function') {
            throw typeErrorCreate('toString is not a function');
          } else {
            dirty = dirty.toString();
            if (typeof dirty !== 'string') {
              throw typeErrorCreate('dirty is not a string, aborting');
            }
          }
        }

        /* Check we can run. Otherwise fall back or ignore */
        if (!DOMPurify.isSupported) {
          if (_typeof(window.toStaticHTML) === 'object' || typeof window.toStaticHTML === 'function') {
            if (typeof dirty === 'string') {
              return window.toStaticHTML(dirty);
            }

            if (_isNode(dirty)) {
              return window.toStaticHTML(dirty.outerHTML);
            }
          }

          return dirty;
        }

        /* Assign config vars */
        if (!SET_CONFIG) {
          _parseConfig(cfg);
        }

        /* Clean up removed elements */
        DOMPurify.removed = [];

        /* Check if dirty is correctly typed for IN_PLACE */
        if (typeof dirty === 'string') {
          IN_PLACE = false;
        }

        if (IN_PLACE) ; else if (dirty instanceof Node) {
          /* If dirty is a DOM element, append to an empty document to avoid
             elements being stripped by the parser */
          body = _initDocument('<!-->');
          importedNode = body.ownerDocument.importNode(dirty, true);
          if (importedNode.nodeType === 1 && importedNode.nodeName === 'BODY') {
            /* Node is already a body, use as is */
            body = importedNode;
          } else if (importedNode.nodeName === 'HTML') {
            body = importedNode;
          } else {
            // eslint-disable-next-line unicorn/prefer-node-append
            body.appendChild(importedNode);
          }
        } else {
          /* Exit directly if we have nothing to do */
          if (!RETURN_DOM && !SAFE_FOR_TEMPLATES && !WHOLE_DOCUMENT && RETURN_TRUSTED_TYPE && dirty.indexOf('<') === -1) {
            return trustedTypesPolicy ? trustedTypesPolicy.createHTML(dirty) : dirty;
          }

          /* Initialize the document to work on */
          body = _initDocument(dirty);

          /* Check we have a DOM node from the data */
          if (!body) {
            return RETURN_DOM ? null : emptyHTML;
          }
        }

        /* Remove first element node (ours) if FORCE_BODY is set */
        if (body && FORCE_BODY) {
          _forceRemove(body.firstChild);
        }

        /* Get node iterator */
        var nodeIterator = _createIterator(IN_PLACE ? dirty : body);

        /* Now start iterating over the created document */
        while (currentNode = nodeIterator.nextNode()) {
          /* Fix IE's strange behavior with manipulated textNodes #89 */
          if (currentNode.nodeType === 3 && currentNode === oldNode) {
            continue;
          }

          /* Sanitize tags and elements */
          if (_sanitizeElements(currentNode)) {
            continue;
          }

          /* Shadow DOM detected, sanitize it */
          if (currentNode.content instanceof DocumentFragment) {
            _sanitizeShadowDOM(currentNode.content);
          }

          /* Check attributes, sanitize if necessary */
          _sanitizeAttributes(currentNode);

          oldNode = currentNode;
        }

        oldNode = null;

        /* If we sanitized `dirty` in-place, return it. */
        if (IN_PLACE) {
          return dirty;
        }

        /* Return sanitized string or DOM */
        if (RETURN_DOM) {
          if (RETURN_DOM_FRAGMENT) {
            returnNode = createDocumentFragment.call(body.ownerDocument);

            while (body.firstChild) {
              // eslint-disable-next-line unicorn/prefer-node-append
              returnNode.appendChild(body.firstChild);
            }
          } else {
            returnNode = body;
          }

          if (RETURN_DOM_IMPORT) {
            /* AdoptNode() is not used because internal state is not reset
                   (e.g. the past names map of a HTMLFormElement), this is safe
                   in theory but we would rather not risk another attack vector.
                   The state that is cloned by importNode() is explicitly defined
                   by the specs. */
            returnNode = importNode.call(originalDocument, returnNode, true);
          }

          return returnNode;
        }

        var serializedHTML = WHOLE_DOCUMENT ? body.outerHTML : body.innerHTML;

        /* Sanitize final string template-safe */
        if (SAFE_FOR_TEMPLATES) {
          serializedHTML = stringReplace(serializedHTML, MUSTACHE_EXPR$$1, ' ');
          serializedHTML = stringReplace(serializedHTML, ERB_EXPR$$1, ' ');
        }

        return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML(serializedHTML) : serializedHTML;
      };

      /**
       * Public method to set the configuration once
       * setConfig
       *
       * @param {Object} cfg configuration object
       */
      DOMPurify.setConfig = function (cfg) {
        _parseConfig(cfg);
        SET_CONFIG = true;
      };

      /**
       * Public method to remove the configuration
       * clearConfig
       *
       */
      DOMPurify.clearConfig = function () {
        CONFIG = null;
        SET_CONFIG = false;
      };

      /**
       * Public method to check if an attribute value is valid.
       * Uses last set config, if any. Otherwise, uses config defaults.
       * isValidAttribute
       *
       * @param  {string} tag Tag name of containing element.
       * @param  {string} attr Attribute name.
       * @param  {string} value Attribute value.
       * @return {Boolean} Returns true if `value` is valid. Otherwise, returns false.
       */
      DOMPurify.isValidAttribute = function (tag, attr, value) {
        /* Initialize shared config vars if necessary. */
        if (!CONFIG) {
          _parseConfig({});
        }

        var lcTag = stringToLowerCase(tag);
        var lcName = stringToLowerCase(attr);
        return _isValidAttribute(lcTag, lcName, value);
      };

      /**
       * AddHook
       * Public method to add DOMPurify hooks
       *
       * @param {String} entryPoint entry point for the hook to add
       * @param {Function} hookFunction function to execute
       */
      DOMPurify.addHook = function (entryPoint, hookFunction) {
        if (typeof hookFunction !== 'function') {
          return;
        }

        hooks[entryPoint] = hooks[entryPoint] || [];
        arrayPush(hooks[entryPoint], hookFunction);
      };

      /**
       * RemoveHook
       * Public method to remove a DOMPurify hook at a given entryPoint
       * (pops it from the stack of hooks if more are present)
       *
       * @param {String} entryPoint entry point for the hook to remove
       */
      DOMPurify.removeHook = function (entryPoint) {
        if (hooks[entryPoint]) {
          arrayPop(hooks[entryPoint]);
        }
      };

      /**
       * RemoveHooks
       * Public method to remove all DOMPurify hooks at a given entryPoint
       *
       * @param  {String} entryPoint entry point for the hooks to remove
       */
      DOMPurify.removeHooks = function (entryPoint) {
        if (hooks[entryPoint]) {
          hooks[entryPoint] = [];
        }
      };

      /**
       * RemoveAllHooks
       * Public method to remove all DOMPurify hooks
       *
       */
      DOMPurify.removeAllHooks = function () {
        hooks = {};
      };

      return DOMPurify;
    }

    var purify = createDOMPurify();

    return purify;

    })));
    //# sourceMappingURL=purify.js.map
    });

    /* src\App.svelte generated by Svelte v3.20.1 */

    const { Object: Object_1, console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[21] = list[i];
    	child_ctx[23] = i;
    	return child_ctx;
    }

    // (85:3) {:else}
    function create_else_block_2(ctx) {
    	let span;
    	let t0;
    	let t1_value = /*t*/ ctx[21].type + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text("Error! ");
    			t1 = text(t1_value);
    			t2 = text(" case not found!!");
    			attr_dev(span, "class", "svelte-ttnnnc");
    			add_location(span, file, 85, 4, 2730);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data, currentThema*/ 3 && t1_value !== (t1_value = /*t*/ ctx[21].type + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(85:3) {:else}",
    		ctx
    	});

    	return block;
    }

    // (83:30) 
    function create_if_block_6(ctx) {
    	let span1;
    	let span0;
    	let img;
    	let img_src_value;
    	let img_alt_value;

    	const block = {
    		c: function create() {
    			span1 = element("span");
    			span0 = element("span");
    			span0.textContent = "📷";
    			img = element("img");
    			attr_dev(span0, "class", "svelte-ttnnnc");
    			add_location(span0, file, 83, 10, 2661);
    			if (img.src !== (img_src_value = /*t*/ ctx[21].link)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*t*/ ctx[21].text);
    			attr_dev(img, "class", "svelte-ttnnnc");
    			add_location(img, file, 83, 25, 2676);
    			attr_dev(span1, "class", "svelte-ttnnnc");
    			add_location(span1, file, 83, 4, 2655);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span1, anchor);
    			append_dev(span1, span0);
    			append_dev(span1, img);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data, currentThema*/ 3 && img.src !== (img_src_value = /*t*/ ctx[21].link)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*data, currentThema*/ 3 && img_alt_value !== (img_alt_value = /*t*/ ctx[21].text)) {
    				attr_dev(img, "alt", img_alt_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(83:30) ",
    		ctx
    	});

    	return block;
    }

    // (75:32) 
    function create_if_block_5(ctx) {
    	let span3;
    	let span0;
    	let t1;
    	let span1;
    	let a;
    	let t2_value = /*t*/ ctx[21].text + "";
    	let t2;
    	let a_href_value;
    	let t3;
    	let span2;
    	let t4;
    	let t5_value = /*t*/ ctx[21].time + "";
    	let t5;
    	let dispose;

    	const block = {
    		c: function create() {
    			span3 = element("span");
    			span0 = element("span");
    			span0.textContent = "📹";
    			t1 = space();
    			span1 = element("span");
    			a = element("a");
    			t2 = text(t2_value);
    			t3 = space();
    			span2 = element("span");
    			t4 = text("@");
    			t5 = text(t5_value);
    			attr_dev(span0, "class", "svelte-ttnnnc");
    			add_location(span0, file, 76, 5, 2439);
    			attr_dev(a, "href", a_href_value = /*t*/ ctx[21].link);
    			attr_dev(a, "class", "svelte-ttnnnc");
    			add_location(a, file, 78, 6, 2473);
    			attr_dev(span1, "class", "svelte-ttnnnc");
    			add_location(span1, file, 77, 5, 2460);
    			attr_dev(span2, "class", "time svelte-ttnnnc");
    			add_location(span2, file, 80, 5, 2572);
    			attr_dev(span3, "class", "svelte-ttnnnc");
    			add_location(span3, file, 75, 4, 2427);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, span3, anchor);
    			append_dev(span3, span0);
    			append_dev(span3, t1);
    			append_dev(span3, span1);
    			append_dev(span1, a);
    			append_dev(a, t2);
    			append_dev(span3, t3);
    			append_dev(span3, span2);
    			append_dev(span2, t4);
    			append_dev(span2, t5);
    			if (remount) dispose();
    			dispose = listen_dev(a, "click", prevent_default(/*click_handler*/ ctx[14]), false, true, false);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data, currentThema*/ 3 && t2_value !== (t2_value = /*t*/ ctx[21].text + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*data, currentThema*/ 3 && a_href_value !== (a_href_value = /*t*/ ctx[21].link)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*data, currentThema*/ 3 && t5_value !== (t5_value = /*t*/ ctx[21].time + "")) set_data_dev(t5, t5_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span3);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(75:32) ",
    		ctx
    	});

    	return block;
    }

    // (68:31) 
    function create_if_block_4(ctx) {
    	let span2;
    	let span0;
    	let t1;
    	let span1;
    	let a;
    	let t2_value = /*t*/ ctx[21].text + "";
    	let t2;
    	let a_href_value;

    	const block = {
    		c: function create() {
    			span2 = element("span");
    			span0 = element("span");
    			span0.textContent = "🌐";
    			t1 = space();
    			span1 = element("span");
    			a = element("a");
    			t2 = text(t2_value);
    			attr_dev(span0, "class", "svelte-ttnnnc");
    			add_location(span0, file, 69, 5, 2259);
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "rel", "noopener noreferrer");
    			attr_dev(a, "href", a_href_value = /*t*/ ctx[21].link);
    			attr_dev(a, "class", "svelte-ttnnnc");
    			add_location(a, file, 71, 6, 2293);
    			attr_dev(span1, "class", "svelte-ttnnnc");
    			add_location(span1, file, 70, 5, 2280);
    			attr_dev(span2, "class", "svelte-ttnnnc");
    			add_location(span2, file, 68, 4, 2247);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span2, anchor);
    			append_dev(span2, span0);
    			append_dev(span2, t1);
    			append_dev(span2, span1);
    			append_dev(span1, a);
    			append_dev(a, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data, currentThema*/ 3 && t2_value !== (t2_value = /*t*/ ctx[21].text + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*data, currentThema*/ 3 && a_href_value !== (a_href_value = /*t*/ ctx[21].link)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(68:31) ",
    		ctx
    	});

    	return block;
    }

    // (66:3) {#if t.type === "text"}
    function create_if_block_3(ctx) {
    	let span;
    	let t0;
    	let t1_value = /*t*/ ctx[21].text + "";
    	let t1;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text("📃");
    			t1 = text(t1_value);
    			attr_dev(span, "class", "f2 svelte-ttnnnc");
    			add_location(span, file, 66, 4, 2176);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data, currentThema*/ 3 && t1_value !== (t1_value = /*t*/ ctx[21].text + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(66:3) {#if t.type === \\\"text\\\"}",
    		ctx
    	});

    	return block;
    }

    // (92:4) {:else}
    function create_else_block_1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "✔";
    			attr_dev(span, "class", "svelte-ttnnnc");
    			add_location(span, file, 92, 5, 2912);
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
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(92:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (90:4) {#if !!t.done}
    function create_if_block_2(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "❌";
    			attr_dev(span, "class", "svelte-ttnnnc");
    			add_location(span, file, 90, 5, 2880);
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
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(90:4) {#if !!t.done}",
    		ctx
    	});

    	return block;
    }

    // (63:2) {#each data[themen[currentThema]] as t, i}
    function create_each_block(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let div1;
    	let span;
    	let t1;
    	let div2_class_value;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*t*/ ctx[21].type === "text") return create_if_block_3;
    		if (/*t*/ ctx[21].type === "link") return create_if_block_4;
    		if (/*t*/ ctx[21].type === "video") return create_if_block_5;
    		if (/*t*/ ctx[21].type === "img") return create_if_block_6;
    		return create_else_block_2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (!!/*t*/ ctx[21].done) return create_if_block_2;
    		return create_else_block_1;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block1 = current_block_type_1(ctx);

    	function click_handler_1(...args) {
    		return /*click_handler_1*/ ctx[15](/*i*/ ctx[23], ...args);
    	}

    	function click_handler_2(...args) {
    		return /*click_handler_2*/ ctx[16](/*t*/ ctx[21], ...args);
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			if_block0.c();
    			t0 = space();
    			div1 = element("div");
    			span = element("span");
    			if_block1.c();
    			t1 = space();
    			attr_dev(div0, "class", "svelte-ttnnnc");
    			add_location(div0, file, 64, 3, 2139);
    			attr_dev(span, "class", "toggler svelte-ttnnnc");
    			add_location(span, file, 88, 9, 2804);
    			attr_dev(div1, "class", "svelte-ttnnnc");
    			add_location(div1, file, 88, 4, 2799);

    			attr_dev(div2, "class", div2_class_value = "" + ((/*active*/ ctx[3].text === /*t*/ ctx[21].text && /*active*/ ctx[3].time === /*t*/ ctx[21].time
    			? "active"
    			: "") + " " + (/*t*/ ctx[21].done ? "done" : "") + " topic" + " svelte-ttnnnc"));

    			add_location(div2, file, 63, 2, 1966);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			if_block0.m(div0, null);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, span);
    			if_block1.m(span, null);
    			append_dev(div2, t1);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(span, "click", click_handler_1, false, false, false),
    				listen_dev(div2, "click", click_handler_2, false, false, false)
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
    					if_block0.m(div0, null);
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

    			if (dirty & /*active, data, currentThema*/ 11 && div2_class_value !== (div2_class_value = "" + ((/*active*/ ctx[3].text === /*t*/ ctx[21].text && /*active*/ ctx[3].time === /*t*/ ctx[21].time
    			? "active"
    			: "") + " " + (/*t*/ ctx[21].done ? "done" : "") + " topic" + " svelte-ttnnnc"))) {
    				attr_dev(div2, "class", div2_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if_block0.d();
    			if_block1.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(63:2) {#each data[themen[currentThema]] as t, i}",
    		ctx
    	});

    	return block;
    }

    // (111:1) {#if currentVid !== ""}
    function create_if_block_1(ctx) {
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
    			attr_dev(iframe, "class", "svelte-ttnnnc");
    			add_location(iframe, file, 111, 2, 3303);
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
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(111:1) {#if currentVid !== \\\"\\\"}",
    		ctx
    	});

    	return block;
    }

    // (120:1) {:else}
    function create_else_block(ctx) {
    	let div1;
    	let div0;
    	let raw_value = purify.sanitize(marked_1(/*notes*/ ctx[5][/*currentThema*/ ctx[1]])) + "";

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			attr_dev(div0, "class", "svelte-ttnnnc");
    			add_location(div0, file, 121, 4, 3759);
    			attr_dev(div1, "id", "preview");
    			attr_dev(div1, "class", "svelte-ttnnnc");
    			add_location(div1, file, 120, 3, 3736);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			div0.innerHTML = raw_value;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*notes, currentThema*/ 34 && raw_value !== (raw_value = purify.sanitize(marked_1(/*notes*/ ctx[5][/*currentThema*/ ctx[1]])) + "")) div0.innerHTML = raw_value;		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(120:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (118:1) {#if !prewiev}
    function create_if_block(ctx) {
    	let textarea;
    	let dispose;

    	const block = {
    		c: function create() {
    			textarea = element("textarea");
    			attr_dev(textarea, "name", "notes");
    			attr_dev(textarea, "id", "");
    			attr_dev(textarea, "cols", "30");
    			attr_dev(textarea, "rows", "10");
    			attr_dev(textarea, "placeholder", "take notes here...");
    			attr_dev(textarea, "class", "svelte-ttnnnc");
    			add_location(textarea, file, 118, 3, 3597);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, textarea, anchor);
    			set_input_value(textarea, /*notes*/ ctx[5][/*currentThema*/ ctx[1]]);
    			if (remount) dispose();
    			dispose = listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[19]);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*notes, currentThema*/ 34) {
    				set_input_value(textarea, /*notes*/ ctx[5][/*currentThema*/ ctx[1]]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(textarea);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(118:1) {#if !prewiev}",
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
    	let t2_value = /*themen*/ ctx[8][/*currentThema*/ ctx[1]] + "";
    	let t2;
    	let t3;
    	let div1;
    	let t4;
    	let div2;
    	let button0;
    	let t5;
    	let span0;
    	let t6_value = /*prev*/ ctx[7] + 1 + "";
    	let t6;
    	let t7;
    	let button1;
    	let t8;
    	let span1;
    	let t9_value = /*next*/ ctx[6] + 1 + "";
    	let t9;
    	let t10;
    	let div4;
    	let t11;
    	let div7;
    	let div5;
    	let t12;
    	let div6;
    	let button2;
    	let dispose;
    	let each_value = /*data*/ ctx[0][/*themen*/ ctx[8][/*currentThema*/ ctx[1]]];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block0 = /*currentVid*/ ctx[2] !== "" && create_if_block_1(ctx);

    	function select_block_type_2(ctx, dirty) {
    		if (!/*prewiev*/ ctx[4]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_2(ctx);
    	let if_block1 = current_block_type(ctx);

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
    			if (if_block0) if_block0.c();
    			t11 = space();
    			div7 = element("div");
    			div5 = element("div");
    			if_block1.c();
    			t12 = space();
    			div6 = element("div");
    			button2 = element("button");
    			button2.textContent = "⚡";
    			attr_dev(p, "class", " svelte-ttnnnc");
    			add_location(p, file, 59, 2, 1835);
    			attr_dev(div0, "id", "currentTopic");
    			attr_dev(div0, "class", "svelte-ttnnnc");
    			add_location(div0, file, 58, 1, 1809);
    			attr_dev(div1, "id", "themen");
    			attr_dev(div1, "class", "svelte-ttnnnc");
    			add_location(div1, file, 61, 1, 1901);
    			attr_dev(span0, "class", " svelte-ttnnnc");
    			add_location(span0, file, 101, 4, 3079);
    			attr_dev(button0, "class", " svelte-ttnnnc");
    			add_location(button0, file, 100, 3, 3023);
    			attr_dev(span1, "class", " svelte-ttnnnc");
    			add_location(span1, file, 104, 4, 3182);
    			attr_dev(button1, "class", " svelte-ttnnnc");
    			add_location(button1, file, 103, 3, 3126);
    			attr_dev(div2, "id", "control");
    			attr_dev(div2, "class", "svelte-ttnnnc");
    			add_location(div2, file, 98, 1, 2984);
    			attr_dev(div3, "id", "material");
    			attr_dev(div3, "class", "svelte-ttnnnc");
    			add_location(div3, file, 57, 0, 1788);
    			attr_dev(div4, "id", "video");
    			attr_dev(div4, "class", "svelte-ttnnnc");
    			add_location(div4, file, 109, 0, 3259);
    			attr_dev(div5, "id", "pad");
    			attr_dev(div5, "class", "svelte-ttnnnc");
    			add_location(div5, file, 116, 2, 3563);
    			attr_dev(button2, "class", " svelte-ttnnnc");
    			add_location(button2, file, 128, 2, 3890);
    			attr_dev(div6, "id", "pad-controls");
    			attr_dev(div6, "class", "svelte-ttnnnc");
    			add_location(div6, file, 127, 1, 3864);
    			attr_dev(div7, "id", "notes");
    			attr_dev(div7, "class", "svelte-ttnnnc");
    			add_location(div7, file, 115, 0, 3544);
    			attr_dev(main, "class", "svelte-ttnnnc");
    			add_location(main, file, 56, 0, 1781);
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
    			if (if_block0) if_block0.m(div4, null);
    			append_dev(main, t11);
    			append_dev(main, div7);
    			append_dev(div7, div5);
    			if_block1.m(div5, null);
    			append_dev(div7, t12);
    			append_dev(div7, div6);
    			append_dev(div6, button2);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(button0, "click", /*click_handler_3*/ ctx[17], false, false, false),
    				listen_dev(button1, "click", /*click_handler_4*/ ctx[18], false, false, false),
    				listen_dev(button2, "click", /*click_handler_5*/ ctx[20], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*currentThema*/ 2 && t0_value !== (t0_value = /*currentThema*/ ctx[1] + 1 + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*currentThema*/ 2 && t2_value !== (t2_value = /*themen*/ ctx[8][/*currentThema*/ ctx[1]] + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*active, data, themen, currentThema, toggle, clickVid*/ 3339) {
    				each_value = /*data*/ ctx[0][/*themen*/ ctx[8][/*currentThema*/ ctx[1]]];
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

    			if (dirty & /*prev*/ 128 && t6_value !== (t6_value = /*prev*/ ctx[7] + 1 + "")) set_data_dev(t6, t6_value);
    			if (dirty & /*next*/ 64 && t9_value !== (t9_value = /*next*/ ctx[6] + 1 + "")) set_data_dev(t9, t9_value);

    			if (/*currentVid*/ ctx[2] !== "") {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(div4, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div5, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks, detaching);
    			if (if_block0) if_block0.d();
    			if_block1.d();
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
    	let { raw_data } = $$props;

    	const data = localStorage.getItem("data")
    	? JSON.parse(localStorage.getItem("data"))
    	: raw_data;

    	const themen = Object.keys(data);

    	let currentThema = localStorage.getItem("currentThema")
    	? JSON.parse(localStorage.getItem("currentThema"))
    	: 0;

    	let currentVid = "";
    	let active = {};
    	let prewiev = false;

    	// $: console.log(`[i] currentThema: ${notes}`);
    	window.addEventListener("beforeunload", event => {
    		// event.preventDefault();
    		sync();
    	});

    	function go(dest) {
    		$$invalidate(1, currentThema = dest);
    		sync();
    		console.log(`[i] go: ${currentThema}`);
    	}

    	function clickVid(event) {
    		console.log(event.target.href);
    		$$invalidate(2, currentVid = event.target.href);
    	}

    	function toggle(i) {
    		$$invalidate(0, data[themen[currentThema]][i].done = !data[themen[currentThema]][i].done, data);
    		sync();
    	}

    	function sync() {
    		// notes[themen[currentThema]] = note;
    		window.localStorage.setItem("notes", JSON.stringify(notes));

    		window.localStorage.setItem("data", JSON.stringify(data));
    		window.localStorage.setItem("currentThema", JSON.stringify(currentThema));
    	}

    	const writable_props = ["raw_data"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	const click_handler = event => clickVid(event);

    	const click_handler_1 = i => {
    		toggle(i);
    	};

    	const click_handler_2 = t => {
    		$$invalidate(3, active.text = t.text, active);
    		$$invalidate(3, active.time = t.time, active);
    	};

    	const click_handler_3 = () => {
    		go(prev);
    	};

    	const click_handler_4 = () => {
    		go(next);
    	};

    	function textarea_input_handler() {
    		notes[currentThema] = this.value;
    		$$invalidate(5, notes);
    		$$invalidate(1, currentThema);
    	}

    	const click_handler_5 = () => {
    		$$invalidate(4, prewiev = !prewiev);
    	};

    	$$self.$set = $$props => {
    		if ("raw_data" in $$props) $$invalidate(12, raw_data = $$props.raw_data);
    	};

    	$$self.$capture_state = () => ({
    		marked: marked_1,
    		domPurify: purify,
    		raw_data,
    		data,
    		themen,
    		currentThema,
    		currentVid,
    		active,
    		prewiev,
    		go,
    		clickVid,
    		toggle,
    		sync,
    		notes,
    		next,
    		prev
    	});

    	$$self.$inject_state = $$props => {
    		if ("raw_data" in $$props) $$invalidate(12, raw_data = $$props.raw_data);
    		if ("currentThema" in $$props) $$invalidate(1, currentThema = $$props.currentThema);
    		if ("currentVid" in $$props) $$invalidate(2, currentVid = $$props.currentVid);
    		if ("active" in $$props) $$invalidate(3, active = $$props.active);
    		if ("prewiev" in $$props) $$invalidate(4, prewiev = $$props.prewiev);
    		if ("notes" in $$props) $$invalidate(5, notes = $$props.notes);
    		if ("next" in $$props) $$invalidate(6, next = $$props.next);
    		if ("prev" in $$props) $$invalidate(7, prev = $$props.prev);
    	};

    	let notes;
    	let next;
    	let prev;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*currentThema*/ 2) {
    			// $: notes = JSON.parse(localStorage.getItem("notes"))[themen[currentThema]] ? JSON.parse(localStorage.getItem("notes"))[themen[currentThema]] 
    			// : notes[themen[currentThema]] = `# ${themen[currentThema]}\n\n`; 
    			// $: note = notes[themen[currentThema]] ? notes[themen[currentThema]] : `# ${themen[currentThema]}\n\n`;
    			 $$invalidate(6, next = currentThema < themen.length - 1 ? currentThema + 1 : 0);
    		}

    		if ($$self.$$.dirty & /*currentThema*/ 2) {
    			 $$invalidate(7, prev = currentThema > 0 ? currentThema - 1 : themen.length - 1);
    		}

    		if ($$self.$$.dirty & /*currentThema*/ 2) {
    			 console.log(`[i] currentThema: ${themen[currentThema]}`);
    		}
    	};

    	 $$invalidate(5, notes = JSON.parse(localStorage.getItem("notes"))
    	? JSON.parse(localStorage.getItem("notes"))
    	: themen.map(el => `# ${el}\n\n`));

    	return [
    		data,
    		currentThema,
    		currentVid,
    		active,
    		prewiev,
    		notes,
    		next,
    		prev,
    		themen,
    		go,
    		clickVid,
    		toggle,
    		raw_data,
    		sync,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		textarea_input_handler,
    		click_handler_5
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { raw_data: 12 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*raw_data*/ ctx[12] === undefined && !("raw_data" in props)) {
    			console_1.warn("<App> was created without expected prop 'raw_data'");
    		}
    	}

    	get raw_data() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set raw_data(value) {
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
    		link: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Ableitungsss.svg/575px-Ableitungsss.svg.png",
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
    		raw_data: data
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map

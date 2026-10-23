#!/usr/bin/env node
/**
 * Generates `internals/generated/*.d.ts` from a copy of the Desmos
 * `calculator.js` bundle.
 *
 *   node scripts/extract-internals.cjs path/to/calculator.js
 *
 * Two sources are combined:
 *
 *  1. Runtime inspection: the bundle is loaded in jsdom, a calculator is
 *     created with one item of every type, and selected internal objects
 *     are walked. Property types come from their observed values; method
 *     return types come from static analysis of each method's source, and
 *     from calling side-effect-free getters (`get*`, `is*`, ...) with no
 *     arguments.
 *  2. Static analysis of the bundle with acorn: every `dispatch({ type })`
 *     call site and every `switch (action.type)` reducer is scanned to
 *     build the union of dispatchable actions and their payload fields.
 *
 * The output is deliberately loose (`unknown` wherever a type couldn't be
 * observed). Precise types live in the hand-written files in `internals/`,
 * which extend these interfaces.
 *
 * The bundle is third-party code and is executed inside jsdom. Only run
 * this on a bundle downloaded from desmos.com.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const walk = require('acorn-walk');
const { JSDOM } = require('jsdom');

const bundlePath = process.argv[2];
if (!bundlePath) {
  console.error('Usage: node scripts/extract-internals.cjs path/to/calculator.js');
  process.exit(1);
}
const OUT_DIR = path.join(__dirname, '..', 'internals', 'generated');
const source = fs.readFileSync(bundlePath, 'utf8');

// ---------------------------------------------------------------------------
// Load the bundle
// ---------------------------------------------------------------------------

function loadDesmos() {
  const dom = new JSDOM('<!doctype html><div id="calc" style="width:800px;height:600px"></div>', {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const w = dom.window;
  // APIs the bundle expects that jsdom doesn't provide.
  w.structuredClone = structuredClone;
  w.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  w.matchMedia = () => ({
    matches: false,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  });
  w.HTMLCanvasElement.prototype.getContext = function () {
    const canvas = this;
    return new Proxy(
      {},
      {
        get: (_t, k) =>
          k === 'canvas'
            ? canvas
            : k === 'measureText'
              ? () => ({ width: 1 })
              : k === 'getImageData' || k === 'createImageData'
                ? () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })
                : typeof k === 'string'
                  ? () => {}
                  : undefined,
        set: () => true,
      }
    );
  };
  // jsdom has no layout. Give every element a size so the expressions list
  // believes it is visible and renders its item views.
  for (const [prop, value] of [
    ['offsetWidth', 1000],
    ['offsetHeight', 700],
    ['clientWidth', 1000],
    ['clientHeight', 700],
    ['scrollWidth', 1000],
    ['scrollHeight', 700],
  ]) {
    Object.defineProperty(w.HTMLElement.prototype, prop, { configurable: true, get: () => value });
  }
  w.Element.prototype.getBoundingClientRect = () => ({
    x: 0, y: 0, top: 0, left: 0, right: 1000, bottom: 700, width: 1000, height: 700, toJSON() {},
  });
  w.console.warn = () => {};
  w.console.error = () => {};
  w.eval(source);
  return w;
}

/** Record every DCGView constructed from now on. */
function recordViews(D) {
  const views = [];
  const base = D.Private.Fragile.DCGView.Class.prototype;
  const construct = base._construct;
  base._construct = function (...args) {
    views.push(this);
    return construct.apply(this, args);
  };
  return views;
}

const SCENARIO_STATE = {
  version: 11,
  graph: { viewport: { xmin: -10, xmax: 10, ymin: -10, ymax: 10 } },
  expressions: {
    list: [
      { type: 'folder', id: 'folder', title: 'Folder' },
      { type: 'expression', id: 'point', folderId: 'folder', latex: 'P=(1,2)', label: 'P', showLabel: true },
      { type: 'expression', id: 'slider', latex: 'a=3', slider: { hardMin: true, min: '0', max: '10', step: '1' } },
      { type: 'expression', id: 'curve', latex: 'y=a\\sin(x)' },
      // `b` is undefined, so this renders a "add slider" prompt.
      { type: 'expression', id: 'prompt', latex: 'y=bx' },
      { type: 'expression', id: 'dist', latex: 'D=\\operatorname{normaldist}(0,1)' },
      {
        type: 'image',
        id: 'image',
        image_url: 'data:image/png;base64,iVBORw0KGgo=',
        name: 'image',
        width: '4',
        height: '3',
        center: '(0,0)',
      },
      {
        type: 'table',
        id: 'table',
        columns: [
          { id: 'col1', latex: 'x_1', values: ['1', '2'] },
          { id: 'col2', latex: 'y_1', values: ['3', '4'] },
        ],
      },
      { type: 'text', id: 'note', text: 'Note' },
    ],
    ticker: { handlerLatex: 'a\\to a+1', minStepLatex: '100', open: true },
  },
};

// ---------------------------------------------------------------------------
// Type emission helpers
// ---------------------------------------------------------------------------

const IDENT = /^[A-Za-z_$][\w$]*$/;
const key = (k) => (IDENT.test(k) ? k : JSON.stringify(k));
const pascal = (s) => s.replace(/^_+/, '').replace(/(^|[^A-Za-z0-9]+)([A-Za-z0-9])/g, (_m, _p, c) => c.toUpperCase());

/** Names that `typeof` the jsdom window exposes as DOM classes. */
function domTypeName(w, v) {
  let p = Object.getPrototypeOf(v);
  while (p) {
    const name = p.constructor && p.constructor.name;
    if (name && w[name] === p.constructor && /^(HTML|SVG)\w*Element$|^Element$|^Node$|^Event$/.test(name)) return name;
    p = Object.getPrototypeOf(p);
  }
  return null;
}

function isPlainObject(w, v) {
  const p = Object.getPrototypeOf(v);
  return p === null || p === w.Object.prototype || p === Object.prototype;
}

/** A union of type strings, collapsing duplicates and `unknown`. */
function union(types) {
  const set = [...new Set(types)];
  if (set.includes('unknown')) return 'unknown';
  return set.length ? set.sort().join(' | ') : 'unknown';
}

// ---------------------------------------------------------------------------
// Static analysis of method sources
// ---------------------------------------------------------------------------

/**
 * Infer a return type from a function's source: `void` when nothing is
 * returned, `boolean` when every return is a boolean-valued expression.
 */
function staticReturnType(fn) {
  let text;
  try {
    text = Function.prototype.toString.call(fn);
  } catch {
    return null;
  }
  if (/\[native code\]/.test(text)) return null;
  let ast;
  for (const wrapped of [`(${text})`, `({${text}})`]) {
    try {
      ast = acorn.parseExpressionAt(wrapped, 0, { ecmaVersion: 'latest' });
      break;
    } catch {}
  }
  if (!ast) return null;
  const fnNode = ast.type === 'ObjectExpression' ? ast.properties[0] && ast.properties[0].value : ast;
  if (!fnNode || !/Function/.test(fnNode.type)) return null;
  if (fnNode.async || fnNode.generator) return null;
  if (fnNode.expression) return booleanish(fnNode.body) ? 'boolean' : null;

  const returns = [];
  (function visit(node) {
    if (!node || typeof node.type !== 'string') return;
    if (node !== fnNode.body && /Function/.test(node.type)) return; // nested functions
    if (node.type === 'ReturnStatement') returns.push(node.argument);
    for (const k in node) {
      const child = node[k];
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child.type === 'string') visit(child);
    }
  })(fnNode.body);

  const valued = returns.filter((r) => r && !(r.type === 'UnaryExpression' && r.operator === 'void'));
  if (valued.length === 0) return 'void';
  if (valued.every(booleanish)) return 'boolean';
  return null;
}

function booleanish(n) {
  if (!n) return false;
  if (n.type === 'Literal') return typeof n.value === 'boolean';
  if (n.type === 'UnaryExpression') return n.operator === '!';
  if (n.type === 'BinaryExpression')
    return ['===', '!==', '==', '!=', '<', '>', '<=', '>=', 'instanceof', 'in'].includes(n.operator);
  if (n.type === 'LogicalExpression') return booleanish(n.left) && booleanish(n.right);
  if (n.type === 'ConditionalExpression') return booleanish(n.consequent) && booleanish(n.alternate);
  return false;
}

function hasRestParam(fn) {
  try {
    return /^[^(]*\(\s*\.\.\./.test(Function.prototype.toString.call(fn)) ||
      /^\s*\.\.\.\w+\s*=>/.test(Function.prototype.toString.call(fn));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Interface generation
// ---------------------------------------------------------------------------

/** Methods that are safe to call with no arguments to observe the return type. */
const PROBE_NAME = /^(get|is|has|can|should|any|are|needs|supports|was|will)[A-Z0-9_]/;
/**
 * Never probe these, even if the name matches: either they are expensive, or
 * their return type depends on the scenario (product, mount state, ...) so a
 * single observation would be too narrow for the hand-written layer to widen.
 */
const PROBE_DENY =
  /^(getBlankState|getHistory|getState|getScreenshot|getSnapshot|getGrapher|getGrapher2d|getGrapher3d|getRootElt|getExpressionAnalysis|getViewState|getHelperExpressions|getSelectedExpressionIds|getProduct)$/;
const BOOLEAN_NAME = /^(is|has|can|should|are|needs|supports|was|will)[A-Z]/;
/** Property names whose plain-object values are lookup tables, not records. */
const DICTIONARY_NAME = /(IdTo\w+|ById|Map|ToModel|Lookup|Cache|ByName|Subscriptions|subscriptions|Callbacks|_callbacks|Colors|^colors|Analysis|analysis)$/;
/** Ids of the scenario's items; objects keyed by these are lookup tables. */
const SCENARIO_IDS = new Set(['folder', 'point', 'slider', 'curve', 'prompt', 'dist', 'image', 'table', 'note', 'col1', 'col2']);
/** Generated interface names for item models, by `model.type`. */
const ITEM_MODEL_NAMES = {
  expression: 'ExpressionModel',
  table: 'TableModel',
  folder: 'FolderModel',
  text: 'TextModel',
  image: 'ImageModel',
  ticker: 'TickerModel',
};

class Generator {
  constructor(w) {
    this.w = w;
    /** object -> interface name */
    this.names = new Map();
    /** [name, object, options] in emission order */
    this.roots = [];
  }

  /**
   * Item models are plain objects created on demand, so identity lookup
   * misses most of them. Recognize them by shape instead.
   */
  itemModelName(v) {
    if (!this.controller || !v || typeof v !== 'object') return null;
    if (v.table && typeof v.table === 'object' && v.table.type === 'table' && 'values' in v) return 'TableColumnModel';
    if (v.controller !== this.controller) return null;
    return ITEM_MODEL_NAMES[v.type] || null;
  }

  addRoot(name, obj, options = {}) {
    if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) return;
    if (this.names.has(obj)) return;
    this.names.set(obj, name);
    this.roots.push([name, obj, options]);
  }

  /** Register class instances found on `obj` as roots of their own. */
  expand(name, obj, { plain = false } = {}) {
    for (const k of Object.keys(obj).sort()) {
      let v;
      try {
        v = obj[k];
      } catch {
        continue;
      }
      if (!v || typeof v !== 'object' || Array.isArray(v) || this.names.has(v)) continue;
      if (domTypeName(this.w, v) || v instanceof this.w.Map || v instanceof this.w.Set) continue;
      const isPlain = isPlainObject(this.w, v);
      if (isPlain && !plain) continue;
      if (isPlain && !Object.values(v).some((x) => typeof x === 'function' || (x && typeof x === 'object'))) continue;
      this.addRoot(name + pascal(k), v);
    }
  }

  typeOf(v, depth = 0, propName = '') {
    const w = this.w;
    if (v === null) return 'null';
    if (v === undefined) return 'unknown';
    const t = typeof v;
    if (t === 'string' || t === 'number' || t === 'boolean' || t === 'bigint' || t === 'symbol') return t;
    if (this.names.has(v)) return this.names.get(v);
    const modelName = this.itemModelName(v);
    if (modelName) return modelName;
    if (t === 'function') return this.fnType(v);
    if (Array.isArray(v) || v instanceof w.Array) {
      if (v.length === 0) return 'unknown[]';
      const el = union(Array.from(v).slice(0, 25).map((x) => this.typeOf(x, depth + 1)));
      return el.includes(' ') ? `Array<${el}>` : `${el}[]`;
    }
    const dom = domTypeName(w, v);
    if (dom) return dom;
    if (v instanceof w.Map) return 'Map<unknown, unknown>';
    if (v instanceof w.Set) return 'Set<unknown>';
    if (!isPlainObject(w, v)) return 'unknown';

    const keys = Object.keys(v);
    if (keys.length === 0) return 'Record<string, unknown>';
    const valueTypes = keys.slice(0, 50).map((k) => this.typeOf(v[k], depth + 1));
    const homogeneous = new Set(valueTypes).size === 1;
    const dictionaryLike =
      keys.some((k) => !IDENT.test(k) || /^\d/.test(k)) ||
      keys.length > 25 ||
      DICTIONARY_NAME.test(propName) ||
      keys.every((k) => SCENARIO_IDS.has(k)) ||
      // Keyed by the `id` of each value, like `listModel.__itemIdToModel`.
      keys.every((k) => v[k] && typeof v[k] === 'object' && v[k].id === k);
    if (dictionaryLike || (homogeneous && keys.length >= 3 && !/^(string|number|boolean)$/.test(valueTypes[0])))
      return `Record<string, ${union(valueTypes)}>`;
    if (depth >= 2) return 'Record<string, unknown>';
    // A key holding `undefined` is effectively optional.
    const fields = keys.map((k) => `${key(k)}${v[k] === undefined ? '?' : ''}: ${this.typeOf(v[k], depth + 1, k)}`);
    return `{ ${fields.join('; ')} }`;
  }

  /**
   * A function-valued property. Parameters are `any` rather than `unknown`
   * because arrow types are checked contravariantly, and the hand-written
   * layer must be able to narrow them (e.g. to `(action: Action) => void`).
   */
  fnType(fn) {
    return `(${this.params(fn, 'any')}) => ${staticReturnType(fn) || 'unknown'}`;
  }

  params(fn, paramType = 'unknown') {
    if (hasRestParam(fn)) return `...args: ${paramType}[]`;
    return Array.from({ length: fn.length }, (_, i) => `arg${i}?: ${paramType}`).join(', ');
  }

  methodReturn(obj, name, fn) {
    if (fn.length === 0 && PROBE_NAME.test(name) && !PROBE_DENY.test(name)) {
      try {
        const result = fn.call(obj);
        if (result !== undefined && !(result && typeof result.then === 'function')) {
          const t = this.typeOf(result, 0, name);
          if (t !== 'unknown') return t;
        }
      } catch {}
    }
    const s = staticReturnType(fn);
    if (s) return s;
    if (BOOLEAN_NAME.test(name)) return 'boolean';
    return 'unknown';
  }

  emitInterface(name, obj) {
    const lines = [];
    const own = new Set(Object.keys(obj));
    // Own data properties.
    for (const k of [...own].sort()) {
      let v;
      try {
        v = obj[k];
      } catch {
        continue;
      }
      if (typeof v === 'function' && !this.names.has(v)) {
        lines.push(`    ${key(k)}(${this.params(v)}): ${this.methodReturn(obj, k, v)};`);
      } else {
        lines.push(`    ${key(k)}${v === undefined ? '?' : ''}: ${this.typeOf(v, 0, k)};`);
      }
    }
    // Prototype members, nearest first, skipping shadowed names.
    const seen = new Set(own);
    let proto = typeof obj === 'function' ? null : Object.getPrototypeOf(obj);
    while (proto && proto !== this.w.Object.prototype && proto !== Object.prototype) {
      for (const k of Object.getOwnPropertyNames(proto).sort()) {
        if (k === 'constructor' || seen.has(k)) continue;
        seen.add(k);
        const d = Object.getOwnPropertyDescriptor(proto, k);
        if (d.get) {
          let v;
          try {
            v = obj[k];
          } catch {}
          lines.push(`    ${d.set ? '' : 'readonly '}${key(k)}: ${this.typeOf(v)};`);
        } else if (typeof d.value === 'function') {
          lines.push(`    ${key(k)}(${this.params(d.value)}): ${this.methodReturn(obj, k, d.value)};`);
        }
      }
      proto = Object.getPrototypeOf(proto);
    }
    const callable = typeof obj === 'function' ? `    (${this.params(obj)}): unknown;\n` : '';
    return `  interface ${name} {\n${callable}${lines.join('\n')}\n  }`;
  }

  emit() {
    return this.roots.map(([name, obj]) => this.emitInterface(name, obj)).join('\n\n');
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** Payload field types inferred from field names when call sites don't show one. */
const FIELD_TYPES = [
  [/^(id|itemId|columnId|folderId|tableId|parentId|token)$/, 'string'],
  [/^(ids|itemIds)$/, 'string[]'],
  [/(Latex|latex|^text|^title|^name|^str|^key|^color|^description|^label|^url|^language|^tool|^source|^mode)$/, 'string'],
  [/^(index|time|delta|count|value[XY]|x|y|dx|dy|speed|idx|rowIndex|columnIndex)$/, 'number'],
  [/^(dragMode)$/, 'Desmos.DragMode'],
  [/^(labelOrientation)$/, 'Desmos.LabelOrientation'],
  [/^(pointStyle)$/, 'Desmos.PointStyle'],
  [/^(lineStyle)$/, 'Desmos.LineStyle'],
  [/^(state)$/, 'unknown'],
  [/^(is[A-Z]\w*|hidden|secret|readonly|collapsed|open|playing|isPlaying|shown|enabled|allowUndo)$/, 'boolean'],
];

function fieldType(name, observedKinds) {
  const kinds = observedKinds.filter((k) => k !== 'unknown' && k !== 'undefined');
  const mapped = { string: 'string', number: 'number', boolean: 'boolean', object: 'Record<string, unknown>', array: 'unknown[]', function: '(...args: any[]) => unknown', null: 'null' };
  for (const [re, t] of FIELD_TYPES) if (re.test(name)) {
    // Trust the name only when no call site contradicts it.
    if (kinds.every((k) => mapped[k] === t || (t.startsWith('Desmos.') && k === 'string') || (t.endsWith('[]') && k === 'array'))) return t;
  }
  if (kinds.length && !observedKinds.includes('unknown')) return union(kinds.map((k) => mapped[k] || 'unknown'));
  return 'unknown';
}

/**
 * The bundle's main AST plus the ASTs of code it embeds as strings and
 * `eval`s at load time (`__dcg_shared_module_source__`), which acorn would
 * otherwise see only as a string literal.
 */
function parseBundle() {
  const main = acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'script' });
  const asts = [main];
  walk.full(main, (n) => {
    if (n.type !== 'VariableDeclarator' || !n.id.name || !/^__dcg_\w+_source__$/.test(n.id.name)) return;
    if (!n.init || n.init.type !== 'Literal' || typeof n.init.value !== 'string') return;
    try {
      asts.push(acorn.parse(n.init.value, { ecmaVersion: 'latest', sourceType: 'script' }));
    } catch {}
  });
  return asts;
}

// ---------------------------------------------------------------------------
// Fragile view props
// ---------------------------------------------------------------------------

/** Base DCGView instance fields, left out of generated view interfaces. */
const VIEW_BASE_FIELDS = new Set([
  'props', '_childViews', '_bindings', '_isMounted', 'const', '_viewName', '_element', '_elementSpec',
  '_parentElement', '__observers', 'guid',
]);
/** Prop names that are callbacks, never getters, so they must not be called. */
const CALLBACK_PROP = /^(on[A-Z]|did[A-Z]|will[A-Z]|handle[A-Z]|restore[A-Z]|manage[A-Z]|suppress[A-Z])/;
/** How many levels of `{...props}` forwarding to follow into inner views. */
const FORWARD_DEPTH = 3;
/** Marks a call site whose props object contains a spread. */
const SPREAD = Symbol('spread');

/**
 * Static facts about every `var X = class ... {}` in the bundle: the
 * props it reads, its `createElement(X, {...})` call sites, and the classes
 * it forwards its props to with `createElement(Y, {...props})`.
 */
function analyzeViewClasses(mainAst) {
  /** ident -> { node, sites: [{ prop: kind }], reads: Map<prop, Set<argc>>, forwardsTo: Set<ident> } */
  const classes = new Map();
  walk.full(mainAst, (n) => {
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.init && n.init.type === 'ClassExpression')
      classes.set(n.id.name, { node: n.init, sites: [], reads: new Map(), forwardsTo: new Set() });
  });

  const siteKind = (v) => {
    if (!v) return 'unknown';
    if (v.type === 'ArrowFunctionExpression' || v.type === 'FunctionExpression')
      return v.params.length ? `callback:${v.params.length}` : 'getter';
    if (v.type === 'CallExpression') {
      const c = v.callee;
      if ((c.type === 'MemberExpression' && c.property.name === 'const') || (c.type === 'Identifier' && v.arguments.length === 1))
        return 'getter';
    }
    return 'unknown';
  };

  walk.full(mainAst, (n) => {
    if (n.type !== 'CallExpression' || n.arguments.length < 2) return;
    const [a0, a1] = n.arguments;
    if (a0.type !== 'Identifier' || !classes.has(a0.name) || a1.type !== 'ObjectExpression') return;
    const site = {};
    for (const p of a1.properties) if (p.type === 'Property') site[p.key.name || p.key.value] = siteKind(p.value);
    // A site that spreads props could pass anything, so it can't show a prop is optional.
    if (a1.properties.some((p) => p.type === 'SpreadElement')) Object.defineProperty(site, SPREAD, { value: true });
    classes.get(a0.name).sites.push(site);
  });

  for (const [, cls] of classes) {
    const note = (prop, argc) => {
      if (prop === 'children') return;
      if (!cls.reads.has(prop)) cls.reads.set(prop, new Set());
      if (argc !== null) cls.reads.get(prop).add(argc);
    };
    const isThisProps = (e) => e && e.type === 'MemberExpression' && e.object.type === 'ThisExpression' && e.property.name === 'props';
    /** Local names bound to `this.props` or to a copy of it (`omit(this.props, [...])`). */
    const propsAliases = new Set();
    walk.ancestor(cls.node.body, {
      VariableDeclarator(d) {
        const init = d.init;
        if (!init) return;
        if (isThisProps(init) && d.id.type === 'ObjectPattern') {
          for (const p of d.id.properties) {
            if (p.type === 'Property' && p.key.type === 'Identifier') note(p.key.name, null);
            if (p.type === 'RestElement' && p.argument.type === 'Identifier') propsAliases.add(p.argument.name);
          }
        }
        if (d.id.type === 'Identifier' && (isThisProps(init) || (init.type === 'CallExpression' && init.arguments.some(isThisProps))))
          propsAliases.add(d.id.name);
      },
      MemberExpression(m, _s, anc) {
        if (m.computed) return;
        const o = m.object;
        // `this.props.x`, or `(e = this.props).x`
        const fromProps = isThisProps(o) || (o.type === 'AssignmentExpression' && isThisProps(o.right));
        if (!fromProps) return;
        const parent = anc[anc.length - 2];
        note(m.property.name, parent && parent.type === 'CallExpression' && parent.callee === m ? parent.arguments.length : null);
      },
      CallExpression(c) {
        const [a0, a1] = c.arguments;
        if (!a0 || a0.type !== 'Identifier' || !classes.has(a0.name) || !a1 || a1.type !== 'ObjectExpression') return;
        const forwards = a1.properties.some(
          (p) => p.type === 'SpreadElement' && (isThisProps(p.argument) || (p.argument.type === 'Identifier' && propsAliases.has(p.argument.name)))
        );
        if (forwards) cls.forwardsTo.add(a0.name);
      },
    });
  }
  return classes;
}

/**
 * Props and instance members of every view exported on `Private.Fragile`.
 * Each prop is typed from live instances recorded while the calculator
 * rendered, and otherwise from call sites and reads in the class body.
 * Props forwarded to an inner view with `{...props}` are included too.
 */
function extractViews(gen, D, views, mainAst) {
  const F = D.Private.Fragile;
  const ViewBase = F.DCGView.Class;
  const classes = analyzeViewClasses(mainAst);

  // Live instances by class ident, matched on the constructor's source text.
  const identBySource = new Map();
  for (const [ident, cls] of classes) identBySource.set(source.slice(cls.node.start, cls.node.end), ident);
  const liveByIdent = new Map();
  for (const v of views) {
    let text;
    try {
      text = Function.prototype.toString.call(v.constructor);
    } catch {
      continue;
    }
    const ident = identBySource.get(text);
    if (!ident) continue;
    if (!liveByIdent.has(ident)) liveByIdent.set(ident, []);
    liveByIdent.get(ident).push(v);
  }

  const viewNames = Object.keys(F).filter((k) => typeof F[k] === 'function' && F[k].prototype instanceof ViewBase);
  const identOfView = (name) => identBySource.get(Function.prototype.toString.call(F[name]));

  /** All prop evidence for `ident`, following forwarding. `forwarded` marks props only an inner view uses. */
  function collect(ident, depth, forwarded, acc) {
    const cls = classes.get(ident);
    if (!cls) return acc;
    const live = liveByIdent.get(ident) || [];
    const names = new Set([...cls.sites.flatMap((s) => Object.keys(s)), ...cls.reads.keys(), ...live.flatMap((v) => Object.keys(v.props || {}))]);
    names.delete('children');
    for (const prop of names) {
      if (!acc.has(prop)) acc.set(prop, { siteKinds: [], argCounts: [], values: [], required: false, forwarded });
      const e = acc.get(prop);
      if (!forwarded) e.forwarded = false;
      e.siteKinds.push(...cls.sites.map((s) => s[prop]).filter(Boolean));
      if (cls.reads.has(prop)) e.argCounts.push(...cls.reads.get(prop));
      e.values.push(...live.map((v) => v.props && v.props[prop]).filter((x) => x !== undefined));
      if (!forwarded) {
        const explicitSites = cls.sites.filter((s) => !s[SPREAD]);
        e.required = explicitSites.length
          ? explicitSites.every((s) => prop in s)
          : live.length > 0 && live.every((v) => v.props && prop in v.props);
      }
    }
    if (depth < FORWARD_DEPTH) for (const inner of cls.forwardsTo) collect(inner, depth + 1, true, acc);
    return acc;
  }

  function propType(prop, e) {
    let arity = null;
    for (const k of e.siteKinds) if (k.startsWith('callback:')) arity = Math.max(arity || 0, +k.split(':')[1]);
    if (e.argCounts.some((c) => c > 0)) arity = Math.max(arity || 0, ...e.argCounts);
    if (CALLBACK_PROP.test(prop) && arity === null) arity = 0;
    for (const fn of e.values) if (typeof fn === 'function' && fn.length > 0 && !fn.isDCGViewConst) arity = Math.max(arity || 0, fn.length);
    if (arity !== null) return `(${Array.from({ length: arity }, (_, i) => `arg${i}?: any`).join(', ')}) => unknown`;
    const results = [];
    for (const fn of e.values.slice(0, 40)) {
      if (typeof fn !== 'function') {
        results.push(gen.typeOf(fn));
        continue;
      }
      try {
        results.push(gen.typeOf(fn.call(undefined)));
      } catch {}
    }
    return `() => ${results.length ? union(results) : 'unknown'}`;
  }

  const out = [];
  for (const name of viewNames) {
    const C = F[name];
    const ident = identOfView(name);
    const evidence = ident ? collect(ident, 0, false, new Map()) : new Map();
    const cls = ident && classes.get(ident);
    const live = (ident && liveByIdent.get(ident)) || [];
    const lines = [...evidence]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([prop, e]) => {
        const doc = e.forwarded ? '    /** Forwarded to an inner view. */\n' : '';
        return `${doc}    ${key(prop)}${e.required ? '' : '?'}: ${propType(prop, e)};`;
      });
    const forwards = cls && cls.forwardsTo.size ? ` Forwards its props to ${cls.forwardsTo.size} inner view(s).` : '';
    out.push(
      `  /**\n   * Props of \`Private.Fragile.${name}\`, from ${cls ? cls.sites.length : 0} call site(s), ` +
        `${live.length} live instance(s) and the class body.${forwards}\n   */\n` +
        `  interface ${name}Props {\n${lines.join('\n')}\n  }`
    );

    // Instance members: fields from a live instance plus prototype methods,
    // stopping at the DCGView base class.
    const sample = live[0];
    const members = [];
    const seen = new Set();
    if (sample) {
      for (const k of Object.keys(sample).sort()) {
        if (VIEW_BASE_FIELDS.has(k) || k.startsWith('__')) continue;
        seen.add(k);
        const v = sample[k];
        members.push(
          typeof v === 'function'
            ? `    ${key(k)}(${gen.params(v)}): unknown;`
            : `    ${key(k)}${v === undefined ? '?' : ''}: ${gen.typeOf(v, 0, k)};`
        );
      }
    }
    let proto = C.prototype;
    while (proto && proto !== ViewBase.prototype && proto !== Object.prototype) {
      for (const k of Object.getOwnPropertyNames(proto).sort()) {
        if (k === 'constructor' || seen.has(k)) continue;
        seen.add(k);
        const d = Object.getOwnPropertyDescriptor(proto, k);
        if (typeof d.value !== 'function') continue;
        const ret = k === 'template' ? 'DCGView.ElementSpec' : sample ? gen.methodReturn(sample, k, d.value) : staticReturnType(d.value) || 'unknown';
        members.push(`    ${key(k)}(${gen.params(d.value)}): ${ret};`);
      }
      proto = Object.getPrototypeOf(proto);
    }
    out.push(
      `  /** Instance members of \`Private.Fragile.${name}\` beyond the DCGView base. */\n` +
        `  interface ${name}Members {\n${members.join('\n')}\n  }`
    );
  }
  return out.join('\n\n');
}

/**
 * Each object that accepts actions has its own reducer, recognized by
 * method names that survive minification. An action belongs to every
 * domain whose reducer handles it.
 */
const ACTION_DOMAINS = [
  {
    name: 'Action',
    doc: 'Actions handled by the graph controller (`calculator.controller.dispatch`).',
    test: (m) => m.has('handleDispatchedAction') || (m.has('handleAction') && m.has('spinUpAudioContext')),
  },
  {
    name: 'MathFieldAction',
    doc: "Actions handled by a math field's own controller (`mathField.controller.dispatch`).",
    test: (m) => (m.has('handleAction') && m.has('getLatexSelection')) || m.has('_keystrokeSingle'),
  },
  {
    name: 'BasicCalculatorAction',
    doc: 'Actions handled by a four-function or scientific calculator controller.',
    test: (m) => m.has('hookUpDispatcher'),
  },
];

/** Literal values of an expression, if it is a string literal or a conditional between them. */
function literalValues(n) {
  if (!n) return null;
  if (n.type === 'Literal' && typeof n.value === 'string') return [n.value];
  if (n.type === 'ConditionalExpression') {
    const a = literalValues(n.consequent);
    const b = literalValues(n.alternate);
    return a && b ? [...a, ...b] : null;
  }
  return null;
}

function extractActions(asts) {
  const kindOf = (n) => {
    if (!n) return 'unknown';
    switch (n.type) {
      case 'Literal':
        return n.value === null ? 'null' : typeof n.value;
      case 'TemplateLiteral':
        return 'string';
      case 'UnaryExpression':
        return n.operator === '!' ? 'boolean' : n.operator === '-' ? 'number' : n.operator === 'void' ? 'undefined' : 'unknown';
      case 'ArrayExpression':
        return 'array';
      case 'ObjectExpression':
        return 'object';
      case 'ArrowFunctionExpression':
      case 'FunctionExpression':
        return 'function';
      case 'ConditionalExpression':
        return literalValues(n) ? 'string' : 'unknown';
      default:
        return booleanish(n) ? 'boolean' : 'unknown';
    }
  };

  /** The domain names of the class enclosing a node, from its method names. */
  const domainsOfClass = (cls) => {
    if (!cls) return [];
    const methods = new Set(cls.body.body.filter((m) => m.type === 'MethodDefinition' && m.key).map((m) => m.key.name));
    return ACTION_DOMAINS.filter((d) => d.test(methods)).map((d) => d.name);
  };
  const enclosingClass = (anc) => [...anc].reverse().find((a) => a.type === 'ClassExpression' || a.type === 'ClassDeclaration');

  // Free functions called from domain classes inherit those domains, so
  // reducers split into helper functions are attributed correctly.
  const functionDomains = new Map();
  for (const ast of asts)
    walk.fullAncestor(ast, (n, anc) => {
      if (n.type !== 'CallExpression' || n.callee.type !== 'Identifier') return;
      const domains = domainsOfClass(enclosingClass(anc));
      if (!domains.length) return;
      if (!functionDomains.has(n.callee.name)) functionDomains.set(n.callee.name, new Set());
      domains.forEach((d) => functionDomains.get(n.callee.name).add(d));
    });
  const domainsAt = (anc) => {
    const own = domainsOfClass(enclosingClass(anc));
    if (own.length) return own;
    const fn = [...anc].reverse().find((a) => a.type === 'FunctionDeclaration');
    return fn && functionDomains.has(fn.id.name) ? [...functionDomains.get(fn.id.name)] : [];
  };

  /** action -> { sites, fields, read, reducers, domains } */
  const actions = new Map();
  const get = (t) => {
    if (!actions.has(t)) actions.set(t, { sites: 0, fields: new Map(), read: new Set(), reducers: new Set(), domains: new Set() });
    return actions.get(t);
  };

  for (const ast of asts)
    walk.fullAncestor(ast, (node, anc) => {
      if (node.type !== 'CallExpression') return;
      const c = node.callee;
      const name = c.type === 'MemberExpression' && !c.computed ? c.property.name : c.type === 'Identifier' ? c.name : null;
      if (name !== 'dispatch') return;
      const arg = node.arguments[0];
      if (!arg || arg.type !== 'ObjectExpression') return;
      const typeProp = arg.properties.find((p) => p.type === 'Property' && (p.key.name || p.key.value) === 'type');
      if (!typeProp || typeProp.value.type !== 'Literal' || typeof typeProp.value.value !== 'string') return;
      const a = get(typeProp.value.value);
      a.sites++;
      // A dispatch from inside a domain's own class goes to that domain.
      domainsOfClass(enclosingClass(anc)).forEach((d) => a.domains.add(d));
      for (const p of arg.properties) {
        if (p.type !== 'Property') continue;
        const k = p.key.name || p.key.value;
        if (k === 'type') continue;
        if (!a.fields.has(k)) a.fields.set(k, { count: 0, kinds: new Set(), literals: new Set(), allLiteral: true });
        const f = a.fields.get(k);
        f.count++;
        f.kinds.add(p.shorthand ? 'unknown' : kindOf(p.value));
        const lits = p.shorthand ? null : literalValues(p.value);
        if (lits) lits.forEach((l) => f.literals.add(l));
        else f.allLiteral = false;
      }
    });

  const dispatched = new Set(actions.keys());
  for (const ast of asts)
    walk.fullAncestor(ast, (node, ancestors) => {
      if (node.type !== 'SwitchStatement') return;
      const d = node.discriminant;
      if (!(d.type === 'MemberExpression' && !d.computed && d.property.name === 'type' && d.object.type === 'Identifier')) return;
      const param = d.object.name;
      const labels = node.cases.map((c) => (c.test && c.test.type === 'Literal' ? c.test.value : null));
      if (labels.filter((l) => dispatched.has(l)).length < 2) return;
      const domains = domainsAt(ancestors);
      let reducer = '?';
      for (let i = ancestors.length - 1; i >= 0; i--) {
        const a = ancestors[i];
        if ((a.type === 'MethodDefinition' || a.type === 'Property') && a.key) {
          reducer = a.key.name || a.key.value;
          break;
        }
      }
      let group = [];
      for (const c of node.cases) {
        const l = c.test && c.test.type === 'Literal' ? c.test.value : null;
        if (typeof l === 'string') group.push(l);
        if (c.consequent.length === 0) continue;
        const read = new Set();
        c.consequent.forEach((st) =>
          walk.full(st, (n) => {
            if (n.type === 'MemberExpression' && !n.computed && n.object.type === 'Identifier' && n.object.name === param && n.property.name !== 'type')
              read.add(n.property.name);
          })
        );
        for (const g of group) {
          const a = get(g);
          read.forEach((r) => a.read.add(r));
          domains.forEach((dn) => a.domains.add(dn));
          if (/^[a-z]/i.test(reducer) && reducer.length > 3) a.reducers.add(reducer);
        }
        group = [];
      }
    });

  const byDomain = Object.fromEntries(ACTION_DOMAINS.map((d) => [d.name, []]));
  for (const [type, a] of [...actions].sort(([x], [y]) => (x < y ? -1 : 1))) {
    const fields = [];
    const names = new Set([...a.fields.keys(), ...a.read]);
    for (const f of [...names].sort()) {
      const info = a.fields.get(f);
      const kinds = info ? [...info.kinds] : ['unknown'];
      const required = info && a.sites > 0 && info.count === a.sites;
      const t =
        info && info.allLiteral && info.literals.size > 0 && info.literals.size <= 12
          ? [...info.literals].sort().map((l) => JSON.stringify(l)).join(' | ')
          : fieldType(f, kinds);
      fields.push(`${key(f)}${required ? '' : '?'}: ${t}`);
    }
    const doc = [];
    if (a.sites === 0) doc.push('Handled but never dispatched inside the bundle.');
    if (a.reducers.size) doc.push(`Handled by: ${[...a.reducers].sort().join(', ')}.`);
    if (a.domains.size === 0) doc.push('No reducer found; assumed to go to the graph controller.');
    const comment = doc.length ? `    /** ${doc.join(' ')} */\n` : '';
    const member = `${comment}    | { type: ${JSON.stringify(type)}${fields.length ? '; ' + fields.join('; ') : ''} }`;
    for (const dn of a.domains.size ? a.domains : ['Action']) byDomain[dn].push(member);
  }

  const text = ACTION_DOMAINS.filter((d, i, all) => all.findIndex((x) => x.name === d.name) === i)
    .map(
      (d) =>
        '  /**\n' +
        `   * ${d.doc}\n` +
        '   * Field types are inferred from call-site literals and field names;\n' +
        '   * `?` marks fields not passed at every call site.\n' +
        '   */\n' +
        `  type ${d.name} =\n${byDomain[d.name].length ? byDomain[d.name].join('\n') : '    never'};`
    )
    .join('\n\n');
  const counts = Object.entries(byDomain).map(([k, v]) => `${v.length} ${k}`).join(', ');
  return { count: actions.size, counts, text };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function header(title) {
  const D = loaded.Desmos;
  return [
    '// AUTO-GENERATED by scripts/extract-internals.cjs. Do not edit by hand:',
    '// put precise types in the hand-written files in internals/ instead.',
    `// Source: Desmos ${D.version} (commit ${D.commit}).`,
    `// ${title}`,
    '',
  ].join('\n');
}

const loaded = loadDesmos();
const D = loaded.Desmos;
const views = recordViews(D);
const calc = D.GraphingCalculator(loaded.document.getElementById('calc'), { authorFeatures: true });
calc.setState(SCENARIO_STATE);

/**
 * Interact with the UI so that more views render (menus, focused math
 * fields, settings). Each step runs after the previous render settles.
 */
const UI_STEPS = [
  () => calc.controller.dispatch({ type: 'set-selected-id', id: 'curve' }),
  () => calc.controller.dispatch({ type: 'set-focus-location', location: { type: 'expression', id: 'curve' } }),
  () => openMenuFor('ExpressionIconView', 'point'),
  () => openMenuFor('ImageIconView', 'image'),
  () => calc.controller.dispatch({ type: 'set-focus-location', location: { type: 'slider-limit', id: 'slider', location: 'min' } }),
  () => calc.controller.dispatch({ type: 'toggle-graph-settings', isOpen: true }),
  () => calc.controller.dispatch({ type: 'open-add-expression' }),
  () => calc.controller.dispatch({ type: 'set-edit-list-mode', isEditListMode: true, focusExpressionList: false }),
];

function openMenuFor(viewName, id) {
  const C = D.Private.Fragile[viewName];
  const view = views.find((v) => v.constructor === C && v.props && v.props.model && v.props.model().id === id);
  if (view && view.toggleOptions) view.toggleOptions();
}

(function step(i) {
  if (i < UI_STEPS.length) {
    try {
      UI_STEPS[i]();
    } catch {}
    setTimeout(() => step(i + 1), 300);
    return;
  }
  try {
    run();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})(0);

function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ctl = calc.controller;
  const gen = new Generator(loaded);
  gen.controller = ctl;
  const asts = parseBundle();

  // Named roots first so that references between them resolve by name.
  gen.addRoot('Controller', ctl);
  gen.addRoot('CalcInternals', calc._calc);
  gen.addRoot('ListModel', ctl.listModel);
  gen.addRoot('ExpressionModel', ctl.getItemModel('curve'));
  gen.addRoot('TableModel', ctl.getItemModel('table'));
  gen.addRoot('TableColumnModel', ctl.getItemModel('table').columnModels[0]);
  gen.addRoot('FolderModel', ctl.getItemModel('folder'));
  gen.addRoot('TextModel', ctl.getItemModel('note'));
  gen.addRoot('ImageModel', ctl.getItemModel('image'));
  gen.addRoot('Dispatcher', ctl.dispatcher);
  gen.addRoot('Evaluator', ctl.evaluator);
  gen.addRoot('Grapher2D', ctl.grapher2d);
  gen.addRoot('GrapherSettings', ctl.graphSettings);
  gen.addRoot('ApiInternals', calc);
  gen.addRoot('TickerModel', ctl.listModel.ticker);
  gen.addRoot('LayoutModel', ctl.layoutModel);
  const calc3d = D.Calculator3D(loaded.document.createElement('div'));
  gen.addRoot('Grapher3D', calc3d.controller.grapher3d);

  // Math fields and basic calculators have their own controllers and actions.
  const mqElement = loaded.document.createElement('span');
  loaded.document.body.appendChild(mqElement);
  const mathField = D.MathQuill.MathField(mqElement, {});
  mathField.latex('\\frac{x}{2}');
  gen.addRoot('MathFieldController', mathField.controller);
  const basicElement = loaded.document.createElement('div');
  loaded.document.body.appendChild(basicElement);
  const scientific = D.ScientificCalculator(basicElement);
  gen.addRoot('BasicCalculatorController', scientific.controller);
  // Other item models of the same class reuse the interface names above.
  for (const id of ['point', 'slider']) gen.names.set(ctl.getItemModel(id), 'ExpressionModel');
  gen.names.set(ctl.getItemModel('table').columnModels[1], 'TableColumnModel');
  // One level of nested class instances on the main objects.
  gen.expand('Controller', ctl);
  gen.expand('CalcInternals', calc._calc);
  gen.expand('Grapher2D', ctl.grapher2d);
  gen.addRoot('Private', D.Private);
  gen.expand('Private', D.Private, { plain: true });
  gen.expand('PrivateFragile', D.Private.Fragile, { plain: true });

  const objects = gen.emit();
  fs.writeFileSync(
    path.join(OUT_DIR, 'objects.d.ts'),
    `${header('Runtime shapes of internal objects.')}declare namespace Desmos.Internals.Generated {\n${objects}\n}\n`
  );

  const viewTypes = extractViews(gen, D, views, asts[0]);
  fs.writeFileSync(
    path.join(OUT_DIR, 'views.d.ts'),
    `${header('Props and instance members of the views on Private.Fragile.')}declare namespace Desmos.Internals.Generated {\n${viewTypes}\n}\n`
  );

  const actions = extractActions(asts);
  fs.writeFileSync(
    path.join(OUT_DIR, 'actions.d.ts'),
    `${header('Actions accepted by each dispatch domain, from static analysis.')}declare namespace Desmos.Internals.Generated {\n${actions.text}\n}\n`
  );

  console.log(
    `Wrote ${gen.roots.length} interfaces, ${actions.count} actions (${actions.counts}) and props for ` +
      `${(viewTypes.match(/interface \w+Props/g) || []).length} views (from ${views.length} rendered) to ${path.relative(process.cwd(), OUT_DIR)}`
  );
}

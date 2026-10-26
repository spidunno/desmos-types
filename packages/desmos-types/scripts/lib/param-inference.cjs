/**
 * Infer parameter names, types and optionality for minified methods, from
 * how each parameter is used in the method's source:
 *
 * - `this.x = p`, `{ x: p }`, `setProperty('x', p)`, `o.x === p` name it `x`.
 * - `dispatch({ type: 'T', x: p })` names it `x` and copies the type of
 *   field `x` of action `T`.
 * - `this.m(p)` reuses the name and type inferred for `m`'s parameter.
 * - Defaults (`p = 90`), arithmetic, comparisons with literals, array
 *   methods, calls (`p()`) and exhaustive `switch (p)` statements give types.
 * - A parameter is optional if it has a default, is compared with
 *   `undefined`/`null`, or some call site in the bundle omits it.
 */
'use strict';

const acorn = require('acorn');

const RESERVED = new Set(
  ('break case catch class const continue debugger default delete do else enum export extends false finally for ' +
    'function if import in instanceof new null return super switch this throw true try typeof var void while with ' +
    'yield let static implements interface package private protected public await arguments eval undefined')
    .split(' ')
);

/** Names and types for parameters of widely used methods the source can't explain. */
const SEEDS = {
  getItemModel: [{ name: 'id', type: 'string' }, { name: 'options' }],
  getItemModelByIndex: [{ name: 'index', type: 'number' }],
  dispatch: [{ name: 'action' }],
  runAfterDispatch: [{ name: 'callback', type: '() => void' }],
  s: [{ name: 'key', type: 'string' }, { name: 'variables' }],
  getProperty: [{ name: 'name', type: 'string' }],
  observe: [{ name: 'names', type: 'string' }, { name: 'callback' }],
  unobserve: [{ name: 'names', type: 'string' }],
  observeEvent: [{ name: 'event', type: 'string' }, { name: 'callback' }],
  unobserveEvent: [{ name: 'event', type: 'string' }],
  triggerEvent: [{ name: 'event', type: 'string' }, { name: 'data' }],
  querySelector: [{ name: 'selector', type: 'string' }],
  findEl: [{ name: 'selector', type: 'string' }],
};

const ARRAY_METHODS = new Set(['forEach', 'map', 'filter', 'some', 'every', 'find', 'findIndex', 'push', 'reduce', 'flatMap', 'splice']);
const NUMERIC_OPERATORS = new Set(['-', '*', '/', '%', '**', '<', '>', '<=', '>=', '<<', '>>', '>>>', '&', '|', '^']);
const FUNCTION_TYPE = '(...args: any[]) => unknown';
const ITEM_TYPES = new Set(['expression', 'table', 'folder', 'text', 'image']);
/** Fields only item models have (states and other objects with a `type` don't). */
const MODEL_ONLY_FIELDS = new Set(['formula', 'index', 'displayIndex', 'controller', 'columnModels', 'guid', 'cachedViewState']);
const ITEM_MODEL_TYPE = 'ExpressionModel | TableModel | FolderModel | TextModel | ImageModel';

function parseFunction(fn) {
  let text;
  try {
    text = Function.prototype.toString.call(fn);
  } catch {
    return null;
  }
  if (/\[native code\]/.test(text) || /^class\b/.test(text)) return null;
  for (const wrapped of [`(${text})`, `({${text}})`]) {
    try {
      const ast = acorn.parseExpressionAt(wrapped, 0, { ecmaVersion: 'latest' });
      const node = ast.type === 'ObjectExpression' ? ast.properties[0] && ast.properties[0].value : ast;
      if (node && /Function/.test(node.type)) return node;
    } catch {}
  }
  return null;
}

function validName(name) {
  return typeof name === 'string' && /^[a-z][A-Za-z0-9]*$/.test(name) && name.length > 1 && !RESERVED.has(name);
}

/** `__compilerDebugData` -> `compilerDebugData`; names of constants (`SURFACE_xyz`) are rejected later. */
function cleanName(name) {
  return typeof name === 'string' ? name.replace(/^[_$]+/, '') : name;
}

function keyName(prop) {
  if (prop.computed) return null;
  if (prop.key.type === 'Identifier') return prop.key.name;
  if (prop.key.type === 'Literal' && typeof prop.key.value === 'string') return prop.key.value;
  return null;
}

function literalType(node) {
  if (!node) return null;
  if (node.type === 'Literal') {
    if (typeof node.value === 'string') return 'string';
    if (typeof node.value === 'number') return 'number';
    if (typeof node.value === 'boolean') return 'boolean';
    return null;
  }
  if (node.type === 'UnaryExpression' && node.operator === '!' && node.argument.type === 'Literal') return 'boolean';
  if (node.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'Literal') return 'number';
  if (node.type === 'TemplateLiteral') return 'string';
  if (node.type === 'ArrayExpression') return 'unknown[]';
  if (node.type === 'ObjectExpression') {
    const fields = [];
    for (const p of node.properties) {
      const k = p.type === 'Property' && keyName(p);
      if (!k || !validName(k)) return 'Record<string, unknown>';
      fields.push(`${k}?: ${literalType(p.value) || 'unknown'}`);
    }
    return fields.length ? `{ ${fields.join('; ')} }` : 'Record<string, unknown>';
  }
  if (/Function/.test(node.type)) return FUNCTION_TYPE;
  return null;
}

function isNullish(node) {
  return (
    (node.type === 'Literal' && node.value === null) ||
    (node.type === 'UnaryExpression' && node.operator === 'void') ||
    (node.type === 'Identifier' && node.name === 'undefined')
  );
}

function isThis(node) {
  return node && node.type === 'ThisExpression';
}

/** Names bound by a pattern (params, declarations). */
function boundNames(pattern, out = new Set()) {
  if (!pattern) return out;
  switch (pattern.type) {
    case 'Identifier':
      out.add(pattern.name);
      break;
    case 'AssignmentPattern':
      boundNames(pattern.left, out);
      break;
    case 'RestElement':
      boundNames(pattern.argument, out);
      break;
    case 'ArrayPattern':
      pattern.elements.forEach((e) => boundNames(e, out));
      break;
    case 'ObjectPattern':
      pattern.properties.forEach((p) => boundNames(p.type === 'RestElement' ? p : p.value, out));
      break;
  }
  return out;
}

/** Whether a nested function or block redeclares `name`, hiding the parameter. */
function shadows(node, name) {
  if (/Function/.test(node.type)) {
    if (node.params.some((p) => boundNames(p).has(name))) return true;
    if (node.id && node.id.name === name) return true;
  }
  if (node.type === 'VariableDeclaration' && node.kind !== 'var') return false; // handled at the block level
  if (node.type === 'BlockStatement' || node.type === 'Program') {
    for (const s of node.body) {
      if (s.type === 'VariableDeclaration' && s.kind !== 'var' && s.declarations.some((d) => boundNames(d.id).has(name)))
        return true;
    }
  }
  if (node.type === 'CatchClause' && node.param && boundNames(node.param).has(name)) return true;
  return false;
}

/** Visit every node of `root` where identifier `name` refers to the parameter. */
function forEachUse(root, name, visit) {
  (function walk(node, parent, isRoot) {
    if (!node || typeof node.type !== 'string') return;
    if (!isRoot && shadows(node, name)) return;
    if (node.type === 'Identifier' && node.name === name) {
      // Skip property keys and non-computed member properties.
      if (parent && parent.type === 'MemberExpression' && parent.property === node && !parent.computed) return;
      if (parent && parent.type === 'Property' && parent.key === node && !parent.computed && parent.value !== node) return;
      visit(node, parent);
      return;
    }
    for (const k in node) {
      if (k === 'parent') continue;
      const child = node[k];
      if (Array.isArray(child)) child.forEach((c) => c && typeof c.type === 'string' && walk(c, node, false));
      else if (child && typeof child.type === 'string') walk(child, node, false);
    }
  })(root, null, true);
}

/** Attach `parent` links so uses can look outward. */
function linkParents(root) {
  (function walk(node, parent) {
    if (!node || typeof node.type !== 'string') return;
    Object.defineProperty(node, 'parent', { value: parent, enumerable: false, configurable: true });
    for (const k in node) {
      const child = node[k];
      if (Array.isArray(child)) child.forEach((c) => c && typeof c.type === 'string' && walk(c, node));
      else if (child && typeof child.type === 'string') walk(child, node);
    }
  })(root, null);
}

class ParamInference {
  /**
   * @param {object} options
   * @param {object[]} options.asts parsed bundle sources, for call-site arity
   * @param {Map<string, Map<string, string>>} options.actionFields action type -> field -> TS type
   */
  constructor({ asts, actionFields }) {
    this.actionFields = actionFields;
    this.minArgs = new Map();
    this.asts = asts;
    /** function name -> [{ node, ast, scopeStart, scopeEnd }] */
    this.functions = new Map();
    /** shared module export key -> { name, ast, pos } */
    this.sharedExports = new Map();
    asts.forEach((ast, i) => this.collect(ast, i));
    /** fn or AST node -> inferred params (null while in progress, to break cycles) */
    this.cache = new Map();
  }

  collect(ast, astIndex) {
    // [node, enclosing scope node]
    const stack = [[ast, ast]];
    while (stack.length) {
      const [node, scope] = stack.pop();
      if (node.type === 'FunctionDeclaration' && node.id) {
        const name = node.id.name;
        if (!this.functions.has(name)) this.functions.set(name, []);
        this.functions.get(name).push({ node, ast: astIndex, scopeStart: scope.start, scopeEnd: scope.end });
      }
      // Object.defineProperty(__dcg_chunk_exports__, 'Mc', { get: () => localName })
      if (
        node.type === 'CallExpression' &&
        node.arguments.length === 3 &&
        node.arguments[0].type === 'Identifier' &&
        /^__dcg_\w*exports__$/.test(node.arguments[0].name) &&
        node.arguments[1].type === 'Literal' &&
        node.arguments[2].type === 'ObjectExpression'
      ) {
        const getter = node.arguments[2].properties.find((p) => p.type === 'Property' && keyName(p) === 'get');
        if (getter && getter.value.body && getter.value.body.type === 'Identifier')
          this.sharedExports.set(node.arguments[1].value, { name: getter.value.body.name, ast: astIndex, pos: node.start });
      }
      if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && !node.callee.computed) {
        const name = node.callee.property.name;
        if (name && !node.arguments.some((a) => a.type === 'SpreadElement')) {
          const prev = this.minArgs.get(name);
          if (prev === undefined || node.arguments.length < prev) this.minArgs.set(name, node.arguments.length);
        }
      }
      const childScope = /Function/.test(node.type) ? node : scope;
      for (const k in node) {
        const child = node[k];
        if (Array.isArray(child)) {
          for (const c of child) if (c && typeof c.type === 'string') stack.push([c, childScope]);
        } else if (child && typeof child.type === 'string') stack.push([child, childScope]);
      }
    }
  }

  /** The declaration `name` refers to at position `pos` of AST `ast`: the innermost one in scope. */
  resolve(name, ast, pos) {
    let best = null;
    for (const d of this.functions.get(name) || []) {
      if (d.ast !== ast || pos < d.scopeStart || pos > d.scopeEnd) continue;
      if (!best || d.scopeEnd - d.scopeStart < best.scopeEnd - best.scopeStart) best = d;
    }
    return best;
  }

  /** Where a method's source appears in the bundle, for resolving the functions it calls. */
  locate(fn) {
    let text;
    try {
      text = Function.prototype.toString.call(fn);
    } catch {
      return null;
    }
    for (let i = 0; i < this.asts.length; i++) {
      const { sourceText: src, embeddedRanges = [] } = this.asts[i];
      if (!src) continue;
      for (let pos = src.indexOf(text); pos >= 0; pos = src.indexOf(text, pos + 1)) {
        if (!embeddedRanges.some(([start, end]) => pos >= start && pos < end)) return { ast: i, pos };
      }
    }
    return null;
  }

  /** The params of method `name` (looked up on `obj`), or null. */
  paramsOf(obj, name) {
    let fn;
    for (let p = obj; p && !fn; p = Object.getPrototypeOf(p)) {
      const d = Object.getOwnPropertyDescriptor(p, name);
      if (d && typeof d.value === 'function') fn = d.value;
    }
    if (fn) return this.infer(obj, name, fn);
    return SEEDS[name] || null;
  }

  /**
   * Inferred params of `fn` (method `name` of `obj`): an array of
   * `{ name, type, optional, rest }`, or null if the source can't be parsed.
   */
  infer(obj, methodName, fn) {
    if (this.cache.has(fn)) return this.cache.get(fn);
    this.cache.set(fn, null);
    const node = parseFunction(fn);
    const result = node ? this.inferNode(obj, methodName, node, this.locate(fn)) : null;
    this.cache.set(fn, result);
    return result;
  }

  /**
   * Inferred params of a function in the bundle, called as `name(...)` (from
   * `location`) or through a shared module export.
   */
  inferBundleFunction(callee, location) {
    let decl = null;
    if (callee.type === 'Identifier') {
      if (location) decl = this.resolve(callee.name, location.ast, location.pos);
    } else if (
      callee.type === 'MemberExpression' &&
      callee.computed &&
      callee.object.type === 'Identifier' &&
      /^__dcg_\w*exports__$/.test(callee.object.name) &&
      callee.property.type === 'Literal'
    ) {
      const exp = this.sharedExports.get(callee.property.value);
      if (exp) decl = this.resolve(exp.name, exp.ast, exp.pos);
    }
    if (!decl) return null;
    const node = decl.node;
    if (this.cache.has(node)) return this.cache.get(node);
    this.cache.set(node, null);
    const result = this.inferNode(null, node.id.name, node, { ast: decl.ast, pos: node.start });
    this.cache.set(node, result);
    return result;
  }

  inferNode(obj, methodName, node, location) {
    linkParents(node);
    const seeds = SEEDS[methodName] || [];
    const minArgs = this.minArgs.get(methodName);
    const result = node.params.map((param, i) => {
      const info = this.inferParam(obj, node, param, i, location);
      const seed = seeds[i] || {};
      if (seed.name) info.name = seed.name;
      if (seed.type && (!info.type || info.type === 'unknown')) info.type = seed.type;
      if (minArgs !== undefined && minArgs <= i) info.optional = true;
      return info;
    });
    // Fallbacks and de-duplication.
    const used = new Set();
    result.forEach((p, i) => {
      if (!p.name && i === 0 && result.length === 1) p.name = nameFromMethod(methodName);
      if (!p.name && p.type === FUNCTION_TYPE) p.name = 'callback';
      if (!p.name || used.has(p.name)) p.name = p.name && !used.has(`${p.name}${i + 1}`) ? `${p.name}${i + 1}` : `arg${i}`;
      used.add(p.name);
      if (!p.type) p.type = 'unknown';
    });
    // A required parameter can't follow an optional one: earlier optional
    // parameters become required ones that accept `undefined`.
    let lastRequired = -1;
    result.forEach((p, i) => {
      if (!p.optional && !p.rest) lastRequired = i;
    });
    for (let i = 0; i < lastRequired; i++) {
      if (result[i].optional) {
        result[i].optional = false;
        if (result[i].type !== 'unknown') result[i].type += ' | undefined';
      }
    }
    return result;
  }

  inferParam(obj, fnNode, param, index, location) {
    const info = { name: null, type: null, optional: false, rest: false };
    if (param.type === 'RestElement') {
      info.rest = true;
      info.name = 'args';
      info.type = 'unknown[]';
      return info;
    }
    if (param.type === 'AssignmentPattern') {
      info.optional = true;
      info.type = literalType(param.right);
      param = param.left;
    }
    if (param.type === 'ObjectPattern') {
      info.name = 'options';
      // Only the destructured fields are known; too narrow to pass on to callers.
      info.local = true;
      const fields = [];
      for (const p of param.properties) {
        const k = p.type === 'Property' && keyName(p);
        if (!k || !validName(k)) {
          fields.length = 0;
          break;
        }
        const value = p.value.type === 'AssignmentPattern' ? p.value.right : null;
        const usage = p.value.type === 'Identifier' ? this.usage(obj, fnNode, p.value.name, location) : null;
        const t = literalType(value) || (usage && usage.type) || 'unknown';
        fields.push(`${k}?: ${t === 'unknown[]' && usage && usage.type ? usage.type : t}`);
      }
      if (fields.length) info.type = `{ ${fields.join('; ')} }`;
      return info;
    }
    if (param.type !== 'Identifier') return info;
    const usage = this.usage(obj, fnNode, param.name, location);
    info.name = usage.name;
    if (!info.type || info.type === 'unknown') info.type = usage.type;
    else if (usage.type && info.type === 'string' && /^"/.test(usage.type)) info.type = usage.type;
    info.optional = info.optional || usage.optional;
    return info;
  }

  /** Collect naming and typing evidence for one parameter. */
  usage(obj, fnNode, name, location) {
    const names = new Map(); // name -> weight
    const types = new Map(); // type -> weight
    let optional = false;
    const reads = new Set();
    let itemTypeCompared = false;
    let polymorphic = false;
    const nameHint = (n, w) => {
      n = cleanName(n);
      if (validName(n)) names.set(n, (names.get(n) || 0) + w);
    };
    const typeHint = (t, w) => t && t !== 'unknown' && types.set(t, (types.get(t) || 0) + w);

    forEachUse(fnNode.body, name, (node, parent) => {
      if (!parent) return;
      switch (parent.type) {
        case 'Property':
          if (parent.value === node) {
            const k = keyName(parent);
            nameHint(k, 3);
            const action = dispatchedActionType(parent.parent);
            const t = action && this.actionFields.get(action) && this.actionFields.get(action).get(k);
            if (t) typeHint(t, 4);
          }
          break;
        case 'AssignmentExpression':
          if (parent.right === node && parent.left.type === 'MemberExpression' && !parent.left.computed) {
            nameHint(parent.left.property.name, 2);
          }
          if (parent.left === node && parent.operator === '=' && isNullishCheckAssignment(parent)) optional = true;
          break;
        case 'BinaryExpression': {
          const other = parent.left === node ? parent.right : parent.left;
          if (['===', '!==', '==', '!='].includes(parent.operator)) {
            if (isNullish(other)) optional = true;
            else if (other.type === 'MemberExpression' && !other.computed) {
              // `this.layoutModel.dropdownOpenForTableId === p` -> `id`
              const prop = other.property.name;
              nameHint(/Id$/.test(prop) ? 'id' : prop, 1);
            }
            else typeHint(literalType(other), 1);
          } else if (NUMERIC_OPERATORS.has(parent.operator)) {
            typeHint('number', 1);
          }
          break;
        }
        case 'LogicalExpression':
          if (parent.left === node && (parent.operator === '??' || parent.operator === '||')) {
            if (parent.right.type === 'AssignmentExpression' || isNullish(parent.right)) optional = true;
            else if (parent.operator === '??') optional = true;
          }
          break;
        case 'CallExpression':
          if (parent.callee === node) {
            typeHint(FUNCTION_TYPE, 2);
          } else {
            const i = parent.arguments.indexOf(node);
            const callee = parent.callee;
            const bundleParams = i >= 0 ? this.inferBundleFunction(callee, location) : null;
            if (bundleParams) {
              const p = bundleParams[i];
              if (p && !p.rest && !p.local) {
                if (p.name && !/^arg\d+$/.test(p.name) && p.name !== 'options') nameHint(p.name, 2);
                typeHint(p.type, 2);
              }
            } else if (i >= 0 && callee.type === 'MemberExpression' && !callee.computed) {
              const method = callee.property.name;
              if (method === 'setProperty' || method === 'setPropertyWithoutNotifying') {
                if (i === 1 && parent.arguments[0].type === 'Literal') nameHint(parent.arguments[0].value, 3);
              } else {
                const target = isThis(callee.object) ? this.paramsOf(obj, method) : SEEDS[method];
                const p = target && target[i];
                if (p && !p.rest && !p.local) {
                  if (p.name && !/^arg\d+$/.test(p.name)) nameHint(p.name, 2);
                  typeHint(p.type, 2);
                }
              }
            }
          }
          break;
        case 'MemberExpression':
          if (parent.object === node && !parent.computed) {
            const prop = parent.property.name;
            reads.add(prop);
            if (ARRAY_METHODS.has(prop)) typeHint('unknown[]', 1);
            if (prop === 'type') {
              const cmp = parent.parent;
              const other = cmp && cmp.type === 'BinaryExpression' && (cmp.left === parent ? cmp.right : cmp.left);
              if (other && other.type === 'Literal' && ITEM_TYPES.has(other.value)) itemTypeCompared = true;
            }
          } else if (parent.property === node && parent.computed) {
            // `listModel.__itemIdToModel[p]`
            const owner = parent.object;
            const ownerName = owner.type === 'MemberExpression' && !owner.computed ? owner.property.name : null;
            if (ownerName && /Id(To|s?$)/.test(ownerName)) nameHint('id', 2);
          }
          break;
        case 'SwitchStatement':
          if (parent.discriminant === node) {
            const cases = parent.cases.filter((c) => c.test);
            const strings = cases.every((c) => c.test.type === 'Literal' && typeof c.test.value === 'string');
            const def = parent.cases.find((c) => !c.test);
            const throws = def && def.consequent.some((s) => s.type === 'ThrowStatement');
            if (strings && cases.length && throws) typeHint(cases.map((c) => JSON.stringify(c.test.value)).join(' | '), 5);
            else if (strings && cases.length) typeHint('string', 1);
          }
          break;
        case 'ChainExpression':
          optional = true;
          break;
      }
      if (parent.type === 'MemberExpression' && parent.object === node && parent.optional) optional = true;
      // `typeof p` / `p instanceof X`: the function accepts several types.
      if ((parent.type === 'UnaryExpression' && parent.operator === 'typeof') || (parent.type === 'BinaryExpression' && parent.operator === 'instanceof' && parent.left === node))
        polymorphic = true;
    });
    if (polymorphic) types.clear();

    if (itemTypeCompared) {
      nameHint('model', 2);
      if ([...reads].some((r) => MODEL_ONLY_FIELDS.has(r))) typeHint(ITEM_MODEL_TYPE, 3);
    }
    const best = (m) => {
      let pick = null;
      let weight = 0;
      for (const [k, w] of m) if (w > weight) [pick, weight] = [k, w];
      return pick;
    };
    return { name: best(names), type: best(types), optional };
  }
}

/** If `objectNode` is `dispatch({ type: 'T', ... })`'s argument, return `'T'`. */
function dispatchedActionType(objectNode) {
  if (!objectNode || objectNode.type !== 'ObjectExpression') return null;
  const call = objectNode.parent;
  if (!call || call.type !== 'CallExpression' || call.arguments[0] !== objectNode) return null;
  const callee = call.callee;
  if (callee.type !== 'MemberExpression' || callee.computed || callee.property.name !== 'dispatch') return null;
  const typeProp = objectNode.properties.find((p) => p.type === 'Property' && keyName(p) === 'type');
  return typeProp && typeProp.value.type === 'Literal' ? typeProp.value.value : null;
}

/** `p || (p = default)`: the parameter was optional. */
function isNullishCheckAssignment(assignment) {
  const parent = assignment.parent;
  return parent && parent.type === 'LogicalExpression' && parent.right === assignment;
}

/** `setFooBar(e)` -> `fooBar`. */
function nameFromMethod(methodName) {
  const m = /^_?(?:set|update|toggle|handle)([A-Z]\w*)$/.exec(methodName);
  if (!m) return null;
  const n = m[1][0].toLowerCase() + m[1].slice(1);
  return validName(n) ? n : null;
}

module.exports = { ParamInference, FUNCTION_TYPE, parseFunction, linkParents, boundNames, keyName };

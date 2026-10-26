/**
 * Infer method return types from their source:
 *
 * - literals, operators, template strings, object and array literals
 * - `this.x` -> `this["x"]` (so hand-written refinements of `x` carry over)
 * - `this.m()`, `this.a.b.m()` and bundle function calls -> the callee's
 *   inferred return type
 * - parameters and `const`/`let` locals -> their types
 * - common built-ins (`.join()` -> string, `.indexOf()` -> number, ...)
 *
 * Returns null (meaning `unknown`) as soon as any returned expression can't
 * be typed, so a result is never narrower than what the method can return.
 */
'use strict';

const { FUNCTION_TYPE, parseFunction, linkParents } = require('./param-inference.cjs');

const STRING_METHODS = new Set([
  'join', 'toString', 'toFixed', 'toPrecision', 'trim', 'trimStart', 'trimEnd', 'toLowerCase', 'toUpperCase',
  'replace', 'replaceAll', 'padStart', 'padEnd', 'substring', 'substr', 'charAt', 'repeat', 'toISOString',
  'toLocaleString', 'normalize', 'toDataURL',
]);
const NUMBER_METHODS = new Set(['indexOf', 'lastIndexOf', 'findIndex', 'findLastIndex', 'push', 'unshift', 'charCodeAt', 'getTime', 'localeCompare']);
const BOOLEAN_METHODS = new Set(['includes', 'some', 'every', 'has', 'startsWith', 'endsWith', 'test', 'hasOwnProperty', 'contains', 'matches', 'isPrototypeOf', 'delete']);
const NUMERIC_OPERATORS = new Set(['-', '*', '/', '%', '**', '<<', '>>', '>>>', '&', '|', '^']);
const BOOLEAN_OPERATORS = new Set(['===', '!==', '==', '!=', '<', '>', '<=', '>=', 'instanceof', 'in']);
const MAX_LITERALS = 12;

/** Split a type on top-level `|`. */
function splitUnion(type) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < type.length; i++) {
    const ch = type[i];
    if ('(<{['.includes(ch)) depth++;
    if (')>}]'.includes(ch)) depth--;
    if (ch === '|' && depth === 0) {
      parts.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts.map((p) => (/^\(.*\)$/.test(p) && balanced(p.slice(1, -1)) ? p.slice(1, -1) : p));
}

function balanced(s) {
  let depth = 0;
  for (const ch of s) {
    if ('(<{['.includes(ch)) depth++;
    if (')>}]'.includes(ch)) depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}

/** Union of types, or null if any is unknown. */
function union(types) {
  if (types.some((t) => !t || t === 'unknown')) return null;
  const parts = [...new Set(types.flatMap(splitUnion))];
  let result = parts;
  if (result.includes('string')) result = result.filter((t) => !/^"/.test(t));
  const literals = result.filter((t) => /^"/.test(t));
  if (literals.length > MAX_LITERALS) result = [...result.filter((t) => !/^"/.test(t)), 'string'];
  if (result.includes('false') || result.includes('true')) result = [...result.filter((t) => t !== 'true' && t !== 'false'), 'boolean'];
  if (result.includes('boolean')) result = result.filter((t) => t !== 'true' && t !== 'false');
  // Returning the result of a void call, or nothing: still `void`.
  if (result.length > 1 && result.every((t) => t === 'void' || t === 'undefined')) return 'void';
  if (result.length > 1) result = result.map((t) => (t === 'void' ? 'undefined' : t));
  result = [...new Set(result)];
  if (result.length === 1) return result[0];
  // `T | null | undefined` reads better than `undefined | T`.
  const rank = (t) => (t === 'null' ? 1 : t === 'undefined' ? 2 : 0);
  result.sort((a, b) => rank(a) - rank(b));
  return result.map((t) => (t.includes('=>') ? `(${t})` : t)).join(' | ');
}

function arrayOf(t) {
  if (!t) return 'unknown[]';
  return /^[\w$."[\]]+$/.test(t) ? `${t}[]` : `Array<${t}>`;
}

/** Whether execution can't fall off the end of `stmt`. */
function terminates(stmt) {
  if (!stmt) return false;
  switch (stmt.type) {
    case 'ReturnStatement':
    case 'ThrowStatement':
      return true;
    case 'BlockStatement':
      return stmt.body.length > 0 && stmt.body.some(terminates);
    case 'IfStatement':
      return terminates(stmt.consequent) && terminates(stmt.alternate);
    case 'TryStatement':
      return terminates(stmt.block) && (!stmt.handler || terminates(stmt.handler.body));
    case 'SwitchStatement':
      return (
        stmt.cases.some((c) => !c.test) &&
        stmt.cases.every((c) => c.consequent.length === 0 || c.consequent.some(terminates))
      );
    default:
      return false;
  }
}

/** Visit nodes of a function body, not descending into nested functions. */
function walkBody(root, visit) {
  (function walk(node) {
    if (!node || typeof node.type !== 'string') return;
    if (node !== root && /Function/.test(node.type)) return;
    visit(node);
    for (const k in node) {
      const child = node[k];
      if (Array.isArray(child)) child.forEach((c) => c && typeof c.type === 'string' && walk(c));
      else if (child && typeof child.type === 'string') walk(child);
    }
  })(root);
}

class ReturnInference {
  /**
   * @param {object} options
   * @param {import('./param-inference.cjs').ParamInference} options.params
   * @param {(value: unknown) => string} options.typeOfValue type of a live value ('unknown' if not known)
   */
  constructor({ params, typeOfValue }) {
    this.params = params;
    this.typeOfValue = typeOfValue;
    /** `${thisRef}` -> Map(fn or node -> type) */
    this.cache = { true: new Map(), false: new Map() };
  }

  /** Return type of method `name` of `obj`, or null. With `thisRef`, may use `this[...]` types. */
  methodReturn(obj, name, fn, thisRef = true) {
    const cache = this.cache[thisRef];
    if (cache.has(fn)) return cache.get(fn);
    cache.set(fn, null);
    const node = parseFunction(fn);
    let result = null;
    if (node) {
      const params = this.params.infer(obj, name, fn) || [];
      result = this.functionType(node, { obj, thisRef, location: this.params.locate(fn), params });
    }
    cache.set(fn, result);
    return result;
  }

  methodReturnByName(obj, name, thisRef) {
    let fn;
    for (let p = obj; p && !fn; p = Object.getPrototypeOf(p)) {
      const d = Object.getOwnPropertyDescriptor(p, name);
      if (d && typeof d.value === 'function') fn = d.value;
      else if (d) return null;
    }
    return fn ? this.methodReturn(obj, name, fn, thisRef) : null;
  }

  bundleFunctionReturn(decl) {
    const cache = this.cache.false;
    if (cache.has(decl.node)) return cache.get(decl.node);
    cache.set(decl.node, null);
    const params = this.params.inferBundleFunction({ type: 'Identifier', name: decl.node.id.name }, { ast: decl.ast, pos: decl.node.start }) || [];
    const result = this.functionType(decl.node, { obj: null, thisRef: false, location: { ast: decl.ast, pos: decl.node.start }, params });
    cache.set(decl.node, result);
    return result;
  }

  functionType(node, ctx) {
    linkParents(node);
    if (node.generator) return null;
    ctx = { ...ctx, fnNode: node, paramTypes: new Map() };
    node.params.forEach((p, i) => {
      if (p.type === 'Identifier' && ctx.params[i]) ctx.paramTypes.set(p.name, ctx.params[i].type);
      if (p.type === 'AssignmentPattern' && p.left.type === 'Identifier' && ctx.params[i])
        ctx.paramTypes.set(p.left.name, ctx.params[i].type.replace(/ \| undefined$/, ''));
    });
    let type;
    if (node.expression) {
      type = this.exprType(node.body, ctx, 0);
    } else {
      const returns = [];
      walkBody(node.body, (n) => n.type === 'ReturnStatement' && returns.push(n));
      if (returns.every((r) => !r.argument || (r.argument.type === 'UnaryExpression' && r.argument.operator === 'void'))) {
        type = 'void';
      } else {
        const types = returns.map((r) => (r.argument ? this.exprType(r.argument, ctx, 0) : 'undefined'));
        if (!terminates(node.body)) types.push('undefined');
        type = union(types);
      }
    }
    if (type && node.async) type = type === 'void' ? 'Promise<void>' : `Promise<${type}>`;
    return type;
  }

  /** Live value of a `this.a.b` chain, or undefined. */
  thisPath(node, ctx) {
    if (!ctx.obj) return { ok: false };
    if (node.type === 'ThisExpression') return { ok: true, value: ctx.obj };
    if (node.type !== 'MemberExpression' || node.computed) return { ok: false };
    const base = this.thisPath(node.object, ctx);
    if (!base.ok || base.value === null || typeof base.value !== 'object') return { ok: false };
    // Only data properties; never run getters.
    for (let p = base.value; p; p = Object.getPrototypeOf(p)) {
      const d = Object.getOwnPropertyDescriptor(p, node.property.name);
      if (d) return 'value' in d ? { ok: true, value: d.value } : { ok: false };
    }
    return { ok: false };
  }

  exprType(n, ctx, depth) {
    if (!n || depth > 8) return null;
    const sub = (x) => this.exprType(x, ctx, depth + 1);
    switch (n.type) {
      case 'Literal':
        if (typeof n.value === 'string') return JSON.stringify(n.value);
        if (typeof n.value === 'number') return 'number';
        if (typeof n.value === 'boolean') return 'boolean';
        if (n.value === null) return 'null';
        if (n.regex) return 'RegExp';
        return null;
      case 'TemplateLiteral':
        return 'string';
      case 'UnaryExpression':
        if (n.operator === '!' || n.operator === 'delete') return 'boolean';
        if (n.operator === 'void') return 'undefined';
        if (n.operator === 'typeof') return 'string';
        return 'number';
      case 'UpdateExpression':
        return 'number';
      case 'BinaryExpression':
        if (BOOLEAN_OPERATORS.has(n.operator)) return 'boolean';
        if (NUMERIC_OPERATORS.has(n.operator)) return 'number';
        if (n.operator === '+') {
          const [l, r] = [sub(n.left), sub(n.right)];
          const isStr = (t) => t === 'string' || (t && /^"/.test(t));
          if (isStr(l) || isStr(r)) return 'string';
          if (l === 'number' && r === 'number') return 'number';
        }
        return null;
      case 'LogicalExpression': {
        if (n.operator === '&&') {
          // `a && b` is a falsy value of `a`, or `b`.
          const r = sub(n.right);
          const falsy = r && this.falsyOf(n.left, ctx, depth + 1);
          return falsy ? union([...falsy, r]) : null;
        }
        const [l, r] = [sub(n.left), sub(n.right)];
        if (!l || !r) return null;
        // `a || b`, `a ?? b`: b when a is nullish.
        const left = splitUnion(l).filter((t) => t !== 'undefined' && t !== 'null');
        if (!left.length) return r;
        return union([left.join(' | '), r]);
      }
      case 'ConditionalExpression':
        return union([sub(n.consequent), sub(n.alternate)]);
      case 'SequenceExpression':
        return sub(n.expressions[n.expressions.length - 1]);
      case 'AssignmentExpression':
        return n.operator === '=' ? sub(n.right) : null;
      case 'ChainExpression': {
        const t = sub(n.expression);
        return t && union([t, 'undefined']);
      }
      case 'ParenthesizedExpression':
        return sub(n.expression);
      case 'ArrowFunctionExpression':
      case 'FunctionExpression':
        return FUNCTION_TYPE;
      case 'ThisExpression':
        if (ctx.thisRef && !ctx.inLiteral) return 'this';
        return ctx.obj ? known(this.typeOfValue(ctx.obj)) : null;
      case 'ArrayExpression': {
        if (n.elements.length === 0) return 'unknown[]';
        if (n.elements.some((e) => !e || e.type === 'SpreadElement')) return 'unknown[]';
        // `this` types aren't allowed inside type literals.
        const inner = { ...ctx, inLiteral: true };
        const el = union(n.elements.map((e) => this.exprType(e, inner, depth + 1)));
        return arrayOf(el);
      }
      case 'ObjectExpression': {
        if (depth > 3) return 'Record<string, unknown>';
        const fields = [];
        const inner = { ...ctx, inLiteral: true };
        for (const p of n.properties) {
          if (p.type !== 'Property' || p.computed) return null;
          const k = p.key.type === 'Identifier' ? p.key.name : typeof p.key.value === 'string' ? p.key.value : null;
          if (k === null) return null;
          const name = /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
          const t = p.method ? FUNCTION_TYPE : this.exprType(p.value, inner, depth + 1) || 'unknown';
          // A field that may hold `undefined` is typed as optional, which also accepts a missing key.
          const optional = t === 'unknown' || splitUnion(t).includes('undefined');
          fields.push(`${name}${optional ? '?' : ''}: ${t}`);
        }
        // An empty literal is usually filled in afterwards.
        return fields.length ? `{ ${fields.join('; ')} }` : null;
      }
      case 'NewExpression': {
        const c = n.callee.type === 'Identifier' ? n.callee.name : null;
        if (c === 'Set') return 'Set<unknown>';
        if (c === 'Map') return 'Map<unknown, unknown>';
        if (c === 'Date' || c === 'Error' || c === 'RegExp') return c;
        if (c === 'Promise') return 'Promise<unknown>';
        return null;
      }
      case 'Identifier':
        return this.identifierType(n, ctx, depth);
      case 'MemberExpression':
        return this.memberType(n, ctx, depth);
      case 'CallExpression':
        return this.callType(n, ctx, depth);
      default:
        return null;
    }
  }

  /**
   * The falsy values `node` can have, as types (an empty array if it's
   * always truthy), or null if unknown. An untyped variable or property
   * used as a condition (`x && x.foo`) is a presence check: `undefined`.
   */
  falsyOf(node, ctx, depth) {
    if (node.type === 'LogicalExpression' && node.operator === '&&') {
      const [l, r] = [this.falsyOf(node.left, ctx, depth + 1), this.falsyOf(node.right, ctx, depth + 1)];
      return l && r ? [...l, ...r] : null;
    }
    let type = this.exprType(node, ctx, depth);
    if (type && /^this\[/.test(type)) {
      const path = this.thisPath(node, ctx);
      type = path.ok && path.value !== undefined ? known(this.typeOfValue(path.value)) : null;
    }
    if (!type) return node.type === 'Identifier' || (node.type === 'MemberExpression' && !node.computed) ? ['undefined'] : null;
    const out = [];
    for (const t of splitUnion(type)) {
      if (t === 'boolean' || t === 'false') out.push('false');
      else if (t === 'number') out.push('number');
      else if (t === 'string' || t === '""') out.push('""');
      else if (t === 'undefined' || t === 'void') out.push('undefined');
      else if (t === 'null') out.push('null');
      else if (t === 'true' || /^"./.test(t)) continue;
      else if (t === 'unknown' || t === 'any') return null;
      // Objects, arrays, functions and interfaces are always truthy.
    }
    return out;
  }

  identifierType(n, ctx, depth) {
    if (n.name === 'undefined') return 'undefined';
    if (n.name === 'NaN' || n.name === 'Infinity') return 'number';
    if (ctx.paramTypes.has(n.name)) return known(ctx.paramTypes.get(n.name));
    // A local `const`/`let` that is never reassigned.
    let init = null;
    let declarations = 0;
    let reassigned = false;
    walkBody(ctx.fnNode.body, (x) => {
      if (x.type === 'VariableDeclarator' && x.id.type === 'Identifier' && x.id.name === n.name) {
        declarations++;
        init = x.init;
      }
      if (
        (x.type === 'AssignmentExpression' && x.left.type === 'Identifier' && x.left.name === n.name) ||
        (x.type === 'UpdateExpression' && x.argument.type === 'Identifier' && x.argument.name === n.name)
      )
        reassigned = true;
    });
    if (declarations !== 1 || reassigned || !init) return null;
    return this.exprType(init, ctx, depth + 1);
  }

  memberType(n, ctx, depth) {
    if (n.computed) return null;
    const prop = n.property.name;
    if (prop === 'length') return 'number';
    if (n.object.type === 'ThisExpression' && ctx.obj && ctx.thisRef && !ctx.inLiteral) {
      const own = Object.getOwnPropertyDescriptor(ctx.obj, prop);
      if (own && 'value' in own && typeof own.value !== 'function') return `this[${JSON.stringify(prop)}]`;
    }
    const path = this.thisPath(n, ctx);
    if (path.ok && path.value !== undefined && typeof path.value !== 'function') return known(this.typeOfValue(path.value));
    return null;
  }

  callType(n, ctx, depth) {
    const callee = n.callee;
    if (callee.type === 'Identifier') {
      switch (callee.name) {
        case 'String':
          return 'string';
        case 'Number':
        case 'parseFloat':
        case 'parseInt':
          return 'number';
        case 'Boolean':
        case 'isNaN':
        case 'isFinite':
          return 'boolean';
      }
      if (!ctx.location) return null;
      const decl = this.params.resolve(callee.name, ctx.location.ast, ctx.location.pos);
      return decl ? this.bundleFunctionReturn(decl) : null;
    }
    if (callee.type !== 'MemberExpression') return null;
    if (callee.computed) {
      // __dcg_shared_module_exports__['X'](...)
      if (callee.object.type === 'Identifier' && /^__dcg_\w*exports__$/.test(callee.object.name) && callee.property.type === 'Literal') {
        const exp = this.params.sharedExports.get(callee.property.value);
        const decl = exp && this.params.resolve(exp.name, exp.ast, exp.pos);
        return decl ? this.bundleFunctionReturn(decl) : null;
      }
      return null;
    }
    const method = callee.property.name;
    const obj = callee.object;
    // Static built-ins.
    if (obj.type === 'Identifier') {
      if (obj.name === 'Math') return 'number';
      if (obj.name === 'JSON' && method === 'stringify') return 'string';
      if (obj.name === 'Date' && method === 'now') return 'number';
      if (obj.name === 'Array' && method === 'isArray') return 'boolean';
      if (obj.name === 'Number' && /^is/.test(method)) return 'boolean';
      if (obj.name === 'Object' && method === 'keys') return 'string[]';
      if (obj.name === 'Object' && method === 'values') return 'unknown[]';
      if (obj.name === 'Object' && method === 'entries') return 'Array<[string, unknown]>';
    }
    if (obj.type === 'ThisExpression' && ctx.obj) return this.methodReturnByName(ctx.obj, method, ctx.thisRef && !ctx.inLiteral);
    const path = this.thisPath(obj, ctx);
    if (path.ok && path.value && typeof path.value === 'object') {
      const t = this.methodReturnByName(path.value, method, false);
      if (t) return t;
    }
    if (STRING_METHODS.has(method)) return 'string';
    if (NUMBER_METHODS.has(method)) return 'number';
    if (BOOLEAN_METHODS.has(method)) return 'boolean';
    if (method === 'querySelector' || method === 'closest') return 'Element | null';
    if (method === 'getBoundingClientRect') return 'DOMRect';
    if (method === 'filter' || method === 'slice' || method === 'concat') {
      const t = this.exprType(obj, ctx, depth + 1);
      if (t && /(\[\]|^Array<.*>)$/.test(t)) return t;
      if (method === 'filter') return 'unknown[]';
    }
    if (method === 'map' || method === 'flatMap') return 'unknown[]';
    return null;
  }
}

/** A usable type, or null. `Record<string, unknown>` only says "some object", which typed interfaces don't satisfy. */
function known(t) {
  return !t || t === 'unknown' || t === 'Record<string, unknown>' ? null : t;
}

module.exports = { ReturnInference };

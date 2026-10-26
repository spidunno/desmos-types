/**
 * Runs the shipped transform on a real calculator.js in jsdom and checks that
 * loading it creates no globals and that a calculator works.
 *
 *   npm run build && npm run test:runtime -- path/to/calculator.js
 *
 * jsdom can't `import()` a blob: URL, so the 'module' output is checked by
 * running the same code as a strict-mode function body (ES modules are
 * always strict).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const bundlePath = process.argv[2];
if (!bundlePath) {
  console.error('Usage: npm run test:runtime -- path/to/calculator.js');
  process.exit(2);
}

function makeWindow() {
  const dom = new JSDOM('<!doctype html><div id="calc"></div>', { runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.structuredClone = structuredClone;
  w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  w.HTMLCanvasElement.prototype.getContext = function () {
    return new Proxy({}, { get: (_t, k) => (k === 'measureText' ? () => ({ width: 1 }) : typeof k === 'string' ? () => {} : undefined), set: () => true });
  };
  w.console.warn = () => {};
  return w;
}

(async () => {
  const { transformSource } = await import(path.join(__dirname, '..', 'dist', 'core.js').replace(/^([A-Za-z]):/, 'file:///$1:'));
  const code = fs.readFileSync(bundlePath, 'utf8');
  let failed = false;

  for (const evaluate of ['function', 'module']) {
    const w = makeWindow();
    let body = transformSource(code, evaluate);
    if (evaluate === 'module') body = '"use strict";\n' + body.replace(/;export default module\.exports;/, ';return module.exports;');
    const before = new Set(Object.getOwnPropertyNames(w));
    const api = w.eval(`(function () {\n${body}\n})`)();
    const leaked = Object.getOwnPropertyNames(w).filter((k) => !before.has(k));
    const calc = api.GraphingCalculator(w.document.getElementById('calc'));
    calc.setExpression({ id: 'a', latex: 'y=x^2' });
    await new Promise((r) => setTimeout(r, 300));
    const sketches = Object.keys(calc.controller.grapher2d.graphSketches).length;
    const ok = leaked.length === 0 && typeof api.version === 'string' && sketches === 1;
    failed ||= !ok;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${evaluate}: version ${api.version}, globals added ${JSON.stringify(leaked)}, sketches ${sketches}`);
  }

  try {
    transformSource('window.Desmos = {};', 'function');
    console.log('FAIL bundle without hooks was accepted');
    failed = true;
  } catch (e) {
    console.log(`ok   bundle without hooks rejected: ${e.message}`);
  }
  process.exit(failed ? 1 : 0);
})();

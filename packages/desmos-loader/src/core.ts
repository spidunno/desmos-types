/**
 * Loads calculator.js without letting it create globals. The bundle is
 * fetched as text, a small prelude is added, and the result runs in its own
 * scope:
 *
 * - `module`: the bundle has a CommonJS branch that puts the API on
 *   `module.exports` instead of `window.Desmos`.
 * - `noGlobal`: the bundled jQuery skips `window.jQuery` / `window.$` when
 *   this is defined.
 * - Two explicit `window.x = …` writes are redirected to a private object.
 */

/** The Desmos API version this package loads (and its major.minor version). */
export const DESMOS_VERSION = 'v1.13';

interface CommonOptions {
  /**
   * How to run the bundle:
   *
   * - `'function'` (default): with `new Function`. Needs `'unsafe-eval'`,
   *   which Desmos needs anyway because it compiles expressions with
   *   `new Function`.
   * - `'module'`: as an ES module from a `blob:` URL. The page's
   *   Content-Security-Policy must allow `blob:` in `script-src`, and some
   *   bundlers need help leaving the dynamic `import()` alone.
   */
  evaluate?: 'module' | 'function';
}

/** Options for `loadDesmos`. */
export type LoadDesmosOptions = CommonOptions &
  (
    | {
        /** Your Desmos API key. */
        apiKey: string;
        url?: undefined;
      }
    | {
        /** Load calculator.js from this URL (a mirror or a self-hosted copy) instead of desmos.com. */
        url: string;
        apiKey?: undefined;
      }
  );

/** Every global calculator.js creates when loaded as a script. */
const BUNDLE_GLOBALS = ['Desmos', 'jQuery', '$', '_touchtracking_id_counter', 'dcgTestOnlyFetchMonitor'];
/** Globals the bundle writes as `window.<name> = …`, redirected to a private object. */
const WINDOW_WRITES = ['_touchtracking_id_counter', 'dcgTestOnlyFetchMonitor'];

/**
 * The most recently loaded API. Typed in the generated declarations as the
 * full `Desmos` namespace.
 */
export let Desmos: unknown;

/**
 * Wrap calculator.js so that it creates no globals. For `'module'` the result
 * is an ES module whose default export is the API; for `'function'` it is a
 * function body that returns it. Throws if the bundle no longer has the
 * hooks this relies on.
 */
export function transformSource(code: string, evaluate: 'module' | 'function'): string {
  if (!/\bmodule\.exports\s*=\s*_Desmos\b/.test(code))
    throw new Error('calculator.js has no CommonJS export; it would create a global `Desmos`.');
  if (!/typeof noGlobal\s*[!=]==?\s*["']undefined["']/.test(code))
    throw new Error('calculator.js has no jQuery `noGlobal` check; it would create `window.jQuery`.');
  for (const name of WINDOW_WRITES) code = code.split(`window.${name}`).join(`__desmosPrivate.${name}`);
  const prelude = 'var module = { exports: {} }, noGlobal = true, __desmosPrivate = {};\n';
  const end = evaluate === 'module' ? 'export default module.exports;' : 'return module.exports;';
  return `${prelude}${code}\n;${end}\n//# sourceURL=desmos-calculator-${DESMOS_VERSION}.js\n`;
}

async function run(code: string, evaluate: 'module' | 'function'): Promise<unknown> {
  const source = transformSource(code, evaluate);
  if (evaluate === 'function') return new Function(source)();
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  try {
    const mod = await import(/* webpackIgnore: true */ /* @vite-ignore */ url);
    return mod.default;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Fetch calculator.js, run it without creating globals, and return the
 * `Desmos` API object. Also sets this package's `Desmos` export.
 *
 * Each call loads a separate copy, so call it once and share the result.
 */
export async function loadDesmos(options: LoadDesmosOptions): Promise<unknown> {
  if (typeof window === 'undefined' || typeof document === 'undefined')
    throw new Error('loadDesmos needs a browser: calculator.js uses window and document.');
  const url =
    options.url ??
    `https://www.desmos.com/api/${DESMOS_VERSION}/calculator.js?apiKey=${encodeURIComponent(options.apiKey)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch calculator.js: HTTP ${response.status}`);
  const code = await response.text();

  const present = new Set(BUNDLE_GLOBALS.filter((name) => name in window));
  const api = await run(code, options.evaluate ?? 'function');
  const leaked = BUNDLE_GLOBALS.filter((name) => !present.has(name) && name in window);
  if (leaked.length) console.warn(`@spidunno/desmos-loader: calculator.js still created globals: ${leaked.join(', ')}`);

  if (!api || typeof (api as { GraphingCalculator?: unknown }).GraphingCalculator !== 'function')
    throw new Error('calculator.js loaded, but did not export the Desmos API.');
  Desmos = api;
  return api;
}

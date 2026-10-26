# @spidunno/desmos-loader

Loads the [Desmos API](https://www.desmos.com/api/v1.13/docs/index.html) v1.13 without creating
any globals, and gives you a fully typed `Desmos` to import.

Normally `calculator.js` is added with a `<script>` tag, which creates `window.Desmos` (plus
`window.jQuery`, `window.$` and a couple of others). This package fetches the script instead, runs it
in its own scope, and hands you the API. The calculator still runs in your page, so its CSS,
events and focus work as usual, and you can style it like any other element.

## Install

```sh
npm install @spidunno/desmos-loader@~1.13.1
```

The version's major.minor is the Desmos API version it loads (`1.13.x` loads v1.13). The patch
number is for fixes to this package. A tilde range keeps you on v1.13.

The types are included: they come from
[`@spidunno/desmos-types`](https://www.npmjs.com/package/@spidunno/desmos-types), copied in at build
time, so you don't need to install that package.

## Recommended usage

Call `loadDesmos` once, in a module of its own, and export `Desmos` from it:

```ts
// desmos.ts
import { loadDesmos, Desmos } from '@spidunno/desmos-loader';

await loadDesmos({ apiKey: 'YOUR_API_KEY' });

export { Desmos };
```

Then import `Desmos` from that module anywhere else in your code:

```ts
// graph.ts
import { Desmos } from './desmos';

const calculator: Desmos.GraphingCalculator = Desmos.GraphingCalculator(element, { keypad: false });
calculator.setExpression({ id: 'a', latex: 'y=x^2' });
```

`Desmos` works both as the API object (`Desmos.GraphingCalculator(...)`) and as a namespace of types
(`Desmos.GraphingCalculator`, `Desmos.GraphState`, ...), the same as with the global script.

The `await` at the top level of `desmos.ts` is what makes this work: any module that imports
`desmos.ts` waits until the API has loaded before it runs, so `Desmos` is always ready when you use
it. Top-level `await` needs an ES2022 target, which every current bundler supports.

`Desmos` is `undefined` until `loadDesmos` resolves. You only see that if you use it from code that
doesn't import the module that awaits `loadDesmos`.

### Internals

For the internals types (`calculator.controller`, graph sketches, `Desmos.Private`, ...), import
from `@spidunno/desmos-loader/internals` instead. It loads the same code; only the types differ.

```ts
// desmos.ts
import { loadDesmos, Desmos } from '@spidunno/desmos-loader/internals';

await loadDesmos({ apiKey: 'YOUR_API_KEY' });

export { Desmos };
```

See the [`@spidunno/desmos-types` README](https://www.npmjs.com/package/@spidunno/desmos-types#internals)
for what is typed and how.

## Options

```ts
loadDesmos({ apiKey: 'YOUR_API_KEY' });                     // from desmos.com
loadDesmos({ url: '/vendor/calculator.js' });               // from your own copy or a mirror
loadDesmos({ apiKey: 'YOUR_API_KEY', evaluate: 'module' }); // see below
```

`evaluate` chooses how the fetched code runs:

| Value | How | Content-Security-Policy needs |
| --- | --- | --- |
| `'function'` (default) | With `new Function` | `'unsafe-eval'` in `script-src` |
| `'module'` | As an ES module, imported from a `blob:` URL | `blob:` in `script-src` |

Desmos itself compiles expressions with `new Function`, so a page that runs Desmos at all already
needs `'unsafe-eval'`: the default never needs more than Desmos does, and works the same in every
browser and bundler. `'module'` is there if you'd rather load the code as a module, for example to
see it as a separate script in your browser's devtools.

`loadDesmos` returns the API too (`const api = await loadDesmos(...)`), and also sets the `Desmos`
export. Each call fetches and runs a separate copy, so call it once.

## How it avoids globals

`calculator.js` creates its globals in three ways, and the loader gives each one somewhere else to go:

- **`Desmos`:** the bundle has a CommonJS branch that puts the API on `module.exports` when a
  `module` object exists. The loader provides one.
- **`jQuery` and `$`:** the bundled jQuery doesn't set them when a `noGlobal` variable is defined.
  The loader defines one.
- **`_touchtracking_id_counter` and `dcgTestOnlyFetchMonitor`:** the bundle writes these as
  `window.<name> = …`. The loader rewrites those two writes to a private object.

If a future `calculator.js` drops either hook, `loadDesmos` throws instead of silently creating
globals. If it finds a new global after loading anyway, it logs a warning naming it.

One thing remains: once a calculator binds events to `window`, jQuery stores its event data in a
non-enumerable, randomly named property on `window` (`jQuery3600…`). It doesn't appear in
`Object.keys(window)` and can't clash with anything.

Things that aren't JavaScript globals are unchanged: the calculator adds its stylesheet to
`document.head` (every rule is scoped under `.dcg-calculator-api-container-v1_13`), and listens for
events on `document` and `window`, as it does when loaded with a script tag.

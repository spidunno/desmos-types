# desmos-types monorepo

| Package | Description |
| --- | --- |
| [`packages/desmos-types`](packages/desmos-types) | `@spidunno/desmos-types`: TypeScript types for the Desmos API v1.13, plus opt-in internals. Published to npm. |
| [`packages/desmos-loader`](packages/desmos-loader) | `@spidunno/desmos-loader`: loads the Desmos API without creating globals, typed with the types above. Published to npm. |
| [`packages/playground`](packages/playground) | A private Vite app that uses the types against the real API. Never published. |

## Setup

```sh
npm install
cp packages/playground/.env.example packages/playground/.env.local   # then add your API key
```

## Scripts (from the root)

| Command | What it does |
| --- | --- |
| `npm test` | Type-checks the types package's tests, builds and type-checks the loader, and type-checks the playground |
| `npm run dev` | Starts the playground at http://localhost:5173 |
| `npm run generate:internals -- path/to/calculator.js` | Regenerates `packages/desmos-types/internals/generated` |
| `npm run release` | Publishes each package whose version isn't on npm yet (see [Publishing](#publishing)) |

The playground depends on the types through the workspace, so edits in `packages/desmos-types`
are picked up immediately, with no build or link step.

## Publishing

Bump the `version` of each package you changed, then from the root:

```sh
npm run release -- --dry-run   # list what would be published
npm run release                # publish it
```

`release` publishes every public package whose current version isn't on npm yet, and skips the
rest (and the private playground). It publishes dependencies first, so the types go out before the
loader, which copies their declarations when it builds. It stops at the first failure. Any other
arguments go to `npm publish`, e.g. `npm run release -- --otp=123456`.

Plain `npm publish` at the root doesn't work: the root package is private.

`npm run test:runtime -w @spidunno/desmos-loader -- path/to/calculator.js` checks that the loader's
transform runs a real bundle in jsdom without creating globals.

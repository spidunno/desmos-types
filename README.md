# desmos-types monorepo

| Package | Description |
| --- | --- |
| [`packages/desmos-types`](packages/desmos-types) | `@spidunno/desmos-types`: TypeScript types for the Desmos API v1.13, plus opt-in internals. Published to npm. |
| [`packages/playground`](packages/playground) | A private Vite app that uses the types against the real API. Never published. |

## Setup

```sh
npm install
cp packages/playground/.env.example packages/playground/.env.local   # then add your API key
```

## Scripts (from the root)

| Command | What it does |
| --- | --- |
| `npm test` | Type-checks the types package's tests and the playground |
| `npm run dev` | Starts the playground at http://localhost:5173 |
| `npm run generate:internals -- path/to/calculator.js` | Regenerates `packages/desmos-types/internals/generated` |

The playground depends on the types through the workspace, so edits in `packages/desmos-types`
are picked up immediately, with no build or link step.

## Publishing

```sh
cd packages/desmos-types
npm publish
```

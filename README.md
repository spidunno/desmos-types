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

## Automatic releases

[`.github/workflows/release.yml`](.github/workflows/release.yml) does two things:

- **Every hour** (or when run by hand from the Actions tab), it downloads the v1.13 `calculator.js`
  and runs `npm run update:bundle` on it. When `Desmos.commit` has changed, it regenerates the
  internal types and runs the tests:
  - If they pass, it commits a new patch version of `@spidunno/desmos-types` to `master` and
    publishes it.
  - If they fail, it opens a pull request (branch `desmos/<commit>`) with the regenerated types
    and the compiler errors, and publishes nothing. Fix the hand-written types on that branch and
    merge it.
- **On every push to `master`**, it runs the tests and `npm run release`, so anything whose
  version isn't on npm yet is published. That covers merged update pull requests and versions
  bumped by hand.

It needs, once:

1. **A `DESMOS_API_KEY` secret** (Settings → Secrets and variables → Actions → New repository
   secret).
2. **Pull requests from Actions allowed** (Settings → Actions → General → Workflow permissions:
   "Read and write permissions" and "Allow GitHub Actions to create and approve pull requests").
3. **A trusted publisher on npm for each package** (on npmjs.com, the package's Settings →
   Trusted Publisher → GitHub Actions): owner `spidunno`, repository `desmos-types`, workflow
   `release.yml`. No npm token is stored anywhere.

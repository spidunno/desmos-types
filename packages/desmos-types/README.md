# @spidunno/desmos-types

TypeScript type definitions for the [Desmos API v1.13](https://www.desmos.com/api/v1.13/docs/index.html):
the graphing calculator, geometry tool, 3D calculator, and the four-function and scientific calculators.

## Install

```sh
npm install --save-dev @spidunno/desmos-types@~1.13.2
```

The package's major and minor version match the Desmos API version it describes; patch releases
are fixes to the types. Use a tilde range (`~1.13.2`), not npm's default caret (`^`), so you only
get type fixes for the API version you load.

## Usage

Load the API as usual:

```html
<script src="https://www.desmos.com/api/v1.13/calculator.js?apiKey=YOUR_API_KEY"></script>
```

Then make the types visible to TypeScript, in one of two ways:

```jsonc
// tsconfig.json
{ "compilerOptions": { "types": ["@spidunno/desmos-types"] } }
```

```ts
/// <reference types="@spidunno/desmos-types" />
```

That declares the global `Desmos` namespace (also available as `window.Desmos`):

```ts
const calculator = Desmos.GraphingCalculator(document.getElementById('calculator')!, {
  keypad: false,
});

calculator.setExpression({ id: 'm', latex: 'm=2', sliderBounds: { min: 1, max: 10, step: 1 } });

calculator.observeEvent('change.autosave', (_name, event) => {
  if (event.isUserInitiated) save(calculator.getState());
});
```

To use the types from a module, import them with `import type`. There is no runtime module:
the API only exists as the global that `calculator.js` creates.

```ts
import type { GraphingCalculator, GraphState } from '@spidunno/desmos-types';
```

## Layout

| File | Contents |
| --- | --- |
| `index.d.ts` | Entry point: references every file below and exports the namespace |
| `types/common.d.ts` | Shared primitives (`Latex`, `HexColor`, …) and the `Observable` mechanism |
| `types/enums.d.ts` | `Colors`, `Styles`, `DragModes`, `AxisArrowModes`, `LabelOrientations`, … |
| `types/options/graphing.d.ts` | Graphing/geometry/3D constructor options, graph settings, the `settings` object |
| `types/options/basic.d.ts` | Four-function and scientific calculator options |
| `types/expressions.d.ts` | `setExpression()` input, `getExpressions()` output, `expressionAnalysis` |
| `types/state.d.ts` | Serialized states and `setState()` / `setBlank()` options |
| `types/coordinates.d.ts` | Bounds, coordinate conversion, screenshot options |
| `types/calculators/base.d.ts` | API shared by graphing, geometry and 3D (`GraphingCalculatorBase`) |
| `types/calculators/graphing.d.ts` | `GraphingCalculator` (and its alias `Calculator`) |
| `types/calculators/geometry.d.ts` | `Geometry` |
| `types/calculators/calculator3d.d.ts` | `Calculator3D` |
| `types/calculators/basic.d.ts` | `FourFunctionCalculator`, `ScientificCalculator` |
| `types/calculators/helper-expression.d.ts` | `HelperExpression` |
| `types/abraham.d.ts` | The bundled Abraham LaTeX ↔ Braille library |
| `types/mathquill.d.ts` | The bundled MathQuill fork |
| `types/desmos.d.ts` | `enabledFeatures`, `supportedLanguages`, `imageFileToDataURL`, `version`, `Window.Desmos` |
| `internals/` | Opt-in internals (see [Internals](#internals)); `internals/generated/` is generated |
| `scripts/extract-internals.cjs` | Regenerates `internals/generated/` from a bundle |

## Sources and conventions

The types follow the official v1.13 documentation and were checked against the
`calculator.js` bundle itself (build `v1.13-prerelease`, commit `c2616b67`).

Members marked `@remarks Undocumented` exist in the bundle but not in the docs. Examples are the
3D camera methods (`getOrientation`, `setOrientation`, `animateToOrientation`,
`setPerspectiveDistortion`), `LabelSizes`, the extra `LabelOrientations`, and `MathQuill`.
They work in v1.13 but Desmos makes no promises about them.

`Abraham` follows its own [documentation page](https://www.desmos.com/api/v1.13/docs/abraham.html).
Desmos asks that you contact partnerships@desmos.com before using it.

Internal exports are not part of the public types. `Desmos.Private` and the calculators' internal
members are typed separately (see [Internals](#internals)). `Desmos.TestInternal`, `Desmos.config` and
`Desmos.$` aren't typed at all.

### Where the runtime differs from the docs

- `Desmos.Colors.GREEN` is `#348543`, not the documented `#388c46`. The palette still cycles through `#388c46` for new items.
- `asyncScreenshot()` without a `mode` uses `'preserveX'` when the axes are square and `'stretch'` otherwise, not the documented `'contain'`.
- On `Calculator3D`, `asyncScreenshot()` always throws, and `mathToPixels` / `pixelsToMath` are `undefined`. The types leave all three out.
- `substitutions`, `regressionTemplates`, `intervalComprehensions` and `recursion` are accepted as options but never appear on `calculator.settings`.
- `setMathBounds()` also accepts `{ xmin, xmax, ymin, ymax }`, plus `zmin` / `zmax` on 3D.

## Internals

For mods that reach into the calculator (DesModder-style), there's a separate opt-in entry point
covering the controller, item models, dispatcher actions, DCGView and `Desmos.Private`:

```ts
/// <reference types="@spidunno/desmos-types/internals" />
// or: "types": ["@spidunno/desmos-types/internals"] in tsconfig.json
// or: import type { Internals } from '@spidunno/desmos-types/internals';

const ctl = calculator.controller;

for (const model of ctl.getAllItemModels()) {
  if (model.type === 'expression' && model.sliderExists) console.log(model.slider.isPlaying);
}

ctl.dispatcher.register((action) => {
  if (action.type === 'set-item-latex') console.log(action.id, action.latex);
});

ctl.dispatch({ type: 'set-item-latex', id: 'a', latex: 'y=x^2' });
```

Including it also adds `controller`, `_calc`, `withControllerInAPIMode` and the other internal members
to the public calculator types, and declares `Desmos.Private`. Without it, none of that is visible.

Everything here is internal to Desmos and changes between builds, even within v1.13.

### How the internals are typed

| Layer | Files | Source |
| --- | --- | --- |
| Generated | `internals/generated/objects.d.ts` | The bundle loaded in jsdom; 58 internal objects walked |
| Generated | `internals/generated/actions.d.ts` | Every `dispatch({ type })` call site and `switch (action.type)` reducer, found with acorn. Each of the 341 actions is attributed to the reducer(s) that handle it, giving three unions: `Action` (graph controller), `MathFieldAction` and `BasicCalculatorAction` |
| Generated | `internals/generated/views.d.ts` | Props and instance members of the 13 `Private.Fragile` views, from live instances (about 1,400 views rendered), call sites and prop reads, following `{...props}` forwarding into inner views |
| Hand-written | `internals/*.d.ts` | Precise types for the parts mods use, checked against the bundle source |

In the generated layer, property types come from observed values. A method's return type comes from
static analysis of its source (nothing returned → `void`, only booleans returned → `boolean`), or from
calling side-effect-free getters such as `get*` and `is*`. Anything that couldn't be determined is
`unknown`, and parameters are `unknown` because the bundle is minified. Action payload field names are
reliable, but their value types are often inferred from the field name.

The hand-written interfaces *extend* the generated ones (`Internals.Controller extends
Generated.Controller`, and so on). TypeScript therefore checks every hand-written type against what
the bundle actually contains: if Desmos changes a field, the build fails rather than silently
being wrong.

What's hand-typed:

- **Controller:** dispatch, item lookup, selection, focus (`FocusLocation` has every variant in the
  bundle), state, toasts, subscriptions, localization.
- **Item models:** `ExpressionModel`, `TableModel`, `TableColumnModel`, `FolderModel`, `TextModel`,
  `ImageModel` and `TickerModel` as a discriminated union (`ItemModel`), plus `ListModel`.
- **Actions:** `Action` is the full union. About 25 common actions have checked payloads, and
  `ActionOfType<'set-item-latex'>` picks one.
- **Dispatcher:** `register`, `unregister`, `waitFor`, generic over the action type.
- **Other controllers:** each math field (`mathField.controller`) and each basic calculator
  (`calculator.controller`) has its own controller and dispatcher. Keystrokes in a math field are
  `MathFieldAction`s, so `arrow-up-down` is accepted by `mathField.controller.dispatch()` and rejected
  by the graph controller's.
- **DCGView:** `Class` (subclass it with typed props), `createElement`, `const`, `mountToNode`,
  and the `For`/`If`/`Switch`/`IfElse`/`SwitchUnion`/`Input` components.
- **`Private.Fragile` views:** all 13 (`ExpressionView`, `ExpressionIconView`, `ExpressionFooterView`,
  `ExpressionOptionsMenuView`, `ImageIconView`, `PromptSliderView`, `MathquillView`,
  `InlineMathInputView`, `StaticMathquillView`, `Checkbox`, `SegmentedControl`, `Tooltip`,
  `DropdownPopoverWithAnchorShim`). `createElement` checks their props, and each class's `prototype`
  is typed with its own methods, so patches like this are checked:

  ```ts
  const { ExpressionView } = Desmos.Private.Fragile;
  const template = ExpressionView.prototype.template;
  ExpressionView.prototype.template = function () {
    console.log(this.props.model().latex, this.isReadonly());
    return template.call(this);
  };
  ```

- **`Private.Fragile` helpers:** `evaluateLatex`, `parseLatexToGroup` (with a typed syntax tree),
  `getReconciledExpressionProps`, `currentLanguage`, `manageFocusHelper` / `mathquillFocusHelper`,
  and `List`.

### Regenerating for a new bundle

```sh
curl -o calculator.js "https://www.desmos.com/api/v1.13/calculator.js?apiKey=YOUR_API_KEY"
npm run generate:internals -- calculator.js
npm test
```

The generator executes the bundle inside jsdom, so only run it on a bundle from desmos.com.
If `npm test` fails afterwards, the bundle changed in a way that contradicts a hand-written type.
The error names the field.

## Testing

```sh
npm install
npm test
```

`test/global-usage.ts` and `test/module-usage.ts` must compile. Each line in `test/errors.ts` is
preceded by `// @ts-expect-error`, so the build fails if any of that misuse type-checks.
`test/internals-usage.ts` covers the internals and is compiled separately (`tsconfig.internals.json`),
which keeps the public types proven to work on their own.

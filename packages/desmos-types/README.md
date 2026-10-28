# @spidunno/desmos-types

TypeScript type definitions for the [Desmos API v1.13](https://www.desmos.com/api/v1.13/docs/index.html):
the graphing calculator, geometry tool, 3D calculator, and the four-function and scientific calculators.

## Install

```sh
npm install --save-dev @spidunno/desmos-types@~1.13.17
```

The package's major and minor version match the Desmos API version it describes; patch releases
are fixes to the types. Use a tilde range (`~1.13.17`), not npm's default caret (`^`), so you only
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

### Without a global

Importing from `@spidunno/desmos-types` (or `/internals`) still declares the global `Desmos`, so
code that uses the global type-checks even when the program never loaded `calculator.js` as a
script. If you load the API some other way, for example into a scope of your own so that
`window.Desmos` never exists, use the module-only entry points instead. They declare the same
types, but nothing global:

```ts
import type { Desmos } from '@spidunno/desmos-types/module'; // or '/module/internals'

async function loadDesmos(): Promise<typeof Desmos> {
  /* ... */
}

const api = await loadDesmos();
const calculator: Desmos.GraphingCalculator = api.GraphingCalculator(element);
```

`Desmos` is a type-only export, since the package contains no JavaScript: using it as a value is a
compile error, and editors auto-import it with `import type` (or with a plain import that
TypeScript removes, unless `verbatimModuleSyntax` is on). Don't also include the default entry
points (in `compilerOptions.types` or a `/// <reference>`), or the global comes back.

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
| `module/` | Module-only copies of `index.d.ts` and `internals/index.d.ts` (see [Without a global](#without-a-global)), built by `npm run build:module` |
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
- The calculator accepts many options the docs don't mention, such as `complex`, `restrictGridToFirstQuadrant` and `advancedStyling`. All of them are typed (as `UndocumentedGraphingCalculatorConfig`, `InternalGraphingCalculatorOptions` and the undocumented members of `GraphSettings`), along with the deprecated aliases (`menus`, `solutions`, ...), which are marked `@deprecated`.
- `substitutions`, `regressionTemplates`, `intervalComprehensions`, `recursion` and the internal and deprecated options are accepted but never appear on `calculator.settings`.
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
| Generated | `internals/generated/objects.d.ts` | The bundle loaded in jsdom; 60 internal objects walked |
| Generated | `internals/generated/actions.d.ts` | Every `dispatch({ type })` call site and `switch (action.type)` reducer, found with acorn. Each of the 341 actions is attributed to the reducer(s) that handle it, giving three unions: `Action` (graph controller), `MathFieldAction` and `BasicCalculatorAction` |
| Generated | `internals/generated/views.d.ts` | Props and instance members of the 13 `Private.Fragile` views, from live instances (about 1,400 views rendered), call sites and prop reads, following `{...props}` forwarding into inner views |
| Hand-written | `internals/*.d.ts` | Precise types for the parts mods use, checked against the bundle source |

In the generated layer, property types come from observed values. A method's return type comes from
calling side-effect-free getters such as `get*` and `is*`, or from what its source returns: literals,
operators, object literals, `this.x` (typed as `this["x"]`, so refinements of `x` carry over), and
calls to other methods and bundle functions, whose return types are inferred the same way. A return
type stays `unknown` if any returned value can't be typed. Anything that couldn't be determined is
`unknown`. Action payload field names are reliable, but their value types are often inferred from the
field name.

The bundle is minified, so parameter names are recovered from how each method uses them:
`this.x = p` and `{ x: p }` name it `x`, `dispatch({ type, x: p })` also copies the action field's
type, and passing `p` to another method or bundle function (`this.getItemModel(p)`) reuses that
function's inferred name and type. Defaults, arithmetic, exhaustive `switch`es and `.type`
comparisons give types (`id: string`, `index: number`, `'selected' | 'tentatively-selected'`, item
models). A parameter is optional if it has a default, is checked against `undefined`, or some call
in the bundle leaves it out. What can't be recovered stays `argN: unknown`. A property is optional if it
held `undefined` or was added after the calculator loaded (for example, by the first animation frame
or a UI interaction).

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
- **Graph sketches** (`controller.grapher2d.graphSketches`): one `GraphSketch` per graphed
  expression, holding `GraphBranch`es as a union over the 20 branch modes the 2D grapher
  draws (`BranchModes` names them). Each mode's `segments` layout is typed: flat `[x, y, …]`
  for most curves, `[y, x, …]` for `x = f(y)`, `[θ, r, …]` for polar, `[x, y]` tuples for
  points, and fixed tuples like `[cx, cy, r]` for geometry objects. Also covered: points of
  interest (`POI`, `POITypes`), sketch labels, movable points and the grapher's sketch methods.
  A fixture of 60 real sketches (`test/fixtures/graph-sketches.ts`) is type-checked against
  these types.
- **The rest of `grapher2d`:** the projection (math ↔ pixel conversion, with linear and log axes),
  `Viewport`, the viewport controller (jump, animate, zoom, pan), `GrapherSettings` (every graph
  and drawing setting, with typed `observe` / `getProperty` / `setProperty`), the `'redraw'`
  event, draw layers, graph images, screenshots and grapher state.
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

### Graph sketches

`controller.grapher2d.graphSketches` holds what the 2D grapher draws, keyed by expression id. Each
sketch has `branches`, and each branch has a numeric `branchMode` that tells you what it is and
how to read its `segments`. One expression often produces several branches: one per list element,
boundary curves plus a fill for an inequality, an outline plus a fill for a polygon.

The examples below are plain JavaScript, so you can paste them into the browser console. On
desmos.com the calculator is the global `Calc`; in your own page it's whatever you called
`Desmos.GraphingCalculator(...)`. desmos.com runs the same v1.13 line, but it is redeployed
continuously, so an internal field can change before these types are regenerated.

```js
// Every branch of every sketch, with its mode
for (const [id, sketch] of Object.entries(Calc.controller.grapher2d.graphSketches)) {
  console.log(id, sketch.branches.map((b) => b.branchMode));
}
```

#### Branch modes

| Mode | Name | Drawn for | `segments` | Other notable fields |
| ---: | --- | --- | --- | --- |
| 1 | X | `x = f(y)`, `x` inequalities | flat `[y0, x0, y1, x1, …]` (**y first**) | `operator`, `compiled`, `poi` |
| 2 | Y | `y = f(x)`, `y` inequalities, distributions, solvable implicit equations | flat `[x0, y0, x1, y1, …]` | `operator`, `compiled`, `poi`, `boundingBox` |
| 3 | XYPOINT | points, point lists, dot plots | arrays of `[x, y]` | `labels`, `pointSize`, `pointOpacity`, `showLabel` |
| 4 | XYPOINT_MOVABLE | draggable points | arrays of `[x, y]` | `movablePointInfo` |
| 5 | PARAMETRIC | parametrics, point-list and table lines, polygon outlines, box plots | flat `[x0, y0, …]` | `compiled`, `tableId` |
| 6 | POLAR | `r = f(θ)`, polar inequalities | flat `[θ0, r0, θ1, r1, …]` (**polar**) | `sampledDomain` |
| 7 | POLYGONFILL | inequality shading, polygon and parametric fills, histogram bars | flat `[x0, y0, …]` polygons (empty for inequality shading) | `fillOpacity` |
| 8 | IMPLICIT | implicit curves | flat `[x0, y0, …]` | `compiled` |
| 15 | ERROR | an expression that failed while graphing | `[]` | `error` (`{ key, vars }`) |
| 17 | SEGMENT | `segment` | `[x1, y1, x2, y2]` | `arrowMode` |
| 18 | LINE | `line` | `[x1, y1, x2, y2]`: two points on the line | `arrowMode` |
| 19 | RAY | `ray` | `[startX, startY, throughX, throughY]` | `arrowMode` |
| 20 | CIRCLE | `circle` | `[cx, cy, r]` | |
| 21 | ARC | `arc` | `[cx, cy, r, startAngle, endAngle]` | |
| 22 | LABEL | label of a segment, polygon or angle | placement data | `labels` (text), `objectType` (17, 16 or 23) |
| 23 | ANGLE_MARKER | `angle`, `directedangle` | `[vx, vy, startAngle, angle, directed]` | |
| 24 | VECTOR | `vector` | `[tailX, tailY, headX, headY]` | `arrowMode` |
| 25 | COMPLEX_NUMBER | complex numbers in complex mode | arrays of `[re, im]` | like XYPOINT |
| 26 | COMPLEX_NUMBER_MOVABLE | draggable complex numbers | arrays of `[re, im]` | `movablePointInfo` |
| 27 | IMAGE | images | `[]` | `dimensions` (`x`, `y`, `width`, `height`, `radianAngle`, `opacity`) |

Modes 17–24 only appear in the geometry tool. Angles are in radians. In each row, `segments` is a
list of these: a curve broken at discontinuities has several flat arrays, and a list of circles has
several `[cx, cy, r]` entries. In TypeScript, hovering `branchMode` shows this table, and comparing
it to a number (`branch.branchMode === 20`) narrows the branch to that mode's type.

#### Points of interest

`sketch.getPOI()` returns the points of interest the grapher shows when an expression is selected.
`poi.type` is:

| Type | Meaning | Comes from |
| ---: | --- | --- |
| 1001 | intersection | `X` / `Y` branches |
| 1002 | zero (root) | `X` / `Y` branches |
| 1003 | axis intercept | `X` / `Y` branches |
| 1004 | extremum | `X` / `Y` branches |
| 1006 | plotted point without a visible label | point branches |
| 1008 | labeled point, or a geometry label's anchor | point branches, labels |

#### Examples

```js
const sketches = Calc.controller.grapher2d.graphSketches;

// Turn any curve branch into a list of {x, y} points, handling the modes
// whose coordinates aren't (x, y)
function curvePoints(branch) {
  const points = [];
  for (const flat of branch.segments) {
    for (let i = 0; i < flat.length; i += 2) {
      const [a, b] = [flat[i], flat[i + 1]];
      if (branch.branchMode === 1) points.push({ x: b, y: a }); // x = f(y): (y, x)
      else if (branch.branchMode === 6) points.push({ x: b * Math.cos(a), y: b * Math.sin(a) }); // polar: (θ, r)
      else points.push({ x: a, y: b });
    }
  }
  return points;
}

// Circles in the geometry tool
for (const sketch of Object.values(sketches)) {
  for (const branch of sketch.branches) {
    if (branch.branchMode === 20) {
      for (const [cx, cy, r] of branch.segments) console.log(`circle at (${cx}, ${cy}), radius ${r}`);
    }
  }
}

// Extrema of the expression with id "1"
sketches['1']?.getPOI().filter((poi) => poi.type === 1004).map((poi) => [poi.x, poi.y]);

// Draggable points, with table row info for table columns
sketches['1']?.getMovablePoints().map((p) => ({ x: p.x, y: p.y, row: p.tableInfo?.rowIndex }));
```

### Projection, viewport and settings

`grapher2d.getProjection()` converts between math coordinates and pixels (CSS pixels from the
graph paper's top-left, y down). The projection is replaced whenever you pan, zoom or resize, so
get a fresh one each time instead of keeping it.

```js
const g = Calc.controller.grapher2d;

// Math ↔ pixels
const p = g.getProjection();
p.map_pt({ x: 0, y: 0 });              // where the origin is on screen
p.reverse_map_pt({ x: 100, y: 100 });  // the math point under pixel (100, 100)
p.mathToPixels.dangerouslyGetXScaleFactor(); // pixels per unit (throws on a log axis)

// The viewport
g.getCurrentViewport(); // { xmin, xmax, ymin, ymax }
g.viewportController.animateToViewport({ xmin: -5, xmax: 5, ymin: -5, ymax: 5 });
g.viewportController.zoom('in'); // 'in' | 'out' | 'square' | 'default'

// Settings: graph settings plus drawing settings like labelSize and graphLineWidth
g.settings.observe('showGrid.myMod', (name, settings) => console.log(name, settings.showGrid));
g.settings.setProperty('showGrid', false);
g.settings.unobserve('.myMod'); // remove every observer in the myMod namespace

// Run code after each redraw (the callback gets the redraw time in ms)
g.events.observeEvent('redraw.myMod', (event, ms) => console.log(`redrew in ${ms}ms`));
g.events.unobserveEvent('.myMod');
```

Moving the viewport this way doesn't add an undo step. Call
`g.debounceUserRequestedViewportChange()` afterwards if you want one.

### Which Desmos build a version matches

Desmos updates the v1.13 bundle without changing its version, so the internal types are
regenerated automatically whenever `Desmos.commit` changes, and each regeneration is published as a
new patch version. The `desmos` field in `package.json` records the commit a version was generated
from, and [CHANGELOG.md](CHANGELOG.md) lists every version's commit and what changed in the
internals:

```sh
npm view @spidunno/desmos-types@1.13.9 desmos   # { version: 'v1.13-prerelease', commit: '…' }
```

```js
// is the live bundle the one the installed types were generated from?
console.log(Desmos.commit);
```

### Regenerating for a new bundle

```sh
curl -o calculator.js "https://www.desmos.com/api/v1.13/calculator.js?apiKey=YOUR_API_KEY"
npm run update:bundle -- calculator.js
```

`update:bundle` does the whole update: it reads the bundle's commit (stopping if it's the one in
`package.json`, unless you pass `--force`), runs both generators, runs `npm test`, bumps the patch
version, records the commit and adds a CHANGELOG entry. It doesn't commit or publish. The
generators can also be run on their own:

```sh
npm run generate:internals -- calculator.js
npm run snapshot:sketches -- calculator.js
npm test
```

`snapshot:sketches` re-renders real graph sketches into `test/fixtures/graph-sketches.ts`. If a
branch shape changed, `npm test` reports which field of which branch mode no longer matches.

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

// Mod-style use of the internals. Compiled with tsconfig.internals.json.

export {};

const calc = Desmos.GraphingCalculator(document.createElement('div'));
const ctl = calc.controller;

// --- Items -----------------------------------------------------------------

for (const model of ctl.getAllItemModels()) {
  switch (model.type) {
    case 'expression': {
      const latex: string = model.latex;
      const playing: boolean = model.slider.isPlaying;
      const loop: Desmos.Internals.SliderLoopMode = model.slider.loopMode;
      if (model.sliderExists) console.log(latex, playing, loop);
      break;
    }
    case 'table': {
      const firstColumn = model.columnModels[0];
      const parent: Desmos.Internals.TableModel = firstColumn.table;
      const values: string[] = firstColumn.values;
      break;
    }
    case 'folder':
      model.collapsed = !model.collapsed;
      break;
    case 'image':
      if (model.loadStatus === 'failed') console.log(model.image_url);
      break;
    case 'text':
      console.log(model.text.length);
      break;
  }
}

const maybeModel = ctl.getItemModel('a');
if (maybeModel?.type === 'expression') maybeModel.color = Desmos.Colors.RED;
const byIndex: Desmos.Internals.ItemModel | undefined = ctl.getItemModelByIndex(0);
const ids: string[] = ctl.listModel.__itemModelArray.map((m) => m.id);
const ticker: string = ctl.listModel.ticker.handlerLatex;

// --- Dispatch --------------------------------------------------------------

ctl.dispatch({ type: 'set-item-latex', id: 'a', latex: 'y=x' });
ctl.dispatch({ type: 'set-focus-location', location: { type: 'expression', id: 'a' } });
ctl.dispatch({ type: 'toggle-item-hidden', id: 'a' });
ctl.dispatch({ type: 'toast/show', toast: { message: 'Hi', hideAfter: 2000 } });
ctl.dispatch({ type: 'undo' });
// A generated (not hand-checked) action:
ctl.dispatch({ type: 'set-folder-collapsed', id: 'f', isCollapsed: true });

const token = ctl.dispatcher.register((action) => {
  if (action.type === 'set-item-latex') {
    const id: string = action.id;
    const latex: string = action.latex;
  }
  if (action.type === 'tick') {
    const t: number = action.time;
  }
});
ctl.dispatcher.unregister(token);

type LatexAction = Desmos.Internals.ActionOfType<'set-item-latex'>;
const a: LatexAction = { type: 'set-item-latex', id: 'x', latex: '1' };

ctl.runAfterDispatch(() => ctl.updateViews());
const unsubscribe: () => void = ctl.subscribeToChanges(() => {});
unsubscribe();

// --- Focus, selection, misc ------------------------------------------------

const focus = ctl.getFocusLocation();
if (focus.type === 'expression') {
  const focusedId: string = focus.id;
}
const selected = ctl.getSelectedItem();
const label: string = ctl.s('graphing-calculator-text-toast-graph-cleared');
const product: Desmos.Internals.Product = ctl.getProduct();
const grapher = ctl.getGrapher();
calc.withControllerInAPIMode(() => calc.setExpression({ id: 'b', latex: 'b=1' }));
const internalCalc: Desmos.Internals.Controller = calc._calc.controller;

// --- DCGView ---------------------------------------------------------------

const { DCGView } = Desmos.Private.Fragile;

class Counter extends DCGView.Class<{ start: number }> {
  count = 0;
  template() {
    return DCGView.createElement('button', {
      onTap: () => {
        this.count++;
        this.update();
      },
      children: () => `${this.props.start() + this.count}`,
    });
  }
}

const node = document.createElement('div');
const view = DCGView.mountToNode(Counter, node, { start: DCGView.const(5) });
view.update();
DCGView.unmountFromNode(node);

const list = DCGView.createElement(DCGView.Components.For, {
  each: () => ['a', 'b'],
  key: (s: string) => s,
  children: (s: () => string) => DCGView.createElement('li', { children: s }),
});
const branch = DCGView.Components.IfElse(() => true, {
  true: () => DCGView.createElement('b', {}),
  false: () => 'no',
});

// --- Fragile views ---------------------------------------------------------

const F = Desmos.Private.Fragile;

// Patch a prototype method; `this` is the typed instance.
const originalTemplate = F.ExpressionView.prototype.template;
F.ExpressionView.prototype.template = function () {
  const model: Desmos.Internals.ExpressionModel = this.props.model();
  const readonly: boolean = this.isReadonly();
  return originalTemplate.call(this);
};

const iconHasError: boolean = F.ExpressionIconView.prototype.hasError.call(
  {} as Desmos.Internals.FragileView<Desmos.Internals.ExpressionIconViewProps, Desmos.Internals.Generated.ExpressionIconViewMembers>
);

const someModel = ctl.getItemModel('a') as Desmos.Internals.ExpressionModel;

// Render Fragile views with typed props.
DCGView.createElement(F.StaticMathquillView, {
  latex: () => 'x^2',
  config: () => ({ language: 'en' }),
});
DCGView.createElement(F.Checkbox, {
  checked: () => true,
  onChange: (checked) => console.log(checked),
  children: 'Show',
});
DCGView.createElement(F.Tooltip, { tooltip: () => 'Help', gravity: () => 's', children: 'i' });
DCGView.createElement(F.MathquillView, {
  latex: () => 'y=x',
  onUserChangedLatex: (latex) => console.log(latex.length),
  isFocused: () => false,
  onFocusedChanged: (focused) => {},
});
DCGView.createElement(F.ExpressionIconView, { model: () => someModel, controller: () => ctl });
DCGView.createElement(F.PromptSliderView, { model: () => ctl.getTicker(), controller: () => ctl });
DCGView.createElement(F.InlineMathInputView, {
  latex: () => '0',
  handleLatexChanged: (latex) => {},
  manageFocus: () => F.manageFocusHelper({ controller: ctl, location: { type: 'slider-limit', id: 'a', location: 'min' } }),
});

// Helpers.
const value: number = F.evaluateLatex('1+1', false);
const tree = F.parseLatexToGroup('x^2');
if (tree.type === 'Group') console.log(tree.args?.length);
const display = F.getReconciledExpressionProps(undefined, { points: true });
const lang: string = F.currentLanguage();
const removed: Desmos.Internals.ItemModel[] = F.List.removeItemById(ctl.listModel, 'a');
F.List.moveItemsTo(ctl.listModel, 0, 2, 1);

// @ts-expect-error ExpressionIconView needs a model
DCGView.createElement(F.ExpressionIconView, { controller: () => ctl });

// @ts-expect-error Checkbox.onChange receives a boolean
DCGView.createElement(F.Checkbox, { checked: () => true, onChange: (checked: string) => {} });

// @ts-expect-error ImageIconView takes an image model
DCGView.createElement(F.ImageIconView, { model: () => someModel, controller: () => ctl });

// --- Math field and basic calculator controllers ---------------------------

const field = Desmos.MathQuill.MathField(document.createElement('span'));
field.controller.dispatch({ type: 'arrow-up-down', updown: 'up' });
field.controller.dispatcher.register((action) => {
  if (action.type === 'arrow-up-down') {
    const dir: 'up' | 'down' = action.updown;
  }
});
const fieldLatex: string = field.controller.getLatex();
type UpDown = Desmos.Internals.MathFieldActionOfType<'arrow-up-down'>;

const scientific = Desmos.ScientificCalculator(document.createElement('div'));
scientific.controller.dispatch({ type: 'main' });
scientific.controller.dispatcher.register((action: Desmos.Internals.BasicCalculatorAction) => {});

// Actions handled by both the graph and basic controllers are in both unions.
ctl.dispatch({ type: 'undo', source: 'api' });
scientific.controller.dispatch({ type: 'undo' });

// @ts-expect-error arrow-up-down is a math field action; the graph controller ignores it
ctl.dispatch({ type: 'arrow-up-down', updown: 'up' });

// @ts-expect-error updown is 'up' | 'down'
field.controller.dispatch({ type: 'arrow-up-down', updown: 'left' });

// @ts-expect-error basic calculator keypad actions don't go to the graph controller
ctl.dispatch({ type: 'main' });

// @ts-expect-error graph actions don't go to a math field
field.controller.dispatch({ type: 'set-item-latex', id: 'a', latex: 'x' });

// --- Graph sketches --------------------------------------------------------

const g2d = ctl.grapher2d;
for (const [id, sketch] of Object.entries(g2d.graphSketches)) {
  for (const branch of sketch.branches) {
    switch (branch.branchMode) {
      case 1: {
        // X functions store (y, x) pairs.
        const [y0, x0] = branch.segments[0];
        break;
      }
      case 2:
      case 5:
      case 8: {
        const flat: number[] = branch.segments[0];
        const op: Desmos.Internals.GraphOperator | undefined = branch.operator;
        const fn = branch.compiled?.fn;
        break;
      }
      case 6: {
        const [theta0, r0] = branch.segments[0];
        const thetaMax: number | undefined = branch.sampledDomain?.max;
        break;
      }
      case 3:
      case 25: {
        const [x, y] = branch.segments[0][0];
        const size: number | number[] | undefined = branch.pointSize;
        const label: string | undefined = branch.labels?.[0];
        break;
      }
      case 4:
      case 26: {
        const { dragX, dragY } = branch.movablePointInfo[0];
        break;
      }
      case 20: {
        const [cx, cy, radius] = branch.segments[0];
        break;
      }
      case 21: {
        const [cx, cy, r, start, end] = branch.segments[0];
        break;
      }
      case 23: {
        const [vx, vy, start, angle, directed] = branch.segments[0];
        const isDirected: boolean = directed === 1;
        break;
      }
      case 22: {
        const text: string = branch.labels[0];
        const labeled: 16 | 17 | 23 = branch.objectType;
        break;
      }
      case 15: {
        const message: string = branch.error.key;
        break;
      }
      case 27: {
        const width: number = branch.dimensions.width[0];
        break;
      }
    }
  }
  for (const poi of sketch.getPOI()) {
    if (poi.type === 1004) console.log(`extremum of ${id} at`, poi.x, poi.y, poi.getGraphMode());
  }
  const dragPoint = sketch.getMovablePoints()[0];
  if (dragPoint) console.log(dragPoint.x, dragPoint.tableInfo?.rowIndex);
}

const circle: Desmos.Internals.BranchOfMode<Desmos.Internals.BranchModes['CIRCLE']> | undefined = g2d
  .getGraphSketch('c')
  ?.branches.find((b): b is Desmos.Internals.CircleBranch => b.branchMode === 20);

// @ts-expect-error circle segments are [cx, cy, r]: there is no fourth element
const [, , , tooMany] = (circle as Desmos.Internals.CircleBranch).segments[0];

// @ts-expect-error `segments` meaning differs by mode, so it must be narrowed first
const unnarrowed: number[] = g2d.graphSketches.x.branches[0].segments[0];

// --- Grapher2D: projection, viewport, settings -------------------------------

const projection = g2d.getProjection();
const px: Desmos.Internals.Point = projection.map_pt({ x: 1, y: 2 });
const math: Desmos.Internals.Point = projection.reverse_map_pt(px);
const pixelsPerUnit: number = projection.mathToPixels.dangerouslyGetXScaleFactor();
const { width: screenWidth } = projection.screen;
const viewport: Desmos.Internals.ViewportObject = g2d.getCurrentViewport();
if (projection.viewport.isSquare(projection.screen, g2d.settings)) console.log(projection.viewport.largestR());
g2d.viewportController.animateToViewport({ xmin: -5, xmax: 5, ymin: -5, ymax: 5 });
g2d.viewportController.setCurrentViewport({ ...viewport, xmax: viewport.xmax * 2 });
g2d.viewportController.zoom('square');
const latexBounds: string = g2d.viewportController.getCurrentViewportLatex().xmin;

const settings = g2d.settings;
settings.observe('showGrid.myMod', (name, owner) => {
  const show: boolean = owner.showGrid;
  const changed: 'showGrid' | (string & {}) = name;
});
settings.observe('xAxisLabel yAxisLabel', () => {});
settings.unobserve('.myMod');
settings.setProperty('xAxisArrowMode', 'BOTH');
const labelSize: number = settings.getProperty('labelSize');
const background: string = settings.getBackgroundColor();
const configLang: string | undefined = settings.config.language;

g2d.events.observeEvent('redraw.myMod', (_event, ms) => console.log(ms.toFixed(1)));
for (const layer of g2d.getDrawLayers()) {
  const where: -1 | 0 | 1 = layer.layer;
  if (layer.drawSet.has('a')) console.log(layer.drawOrder.indexOf('a'));
}
const drawContext = g2d.createDrawContext();
if (drawContext) drawContext.ctx.fillRect(drawContext.projection.mapx(0), 0, 1, 1);
const background2: Desmos.Internals.ImageModel | undefined = g2d.getGraphImage('img');
g2d.notifyAfterRedraw(() => {});
g2d.setLayerClass('myMod', 'my-mod-cursor');

// @ts-expect-error showGrid is a boolean
settings.setProperty('showGrid', 'yes');

// @ts-expect-error unknown setting
settings.observe('showGrdi', () => {});

// @ts-expect-error not a zoom kind
g2d.viewportController.zoom('sideways');

// @ts-expect-error points are objects, not tuples
projection.map_pt([1, 2]);

// --- Errors ----------------------------------------------------------------

// @ts-expect-error unknown action type
ctl.dispatch({ type: 'set-item-latexx', id: 'a', latex: 'y=x' });

// @ts-expect-error hand-checked payload requires `latex`
ctl.dispatch({ type: 'set-item-latex', id: 'a' });

// @ts-expect-error item models must be narrowed before using type-specific fields
ctl.getAllItemModels()[0].latex;

// @ts-expect-error props must be getters
DCGView.mountToNode(Counter, node, { start: 5 });

// Valid uses of the global `Desmos` namespace. Must compile without errors.

const elt = document.getElementById('calculator') as HTMLElement;

// --- Construction --------------------------------------------------------

const calculator = Desmos.GraphingCalculator(elt, {
  keypad: false,
  actions: 'auto',
  gestureHandling: 'cooperative',
  colors: { ...Desmos.Colors, customBlue: '#00f' },
  xAxisArrowMode: Desmos.AxisArrowModes.BOTH,
  fontSize: Desmos.FontSizes.LARGE,
  brailleMode: 'nemeth',
  language: 'fr',
  imageUploadCallback(file, done) {
    Desmos.imageFileToDataURL(file, (err, dataURL) => {
      if (err) {
        done(err);
        return;
      }
      done(null, dataURL);
    });
  },
});
const viaNew: Desmos.GraphingCalculator = new Desmos.GraphingCalculator(elt);
const viaAlias: Desmos.GraphingCalculator = Desmos.Calculator(elt);
const isCalc: boolean = viaNew instanceof Desmos.GraphingCalculator;
const fromWindow: Desmos.GraphingCalculator = window.Desmos.GraphingCalculator(elt);

// --- Expressions ---------------------------------------------------------

calculator.setExpression({ id: 'm', latex: 'm=2' });
calculator.setExpression({ id: 'line1', latex: 'y=mx', color: '#ff0000', lineStyle: Desmos.Styles.DASHED });
calculator.setExpression({ id: 'm', sliderBounds: { min: 1, max: 10, step: 1 } });
calculator.setExpression({
  id: 'A',
  latex: 'A=(1,2)',
  pointStyle: Desmos.Styles.CROSS,
  dragMode: Desmos.DragModes.XY,
  labelOrientation: Desmos.LabelOrientations.ABOVE,
  labelSize: Desmos.LabelSizes.LARGE,
  lineWidth: '\\frac{5}{2}',
  pointSize: 12,
});
calculator.setExpression({
  type: 'table',
  columns: [
    { latex: 'x', values: ['1', '2', '3'] },
    { latex: 'y', values: ['1', '4', '9'], dragMode: Desmos.DragModes.XY },
    { latex: 'x^2', color: Desmos.Colors.BLUE, columnMode: Desmos.ColumnModes.LINES },
  ],
});
calculator.setExpression({ type: 'text', id: 'note', text: 'hello' });
calculator.setExpressions([{ latex: 'y=x' }, { type: 'text', text: 'n' }]);
calculator.removeExpression({ id: 'm' });
calculator.removeExpressions([{ id: 'line1' }, { id: 'A' }]);

for (const item of calculator.getExpressions()) {
  switch (item.type) {
    case 'expression':
      const latex: string = item.latex;
      break;
    case 'table':
      const firstValues: string[] = item.columns[0].values;
      break;
    case 'text':
      const text: string = item.text;
      break;
    case 'folder':
      const title: string = item.title;
      break;
    case 'image':
      const hidden: boolean = item.hidden;
      break;
  }
}

// --- Observers -----------------------------------------------------------

calculator.observe('expressionAnalysis', () => {
  for (const id in calculator.expressionAnalysis) {
    const analysis = calculator.expressionAnalysis[id];
    if (analysis.isError) console.log(analysis.errorMessage);
    if (analysis.evaluation?.type === 'ListOfNumber') {
      const values: number[] = analysis.evaluation.value;
    }
  }
});
calculator.observe('graphpaperBounds.labels', (name, owner) => {
  const prop: 'graphpaperBounds' | 'expressionAnalysis' | 'isAnyExpressionSelected' | 'selectedExpressionId' | 'isAudioTraceActive' = name;
  const ppu = owner.graphpaperBounds.pixelCoordinates.width / owner.graphpaperBounds.mathCoordinates.width;
});
calculator.unobserve('graphpaperBounds.labels');

calculator.settings.observe('xAxisLabel.foo', () => {
  const label: string = calculator.settings.xAxisLabel;
});
calculator.settings.unobserve('xAxisLabel');
const desc: string | undefined = calculator.settings.graphDescription;
const complex: boolean = calculator.settings.complex;

calculator.observeEvent('change', (eventName, event) => {
  const n: 'change' = eventName;
  if (event.isUserInitiated) console.log('user change');
});
calculator.observeEvent('change.autosave', (_name, event) => {
  const b: boolean = event.isUserInitiated;
});
calculator.observeEvent('graphReset', () => {});
calculator.unobserveEvent('change.autosave');

const helper = calculator.HelperExpression({ latex: 'a' });
helper.observe('numericValue', () => console.log(helper.numericValue));
helper.observe('listValue', () => console.log(helper.listValue?.length));

// --- State ---------------------------------------------------------------

const state = calculator.getState();
const json = JSON.stringify(state);
calculator.setState(JSON.parse(json), { allowUndo: true, remapColors: true });
calculator.setBlank({ allowUndo: true });
calculator.setDefaultState(state);
calculator.withHistoryReplacement(() => calculator.setExpression({ id: 'x', latex: 'x=1' }));
calculator.restoreHistory(calculator.getHistory());
calculator.updateSettings({ randomSeed: 'seed', degreeMode: true });
calculator.newRandomSeed();

// --- Coordinates and screenshots -----------------------------------------

calculator.setMathBounds({ left: 0, right: 10, bottom: 0, top: 10 });
calculator.setMathBounds({ xmin: 0, xmax: 10, ymin: 0, ymax: 10 });
const px: { x: number; y: number } = calculator.mathToPixels({ x: 0, y: 0 });
const onlyX: { x: number } = calculator.pixelsToMath({ x: 3 });
const png: string = calculator.screenshot({ width: 200, height: 200, targetPixelRatio: 2 });
calculator.asyncScreenshot((data) => data && console.log(data.length));
calculator.asyncScreenshot(
  {
    mode: calculator.isProjectionUniform() ? 'contain' : 'stretch',
    format: 'svg',
    mathBounds: { left: -5, right: 5 },
  },
  (data) => {}
);

// --- Geometry and 3D -----------------------------------------------------

const geometry = Desmos.Geometry(elt, { authorFeatures: true });
geometry.asyncScreenshot(() => {});

const calc3d = Desmos.Calculator3D(elt);
const [tilt, spin] = calc3d.getOrientation();
calc3d.setOrientation(tilt + 0.1, spin);
calc3d.animateToOrientation(0, Math.PI / 2);
calc3d.setPerspectiveDistortion(0);
calc3d.setMathBounds({ xmin: -5, xmax: 5, ymin: -5, ymax: 5, zmin: -5, zmax: 5 });
const zmax: number | undefined = calc3d.graphpaperBounds.mathCoordinates.zmax;

// --- Basic calculators ---------------------------------------------------

const four = Desmos.FourFunctionCalculator(elt, { additionalFunctions: ['exponent', 'percent'] });
four.updateSettings({ limitNumberScale: true });
const sci = Desmos.ScientificCalculator(elt, { degreeMode: true, qwertyKeyboard: false });
sci.observeEvent('change', () => sci.getState());
sci.setState(sci.getState(), { allowUndo: true });
sci.settings.observe('degreeMode', () => console.log(sci.settings.degreeMode));

// --- Globals -------------------------------------------------------------

if (Desmos.enabledFeatures.Calculator3D) console.log(Desmos.version, Desmos.commit);
const langs: readonly string[] = Desmos.supportedLanguages;
const nemeth = Desmos.Abraham.latexToNemeth('x^2');
if (!nemeth.isError) console.log(Desmos.Abraham.UnicodeBraille.toBrailleAscii(nemeth.value));
else console.log(nemeth.error.location.first_column);
const ueb = Desmos.Abraham.latexToUeb('\\operatorname{blah}(x)', { operatorNames: ['blah'] });
const fromBraille = Desmos.Abraham.nemethToLatex(Desmos.Abraham.UnicodeBraille.coerceToSixDotCells('#A"6#A'), {
  strict: true,
  operatorNames: ['blah'],
});
if (!fromBraille.isError) {
  const latex: string = fromBraille.value;
  const firstWarningColumn: number | undefined = fromBraille.warnings[0]?.location.first_column;
}
const anyResult: Desmos.AbrahamResult = Desmos.Abraham.uebToLatex('⠼⠁');
const mf = Desmos.MathQuill.MathField(document.createElement('span'));
mf.latex('x^2').focus();

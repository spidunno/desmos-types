export {};

// Misuse that the types must reject. Each `@ts-expect-error` fails the build
// if the following line compiles.

const el = document.createElement('div');
const calc = Desmos.GraphingCalculator(el);
const calc3d = Desmos.Calculator3D(el);
const four = Desmos.FourFunctionCalculator(el);

// @ts-expect-error unknown option
Desmos.GraphingCalculator(el, { keypadd: false });

// @ts-expect-error invalid enum value
calc.setExpression({ id: 'a', lineStyle: 'WAVY' });

// @ts-expect-error tables require columns
calc.setExpression({ type: 'table' });

// @ts-expect-error 'folder' can't be created with setExpression
calc.setExpression({ type: 'folder', id: 'f' });

// @ts-expect-error table columns require latex
calc.setExpression({ type: 'table', columns: [{ values: ['1'] }] });

// @ts-expect-error unknown observable property
calc.observe('graphpaperBoundz', () => {});

// @ts-expect-error unknown settings property
calc.settings.observe('xAxisLabl', () => {});

// @ts-expect-error unknown event
calc.observeEvent('chnage', () => {});

// @ts-expect-error settings are read-only; use updateSettings
calc.settings.xAxisLabel = 'T';

// @ts-expect-error write-only option isn't on settings
calc.settings.recursion;

// @ts-expect-error `top` requires `bottom`
calc.asyncScreenshot({ mathBounds: { top: 5 } }, () => {});

// @ts-expect-error invalid screenshot mode
calc.asyncScreenshot({ mode: 'fill' }, () => {});

// @ts-expect-error mathToPixels output only has the input's properties
const y: number = calc.mathToPixels({ x: 1 }).y;

// @ts-expect-error asyncScreenshot isn't available on Calculator3D
calc3d.asyncScreenshot(() => {});

// @ts-expect-error mathToPixels isn't available on Calculator3D
calc3d.mathToPixels({ x: 1 });

// @ts-expect-error four-function calculators don't take graphing options
four.updateSettings({ showGrid: false });

// @ts-expect-error at most two additional functions
Desmos.FourFunctionCalculator(el, { additionalFunctions: ['sqrt', 'percent', 'fraction'] });

// @ts-expect-error basic calculator states aren't graph states
calc.setState(four.getState());

// @ts-expect-error LaTeX→Braille results have no warnings
Desmos.Abraham.latexToNemeth('x').warnings;

// @ts-expect-error `strict` only applies to Braille→LaTeX translation
Desmos.Abraham.latexToUeb('x', { strict: true });

// @ts-expect-error enum constants are read-only
Desmos.Styles.SOLID = 'DASHED';

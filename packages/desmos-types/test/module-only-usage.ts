// The module-only entry points: types available by import, no global `Desmos`.
// Compiled with tsconfig.module.json, which includes no global entry point.

import type { Desmos } from '../module/internals';
import type { Desmos as PublicDesmos } from '../module';
import { Desmos as ValueImport } from '../module';

type DesmosAPI = typeof Desmos;

declare const api: DesmosAPI;
const calc: Desmos.GraphingCalculator = api.GraphingCalculator(document.createElement('div'), { keypad: false });
calc.setExpression({ id: 'a', latex: 'y=x' });
const sketches: Record<string, Desmos.Internals.GraphSketch> = calc.controller.grapher2d.graphSketches;
const projection: Desmos.Internals.Projection = calc.controller.grapher2d.getProjection();

declare const publicApi: typeof PublicDesmos;
const basic: PublicDesmos.ScientificCalculator = publicApi.ScientificCalculator(document.createElement('div'));

// @ts-expect-error the public-only module has no internals
type NoInternals = PublicDesmos.Internals.Controller;

// @ts-expect-error the package has no JavaScript, so `Desmos` is type-only
console.log(ValueImport);

// @ts-expect-error no global `Desmos` namespace
type GlobalCalc = globalThis.Desmos.GraphingCalculator;

// @ts-expect-error no `window.Desmos`
window.Desmos;

export {};

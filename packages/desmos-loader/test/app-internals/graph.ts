import { Desmos } from './desmos.js';

const calculator = Desmos.GraphingCalculator(document.createElement('div'));
const sketches: Record<string, Desmos.Internals.GraphSketch> = calculator.controller.grapher2d.graphSketches;
const projection: Desmos.Internals.Projection = calculator.controller.grapher2d.getProjection();

export {};

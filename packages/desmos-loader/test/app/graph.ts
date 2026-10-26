// Anywhere else in the app.
import { Desmos } from './desmos.js';

const calculator: Desmos.GraphingCalculator = Desmos.GraphingCalculator(document.createElement('div'), {
  keypad: false,
});
calculator.setExpression({ id: 'a', latex: 'y=x' });
const color: string = Desmos.Colors.BLUE;
const state: Desmos.GraphState = calculator.getState();

// @ts-expect-error the public entry point has no internals
calculator.controller;

// @ts-expect-error no global `Desmos`
window.Desmos;

export {};

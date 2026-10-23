// The namespace can also be imported for types only.

import type { GraphingCalculator, GraphState, SettableExpressionState } from '..';
import type DesmosTypes = require('..');

export function load(calc: GraphingCalculator, state: GraphState, extra: SettableExpressionState[]): void {
  calc.setState(state);
  calc.setExpressions(extra);
}

export const options: DesmosTypes.GraphingCalculatorOptions = { expressions: false };

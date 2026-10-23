/**
 * Helper expressions: evaluated like normal expressions but hidden from the
 * expressions list.
 */
declare namespace Desmos {
  interface HelperExpressionObservables {
    /** The value, when the expression evaluates to a number. May be `NaN`. */
    numericValue: number | undefined;
    /** The values, when the expression evaluates to a list. */
    listValue: number[] | undefined;
  }

  /** Created by `calculator.HelperExpression({ latex })`. */
  interface HelperExpression
    extends Observable<HelperExpressionObservables>,
      Readonly<HelperExpressionObservables> {
    /** The LaTeX being evaluated. */
    readonly latex: Latex;
  }
}

/**
 * Controllers other than the graph controller: each math field and each
 * basic calculator has its own, with its own dispatcher and actions.
 */
declare namespace Desmos.Internals {
  /**
   * A math field's controller (`mathField.controller`). Keystrokes and edits
   * in the field become {@link MathFieldAction}s dispatched here; the graph
   * controller never sees them.
   *
   * @example
   * const field = Desmos.MathQuill.MathField(element);
   * field.controller.dispatcher.register((action) => {
   *   if (action.type === 'arrow-up-down') console.log(action.updown);
   * });
   * field.keystroke('Up'); // logs "up"
   */
  interface MathFieldController extends Generated.MathFieldController {
    dispatch(action: MathFieldAction): void;
    dispatcher: Dispatcher<MathFieldAction>;
    /** Apply an action to the field's model. Called by the dispatcher. */
    handleAction(action: MathFieldAction): void;
    /** The dispatcher callback: `handleAction` plus view bookkeeping. */
    onAction(action: MathFieldAction): void;
    /** Run `callback` now, or after the current dispatch finishes. */
    runAfterDispatch(callback: () => void): void;
    /** Call `callback` whenever the field's views should re-render. Returns an unsubscribe function. */
    subscribeToChanges(callback: () => void): () => void;
    getLatex(): Latex;
  }

  /** A four-function or scientific calculator's controller (`calculator.controller`). */
  interface BasicCalculatorController extends Generated.BasicCalculatorController {
    dispatch(action: BasicCalculatorAction): void;
    dispatcher: Dispatcher<BasicCalculatorAction>;
    /** Run `callback` now, or after the current dispatch finishes. */
    runAfterDispatch(callback: () => void): void;
  }
}

declare namespace Desmos {
  interface MathQuillStaticMath {
    /**
     * The field's own controller.
     * @remarks Internal: changes without notice between builds.
     */
    readonly controller: Internals.MathFieldController;
  }

  interface BasicCalculator<TOptions extends BasicCalculatorOptions = BasicCalculatorOptions> {
    /**
     * The calculator's controller.
     * @remarks Internal: changes without notice between builds.
     */
    readonly controller: Internals.BasicCalculatorController;
  }
}

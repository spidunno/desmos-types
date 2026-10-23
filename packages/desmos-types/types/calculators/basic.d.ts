/**
 * The four-function and scientific calculators.
 */
declare namespace Desmos {
  /**
   * A four-function or scientific calculator. Its methods behave like the
   * graphing calculator's, with a smaller set of settings.
   *
   * @typeParam TOptions - options accepted by `updateSettings()`.
   */
  interface BasicCalculator<TOptions extends BasicCalculatorOptions = BasicCalculatorOptions> {
    /** Destroy the instance, unbind listeners and free resources. */
    destroy(): void;

    /** Resize to fill the container. Only needed when auto-sizing is off. */
    resize(): void;

    /** The current state. Treat it as opaque; it can be serialized with `JSON.stringify`. */
    getState(): BasicCalculatorState;

    /** Load a state previously returned by `getState()`. */
    setState(state: BasicCalculatorState, options?: SetBlankOptions): void;

    /** Reset to a blank state. */
    setBlank(options?: SetBlankOptions): void;

    undo(): void;
    redo(): void;
    clearHistory(): void;

    focusFirstExpression(): void;

    /** Update settings. Properties that aren't given keep their current value. */
    updateSettings(settings: TOptions): void;

    /**
     * Current settings, observable per property.
     * @remarks Undocumented for basic calculators, but present at runtime.
     */
    readonly settings: BasicCalculatorSettings<TOptions>;

    /** Listen for changes to the calculator's state. Supports namespacing (`'change.ns'`). */
    observeEvent(event: EventName<'change'>, callback: () => void): void;

    /** Remove `'change'` observers. */
    unobserveEvent(event: EventName<'change'>): void;
  }

  type FourFunctionCalculator = BasicCalculator<FourFunctionCalculatorOptions>;
  type ScientificCalculator = BasicCalculator<ScientificCalculatorOptions>;

  interface FourFunctionCalculatorConstructor {
    (element: HTMLElement, options?: FourFunctionCalculatorOptions): FourFunctionCalculator;
    new (element: HTMLElement, options?: FourFunctionCalculatorOptions): FourFunctionCalculator;
    readonly prototype: FourFunctionCalculator;
  }

  interface ScientificCalculatorConstructor {
    (element: HTMLElement, options?: ScientificCalculatorOptions): ScientificCalculator;
    new (element: HTMLElement, options?: ScientificCalculatorOptions): ScientificCalculator;
    readonly prototype: ScientificCalculator;
  }

  /**
   * Create a four-function calculator in `element`.
   * @throws If the four-function calculator isn't enabled for the API key.
   */
  const FourFunctionCalculator: FourFunctionCalculatorConstructor;

  /**
   * Create a scientific calculator in `element`.
   * @throws If the scientific calculator isn't enabled for the API key.
   */
  const ScientificCalculator: ScientificCalculatorConstructor;
}

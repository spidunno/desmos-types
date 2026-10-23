/**
 * The API shared by the graphing calculator, the geometry tool and the 3D
 * calculator. All three are built on the same underlying class.
 */
declare namespace Desmos {
  /** Events emitted by graphing-family calculators, mapped to their payloads. */
  interface GraphingCalculatorEventMap {
    /**
     * Any change that affects the persisted state, from the user or from API
     * calls. Useful for autosaving without polling.
     */
    change: { isUserInitiated: boolean };
    /** The user clicked "Delete All" or "Reset" in the expressions list top bar. */
    graphReset: unknown;
  }

  type GraphingCalculatorEvent = Extract<keyof GraphingCalculatorEventMap, string>;

  /**
   * Called when an observed calculator event fires. Receives the
   * un-namespaced event name (e.g. `'change'` even when observing
   * `'change.autosave'`) and the event payload.
   */
  type GraphingCalculatorEventCallback<K extends GraphingCalculatorEvent> = (
    eventName: K,
    event: GraphingCalculatorEventMap[K]
  ) => void;

  /** Observable properties of a graphing-family calculator. */
  interface GraphingCalculatorObservables {
    /** Graphpaper bounds in math and pixel coordinates. Changes on pan and zoom. */
    graphpaperBounds: GraphpaperBounds;
    /** Analysis of each expression, keyed by expression id. */
    expressionAnalysis: Readonly<Record<ExpressionId, ExpressionAnalysis>>;
    /** `true` while an expression is selected. */
    isAnyExpressionSelected: boolean;
    /** Id of the selected expression, or `undefined` if none is selected. */
    selectedExpressionId: ExpressionId | undefined;
    /** `true` while audio trace mode is active. */
    isAudioTraceActive: boolean;
  }

  /**
   * Members shared by {@link GraphingCalculator}, {@link Geometry} and
   * {@link Calculator3D}.
   */
  interface GraphingCalculatorBase
    extends Observable<GraphingCalculatorObservables>,
      Readonly<GraphingCalculatorObservables> {
    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    /**
     * Destroy the instance, unbind listeners and free resources. Call this
     * when the container element is removed from the DOM. Methods called
     * afterwards do nothing and log a warning.
     */
    destroy(): void;

    /**
     * Resize the calculator to fill its container. Only needed when the
     * `autosize` option is `false`: call it whenever the container's size
     * changes or it is added to or removed from the DOM.
     */
    resize(): void;

    // -------------------------------------------------------------------------
    // Saving and loading
    // -------------------------------------------------------------------------

    /** The current state. Treat it as opaque; it can be serialized with `JSON.stringify`. */
    getState(): GraphState;

    /** Load a state previously returned by `getState()`. */
    setState(state: GraphState, options?: SetStateOptions): void;

    /** Reset to a blank state. */
    setBlank(options?: SetBlankOptions): void;

    /**
     * Replace "Delete All" with a "Reset" button that restores `state`, and
     * make the "home" zoom button return to that state's viewport.
     */
    setDefaultState(state: GraphState): void;

    /** Return to the previous state in the undo/redo history, if any. */
    undo(): void;

    /** Advance to the next state in the undo/redo history, if any. */
    redo(): void;

    /** Clear the undo/redo history without changing the current state. */
    clearHistory(): void;

    /**
     * Run `callback` so that its changes replace the current history entry
     * instead of adding one. Keeps programmatic changes out of the user's undo stack.
     */
    withHistoryReplacement(callback: () => void): void;

    /**
     * The current state together with its undo/redo history.
     * @remarks Undocumented: may change without notice.
     */
    getHistory(): CalculatorHistory;

    /**
     * Restore a value returned by `getHistory()`, including its undo/redo history.
     * @remarks Undocumented: may change without notice.
     */
    restoreHistory(history: CalculatorHistory): void;

    // -------------------------------------------------------------------------
    // Screenshots
    // -------------------------------------------------------------------------

    /** A PNG data URI of the current graphpaper. */
    screenshot(options?: ScreenshotOptions): string;

    /**
     * A 200×200 PNG data URI at `targetPixelRatio: 2`.
     * @remarks Undocumented: may change without notice.
     */
    makeThumbnail(): string;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /**
     * Listen for a calculator event. Namespace the name (`'change.autosave'`)
     * to be able to remove this observer on its own.
     *
     * @example
     * calculator.observeEvent('change', (eventName, event) => {
     *   if (event.isUserInitiated) save(calculator.getState());
     * });
     */
    observeEvent<K extends GraphingCalculatorEvent>(
      event: EventName<K>,
      callback: GraphingCalculatorEventCallback<K>
    ): void;

    /** Remove event observers; `'change'` removes all of them, `'change.ns'` just one. */
    unobserveEvent(event: EventName<GraphingCalculatorEvent>): void;

    // -------------------------------------------------------------------------
    // Expressions
    // -------------------------------------------------------------------------

    /**
     * Create an expression, or update the one with the same `id`. Only the
     * given properties change. An expression's `type` can't be changed;
     * remove it first. Invalid input is ignored.
     */
    setExpression(expression: SettableExpressionState): void;

    /** Call `setExpression()` for each item. */
    setExpressions(expressions: readonly SettableExpressionState[]): void;

    /** Remove the expression with the given `id`. */
    removeExpression(expression: { id: ExpressionId }): void;

    /** Remove each expression with one of the given ids. */
    removeExpressions(expressions: ReadonlyArray<{ id: ExpressionId }>): void;

    /** The items in the expressions list. */
    getExpressions(): ExpressionListItem[];

    /**
     * Create a helper expression: evaluated like a normal expression but not
     * shown in the expressions list. Observe its `numericValue` or
     * `listValue` to react to changes.
     *
     * @example
     * const a = calculator.HelperExpression({ latex: 'a' });
     * a.observe('numericValue', () => console.log(a.numericValue));
     */
    HelperExpression(expression: { latex: Latex }): HelperExpression;

    /**
     * All helper expressions created on this calculator.
     * @remarks Undocumented: may change without notice.
     */
    getHelperExpressions(): HelperExpression[];

    // -------------------------------------------------------------------------
    // Settings
    // -------------------------------------------------------------------------

    /**
     * Update options and graph settings. Properties that aren't given keep
     * their current value. Some combinations conflict and get adjusted:
     * avoid `graphpaper: false` with `expressionsCollapsed: true` or
     * `zoomButtons: true`, and `lockViewport: true` with `zoomButtons: true`.
     */
    updateSettings(settings: GraphingCalculatorOptions): void;

    /** @deprecated Use {@link GraphingCalculatorBase.updateSettings} instead. */
    setGraphSettings(settings: GraphingCalculatorOptions): void;

    /** Current settings, observable per property. */
    readonly settings: GraphingCalculatorSettings;

    /** @deprecated Use {@link GraphingCalculatorBase.settings} instead. */
    readonly graphSettings: GraphingCalculatorSettings;

    /** The palette in use: the `colors` option or the default palette. */
    readonly colors: ColorPalette;

    /** Set `settings.randomSeed` to a new random value, re-randomizing `random()`. */
    newRandomSeed(): void;

    // -------------------------------------------------------------------------
    // Viewport
    // -------------------------------------------------------------------------

    /** Set the graphpaper bounds. Invalid bounds (`right <= left` or `top <= bottom`) are ignored. */
    setMathBounds(bounds: MathBounds | ViewportBounds): void;

    /** Whether the projection is uniform (square math aspect ratio). */
    isProjectionUniform(): boolean;

    // -------------------------------------------------------------------------
    // Selection and focus
    // -------------------------------------------------------------------------

    /**
     * Focus the first expression. It isn't focused by default because the
     * browser would scroll it into view on page load.
     */
    focusFirstExpression(): void;

    /**
     * Open the keypad, focusing the first expression if none is focused.
     * @deprecated Use the `keypadActivated` option, optionally followed by
     * `focusFirstExpression()`.
     */
    openKeypad(): void;

    /** Select the expression with this id, as if the user had clicked it. */
    setSelectedExpressionId(id: ExpressionId): void;

    /** Remove the selected expression. Returns its id, or `undefined` if nothing was selected. */
    removeSelected(): ExpressionId | undefined;

    // -------------------------------------------------------------------------
    // Accessibility
    // -------------------------------------------------------------------------

    /**
     * Open the audio-trace keypad for the selected expression, or the first
     * traceable expression if none is selected. Requires `audio: true`.
     */
    enterAudioTrace(): void;

    /** Exit audio trace mode if it is active. */
    exitAudioTrace(): void;
  }
}

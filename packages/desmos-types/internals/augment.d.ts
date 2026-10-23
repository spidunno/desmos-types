/**
 * Adds the internal members to the public calculator types. Included only
 * through `@spidunno/desmos-types/internals`.
 */
declare namespace Desmos {
  /** Internal members present on every graphing, geometry and 3D calculator. */
  type GraphingCalculatorInternalMembers = Pick<
    Internals.Generated.ApiInternals,
    | '__observers'
    | '_destroyed'
    | '_eventBus'
    | '_sharedClockBusToken'
    | 'domChangeDetector'
    | 'focusedMathQuill'
    | 'guid'
    | 'injectedDependencies'
    | 'isOffscreen'
    | 'type'
    | '_getMathAspectRatio'
    | '_initGraphSettings'
    | '_syncGraphpaperBounds'
    | '_validateAsyncScreenshotOpts'
    | '_validateBrailleScreenshotOptions'
    | 'notifyControllerOfAPICall'
    | 'setOptions'
    | 'setViewport'
    | 'getProperty'
    | 'notifyPropertyChange'
    | 'observeAndSync'
    | 'setProperties'
    | 'setProperty'
    | 'setPropertyWithoutNotifying'
    | 'unobserveAll'
  >;

  interface GraphingCalculatorBase extends GraphingCalculatorInternalMembers {
    /**
     * The calculator's state manager.
     * @remarks Internal: changes without notice between builds.
     */
    readonly controller: Internals.Controller;
    /**
     * The object that owns the controller, view and grapher.
     * @remarks Internal: changes without notice between builds.
     */
    readonly _calc: Internals.CalcInternals;
    /**
     * Run `callback` with the controller in API mode, as the public methods
     * do: changes are treated as programmatic rather than user-initiated.
     * @remarks Internal.
     */
    withControllerInAPIMode<T>(callback: () => T): T;
  }
}

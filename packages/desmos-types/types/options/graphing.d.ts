/**
 * Constructor options and settings for the graphing calculator. The geometry
 * tool and the 3D calculator accept the same options.
 */
declare namespace Desmos {
  /**
   * Custom handling for user-uploaded images. Store `file` somewhere with a
   * public URL, then call `done(null, url)`, or `done(error)` on failure.
   */
  type ImageUploadCallback = (file: File, done: ImageUploadDone) => void;

  /** The completion callback passed to an {@link ImageUploadCallback}. */
  interface ImageUploadDone {
    (error: null | undefined, url: string): void;
    /** Any truthy value signals an error (the docs' example passes `true`). */
    (error: unknown): void;
  }

  /**
   * Configuration options. These belong to the calculator instance: they are
   * not serialized in graph states and survive `setState()` / `setBlank()`.
   */
  interface GraphingCalculatorConfig {
    /** Show the graphpaper. @defaultValue `true` */
    graphpaper?: boolean;
    /** Show the expressions list. @defaultValue `true` */
    expressions?: boolean;
    /** Show the settings wrench for changing graph display. @defaultValue `true` */
    settingsMenu?: boolean;
    /** Show onscreen zoom buttons. @defaultValue `true` */
    zoomButtons?: boolean;
    /** Show the onscreen keypad. @defaultValue `true` */
    keypad?: boolean;
    /**
     * When `true`, the onscreen keypad opens whenever focus is in a math input.
     * Ignored on touch devices, where the keypad is always activated.
     * @defaultValue `false`
     */
    keypadActivated?: boolean;
    /** If a default state is set, show an onscreen reset button. @defaultValue `false` */
    showResetButtonOnGraphpaper?: boolean;
    /** Show the bar on top of the expressions list. @defaultValue `true` */
    expressionsTopbar?: boolean;
    /** Show Points of Interest as clickable gray dots. @defaultValue `true` */
    pointsOfInterest?: boolean;
    /** Allow tracing curves and showing point coordinates on click. @defaultValue `true` */
    trace?: boolean;
    /** Add a subtle 1px gray border around the calculator. @defaultValue `true` */
    border?: boolean;
    /** Disable user panning and zooming of the graphpaper. @defaultValue `false` */
    lockViewport?: boolean;
    /** Collapse the expressions list. @defaultValue `false` */
    expressionsCollapsed?: boolean;
    /** Limit expressions to 500 LaTeX tokens and a nesting depth of 30. @defaultValue `false` */
    capExpressionSize?: boolean;
    /** Enable content-authoring features (secret folders, readonly expressions, ...). @defaultValue `false` */
    authorFeatures?: boolean;
    /** Allow adding images. @defaultValue `true` */
    images?: boolean;
    /** Custom processing for user-uploaded images. @defaultValue {@link Desmos.imageFileToDataURL} */
    imageUploadCallback?: ImageUploadCallback;
    /** Allow folders in the expressions list. @defaultValue `true` */
    folders?: boolean;
    /** Allow text notes in the expressions list. @defaultValue `true` */
    notes?: boolean;
    /** Allow sliders in the expressions list. @defaultValue `true` */
    sliders?: boolean;
    /**
     * Allow Actions. With `'auto'`, actions are enabled but some UI only
     * appears after the user enters a valid action.
     * @defaultValue `'auto'`
     */
    actions?: boolean | 'auto';
    /**
     * Allow "with" substitutions and list comprehensions. Accepted as an option
     * but not reflected on `calculator.settings`.
     * @defaultValue `true`
     */
    substitutions?: boolean;
    /** Allow hyperlinks in notes/folders and links to help documentation. @defaultValue `true` */
    links?: boolean;
    /** Show the keypad in QWERTY layout (`false` is alphabetical). @defaultValue `true` */
    qwertyKeyboard?: boolean;
    /** Enable distributions, univariate data visualizations and hypothesis tests. @defaultValue `true` */
    distributions?: boolean;
    /** Show a restricted menu of available functions. @defaultValue `false` */
    restrictedFunctions?: boolean;
    /** Keep `distance` and `midpoint` enabled even when `restrictedFunctions` is `true`. @defaultValue `false` */
    forceEnableGeometryFunctions?: boolean;
    /** When `false`, derivatives and integrals are disabled. @defaultValue `true` */
    calculus?: boolean;
    /** Import a graph when the user pastes a valid Desmos graph URL. @defaultValue `false` */
    pasteGraphLink?: boolean;
    /**
     * Pause animations behind an opt-in cover when the user prefers reduced motion.
     * @defaultValue `false`
     */
    showReducedMotionCover?: boolean;
    /** Create a table (up to 50 rows) from pasted table data. @defaultValue `true` */
    pasteTableData?: boolean;
    /**
     * When `true`, clearing the graph leaves the calculator in degree mode.
     * @defaultValue matches `degreeMode` at instantiation
     */
    clearIntoDegreeMode?: boolean;
    /** The color palette the calculator cycles through. @defaultValue {@link Desmos.Colors} */
    colors?: ColorPalette;
    /**
     * Resize automatically when the container element's dimensions change.
     * When `false`, call `.resize()` yourself.
     * @defaultValue `true`
     */
    autosize?: boolean;
    /** Plot inequalities. @defaultValue `true` */
    plotInequalities?: boolean;
    /** Plot implicit equations and inequalities. @defaultValue `true` */
    plotImplicits?: boolean;
    /** Plot single-variable implicit equations. @defaultValue `true` */
    plotSingleVariableImplicitEquations?: boolean;
    /** Increase font sizes and line thicknesses for legibility. @defaultValue `false` */
    projectorMode?: boolean;
    /** Let users toggle between decimal and fraction output. @defaultValue `true` */
    decimalToFraction?: boolean;
    /** Base font size in pixels. See {@link Desmos.FontSizes}. @defaultValue `16` */
    fontSize?: number;
    /**
     * How touch and scroll gestures over the graphpaper are handled.
     * `'cooperative'` requires a modifier or two fingers to pan/zoom.
     * @defaultValue `'greedy'`
     */
    gestureHandling?: 'greedy' | 'cooperative';
    /** Invert every displayed color. No longer recommended. @defaultValue `false` */
    invertedColors?: boolean;
    /** When `false`, hide the "Reverse Contrast" checkbox. @defaultValue `true` */
    invertedColorsControl?: boolean;
    /** **Beta.** Background color as a 3- or 6-digit hex string. @defaultValue `'#fff'` */
    backgroundColor?: HexColor;
    /** **Beta.** Text color as a 3- or 6-digit hex string. @defaultValue `'#000'` */
    textColor?: HexColor;
    /** **Beta.** Accent color for interactive UI elements. @defaultValue `'#2f72dc'` */
    accentColor?: HexColor;
    /** Display language. @defaultValue `'en'` */
    language?: LanguageCode;
    /** Braille code for input and output. @defaultValue `'none'` */
    brailleMode?: BrailleMode;
    /** Allow six-key Braille input on the home row. Requires a Braille mode. @defaultValue `false` */
    sixKeyInput?: boolean;
    /** Show Braille controls in the settings menu and enable Braille shortcut keys. @defaultValue `true` */
    brailleControls?: boolean;
    /** Allow the calculator to produce sound (tones, Audio Trace). @defaultValue `true` */
    audio?: boolean;
    /**
     * Replace the generated description of the graph canvas. `''` removes it;
     * `undefined` restores the generated text.
     * @defaultValue `undefined`
     */
    graphDescription?: string | undefined;
    /** Show a "zoom to fit" icon on tables and distributions. @defaultValue `true` */
    zoomFit?: boolean;
    /** Force log mode on linearizable regressions and hide its checkbox. @defaultValue `false` */
    forceLogModeRegressions?: boolean;
    /** Enable log mode on linearizable regressions by default. @defaultValue `false` */
    defaultLogModeRegressions?: boolean;
    /** Allow arbitrary regression models. @defaultValue `true` */
    customRegressions?: boolean;
    /**
     * Allow regressions from a menu of models in the table column interface.
     * Accepted as an option but not reflected on `calculator.settings`.
     * @defaultValue `true`
     */
    regressionTemplates?: boolean;
    /** Allow logarithmic axis scales. @defaultValue `true` */
    logScales?: boolean;
    /** Enable the `tone` command. @defaultValue `true` */
    tone?: boolean;
    /**
     * Enable interval comprehension syntax. Accepted as an option but not
     * reflected on `calculator.settings`.
     * @defaultValue `true`
     */
    intervalComprehensions?: boolean;
    /**
     * Globally mute sound from `tone()`. Browsers block audio before user
     * interaction, so unmute only in response to a user action.
     * @defaultValue `true`
     */
    muted?: boolean;
    /** Enable the "Complex Mode" toggle in the settings menu. @defaultValue `true` */
    allowComplex?: boolean;
    /** Allow matrices and matrix functions. @defaultValue `true` */
    matrices?: boolean;
    /**
     * How object positions are reported to screen readers. `'default'` uses
     * coordinates when an axis is visible, percentages otherwise.
     * @defaultValue `'default'`
     */
    reportPosition?: 'coordinates' | 'percents' | 'default';
    /** Show a button that copies an evaluation's LaTeX. @defaultValue `false` */
    showEvaluationCopyButtons?: boolean;
    /**
     * Called with the evaluation LaTeX when a copy button is clicked.
     * @defaultValue copy to the system clipboard
     */
    onEvaluationCopyClick?: (latex: Latex) => void;
    /**
     * Allow recursive functions. Accepted as an option but not reflected on
     * `calculator.settings`.
     * @defaultValue `true`
     */
    recursion?: boolean;
  }

  /**
   * Graph settings. Unlike configuration options, these belong to the graph
   * state: they are serialized by `getState()` and overwritten by
   * `setState()` / `setBlank()`.
   */
  interface GraphSettings {
    /** Trig functions take degrees instead of radians. @defaultValue `false` */
    degreeMode?: boolean;
    /** Show grid lines. @defaultValue `true` */
    showGrid?: boolean;
    /** Use a polar grid instead of a cartesian one. @defaultValue `false` */
    polarMode?: boolean;
    /** Show the x axis. @defaultValue `true` */
    showXAxis?: boolean;
    /** Show the y axis. @defaultValue `true` */
    showYAxis?: boolean;
    /** Show numeric tick labels on the x axis. @defaultValue `true` */
    xAxisNumbers?: boolean;
    /** Show numeric tick labels on the y axis. @defaultValue `true` */
    yAxisNumbers?: boolean;
    /** Show numeric tick labels at successive angles (polar mode only). @defaultValue `true` */
    polarNumbers?: boolean;
    /** Spacing between x-axis ticks. `0` chooses automatically. @defaultValue `0` */
    xAxisStep?: number;
    /** Spacing between y-axis ticks. `0` chooses automatically. @defaultValue `0` */
    yAxisStep?: number;
    /**
     * Subdivisions between x-axis ticks, an integer from 0 to 5. `1` shows only
     * major grid lines; `0` chooses automatically.
     * @defaultValue `0`
     */
    xAxisMinorSubdivisions?: number;
    /**
     * Subdivisions between y-axis ticks, an integer from 0 to 5. `1` shows only
     * major grid lines; `0` chooses automatically.
     * @defaultValue `0`
     */
    yAxisMinorSubdivisions?: number;
    /** Arrows on the x axis. @defaultValue `'NONE'` */
    xAxisArrowMode?: AxisArrowMode;
    /** Arrows on the y axis. @defaultValue `'NONE'` */
    yAxisArrowMode?: AxisArrowMode;
    /** Label placed below the x axis. @defaultValue `''` */
    xAxisLabel?: string;
    /** Label placed beside the y axis. @defaultValue `''` */
    yAxisLabel?: string;
    /** Scale of the x axis. @defaultValue `'linear'` */
    xAxisScale?: AxisScale;
    /** Scale of the y axis. @defaultValue `'linear'` */
    yAxisScale?: AxisScale;
    /**
     * Global seed for the built-in `random()` function. Changing it
     * re-randomizes every expression that uses `random()`.
     * @defaultValue a random 128-bit hex string
     */
    randomSeed?: string;
    /**
     * Turn on Complex Mode, so expressions can use complex numbers. Ignored
     * (forced to `false`) when `allowComplex` is `false`, and turns off
     * `degreeMode`.
     * @defaultValue `false`
     * @remarks Undocumented.
     */
    complex?: boolean;
    /**
     * Draw the grid, axes and numbers only in the first quadrant.
     * @defaultValue `false`
     * @remarks Undocumented.
     */
    restrictGridToFirstQuadrant?: boolean;
    /**
     * The "lock viewport" toggle in the graph settings, which stops the user
     * from panning and zooming. Unlike `lockViewport`, it is part of the graph
     * state.
     * @defaultValue `false`
     * @remarks Undocumented.
     */
    userLockedViewport?: boolean;
  }

  /**
   * Configuration options the docs don't mention that still appear on
   * `calculator.settings`.
   *
   * @remarks Undocumented: may change without notice.
   */
  interface UndocumentedGraphingCalculatorConfig {
    /**
     * Show the author features enabled by `authorFeatures`. With `false`, they
     * stay available but hidden, as when an author previews the student view.
     * @defaultValue `true`
     */
    authorMode?: boolean;
    /** Allow the advanced styling options in the style menu. @defaultValue `false` */
    advancedStyling?: boolean;
    /** Allow defining functions, like `f(x)=x^2`. @defaultValue `true` */
    functionDefinition?: boolean;
    /** 3D: put the viewport controls on the left instead of the right. @defaultValue `false` */
    leftAlign3dViewportControls?: boolean;
    /** 3D: draw surfaces with their opacity. When `false`, surfaces are opaque. @defaultValue `false` */
    translucentSurfaces?: boolean;
    /** Show keyboard shortcuts in tooltips. @defaultValue `false` */
    showKeyboardShortcutsInTooltips?: boolean;
    /** Show a performance meter over the graph paper. @defaultValue `false` */
    showPerformanceMeter?: boolean;
  }

  /**
   * Options Desmos uses for its own products, debugging and embedding. They
   * are accepted by the constructor and `updateSettings()` but never appear
   * on `calculator.settings`.
   *
   * @remarks Undocumented: may change without notice.
   */
  interface InternalGraphingCalculatorOptions {
    /**
     * Which product the calculator behaves as. `Desmos.Geometry` and
     * `Desmos.Calculator3D` set this themselves.
     * @defaultValue `'graphing'`
     */
    product?: 'graphing' | 'geometry-calculator' | 'graphing-3d';
    /** Show the Desmos branding on the graph paper. @defaultValue `true` */
    branding?: boolean;
    /** Only trace and show points of interest for the selected expression. @defaultValue `false` */
    onlyTraceSelected?: boolean;
    /** Ignore mouse and touch input on the graph paper. @defaultValue `false` */
    disableMouseInteractions?: boolean;
    /** Accepted, but not read anywhere in the v1.13 bundle. @defaultValue `false` */
    nativeOnscreenKeypad?: boolean;
    /** 3D: draw surfaces as wireframes. @defaultValue `false` */
    wireframe?: boolean;
    /** 3D: debug rendering that shows ray-casting cost as a heat map. @defaultValue `false` */
    raycastHeatmap?: boolean;
    /** 3D: debugging flag for surface cost estimates (shows them in the expression list). @defaultValue `false` */
    ignoreCostEstimate?: boolean;
    /** 3D: ray-cast without interval arithmetic (debugging). @defaultValue `false` */
    raycastDisableIntervals?: boolean;
    /**
     * With `pasteGraphLink`, called with the state of a pasted graph link
     * before it is imported. Call `done(null, state)` to import it (possibly
     * modified), or `done(error)` to reject it.
     * @defaultValue imports the state unchanged
     */
    pasteGraphLinkCallback?: (state: GraphState, done: (error: unknown, state?: GraphState) => void) => void;
    /** Link the branding to desmos.com, where the graph can be edited. @defaultValue `false` */
    editOnWeb?: boolean;
    /** Desmos testing: post the cross-origin save test to the current origin. @defaultValue `false` */
    crossOriginSaveTest?: boolean;
    /** Make the graph paper and its objects reachable with Tab. @defaultValue `true` */
    enableTabindex?: boolean;
    /** Audio Trace: step through expressions in reverse order. @defaultValue `false` */
    audioTraceReverseExpressions?: boolean;
    /** Draw the graph paper with a transparent background. @defaultValue `false` */
    transparentBackground?: boolean;
    /** Stop animating while the calculator is scrolled out of view. @defaultValue `false` */
    pauseWhenOffscreen?: boolean;
    /** 3D: release the WebGL context while the calculator is out of view. @defaultValue `true` */
    releaseContextWhenOffscreen?: boolean;
    /** Geometry: hide the geometry toolbar and tools. @defaultValue `false` */
    hideGeoUI?: boolean;
    /** 3D: beta features, such as per-surface resolution and translucent surfaces. @defaultValue `false` */
    beta3d?: boolean;
    /** Allow strings (categorical data) in expressions. @defaultValue `false` */
    categoricalData?: boolean;
    /** Pause the evaluator while the user is zooming. @defaultValue `false` */
    disableWorkerOnZoom?: boolean;
    /** Cache rendered SVG images. @defaultValue `false` */
    cacheRenderedSvgs?: boolean;
    /** Graph hidden expressions too (the "ghost mode" checkbox in advanced settings). @defaultValue `false` */
    ghostMode?: boolean;
    /** Geometry: draw an arc on reflection previews. @defaultValue `false` */
    reflectionArc?: boolean;
    /** Log the evaluator's internal errors to the console. @defaultValue `false` */
    logInternalErrors?: boolean;
    /** Show the compiler debugging panel. @defaultValue `false` */
    debugCompiler?: boolean;
    /** Show each item's id in the expression list. @defaultValue `false` */
    showIDs?: boolean;
    /** Show the evaluator's progress on each item, with a legend. @defaultValue `false` */
    debugProgressUpdates?: boolean;
    /** Maximum depth of recursive function calls, from 1 to 1,000,000. @defaultValue the evaluator's built-in limit */
    recursionDepthLimit?: number;
    /** Never narrate coordinates to screen readers, except during Audio Trace. @defaultValue `false` */
    reportPositionNone?: boolean;
    /** The calculator is embedded in a Desmos notebook. @defaultValue `false` */
    insideDesNotebook?: boolean;
    /** The expression list is rendered outside the calculator (split panel). @defaultValue `false` */
    expressionsExternal?: boolean;
    /** 3D: show the orientation buttons. @defaultValue `true` */
    orientationButtons?: boolean;
    /** Accepted, but not read anywhere in the v1.13 bundle. */
    debug3dRender?: unknown;
    /** 3D: force this many depth-peeling layers for translucent surfaces. @defaultValue chosen from the scene */
    debugPeelLayers?: number;
    /** 3D: choose the number of depth-peeling layers from the scene. @defaultValue `true` */
    adaptivePeeling?: boolean;
    /** Accepted, but not read anywhere in the v1.13 bundle. */
    debugPixelRatio?: unknown;
    /** 3D: opacity (as LaTeX) given to new translucent surfaces. @defaultValue `'0.8'` */
    translucentOpacity?: Latex;
    /** 3D: samples per pixel for depth peeling. @defaultValue chosen from the device pixel ratio */
    peelUpsample?: number;
    /** 3D: render surfaces by ray casting. @defaultValue `false` */
    rayCast?: boolean;
  }

  /**
   * Old options that still work: the calculator logs a deprecation warning
   * and sets the replacement.
   */
  interface DeprecatedGraphingCalculatorOptions {
    /** @deprecated Use `settingsMenu` and `expressionsTopbar`, which this sets. */
    menus?: boolean;
    /** @deprecated Use `pointsOfInterest`, which this sets. */
    solutions?: boolean;
    /** @deprecated Removed in API v1.0; ignored. */
    singleVariableSolutions?: boolean;
    /** @deprecated Use `actions`; `true` sets `actions: true`. */
    clickableObjects?: boolean;
    /** @deprecated Use `authorFeatures`, which this sets. */
    administerSecretFolders?: boolean;
  }

  type AxisScale = 'linear' | 'logarithmic';

  /** Everything that can be passed to the `GraphingCalculator` constructor or `updateSettings()`. */
  interface GraphingCalculatorOptions
    extends GraphingCalculatorConfig,
      GraphSettings,
      UndocumentedGraphingCalculatorConfig,
      InternalGraphingCalculatorOptions,
      DeprecatedGraphingCalculatorOptions {}

  /** Options for `Desmos.Geometry`. Any graphing calculator option is accepted. */
  type GeometryOptions = GraphingCalculatorOptions;

  /** Options for `Desmos.Calculator3D`. Any graphing calculator option is accepted. */
  type Calculator3DOptions = GraphingCalculatorOptions;

  /** Options that are accepted but never appear on `calculator.settings`. */
  type WriteOnlyGraphingOption =
    | 'substitutions'
    | 'regressionTemplates'
    | 'intervalComprehensions'
    | 'recursion'
    | keyof InternalGraphingCalculatorOptions
    | keyof DeprecatedGraphingCalculatorOptions;

  /** The current value of every option and graph setting that appears on `calculator.settings`. */
  type GraphingCalculatorSettingsValues = {
    readonly [K in Exclude<keyof GraphingCalculatorOptions, WriteOnlyGraphingOption | 'graphDescription'>]-?: NonNullable<
      GraphingCalculatorOptions[K]
    >;
  } & {
    readonly graphDescription: string | undefined;
  };

  /**
   * `calculator.settings`: the current settings, observable per property.
   * Change them with `calculator.updateSettings()`.
   *
   * @example
   * calculator.settings.observe('xAxisLabel', () => {
   *   console.log(calculator.settings.xAxisLabel);
   * });
   */
  type GraphingCalculatorSettings = GraphingCalculatorSettingsValues & Observable<GraphingCalculatorSettingsValues>;
}

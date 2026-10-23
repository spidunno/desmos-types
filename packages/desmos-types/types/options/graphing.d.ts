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
  }

  type AxisScale = 'linear' | 'logarithmic';

  /** Everything that can be passed to the `GraphingCalculator` constructor or `updateSettings()`. */
  interface GraphingCalculatorOptions extends GraphingCalculatorConfig, GraphSettings {}

  /** Options for `Desmos.Geometry`. Any graphing calculator option is accepted. */
  type GeometryOptions = GraphingCalculatorOptions;

  /** Options for `Desmos.Calculator3D`. Any graphing calculator option is accepted. */
  type Calculator3DOptions = GraphingCalculatorOptions;

  /** Options that are accepted but never appear on `calculator.settings`. */
  type WriteOnlyGraphingOption =
    | 'substitutions'
    | 'regressionTemplates'
    | 'intervalComprehensions'
    | 'recursion';

  /**
   * Settings present on `calculator.settings` at runtime that the docs don't
   * mention. They are read-only here because their behavior when set is not
   * part of the public API.
   *
   * @remarks Undocumented: may change without notice.
   */
  interface UndocumentedGraphingSettings {
    /** Whether Complex Mode is currently on. */
    readonly complex: boolean;
    readonly functionDefinition: boolean;
    readonly restrictGridToFirstQuadrant: boolean;
    readonly userLockedViewport: boolean;
    readonly authorMode: boolean;
    readonly advancedStyling: boolean;
    readonly leftAlign3dViewportControls: boolean;
    readonly translucentSurfaces: boolean;
    readonly showKeyboardShortcutsInTooltips: boolean;
    readonly showPerformanceMeter: boolean;
  }

  /** The current value of every documented option and graph setting. */
  type GraphingCalculatorSettingsValues = {
    readonly [K in Exclude<keyof GraphingCalculatorOptions, WriteOnlyGraphingOption | 'graphDescription'>]-?: NonNullable<
      GraphingCalculatorOptions[K]
    >;
  } & {
    readonly graphDescription: string | undefined;
  } & UndocumentedGraphingSettings;

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

/**
 * `calculator.controller.grapher2d`: the 2D graph paper. Owns the projection
 * (math ↔ pixel mapping), the graph settings, the viewport controller, the
 * draw layers and the graph sketches (see graph-sketches.d.ts).
 *
 * Coordinate systems:
 * - **math**: graph coordinates, y up.
 * - **pixel**: CSS pixels relative to the top-left of the graph paper, y down.
 *   The canvas is scaled by `devicePixelRatio` internally, so you never
 *   see physical pixels here.
 */
declare namespace Desmos.Internals {
  // ---------------------------------------------------------------------------
  // Geometry primitives
  // ---------------------------------------------------------------------------

  /** A point, in math or pixel coordinates depending on context. */
  interface Point {
    x: number;
    y: number;
  }

  /** Graph paper size in CSS pixels. */
  interface Screen {
    width: number;
    height: number;
  }

  /** A rectangle in math coordinates (`top > bottom`). */
  interface MathRect {
    left: number;
    right: number;
    bottom: number;
    top: number;
  }

  /** A rectangle in pixel coordinates (`bottom > top`, since y points down). */
  interface PixelRect {
    left: number;
    right: number;
    top: number;
    bottom: number;
  }

  /** Axis scales, as found on {@link GrapherSettings}. */
  interface AxisScales {
    xAxisScale: Desmos.AxisScale;
    yAxisScale: Desmos.AxisScale;
  }

  /** Viewport bounds as LaTeX strings: the form stored in graph state. */
  interface LatexViewport {
    xmin: string;
    xmax: string;
    ymin: string;
    ymax: string;
    zmin?: string;
    zmax?: string;
  }

  /** Viewport bounds as numbers. `zmin`/`zmax` are only set in 3D. */
  interface ViewportObject {
    xmin: number;
    xmax: number;
    ymin: number;
    ymax: number;
    zmin?: number;
    zmax?: number;
  }

  // ---------------------------------------------------------------------------
  // Viewport
  // ---------------------------------------------------------------------------

  /**
   * The visible math region. Immutable in practice: the grapher replaces the
   * whole viewport (and projection) when you pan or zoom, so a reference you
   * hold keeps describing the old view.
   */
  interface Viewport extends Generated.Grapher2DLastTickViewport {
    xmin: number;
    xmax: number;
    ymin: number;
    ymax: number;
    zmin?: number;
    zmax?: number;
    toObject(): ViewportObject;
    /** Compares all six bounds with `===`. */
    equals(other: ViewportObject): boolean;
    /** `xmin < xmax`, both finite (and positive for a logarithmic axis). */
    isXValid(scale: Desmos.AxisScale): boolean;
    isYValid(scale: Desmos.AxisScale): boolean;
    isZValid(): boolean;
    isValid(scales: AxisScales): boolean;
    /** Height over width in math units (in decades for logarithmic axes). */
    aspectRatio(scales: AxisScales): number;
    /** Whether one math unit is the same number of pixels on both axes (within 1px). */
    isSquare(screen: Screen, scales: AxisScales): boolean;
    isSquare3D(): boolean;
    getSquaredAxisLimits(options: { axis: 'x' | 'y'; screen: Screen; settings: AxisScales }): { min: number; max: number };
    /** Adjust `xmin`/`xmax` about their midpoint so the axes are square. */
    squareXAxis(screen: Screen, scales: AxisScales): Viewport;
    /** Adjust `ymin`/`ymax` about their midpoint so the axes are square. */
    squareYAxis(screen: Screen, scales: AxisScales): Viewport;
    /** Square the axes by shrinking whichever axis is too long. */
    squareCrop(screen: Screen, scales: AxisScales): Viewport;
    /** Distance from the origin to the farthest corner. */
    largestR(): number;
    /** Distance from the origin to the nearest visible point (0 if the origin is visible). */
    smallestR(): number;
    /** 1.5 × the largest absolute bound; how far the polar grid is drawn. */
    polarDiameter(): number;
  }

  // ---------------------------------------------------------------------------
  // Projection
  // ---------------------------------------------------------------------------

  /**
   * How one axis maps values:
   * - `linear`: `s * v + t`
   * - `logarithmic`: `s * ln(v) + t` (math → pixels on a log axis)
   * - `exponential`: `exp(s * v + t)` (pixels → math on a log axis)
   */
  type ScaleType = 'linear' | 'logarithmic' | 'exponential';

  interface Scale {
    type: ScaleType;
    s: number;
    t: number;
  }

  /**
   * A per-axis mapping between two coordinate systems. `projection.mathToPixels`
   * and `projection.pixelsToMath` are the two directions.
   */
  interface ScreenTransform {
    xScale: Scale;
    yScale: Scale;
    mapX(value: number): number;
    mapY(value: number): number;
    mapPoint(point: Point): Point;
    mapCoordinatePair(pair: [number, number]): [number, number];
    mapRect(rect: MathRect | PixelRect): { left: number; right: number; bottom: number; top: number };
    /** The reverse mapping. */
    inverse(): ScreenTransform;
    /** Interpolate between two values along the x axis (geometrically on a log axis). `t` runs from 0 to 1. */
    interpolateX(from: number, to: number, t: number): number;
    interpolateY(from: number, to: number, t: number): number;
    /** Pixels per math unit on x. Throws unless the x axis is linear. */
    dangerouslyGetXScaleFactor(): number;
    /** Pixels per math unit on y (negative, since y points down). Throws unless the y axis is linear. */
    dangerouslyGetYScaleFactor(): number;
  }

  /**
   * The current mapping between math and pixel coordinates. Replaced (not
   * mutated) whenever the viewport or screen size changes, so call
   * `grapher2d.getProjection()` each time rather than keeping one.
   *
   * @example
   * const p = Calc.controller.grapher2d.getProjection();
   * p.map_pt({ x: 1, y: 2 });          // math → pixels
   * p.reverse_map_pt({ x: 100, y: 50 }); // pixels → math
   */
  interface Projection extends Generated.Grapher2DProjection {
    screen: Screen;
    viewport: Viewport;
    settings: GrapherSettings;
    /** The viewport as a {@link MathRect}. */
    mathCoordinates: MathRect;
    /** The screen as a {@link PixelRect}: `{ left: 0, top: 0, right: width, bottom: height }`. */
    pixelCoordinates: PixelRect;
    mathToPixels: ScreenTransform;
    pixelsToMath: ScreenTransform;
    /** Rebuild `mathToPixels`/`pixelsToMath` after changing the axis scales. */
    updateScalePairs(): void;
    /** Math x → pixel x. */
    mapx(x: number): number;
    /** Math y → pixel y. */
    mapy(y: number): number;
    /** Pixel x → math x. */
    reverse_mapx(x: number): number;
    /** Pixel y → math y. */
    reverse_mapy(y: number): number;
    mapAlongAxis(value: number, axis: 'x' | 'y'): number;
    reverseMapAlongAxis(value: number, axis: 'x' | 'y'): number;
    /** Math point → pixel point. */
    map_pt(point: Point): Point;
    /** Pixel point → math point. */
    reverse_map_pt(point: Point): Point;
    /** Map a flat `[x0, y0, x1, y1, …]` array from math to pixels. */
    map_xy_pairs(flat: number[]): number[];
    /** Whether a pixel point is within the screen, optionally extended by `margin` pixels. */
    coordsAreOnscreen(x: number, y: number, margin?: number): boolean;
    /** Clamp a pixel point into the screen. */
    closestPointOnScreen(point: Point): Point;
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  /**
   * An object whose properties are observed by name. The internal base class
   * of `GrapherSettings` and its `config`.
   *
   * Observers receive the property name and the object. Names may be
   * namespaced (`'showGrid.myMod'`) so the observer can be removed alone,
   * and `observe` also accepts several space-separated names.
   */
  interface ObservableModel<Props> extends Desmos.Observable<Props> {
    guid: string;
    getProperty<K extends keyof Props>(name: K): Props[K];
    /** Set a property and notify its observers if the value changed (deep comparison). */
    setProperty<K extends keyof Props>(name: K, value: Props[K]): void;
    setPropertyWithoutNotifying<K extends keyof Props>(name: K, value: Props[K]): void;
    /** Set several properties, then notify observers of those that changed. */
    setProperties(values: Partial<Props>): void;
    notifyPropertyChange(name: Extract<keyof Props, string>): void;
    observe(
      names: Desmos.ObservableProperty<Props> | `${Extract<keyof Props, string>} ${string}`,
      callback: Desmos.ObserverCallback<this, Props>
    ): void;
    /** `observe`, then immediately call `callback` for each named property that exists. */
    observeAndSync(
      names: Desmos.ObservableProperty<Props> | `${Extract<keyof Props, string>} ${string}`,
      callback: Desmos.ObserverCallback<this, Props>
    ): void;
    /** Also accepts `'.namespace'` to remove that namespace from every property. */
    unobserve(names: Desmos.ObservableProperty<Props> | `.${string}`): void;
    unobserveAll(): void;
  }

  /**
   * Graph settings that are saved in the graph state (`stateProperties`).
   * Mostly the documented {@link Desmos.GraphSettings}, plus 3D and
   * internal ones.
   */
  interface GrapherStateSettings extends Required<Desmos.GraphSettings> {
    complex: boolean;
    restrictGridToFirstQuadrant: boolean;
    userLockedViewport: boolean;
    squareAxes: boolean;
    product: Product;
    includeFunctionParametersInRandomSeed: boolean;
    hideCustomColors: boolean;
    // 3D only
    worldRotation3D: number[];
    axis3D: number[];
    speed3D: number;
    userLockedRotation: boolean;
    disableLighting: boolean;
    perspectiveDistortion: number;
    showPlane3D: boolean;
    showNumbers3D: boolean;
    showAxis3D: boolean;
    showAxisLabels3D: boolean;
    showBox3D: boolean;
  }

  /**
   * Drawing settings derived from `config.projectorMode` and `highlight`.
   * Setting them directly works until the next time those change.
   */
  interface GrapherStyleSettings {
    /** Font size of axis numbers and labels. @defaultValue `14` (`19` in projector mode) */
    labelSize: number;
    majorAxisOpacity: number;
    minorAxisOpacity: number;
    axisOpacity: number;
    axisLineWidth: number;
    axisLineOffset: number;
    /** Approximate spacing between axis numbers. */
    pixelsPerLabel: number;
    curveOpacity: number;
    /** Overrides every curve's color when set. */
    globalCurveColor?: HexColor;
    disableFill: boolean;
    graphLineWidth: number;
    pointLineWidth: number;
  }

  interface GrapherSettingsProperties extends GrapherStateSettings, GrapherStyleSettings {
    /** Draw everything thicker, as for a selected expression. Unset until first used. */
    highlight?: boolean;
    /** Color of hanging labels: the background mixed 40% toward the text color. */
    labelHangingColor: HexColor;
    /** Which axis the user last zoomed alone; decides which axis "zoom square" keeps. */
    lastChangedAxis: 'x' | 'y';
    /** Set on the settings copy used while drawing a screenshot. */
    takingScreenshot?: boolean;
  }

  /**
   * The calculator configuration as seen by the grapher: the constructor
   * options (`calculator.updateSettings()` writes here), observable by name.
   */
  type GrapherConfig = Desmos.GraphingCalculatorConfig & ObservableModel<Desmos.GraphingCalculatorConfig> & { [option: string]: unknown };

  /**
   * `grapher2d.settings` (also `controller.getGraphSettings()`): graph
   * settings and derived drawing settings, observable by name. Changing a
   * state property through `setProperty` requests a redraw.
   *
   * @example
   * const s = Calc.controller.grapher2d.settings;
   * s.observe('showGrid.myMod', () => console.log('grid', s.showGrid));
   * s.unobserve('showGrid.myMod');
   */
  interface GrapherSettings
    // Omitted members are redeclared by the other bases; Grapher2D's
    // `extends Generated.Grapher2D` still checks the result against the bundle.
    extends Omit<Generated.GrapherSettings, keyof ObservableModel<{}> | keyof GrapherSettingsProperties>,
      GrapherSettingsProperties,
      ObservableModel<GrapherSettingsProperties> {
    controller: Controller;
    config: GrapherConfig;
    /** Names of the {@link GrapherStateSettings}. */
    stateProperties: Array<Extract<keyof GrapherStateSettings, string>>;
    /** Properties copied when the settings are cloned (for screenshots). */
    cloneProperties: Array<Extract<keyof GrapherSettingsProperties, string>>;
    /** Per style property: multipliers for [normal, highlighted, projector, projector + highlighted]. */
    highlightPropertyMultipliers: Record<string, [number, number, number, number]>;
    getHighlightPropertyMultiplier(name: 'curveOpacity' | 'graphLineWidth' | 'pointLineWidth', highlighted: boolean): number;
    getFillOpacityMultiplier(): number;
    getBackgroundColor(options?: { invertWhite?: boolean }): HexColor;
    getTextColor(options?: { invertBlack?: boolean }): HexColor;
    getAccentColor(options?: { invertBlack?: boolean }): HexColor;
    getConfiguredBackgroundColor(): HexColor;
    getConfiguredTextColor(): HexColor;
    getConfiguredAccentColor(): HexColor;
    cloneConfig(): Desmos.GraphingCalculatorConfig;
    /** Validate and coerce settings as `updateSettings()` does, warning about bad values. */
    validateSettings(settings: Partial<GrapherStateSettings>): Partial<GrapherStateSettings>;
    _validateSetting<K extends keyof GrapherStateSettings>(name: K, value: unknown): GrapherStateSettings[K];
    addStateProperty(name: string, defaultValue: unknown): void;
    setController(controller: Controller): void;
  }

  // ---------------------------------------------------------------------------
  // Events, layers, drawing
  // ---------------------------------------------------------------------------

  /**
   * `grapher2d.events`. The grapher triggers `'redraw'` after every redraw,
   * with the time it took in milliseconds.
   */
  interface GrapherEvents extends Generated.Grapher2DEvents {
    observeEvent(event: Desmos.EventName<'redraw'>, callback: (event: 'redraw', durationMs: number) => void): void;
    unobserveEvent(event: Desmos.EventName<'redraw'> | `.${string}`): void;
    triggerEvent(event: 'redraw', durationMs: number): void;
  }

  /** What every layer's `redrawToCtx` receives. */
  interface DrawContext {
    ctx: CanvasRenderingContext2D;
    projection: Projection;
    transformationPreviewParentData: {
      translationPreviewVectorParents: Set<string>;
      translationsWithVisibleVectorParent: Set<string>;
      rotationPreviewAngleMarkerParents: Set<string>;
      rotationsWithVisibleAndCenteredAngle: Set<string>;
    };
  }

  // ---------------------------------------------------------------------------
  // Grid layer
  // ---------------------------------------------------------------------------

  /**
   * Grid spacing in math units: the axis step settings if they fit, otherwise
   * steps picked so the axis numbers don't overlap. A minor step of 0 means no
   * minor lines; both are NaN on a logarithmic axis.
   */
  interface GridSteps {
    majorStepX: number;
    minorStepX: number;
    majorStepY: number;
    minorStepY: number;
  }

  /** Where a logarithmic axis draws its lines (a linear axis has empty lists). */
  interface LogAxisGrid {
    label: number[];
    major: number[];
    minor: number[];
    /** Multiplies the minor line opacity; fades minor lines as decades shrink. */
    unitOpacity: number;
  }

  interface LogGrid {
    x: LogAxisGrid;
    y: LogAxisGrid;
  }

  /**
   * `grapher2d.gridLayer` (also `privateGetGridLayer()`): draws the grid,
   * axes and axis numbers, under every graph.
   *
   * Lines are drawn 1px wide at `Math.round(px - 0.5) + 0.5`, in the text
   * color: minor lines at `minorAxisOpacity`, then major lines over them at
   * an opacity that composites to `majorAxisOpacity`. Lines on the edges of
   * the screen, and at 0 when that axis is shown, are skipped.
   */
  interface GridLayer extends Generated.Grapher2DGridLayer {
    /**
     * Draw the whole layer. The main redraw passes `grapher2d.scaleAxis`
     * (the axis being dragged, highlighted); screenshots pass only `context`.
     */
    redrawToCtx(context: DrawContext, scaleAxis?: 'x' | 'y' | 'both'): void;
    drawCartesianGrid(ctx: CanvasRenderingContext2D, projection: Projection, steps: GridSteps, logGrid?: LogGrid): void;
    drawPolarGrid(ctx: CanvasRenderingContext2D, projection: Projection, steps: { majorStepR: number; minorStepR: number }): void;
    /**
     * Draw the numbers at every major step (each one a `strokeText` shadow
     * then a `fillText`), plus tick marks on the axes when `drawTickMarks`
     * (the grid is hidden). Returns the strips along each axis that the
     * numbers cover, which `drawLabels` keeps the axis labels out of.
     */
    drawCartesianStepNumbers(
      ctx: CanvasRenderingContext2D,
      projection: Projection,
      steps: GridSteps,
      drawTickMarks: boolean,
      logGrid?: LogGrid,
    ): { x: PixelRect; y: PixelRect };
  }

  /**
   * Options accepted by the grapher's own screenshot methods. The public
   * `asyncScreenshot` handles `mode` and `mathBounds` itself and passes the
   * rest through.
   */
  interface GrapherScreenshotOptions extends Desmos.ScreenshotOptions {
    format?: 'png' | 'svg';
    showLabels?: boolean;
    transparentBackground?: boolean;
    /** Settings to override for the screenshot only. */
    settings?: Partial<GrapherSettingsProperties>;
    /** Render a tactile graphic for a braille embosser instead. */
    braille?: { embosserModel: 'vpmax8' | 'vpmax11' | 'etc8' | 'etc11' | (string & {}); brailleMode: Desmos.BrailleMode };
    /** SVG only: embed metadata describing the graphed items. */
    includeJIM?: boolean;
  }

  /** {@link GrapherScreenshotOptions} with defaults applied. */
  interface ParsedScreenshotOptions {
    width: number;
    height: number;
    targetPixelRatio: number;
    settings: GrapherSettings;
    transparentBackground: boolean;
  }

  /** `grapher2d.getState()`: the `graph` part of the calculator state. */
  type GrapherState = Partial<GrapherStateSettings> & {
    viewport: LatexViewport;
    __viewportEvaluatedForBackMigration: ViewportObject;
  };

  /** Graph settings and viewport as recorded in the undo history. */
  type GrapherUndoState = { [K in keyof GrapherStateSettings]: GrapherStateSettings[K] } & { viewport: LatexViewport };

  // ---------------------------------------------------------------------------
  // Viewport controller
  // ---------------------------------------------------------------------------

  /**
   * Pans and zooms the graph paper (mouse wheel, touch, keyboard, zoom
   * buttons) and keeps the viewport LaTeX in sync with the numeric viewport.
   *
   * To move the view from a mod, use `setCurrentViewport` (immediate) or
   * `animateToViewport`. Neither adds an undo step; call
   * `grapher2d.debounceUserRequestedViewportChange()` afterwards for that.
   */
  interface ViewportController extends Generated.Grapher2DViewportController {
    grapher: Grapher2D;
    controller: Controller;
    /** Pixel position of the mouse, relative to the graph paper. */
    mousePt: Point;
    /** The viewport as entered (may be expressions, e.g. `'2\\pi'`). */
    currentViewportLatex: LatexViewport;
    /** The viewport recorded in the undo history. */
    undoViewportLatex: LatexViewport;
    getViewport(): Viewport;
    getProjection(): Projection;
    getCurrentViewportLatex(): LatexViewport;
    getUndoViewportLatex(): LatexViewport;
    /** Jump to a viewport. Invalid axes keep their current bounds. */
    setCurrentViewport(viewport: ViewportObject): void;
    setCurrentViewportLatex(viewport: LatexViewport): void;
    setUndoViewport(viewport: ViewportObject): void;
    setUndoViewportLatex(viewport: LatexViewport): void;
    /** Set the numeric viewport without touching the LaTeX. Cancels any animation. */
    setEvaluatedViewport(viewport: ViewportObject): void;
    _setViewportWithoutCancellingAnimation(viewport: ViewportObject): void;
    /** Animate to a viewport over 500ms. */
    animateToViewport(viewport: ViewportObject): void;
    cancelAnimation(): void;
    /** The zoom buttons. `'default'` restores the default viewport. */
    zoom(kind: 'in' | 'out' | 'square' | 'default'): void;
    /** Animate to a viewport and announce it to screen readers. */
    zoomCustom(viewport: ViewportObject): void;
    zoomHomeImmediately(): void;
    zoomSquareImmediately(): void;
    setDefaultViewport(): void;
    /** The current viewport with one axis adjusted so the axes are square. */
    getSquareViewport(): Viewport;
    /**
     * The viewport after applying a pixel-space transform (anything with
     * `mapRect`), e.g. a translation by the drag distance.
     */
    getTransformedViewport(transform: { mapRect(rect: PixelRect): { left: number; right: number; bottom: number; top: number } }): Viewport;
    transformViewport(transform: { mapRect(rect: PixelRect): { left: number; right: number; bottom: number; top: number } }): void;
    /** Pan by 5 pixels, as the arrow keys do. */
    panFromKeyboard(direction: 'Up' | 'Down' | 'Left' | 'Right'): void;
    /** Zooming out further would exceed the limits (log axes, geometry). */
    tooBig(viewport: ViewportObject): boolean;
    tooSmall(viewport: ViewportObject): boolean;
    setScreen(screen: Screen): void;
    /** Whether zoom and pan are disabled (`lockViewport` or the user lock). */
    isViewportLocked(): boolean;
    isDefaultViewportRestored(): boolean;
    /** Pixel point to scale about when dragging an axis: the origin, clamped to the screen. */
    chooseDragScaleCenter(): Point;
  }

  // ---------------------------------------------------------------------------
  // Grapher2D
  // ---------------------------------------------------------------------------

  /**
   * The rest of the 2D grapher (merged into the `Grapher2D` declared in
   * controller.d.ts). Sketch members are in graph-sketches.d.ts.
   */
  interface Grapher2D {
    type: '2d';
    elt: HTMLDivElement;
    settings: GrapherSettings;
    events: GrapherEvents;
    viewportController: ViewportController;
    /** Draws the grid, axes and axis numbers. */
    gridLayer: GridLayer;
    privateGetGridLayer(): GridLayer;
    __projection: Projection;
    /** The viewport at the last animation frame (unset before the first one); used to detect viewport changes. */
    lastTickViewport?: Viewport;
    /** Image items currently drawn, keyed by id. Images are added once loaded. */
    graphImages: Record<ExpressionId, ImageModel>;
    /** Which geometry token (the chips in the toolbar) is hovered or selected, as an expression id. */
    lastActiveToken: { selected?: ExpressionId; hovered?: ExpressionId };
    /** Which axis a drag scales, from where the mouse is: near an axis, or elsewhere (`'both'`). */
    scaleAxis?: 'x' | 'y' | 'both';
    /** Set while the user is dragging the graph paper. */
    isDragging?: boolean;
    /** Draw POI dots of selected sketches. */
    showPOIDots: boolean;
    isVisible: boolean;
    __redrawRequested: boolean;
    __drawLayers: DrawLayer[];
    /** Ids in keyboard tab order. */
    __tabOrder: string[];
    /** CSS class names on `elt`, keyed by who set them (see `setLayerClass`). */
    _layerClasses: Record<string, string | undefined>;
    _classLayers: Record<string, Set<string>>;

    /** The current projection. Replaced on every pan, zoom or resize. */
    getProjection(): Projection;
    _setProjection(projection: Projection): void;
    /** The current viewport as numbers. */
    getCurrentViewport(): ViewportObject;
    /** The viewport `setBlank()` would show. */
    getDefaultViewport(): Viewport;
    /** `viewport` with its y axis squared if `squareAxes` is on. */
    computeConcreteViewport(viewport: Viewport): Viewport;
    /** Load the viewport (and nothing else) from a state's `graph.viewport`. */
    setViewportState(viewport: LatexViewport): void;
    /** Record the current viewport as an undo step after 200ms without changes. */
    debounceUserRequestedViewportChange(): void;
    _updateScreenSize(width: number, height: number): void;
    /** Size of the canvas in CSS pixels. */
    size(): Screen;

    /** Request a redraw on the next animation frame. */
    redrawAllLayers(): void;
    /** Redraw now. Fires the `'redraw'` event. */
    redrawAllLayersSynchronously(): void;
    _redrawAllLayers(): void;
    _redrawGrapher(context: DrawContext | undefined): void;
    /** Call `callback` after the pending redraw, or now if none is pending. */
    notifyAfterRedraw(callback: () => void): void;
    /** Runs every animation frame; redraws if requested. */
    tick(now?: number): void;
    /** The drawing context for the visible canvas, or `undefined` before the canvas exists. */
    createDrawContext(): DrawContext | undefined;
    getCanvasNode(): HTMLCanvasElement;
    /** Read pixels from the visible canvas (physical pixels, not CSS pixels). */
    getImageData(x: number, y: number, width: number, height: number): ImageData | undefined;
    /** Clear the canvas. */
    _clear(): void;
    /** Forget all sketches and images. They come back as the evaluator updates them. */
    clear(): void;
    update(): void;
    remove(): void;

    getDrawLayers(): DrawLayer[];
    /** Replace the draw layers. The controller resets them from the expression list on each update. */
    setDrawLayers(layers: DrawLayer[]): void;
    /** Every layer's `drawOrder`, concatenated. Layers are in list-model.d.ts. */
    generateMergeDrawOrder(): Generator<string, void, undefined>;
    getTabOrder(): string[];
    setTabOrder(order: string[]): void;
    /**
     * Put a CSS class on the grapher element on behalf of `owner`, replacing
     * that owner's previous class (`undefined` removes it). Used for cursors,
     * e.g. owner `'movablePoints'` with `'dcg-mouse-over-movable-point'`.
     */
    setLayerClass(owner: string, className: string | undefined): void;
    classLayers(className: string): Set<string>;

    getGraphImage(id: ExpressionId): ImageModel | undefined;
    /** Starts drawing an image once it has loaded. */
    addGraphImage(image: ImageModel): void;
    removeGraphImage(id: ExpressionId): void;

    setActiveToken(id: ExpressionId | undefined, kind: 'selected' | 'hovered'): void;
    /** Pixel rectangle of the geometry box selection, or `undefined` for none. */
    setBoxSelectRectangle(rect: PixelRect | undefined): void;
    /** Called every frame before drawing; used while dragging points. */
    registerMovablePointListener(listener: () => void): void;
    deregisterMovablePointListener(): void;

    /** PNG data URI. `showLabels` is ignored here; use `asyncScreenshot`. */
    screenshot(options?: GrapherScreenshotOptions): string;
    /** PNG data URI or SVG string, depending on `format`. */
    asyncScreenshot(options: GrapherScreenshotOptions | undefined, callback: (data: string) => void): void;
    screenshotToCanvas(
      canvas: HTMLCanvasElement | { getContext(type: '2d'): CanvasRenderingContext2D; width: number; height: number },
      options?: GrapherScreenshotOptions
    ): void;
    makeScreenshotProjection(options?: GrapherScreenshotOptions): Projection;
    _parseScreenshotOpts(options?: GrapherScreenshotOptions): ParsedScreenshotOptions;
    _syncScreenshotReturnCanvas(options?: GrapherScreenshotOptions): HTMLCanvasElement;

    /** The `graph` part of the calculator state. */
    getState(options: { stripDefaults?: boolean }): GrapherState;
    /** Load graph settings and viewport from a state. Clears sketches unless `doNotClear`. */
    setGrapherState(state: Partial<GrapherState>, options?: { doNotClear?: boolean }): void;
    getUndoRedoFullState(): GrapherUndoState;
    /** Like `getUndoRedoFullState`, without `worldRotation3D` while auto-rotating. */
    getUndoRedoDiffState(): Partial<GrapherUndoState>;

    getIsVisible(): boolean;
    _setIsVisible(visible: boolean): void;
  }
}

/**
 * `controller.grapher2d.graphSketches`: what the 2D grapher draws for each
 * expression.
 *
 * Every graphed expression has one {@link GraphSketch}, keyed by expression
 * id. A sketch holds one or more {@link GraphBranch}es, which are the units
 * the grapher actually draws. One expression often produces several branches:
 * a list produces one per element, an inequality produces boundary curves plus
 * a fill, a polygon produces a fill plus an outline, an angle produces a marker
 * plus a label.
 *
 * Branches are a discriminated union on the numeric `branchMode`; see
 * {@link BranchModes} for the names. The meaning of `segments` depends on the
 * mode, so always narrow on `branchMode` before reading it.
 *
 * Typed from the v1.13 bundle: every branch mode below was observed at runtime
 * except `ERROR` (15), whose shape comes from the code that builds it.
 */
declare namespace Desmos.Internals {
  // ---------------------------------------------------------------------------
  // Enums (numeric at runtime; there is no exported enum object)
  // ---------------------------------------------------------------------------

  /**
   * Names of the `branchMode` values that reach the 2D grapher. Use as a type:
   * `BranchModes['Y']` is `2`.
   *
   * The bundle also defines `NONE` (10), `VISUALIZATION` (11), `POLYGON` (16)
   * and the 3D modes (100+), but the 2D grapher never receives them.
   */
  interface BranchModes {
    /** `x` as a function of `y`. */
    X: 1;
    /** `y` as a function of `x`. */
    Y: 2;
    /** Static points. */
    XYPOINT: 3;
    /** Draggable points. */
    XYPOINT_MOVABLE: 4;
    /** Parametric curves; also point-list lines, table lines and box plots. */
    PARAMETRIC: 5;
    POLAR: 6;
    /** A filled region: inequality shading, polygon interiors, histogram bars. */
    POLYGONFILL: 7;
    IMPLICIT: 8;
    /** The expression failed while graphing. */
    ERROR: 15;
    SEGMENT: 17;
    LINE: 18;
    RAY: 19;
    CIRCLE: 20;
    ARC: 21;
    /** A text label attached to a geometry object (segment, polygon or angle). */
    LABEL: 22;
    ANGLE_MARKER: 23;
    VECTOR: 24;
    /** Complex numbers plotted as points (complex mode). */
    COMPLEX_NUMBER: 25;
    COMPLEX_NUMBER_MOVABLE: 26;
    IMAGE: 27;
  }

  type BranchModeName = keyof BranchModes;
  type BranchMode = BranchModes[BranchModeName];

  /** Kinds of point of interest. `type` on {@link POI}. */
  interface POITypes {
    /** Intersection with another curve. */
    INTERSECTION: 1001;
    /** Zero (root). */
    ZERO: 1002;
    /** Axis intercept. */
    INTERCEPT: 1003;
    /** Local minimum or maximum. */
    EXTREMUM: 1004;
    /** A plotted point without a visible label. */
    DEFINED: 1006;
    /** A traced point. Not created by sketches. */
    TRACE: 1007;
    /** A point with a visible (or interactive) label, or a geometry label anchor. */
    LABEL: 1008;
  }

  type POIType = POITypes[keyof POITypes];

  /** The comparison of the expression that produced a branch. */
  type GraphOperator = '=' | '<' | '>' | '<=' | '>=' | '!=';

  // ---------------------------------------------------------------------------
  // Shared parts
  // ---------------------------------------------------------------------------

  /** Coordinates of a group of points of interest, as parallel arrays. */
  interface POICoordinates {
    x: number[];
    y: number[];
    /** For intersections: what each point intersects with. */
    intersects?: unknown[];
  }

  /** Points of interest of a curve. Only `X` and `Y` branches turn these into {@link POI}s. */
  interface CurvePOIs {
    zeros?: POICoordinates;
    intercept?: POICoordinates;
    extrema?: POICoordinates;
    /** Set by the grapher after intersections are computed. */
    intersections?: POICoordinates;
  }

  /** Points of interest of a point branch: the points themselves. */
  interface PointPOIs {
    defined: POICoordinates;
    intersections?: POICoordinates;
  }

  /** Branches without their own points of interest. */
  interface NoPOIs {
    intersections?: POICoordinates;
  }

  /** The JavaScript compiled from an expression, used for tracing and evaluation. */
  interface CompiledFunction {
    source: string;
    /** Parameter names, e.g. `['x']`, `['t']`, `['theta']`, `['x', 'y']`. */
    args: string[];
    constants: unknown[];
    executionMetadata: Record<string, unknown>;
    /** Created lazily from `source`. */
    fn?: (...args: number[]) => number;
  }

  /** Extent of a statistical object or table, used for "zoom to fit". */
  interface BranchBoundingBox {
    type: 'continuousDistribution' | 'discreteDistribution' | 'histogram' | 'dotplot' | 'boxplot' | 'table';
    xmin: number;
    xmax: number;
    ymin: number;
    ymax: number;
    /** For histograms and dot plots. */
    binWidth?: number;
    /** For tables: the column variable, e.g. `'y_1'`. */
    symbol?: string;
  }

  /** A localized message: a translation key plus its substitutions. */
  interface LocalizedMessage {
    key: string;
    vars?: Record<string, unknown>;
  }

  /** Fields every branch can have. */
  interface GraphBranchBase<M extends BranchMode> {
    /**
     * What kind of branch this is, and so how to read `segments`. A plain
     * number at runtime; compare against it directly (`branch.branchMode === 20`),
     * which in TypeScript also narrows the branch type.
     *
     * | Mode | Name | Drawn for | `segments` |
     * | ---: | --- | --- | --- |
     * | 1 | X | `x = f(y)`, `x` inequalities | flat `[y0, x0, y1, x1, …]` (⚠ y first) |
     * | 2 | Y | `y = f(x)`, `y` inequalities, distributions, solvable implicits | flat `[x0, y0, x1, y1, …]` |
     * | 3 | XYPOINT | points and point lists, dot plots | `[x, y][]` per group |
     * | 4 | XYPOINT_MOVABLE | draggable points | `[x, y][]` per group |
     * | 5 | PARAMETRIC | parametrics, point-list/table lines, polygon outlines, box plots | flat `[x0, y0, …]` |
     * | 6 | POLAR | `r = f(θ)`, polar inequalities | flat `[θ0, r0, θ1, r1, …]` (⚠ polar) |
     * | 7 | POLYGONFILL | inequality shading, polygon/parametric fills, histogram bars | flat `[x0, y0, …]` polygons |
     * | 8 | IMPLICIT | implicit curves | flat `[x0, y0, …]` |
     * | 15 | ERROR | an expression that failed while graphing | `[]`; see `error` |
     * | 17 | SEGMENT | `segment` | `[x1, y1, x2, y2]` |
     * | 18 | LINE | `line` | `[x1, y1, x2, y2]` (two points on it) |
     * | 19 | RAY | `ray` | `[startX, startY, throughX, throughY]` |
     * | 20 | CIRCLE | `circle` | `[cx, cy, r]` |
     * | 21 | ARC | `arc` | `[cx, cy, r, startAngle, endAngle]` |
     * | 22 | LABEL | label of a segment, polygon or angle | placement data; text in `labels` |
     * | 23 | ANGLE_MARKER | `angle`, `directedangle` | `[vx, vy, startAngle, angle, directed]` |
     * | 24 | VECTOR | `vector` | `[tailX, tailY, headX, headY]` |
     * | 25 | COMPLEX_NUMBER | complex numbers (complex mode) | `[re, im][]` per group |
     * | 26 | COMPLEX_NUMBER_MOVABLE | draggable complex numbers | `[re, im][]` per group |
     * | 27 | IMAGE | images | `[]`; see `dimensions` |
     *
     * Modes 17–24 only occur in the geometry tool. Angles are in radians.
     */
    branchMode: M;
    color: HexColor;
    /** Index of the list element this branch was drawn for. */
    listIndex?: number;
    /** `false` when the curve couldn't be fully resolved (detail may be missing). */
    resolved?: boolean;
    boundingBox?: BranchBoundingBox;
    /** The table this branch comes from, if any. */
    tableId?: ExpressionId;
    /** Why values became NaN, if known. Copied to the item model. */
    nanBlame?: unknown;
    /** Set when a recursive function hit the depth limit. Copied to the item model. */
    recursionTerminationStatus?: unknown;
  }

  /** Styling of stroked branches. */
  interface StrokeFields {
    style?: LineStyle;
    lineWidth?: number;
    lineOpacity?: number;
    operator?: GraphOperator;
    /** Fill opacity for inequality boundaries and filled curves. */
    fillOpacity?: number;
    /** Geometry: a dashed extension of an object used to construct an intersection. */
    isIntersectionExtension?: boolean;
  }

  /** Styling of point branches. Several fields may be per-point arrays. */
  interface PointFields {
    style: PointStyle;
    /**
     * A single color, or one per point. The grapher supports per-point
     * arrays; the API's `colorLatex` was not observed to produce them.
     */
    color: HexColor | HexColor[];
    /**
     * Pixels; a single size or one per point (e.g. `pointSize: '[5,10,15]'`).
     * Absent on some branches (e.g. discrete distributions); the grapher then uses 8.
     */
    pointSize?: number | number[];
    /** 0–1; a single opacity or one per point. Absent means 1. */
    pointOpacity?: number | number[];
    pointOutline?: boolean;
    showLabel?: boolean;
    /** One label per point; LaTeX in backticks is already evaluated. */
    labels?: string[];
    labelSize?: number;
    /** Radians. */
    labelAngle?: number;
    labelOrientation?: LabelOrientation;
    suppressTextOutline?: boolean;
    interactiveLabel?: boolean;
    editableLabel?: boolean;
    /** Draw the label without its point. */
    nakedLabel?: boolean;
    /** Indices of points dropped because a coordinate was NaN. */
    droppedIndices?: Record<number, true>;
  }

  /** How a movable point can be dragged. */
  interface MovablePointInfo {
    /** Index of the point (for tables, the row). */
    index: number;
    dragX: boolean;
    dragY: boolean;
  }

  // ---------------------------------------------------------------------------
  // Branches
  // ---------------------------------------------------------------------------

  /**
   * `x` as a function of `y`.
   *
   * ⚠ `segments` are flat `[y0, x0, y1, x1, ...]` arrays: the independent
   * variable `y` comes first, unlike every other curve mode.
   */
  interface XBranch extends GraphBranchBase<1>, StrokeFields {
    /** Polylines, each a flat `[y0, x0, y1, x1, ...]` array. */
    segments: number[][];
    poi: CurvePOIs;
    compiled?: CompiledFunction;
  }

  /** `y` as a function of `x`. Also distribution curves and solved implicit equations. */
  interface YBranch extends GraphBranchBase<2>, StrokeFields {
    /** Polylines, each a flat `[x0, y0, x1, y1, ...]` array. */
    segments: number[][];
    poi: CurvePOIs;
    compiled?: CompiledFunction;
  }

  /** Static points. */
  interface PointBranch extends Omit<GraphBranchBase<3>, 'color'>, PointFields {
    /** Groups of points, each an array of `[x, y]`. */
    segments: Array<Array<[x: number, y: number]>>;
    poi: PointPOIs;
    showPoint: boolean;
    /** Dot plots: whether the x positions still need computing. */
    needsDotplotXMode?: boolean;
  }

  /** Draggable points. */
  interface MovablePointBranch extends Omit<GraphBranchBase<4>, 'color'>, PointFields {
    /** Groups of points, each an array of `[x, y]`. */
    segments: Array<Array<[x: number, y: number]>>;
    poi: PointPOIs;
    showPoint?: boolean;
    /** One entry per point in `segments[0]`. */
    movablePointInfo: MovablePointInfo[];
    /** Image scaling handles: per point, the `[x, y]` scale factor it controls. */
    scaleFactors?: Array<Array<[number, number]>>;
  }

  /**
   * Parametric curves. Also produced for lines through point lists and table
   * columns (with `tableId`) and for box plots.
   */
  interface ParametricBranch extends GraphBranchBase<5>, StrokeFields {
    /** Polylines, each a flat `[x0, y0, x1, y1, ...]` array. */
    segments: number[][];
    poi: CurvePOIs;
    compiled?: CompiledFunction;
  }

  /**
   * Polar curves.
   *
   * ⚠ `segments` are flat `[θ0, r0, θ1, r1, ...]` arrays in polar coordinates.
   */
  interface PolarBranch extends GraphBranchBase<6>, StrokeFields {
    /** Polylines, each a flat `[θ0, r0, θ1, r1, ...]` array (radians). */
    segments: number[][];
    poi: CurvePOIs;
    compiled?: CompiledFunction;
    /** The θ range that was sampled. */
    sampledDomain?: { min?: number; max?: number };
  }

  /**
   * A filled region: inequality shading, the inside of polygons and filled
   * parametric curves, histogram bars.
   */
  interface PolygonFillBranch extends GraphBranchBase<7> {
    /**
     * Polygons, each a flat `[x0, y0, x1, y1, ...]` array. Empty for inequality
     * shading, which is drawn from the boundary branches.
     */
    segments: number[][];
    poi: NoPOIs;
    fillOpacity: number;
    lineOpacity?: number;
    style?: undefined;
  }

  interface ImplicitBranch extends GraphBranchBase<8>, StrokeFields {
    /** Polylines, each a flat `[x0, y0, x1, y1, ...]` array. */
    segments: number[][];
    poi: CurvePOIs;
    compiled?: CompiledFunction;
  }

  /** The expression failed while graphing. Copied to the model as `errorFromGraphing`. */
  interface ErrorBranch extends Omit<GraphBranchBase<15>, 'color'> {
    error: LocalizedMessage;
    segments: [];
  }

  /** Fields shared by the geometry object branches. */
  interface GeometryStrokeFields extends StrokeFields {
    poi: NoPOIs;
  }

  /** A segment between two points. */
  interface SegmentBranch extends GraphBranchBase<17>, GeometryStrokeFields {
    segments: Array<[x1: number, y1: number, x2: number, y2: number]>;
    arrowMode?: ExpressionArrowMode;
  }

  /** An infinite line through two points. */
  interface LineBranch extends GraphBranchBase<18>, GeometryStrokeFields {
    /** Two points the line passes through. */
    segments: Array<[x1: number, y1: number, x2: number, y2: number]>;
    arrowMode?: ExpressionArrowMode;
  }

  /** A ray from a start point through a second point. */
  interface RayBranch extends GraphBranchBase<19>, GeometryStrokeFields {
    segments: Array<[startX: number, startY: number, throughX: number, throughY: number]>;
    arrowMode?: ExpressionArrowMode;
  }

  interface CircleBranch extends GraphBranchBase<20>, GeometryStrokeFields {
    segments: Array<[centerX: number, centerY: number, radius: number]>;
  }

  /** A circular arc from `startAngle` to `endAngle` (radians; either direction). */
  interface ArcBranch extends GraphBranchBase<21>, GeometryStrokeFields {
    segments: Array<[centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number]>;
  }

  /** A text label for a geometry object; the text is in `labels`. */
  interface LabelBranch extends GraphBranchBase<22> {
    /** The kind of object labeled: segment (17), polygon (16) or angle (23). */
    objectType: 16 | 17 | 23;
    /**
     * Placement data for the label. For angles:
     * `[vertexX, vertexY, startAngle, angle]`.
     */
    segments: number[][];
    showLabel: boolean;
    labels: string[];
    labelSize: number;
    labelAngle: number;
    labelOrientation: LabelOrientation;
  }

  /**
   * The arc marking an angle. `angle` is signed; `directed` is `1` for
   * `directedangle`, `0` for `angle`.
   */
  interface AngleMarkerBranch extends GraphBranchBase<23>, GeometryStrokeFields {
    segments: Array<[vertexX: number, vertexY: number, startAngle: number, angle: number, directed: 0 | 1]>;
  }

  interface VectorBranch extends GraphBranchBase<24>, GeometryStrokeFields {
    segments: Array<[tailX: number, tailY: number, headX: number, headY: number]>;
    arrowMode?: ExpressionArrowMode;
  }

  /** Complex numbers, plotted as points `[re, im]`. */
  interface ComplexNumberBranch extends Omit<GraphBranchBase<25>, 'color'>, PointFields {
    segments: Array<Array<[re: number, im: number]>>;
    poi: PointPOIs;
    showPoint: boolean;
  }

  /** Draggable complex numbers. */
  interface MovableComplexNumberBranch extends Omit<GraphBranchBase<26>, 'color'>, PointFields {
    segments: Array<Array<[re: number, im: number]>>;
    poi: PointPOIs;
    showPoint?: boolean;
    movablePointInfo: MovablePointInfo[];
  }

  /** An image. Placement is in `dimensions`, one entry per image (for lists). */
  interface ImageBranch extends GraphBranchBase<27> {
    segments: [];
    dimensions: {
      /** Center x. */
      x: number[];
      /** Center y. */
      y: number[];
      radianAngle: number[];
      width: number[];
      height: number[];
      opacity: number[];
    };
  }

  /** Any branch the 2D grapher draws. Narrow on `branchMode`. */
  type GraphBranch =
    | XBranch
    | YBranch
    | PointBranch
    | MovablePointBranch
    | ParametricBranch
    | PolarBranch
    | PolygonFillBranch
    | ImplicitBranch
    | ErrorBranch
    | SegmentBranch
    | LineBranch
    | RayBranch
    | CircleBranch
    | ArcBranch
    | LabelBranch
    | AngleMarkerBranch
    | VectorBranch
    | ComplexNumberBranch
    | MovableComplexNumberBranch
    | ImageBranch;

  /** The branch type for a mode, e.g. `BranchOfMode<BranchModes['CIRCLE']>`. */
  type BranchOfMode<M extends BranchMode> = Extract<GraphBranch, { branchMode: M }>;

  /** Branches drawn as points (modes 3, 4, 25, 26). */
  type PointLikeBranch = PointBranch | MovablePointBranch | ComplexNumberBranch | MovableComplexNumberBranch;

  /** Branches whose points can be dragged (modes 4, 26). */
  type MovableBranch = MovablePointBranch | MovableComplexNumberBranch;

  // ---------------------------------------------------------------------------
  // Points of interest, labels, movable points
  // ---------------------------------------------------------------------------

  /** A point of interest: a root, intercept, extremum, intersection or plotted point. */
  interface POI {
    x: number;
    y: number;
    type: POIType;
    sketch: GraphSketch;
    /** Index of the branch in `sketch.branches`. */
    branch: number;
    /** Index of the point within that branch. */
    pointIdxOnBranch: number;
    bareLabel: boolean;
    /** Unique across all sketches. */
    id: number;
    intersects?: unknown;
    /** The point's label text, or `''`. */
    getLabel(): string;
    getGraphMode(): BranchMode;
    /** The branch's compiled function, if it has one. */
    getCompiledFunction(): ((...args: number[]) => number) | undefined;
    /** `true` for plotted points (`DEFINED` or `LABEL`). */
    isAttachedToPlottedPoint(): boolean;
    isMovable(): boolean;
    /** `true` for `LABEL`: shown even when the sketch isn't selected. */
    isPersistent(): boolean;
    getLabelSize(): number;
    getLabelRotation(): number;
    getPointOpacity(): number;
    getPointSize(): number;
    getTextOutline(): boolean;
    hasInteractiveLabel(): boolean;
    hasEditableLabel(): boolean;
    isBareLabel(): boolean;
    getMovablePoint(): MovablePoint | undefined;
    isSelected(): boolean;
  }

  /** A label drawn for a sketch. */
  type SketchLabel =
    | { type: 'poi'; poi: POI }
    | {
        type: 'segment' | 'polygon' | 'angle';
        /** `label-<expression id>-<list index>`. */
        id: string;
        /** An anchor POI of type `LABEL`. */
        poi: POI;
        /** The label branch's placement data. */
        segments: number[];
        text: string;
      };

  /** A draggable point, from `sketch.getMovablePoints()`. */
  interface MovablePoint {
    type: 'movable-point';
    /** `movable:[<expression id>,<index>]`. */
    id: string;
    listIndex: number;
    sketch: GraphSketch;
    x: number;
    y: number;
    color: HexColor;
    pointOpacity: number | number[];
    pointSize: number | number[];
    pointStyle: PointStyle;
    /** For table points: where the point lives and how it can be dragged. */
    tableInfo?: { tableId: ExpressionId; columnId: ExpressionId; rowIndex: number; dragX: boolean; dragY: boolean };
    /** Image scaling handles: the scale factor this point controls. */
    scaleFactor?: [number, number];
    label?: string;
    ariaLabel?: string;
  }

  /** A labeled static point, from `sketch.getStaticLabeledPoints()`. */
  interface StaticLabeledPoint {
    type: 'static-labeled-point';
    /** `static[<expression id>,<POI id>]`. */
    id: string;
    listIndex: number;
    sketch: GraphSketch;
    x: number;
    y: number;
    label: string;
    ariaLabel?: string;
  }

  // ---------------------------------------------------------------------------
  // Sketch
  // ---------------------------------------------------------------------------

  /** Everything the 2D grapher draws for one expression. */
  interface GraphSketch {
    /** The expression id. */
    id: ExpressionId;
    branches: GraphBranch[];
    is3d: false;
    /** Copied from the first branch. `'#000000'` when that branch is an error. */
    color: HexColor | HexColor[];
    /** Copied from the first branch; `'normal'` when it has no style. */
    style: LineStyle | PointStyle | 'normal';
    /** Show points of interest (set while selected, if tracing is enabled). */
    showPOI: boolean;
    showHighlight: boolean;
    /** Draw above other sketches. */
    hoistToTop: boolean;
    selected: boolean;
    tokenHovered: boolean;
    tokenSelected: boolean;
    labels: SketchLabel[];
    /** Cache behind `getPOI()`. */
    __cachedPOI: POI[];
    /** Cache behind `getPOIById()`. */
    __cachedPOIIds: Record<number, POI>;
    __cachedMovablePoints?: MovablePoint[];
    __cachedStaticLabeledPoints?: StaticLabeledPoint[];

    /**
     * All points of interest, cached. `X`/`Y` branches contribute zeros,
     * intercepts, extrema and intersections; point branches contribute their
     * points (`LABEL` if labeled, else `DEFINED`). Other modes contribute none.
     */
    getPOI(): POI[];
    /** Points of interest of one branch. */
    getBranchPOI(branchIndex: number): POI[];
    getPOIById(id: number): POI | undefined;
    getImageBranch(): ImageBranch | undefined;
    getMovablePointsBranch(): MovableBranch | undefined;
    getMovablePoints(): MovablePoint[];
    getMovablePointByIndex(index: number): MovablePoint | undefined;
    /** Points with a visible label (point and complex-number sketches). */
    getStaticLabeledPoints(): StaticLabeledPoint[];
    /** Set `poi.intersections` on each branch (indexed like `branches`) and rebuild the POI cache. */
    updateIntersections(intersections: Array<POICoordinates | undefined>): void;
    /** Carry selection and highlight state over from the sketch this one replaces. */
    updateFrom(previous: GraphSketch | undefined): void;
    _pushPOI(coordinates: POICoordinates, branchIndex: number, type: POIType, bareLabel?: boolean): void;
  }

  /**
   * The sketch members of the 2D grapher (merged into the `Grapher2D`
   * declared in controller.d.ts, which checks them against the generated type).
   */
  interface Grapher2D {
    /** One sketch per graphed expression, keyed by expression id. */
    graphSketches: Record<ExpressionId, GraphSketch>;
    getGraphSketch(id: ExpressionId): GraphSketch | undefined;
    addGraphSketch(sketch: GraphSketch): void;
    removeGraphSketch(id: ExpressionId): void;
    /** Replace an expression's sketch with one built from `branches`, keeping its selection state. */
    updateSketch(id: ExpressionId, branches: GraphBranch[]): void;
    selectSketch(id: ExpressionId): void;
    deselectSketch(id: ExpressionId): void;
    setSketchHoistedToTop(id: ExpressionId, hoisted: boolean): void;
  }
}

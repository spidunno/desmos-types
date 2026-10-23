/**
 * Expression-list items: what `setExpression()` accepts, what
 * `getExpressions()` returns, and the per-expression analysis.
 */
declare namespace Desmos {
  /** Bounds as LaTeX strings (numbers are coerced to strings). */
  interface Domain {
    min?: NumberOrLatex;
    max?: NumberOrLatex;
  }

  /**
   * Slider bounds. Bounds may use numbers and the constants `e`, `\pi` and
   * `\tau`, but not variables. Omit `step` (or pass `''`) for a continuous slider.
   */
  interface SliderBounds extends Domain {
    step?: NumberOrLatex;
  }

  // ---------------------------------------------------------------------------
  // setExpression() input
  // ---------------------------------------------------------------------------

  /**
   * A math expression. When `id` matches an existing expression, only the
   * provided properties change; the rest are left as they were.
   */
  interface ExpressionState {
    type?: 'expression';
    id?: ExpressionId;
    /** The expression, in Desmos LaTeX. */
    latex?: Latex;
    /** Defaults to cycling through the palette. */
    color?: HexColor;
    /** Line style for curves or point lists. */
    lineStyle?: LineStyle;
    /** Line width in pixels: a positive number or LaTeX evaluating to one. @defaultValue `2.5` */
    lineWidth?: NumberOrLatex;
    /** Line opacity from 0 to 1, or LaTeX evaluating to one. @defaultValue `0.9` */
    lineOpacity?: NumberOrLatex;
    /** Point style for points and point lists. */
    pointStyle?: PointStyle;
    /** Point diameter in pixels: a positive number or LaTeX evaluating to one. @defaultValue `9` */
    pointSize?: NumberOrLatex;
    /** Point opacity from 0 to 1, or LaTeX evaluating to one. @defaultValue `0.9` */
    pointOpacity?: NumberOrLatex;
    /** Draw a white outline around points to separate them from overlapping items. */
    pointOutline?: boolean;
    /** Fill opacity of a polygon or parametric curve, 0 to 1. @defaultValue `0.4` */
    fillOpacity?: NumberOrLatex;
    /** Plot points for point lists. */
    points?: boolean;
    /** Plot line segments for point lists. */
    lines?: boolean;
    /** Shade the interior of a polygon or parametric curve. */
    fill?: boolean;
    /** Don't draw the graph. @defaultValue `false` */
    hidden?: boolean;
    /** Hide the expression from the expressions list; doesn't affect the graph. @defaultValue `false` */
    secret?: boolean;
    /** Bounds of a slider. */
    sliderBounds?: SliderBounds;
    /** Animate the slider. @defaultValue `false` */
    playing?: boolean;
    /** Bounds of a parametric curve. */
    parametricDomain?: Domain;
    /** Bounds of a polar curve. */
    polarDomain?: Domain;
    /** How a point can be dragged. @defaultValue `'AUTO'` */
    dragMode?: DragMode;
    /** Text label of a point. `''` restores the default label (its coordinates). */
    label?: string;
    /** Show the point's label. */
    showLabel?: boolean;
    /**
     * Label size as LaTeX, multiplying the standard label font size. See
     * {@link Desmos.LabelSizes}.
     * @defaultValue `'1'`
     */
    labelSize?: Latex;
    /** Where the label sits relative to the point. @defaultValue `'default'` */
    labelOrientation?: LabelOrientation;
    /** Prevent the user from editing or deleting the expression (author feature). */
    readonly?: boolean;
  }

  /** A column of a table. */
  interface TableColumnState {
    /** Column header: a variable, or an expression for computed columns. */
    latex: Latex;
    /** Cell values as LaTeX. Not needed for computed columns. */
    values?: Latex[];
    /** Ignored for the first column. */
    color?: HexColor;
    /** Ignored for the first column. @defaultValue `false` */
    hidden?: boolean;
    points?: boolean;
    lines?: boolean;
    lineStyle?: LineStyle;
    /** @defaultValue `2.5` */
    lineWidth?: NumberOrLatex;
    /** @defaultValue `0.9` */
    lineOpacity?: NumberOrLatex;
    pointStyle?: PointStyle;
    /** @defaultValue `9` */
    pointSize?: NumberOrLatex;
    /** @defaultValue `0.9` */
    pointOpacity?: NumberOrLatex;
    /** @deprecated Use `points` and `lines` instead. */
    columnMode?: ColumnMode;
    /** Only affects explicitly specified values, not computed ones. @defaultValue `'NONE'` */
    dragMode?: DragMode;
  }

  interface TableState {
    type: 'table';
    id?: ExpressionId;
    columns: TableColumnState[];
  }

  /** A text note. */
  interface NoteState {
    type: 'text';
    id?: ExpressionId;
    /** @defaultValue `''` */
    text?: string;
  }

  /** Anything accepted by `setExpression()`. */
  type SettableExpressionState = ExpressionState | TableState | NoteState;

  // ---------------------------------------------------------------------------
  // getExpressions() output
  // ---------------------------------------------------------------------------

  /** Bounds as returned by `getExpressions()`: `''` means "use the default". */
  interface DomainItem {
    min: Latex;
    max: Latex;
  }

  /**
   * An expression as returned by `getExpressions()`. Numeric styling values
   * come back as LaTeX strings, with `''` meaning "use the default".
   */
  interface ExpressionItem {
    type: 'expression';
    id: ExpressionId;
    latex: Latex;
    color: HexColor;
    lineStyle: LineStyle;
    lineWidth: Latex;
    lineOpacity: Latex;
    pointStyle: PointStyle;
    pointSize: Latex;
    movablePointSize: Latex;
    pointOpacity: Latex;
    pointOutline?: boolean;
    fillOpacity: Latex;
    points?: boolean;
    lines?: boolean;
    fill?: boolean;
    hidden: boolean;
    secret: boolean;
    dragMode: DragMode;
    label: string;
    showLabel: boolean;
    labelSize: Latex;
    labelOrientation: LabelOrientation;
    interactiveLabel: boolean;
    readonly: boolean;
    /** Present only for sliders; omitted bounds were not set. */
    sliderBounds?: { min?: Latex; max?: Latex; step?: Latex };
    playing: boolean;
    parametricDomain: DomainItem;
    parametricDomain3Du: DomainItem;
    parametricDomain3Dv: DomainItem;
    parametricDomain3Dr: DomainItem;
    parametricDomain3Dphi: DomainItem;
    polarDomain: DomainItem;
    domain: DomainItem;
  }

  interface TableColumnItem {
    id: ExpressionId;
    latex: Latex;
    values: Latex[];
    color: HexColor;
    hidden: boolean;
    points: boolean;
    lines: boolean;
    lineStyle: LineStyle;
    lineWidth: Latex;
    lineOpacity: Latex;
    pointStyle: PointStyle;
    pointOutline: boolean;
    pointSize: Latex;
    pointOpacity: Latex;
    dragMode: DragMode;
  }

  interface TableItem {
    type: 'table';
    id: ExpressionId;
    columns: TableColumnItem[];
  }

  interface NoteItem {
    type: 'text';
    id: ExpressionId;
    text: string;
    secret: boolean;
  }

  /**
   * A folder. Cannot be created with `setExpression()`; folders come from
   * the user or from `setState()`.
   */
  interface FolderItem {
    type: 'folder';
    id: ExpressionId;
    title: string;
    hidden: boolean;
    secret: boolean;
  }

  /**
   * An image. Only its identity and visibility are reported. Cannot be
   * created with `setExpression()`.
   */
  interface ImageItem {
    type: 'image';
    id: ExpressionId;
    hidden: boolean;
    secret: boolean;
  }

  /** Any item returned by `getExpressions()`. */
  type ExpressionListItem = ExpressionItem | TableItem | NoteItem | FolderItem | ImageItem;

  // ---------------------------------------------------------------------------
  // Analysis
  // ---------------------------------------------------------------------------

  type ExpressionEvaluation = { type: 'Number'; value: number } | { type: 'ListOfNumber'; value: number[] };

  /**
   * The calculator's analysis of one expression. Evaluation is asynchronous,
   * so read this inside an `observe('expressionAnalysis', ...)` callback.
   */
  interface ExpressionAnalysis {
    /** The expression can be plotted. */
    isGraphable: boolean;
    /** The expression produces an evaluation error. */
    isError: boolean;
    /** The localized error message, if any. */
    errorMessage?: string;
    /** Evaluation information is shown in the expressions list. */
    evaluationDisplayed?: boolean;
    /** Numeric value(s), when the expression evaluates to numbers. */
    evaluation?: ExpressionEvaluation;
  }
}

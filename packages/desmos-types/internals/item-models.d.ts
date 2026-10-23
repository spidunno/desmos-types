/**
 * Item models: the controller's live, mutable representation of each entry
 * in the expressions list (`controller.getItemModel(id)`), as opposed to the
 * serialized states returned by the public API.
 */
declare namespace Desmos.Internals {
  type ItemType = ItemModel['type'];

  /** Any item in the expressions list. Narrow on `type`. */
  type ItemModel = ExpressionModel | TableModel | FolderModel | TextModel | ImageModel;

  /** Items that can live inside a folder. */
  type NonFolderItemModel = Exclude<ItemModel, FolderModel>;

  /** Arrow placement on a segment, vector or curve. `DEFAULT` follows the object type. */
  type ExpressionArrowMode = 'DEFAULT' | 'NONE' | 'POSITIVE' | 'BOTH';

  /** Whether a point's label is plain, editable text or editable math. */
  type EditableLabelMode = 'NONE' | 'MATH' | 'TEXT';

  type SliderLoopMode = 'LOOP_FORWARD_REVERSE' | 'LOOP_FORWARD' | 'PLAY_ONCE' | 'PLAY_INDEFINITELY';

  /** A slider's settings. Every expression has one, even if it isn't a slider (check `sliderExists`). */
  interface SliderModel {
    hardMin: boolean;
    hardMax: boolean;
    /** Milliseconds per sweep. */
    animationPeriod: number;
    loopMode: SliderLoopMode;
    playDirection: 1 | -1;
    isPlaying: boolean;
    min: Latex;
    max: Latex;
    step: Latex;
  }

  /** Domain bounds as LaTeX. `''` means "use the default". */
  interface DomainModel {
    min: Latex;
    max: Latex;
  }

  /** A math expression, point, slider, regression, distribution or action. */
  interface ExpressionModel extends Generated.ExpressionModel {
    type: 'expression';
    controller: Controller;
    /** Id of the containing folder, or `''`. */
    folderId: ExpressionId | '';
    latex: Latex;
    color: HexColor;
    /** LaTeX color expression overriding `color`, or `''`. */
    colorLatex: Latex;
    dragMode: DragMode;
    labelOrientation: LabelOrientation;
    pointStyle: PointStyle;
    lineStyle: LineStyle;
    arrowMode: ExpressionArrowMode;
    editableLabelMode: EditableLabelMode;
    /** `undefined` until the user or a state sets them. */
    points: boolean | undefined;
    lines: boolean | undefined;
    fill: boolean | undefined;
    slider: SliderModel;
    /** Whether this expression currently renders as a slider. */
    sliderExists: boolean;
    sliderDragging: boolean | undefined;
    sliderAnimationTargetValue: number | undefined;
    polarDomain: DomainModel;
    parametricDomain: DomainModel;
    parametricDomain3Du: DomainModel;
    parametricDomain3Dv: DomainModel;
    parametricDomain3Dr: DomainModel;
    parametricDomain3Dphi: DomainModel;
    /** Fitted regression parameters by name. */
    regressionParameters: Record<string, number>;
    /** Click handler ("clickable") settings. */
    clickableInfo: { enabled: boolean; latex: Latex; [key: string]: unknown };
    /** Distribution display: `'pdf'`, `'cdf'`, ... */
    plotType: string;
    cdf: {
      show: boolean;
      bound1: Latex;
      bound2: Latex;
      p: Latex;
      tails: string;
      compute: string;
    };
    vizProps: {
      breadth: Latex;
      axisOffset: Latex;
      alignedAxis: 'x' | 'y';
      showBoxplotOutliers: boolean;
      binAlignment: string;
      dotplotXMode: string;
      histogramMode: string;
    };
    /** Error from parsing or evaluation, if any. */
    error: unknown;
  }

  /** A table. The column definitions live in `columnModels`. */
  interface TableModel extends Generated.TableModel {
    type: 'table';
    controller: Controller;
    folderId: ExpressionId | '';
    /**
     * Column models. The array can end with a placeholder for the blank
     * column the UI shows after the last real column.
     */
    columnModels: TableColumnModel[];
  }

  /** One column of a {@link TableModel}. */
  interface TableColumnModel extends Generated.TableColumnModel {
    /** The table this column belongs to. */
    table: TableModel;
    latex: Latex;
    color: HexColor;
    colorLatex: Latex;
    values: Latex[];
    /** Evaluated cell values as LaTeX (for computed columns). */
    computedValues: Latex[];
    dragMode: DragMode;
    pointStyle: PointStyle;
    lineStyle: LineStyle;
  }

  interface FolderModel extends Generated.FolderModel {
    type: 'folder';
    controller: Controller;
    title: string;
    collapsed: boolean;
  }

  /** A text note. */
  interface TextModel extends Generated.TextModel {
    type: 'text';
    controller: Controller;
    folderId: ExpressionId | '';
    text: string;
  }

  interface ImageModel extends Generated.ImageModel {
    type: 'image';
    controller: Controller;
    folderId: ExpressionId | '';
    /** Data URL or remote URL. */
    image_url: string;
    name: string;
    /** Position and size as LaTeX. */
    center: Latex;
    width: Latex;
    height: Latex;
    angle: Latex;
    opacity: Latex;
    loadStatus: 'loading' | 'loaded' | 'failed';
    imageObj: HTMLImageElement;
  }

  /** The actions ticker at the top of the expressions list (`listModel.ticker`). */
  interface TickerModel extends Generated.TickerModel {
    type: 'ticker';
    /** The action run on each tick. */
    handlerLatex: Latex;
    /** Minimum milliseconds between ticks. */
    minStepLatex: Latex;
    open: boolean;
    playing: boolean;
    /** Rolling average of milliseconds between ticks. */
    avgDelta: number;
  }
}

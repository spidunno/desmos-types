/**
 * Enum-like constant objects exposed on the `Desmos` global, together with
 * the union types of their values.
 */
declare namespace Desmos {
  // ---------------------------------------------------------------------------
  // Colors
  // ---------------------------------------------------------------------------

  /** The default color palette. */
  const Colors: {
    /** `#c74440` */
    readonly RED: HexColor;
    /** `#2d70b3` */
    readonly BLUE: HexColor;
    /**
     * `#348543` in the v1.13 bundle. (The documentation lists `#388c46`,
     * which is still the color the calculator cycles through for new items.)
     */
    readonly GREEN: HexColor;
    /** `#fa7e19` */
    readonly ORANGE: HexColor;
    /** `#6042a6` */
    readonly PURPLE: HexColor;
    /** `#000000` */
    readonly BLACK: HexColor;
  };

  /**
   * A color palette: names mapped to valid CSS colors. Used by the `colors`
   * constructor option and exposed as `calculator.colors`.
   */
  type ColorPalette = Readonly<Record<string, string>>;

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  /** Drawing styles for points and curves. */
  const Styles: {
    // Curves
    readonly SOLID: 'SOLID';
    readonly DASHED: 'DASHED';
    readonly DOTTED: 'DOTTED';
    // Points
    readonly POINT: 'POINT';
    readonly OPEN: 'OPEN';
    readonly CROSS: 'CROSS';
    readonly SQUARE: 'SQUARE';
    readonly PLUS: 'PLUS';
    readonly TRIANGLE: 'TRIANGLE';
    readonly DIAMOND: 'DIAMOND';
    readonly STAR: 'STAR';
  };

  /** A line style for curves and point-list segments. */
  type LineStyle = 'SOLID' | 'DASHED' | 'DOTTED';

  /** A point style for points and point lists. */
  type PointStyle = 'POINT' | 'OPEN' | 'CROSS' | 'SQUARE' | 'PLUS' | 'TRIANGLE' | 'DIAMOND' | 'STAR';

  // ---------------------------------------------------------------------------
  // Column modes (deprecated)
  // ---------------------------------------------------------------------------

  /**
   * @deprecated Since API v1.1, use the boolean `points` and `lines`
   * properties of a table column instead.
   */
  const ColumnModes: {
    readonly POINTS: 'POINTS';
    readonly LINES: 'LINES';
    readonly POINTS_AND_LINES: 'POINTS_AND_LINES';
  };

  /** @deprecated Use the `points` and `lines` table column properties instead. */
  type ColumnMode = 'POINTS' | 'LINES' | 'POINTS_AND_LINES';

  // ---------------------------------------------------------------------------
  // Drag modes
  // ---------------------------------------------------------------------------

  /** Directions in which a point (or table column's points) can be dragged. */
  const DragModes: {
    readonly NONE: 'NONE';
    readonly X: 'X';
    readonly Y: 'Y';
    readonly XY: 'XY';
    /** Use the calculator's normal rules for deciding how a point can move. */
    readonly AUTO: 'AUTO';
  };

  type DragMode = 'NONE' | 'X' | 'Y' | 'XY' | 'AUTO';

  // ---------------------------------------------------------------------------
  // Axis arrow modes
  // ---------------------------------------------------------------------------

  /** Whether arrows are drawn at one or both ends of an axis. */
  const AxisArrowModes: {
    readonly NONE: 'NONE';
    readonly POSITIVE: 'POSITIVE';
    readonly BOTH: 'BOTH';
  };

  type AxisArrowMode = 'NONE' | 'POSITIVE' | 'BOTH';

  // ---------------------------------------------------------------------------
  // Font sizes
  // ---------------------------------------------------------------------------

  /**
   * Predefined values for the `fontSize` option. Any number is accepted;
   * these are conveniences.
   */
  const FontSizes: {
    readonly VERY_SMALL: 9;
    readonly SMALL: 12;
    readonly MEDIUM: 16;
    readonly LARGE: 20;
    readonly VERY_LARGE: 24;
  };

  // ---------------------------------------------------------------------------
  // Label sizes
  // ---------------------------------------------------------------------------

  /**
   * Predefined LaTeX values for the `labelSize` expression property.
   *
   * @remarks Undocumented: present in the v1.13 bundle but not in the docs.
   */
  const LabelSizes: {
    readonly SMALL: '0.85';
    readonly MEDIUM: '1';
    readonly LARGE: '1.35';
  };

  // ---------------------------------------------------------------------------
  // Label orientations
  // ---------------------------------------------------------------------------

  /**
   * Positions of a point's label relative to the point. The docs list
   * `ABOVE`, `BELOW`, `LEFT`, `RIGHT` and `DEFAULT`; the remaining values
   * exist in the v1.13 bundle but are undocumented.
   */
  const LabelOrientations: {
    /** Let the calculator position the label to keep it legible. */
    readonly DEFAULT: 'default';
    readonly ABOVE: 'above';
    readonly BELOW: 'below';
    readonly LEFT: 'left';
    readonly RIGHT: 'right';
    /** @remarks Undocumented. */
    readonly CENTER: 'center';
    /** @remarks Undocumented. */
    readonly CENTER_AUTO: 'center_auto';
    /** @remarks Undocumented. */
    readonly AUTO_CENTER: 'auto_center';
    /** @remarks Undocumented. */
    readonly ABOVE_LEFT: 'above_left';
    /** @remarks Undocumented. */
    readonly ABOVE_RIGHT: 'above_right';
    /** @remarks Undocumented. */
    readonly ABOVE_AUTO: 'above_auto';
    /** @remarks Undocumented. */
    readonly BELOW_LEFT: 'below_left';
    /** @remarks Undocumented. */
    readonly BELOW_RIGHT: 'below_right';
    /** @remarks Undocumented. */
    readonly BELOW_AUTO: 'below_auto';
    /** @remarks Undocumented. */
    readonly AUTO_LEFT: 'auto_left';
    /** @remarks Undocumented. */
    readonly AUTO_RIGHT: 'auto_right';
  };

  type LabelOrientation = (typeof LabelOrientations)[keyof typeof LabelOrientations];
}

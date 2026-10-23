/**
 * Viewport bounds, coordinate conversion and screenshot options.
 */
declare namespace Desmos {
  /** Viewport bounds in math coordinates. Requires `right > left` and `top > bottom`. */
  interface MathBounds {
    left: number;
    right: number;
    bottom: number;
    top: number;
  }

  /**
   * Viewport bounds using `xmin`/`xmax`/`ymin`/`ymax` names. Accepted by
   * `setMathBounds()` in place of {@link MathBounds}.
   *
   * @remarks Undocumented alias.
   */
  interface ViewportBounds {
    xmin: number;
    xmax: number;
    ymin: number;
    ymax: number;
  }

  /** 3D viewport bounds; `setMathBounds()` on a `Calculator3D` also accepts `zmin`/`zmax`. */
  interface ViewportBounds3D extends ViewportBounds {
    zmin: number;
    zmax: number;
  }

  /** A rectangle in math or pixel coordinates. */
  interface Rect {
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
    height: number;
  }

  /** Math coordinates of the graphpaper. Note `top > bottom`. */
  interface MathCoordinates extends Rect {
    xmin: number;
    xmax: number;
    ymin: number;
    ymax: number;
    /** Present on 3D calculators. */
    zmin?: number;
    /** Present on 3D calculators. */
    zmax?: number;
  }

  /**
   * The graphpaper bounds. Pixel coordinates are relative to the top left of
   * the calculator's container element, so `pixelCoordinates.top <
   * pixelCoordinates.bottom` while `mathCoordinates.top > mathCoordinates.bottom`.
   */
  interface GraphpaperBounds {
    mathCoordinates: MathCoordinates;
    pixelCoordinates: Rect;
  }

  /** A point with an `x` property, a `y` property, or both. */
  type PartialPoint = { x: number; y?: number } | { x?: number; y: number };

  /** The result of a coordinate conversion: the same properties as the input. */
  type ConvertedPoint<T extends PartialPoint> = { [K in keyof T & ('x' | 'y')]: number };

  // ---------------------------------------------------------------------------
  // Screenshots
  // ---------------------------------------------------------------------------

  interface ScreenshotOptions {
    /** Width in pixels. @defaultValue current graphpaper width */
    width?: number;
    /** Height in pixels. @defaultValue current graphpaper height */
    height?: number;
    /**
     * Oversampling factor for high-density screens. With `2`, the image is
     * physically twice `width` × `height` but meant to be displayed at
     * `width` × `height`.
     * @defaultValue `1`
     */
    targetPixelRatio?: number;
    /**
     * Keep axis numbers on small images (below 256px in either dimension),
     * where they are normally removed.
     * @defaultValue `false`
     */
    preserveAxisNumbers?: boolean;
    /** Draw movable points with their interactive halo. @defaultValue `false` */
    showMovablePoints?: boolean;
  }

  /**
   * How `asyncScreenshot()` computes the captured viewport:
   *
   * - `contain`: smallest box containing `mathBounds` that keeps the math aspect ratio.
   * - `stretch`: use `mathBounds` exactly; the aspect ratio is not kept.
   * - `preserveX`: use `left`/`right`, adjust `y` about the midline to keep the aspect ratio.
   * - `preserveY`: use `top`/`bottom`, adjust `x` about the midline to keep the aspect ratio.
   */
  type ScreenshotMode = 'contain' | 'stretch' | 'preserveX' | 'preserveY';

  /**
   * Desired screenshot bounds. Any omitted property uses the current viewport,
   * but `top` requires `bottom` and `left` requires `right`.
   */
  type ScreenshotMathBounds = ({ top: number; bottom: number } | { top?: never; bottom?: never }) &
    ({ left: number; right: number } | { left?: never; right?: never });

  interface AsyncScreenshotOptions extends ScreenshotOptions {
    /** Image format. @defaultValue `'png'` */
    format?: 'png' | 'svg';
    /**
     * Viewport strategy. The docs give `'contain'` as the default, but the
     * v1.13 bundle uses `'preserveX'` when the axes are square and `'stretch'`
     * otherwise. Pass a mode explicitly if it matters.
     */
    mode?: ScreenshotMode;
    /** Region to capture. Invalid bounds log a warning and use the current viewport. */
    mathBounds?: ScreenshotMathBounds;
    /** Include point labels. @defaultValue `false` */
    showLabels?: boolean;
  }

  /**
   * Receives a PNG data URI or an SVG string, or `undefined` if the
   * screenshot failed.
   */
  type AsyncScreenshotCallback = (data: string | undefined) => void;
}

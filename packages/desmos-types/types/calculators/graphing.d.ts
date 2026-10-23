/**
 * The 2D graphing calculator.
 */
declare namespace Desmos {
  /**
   * A graphing calculator embedded in a DOM element. Create one with
   * `Desmos.GraphingCalculator(element, options)`.
   */
  interface GraphingCalculator extends GraphingCalculatorBase {
    /**
     * Asynchronous screenshot. Guarantees the state is fully evaluated
     * before capture, can capture regions outside the current viewport, and
     * can produce SVG.
     */
    asyncScreenshot(callback: AsyncScreenshotCallback): void;
    asyncScreenshot(options: AsyncScreenshotOptions, callback: AsyncScreenshotCallback): void;

    /** Convert math coordinates to pixel coordinates. Returns the same properties as `coords`. */
    mathToPixels<T extends PartialPoint>(coords: T): ConvertedPoint<T>;

    /** Convert pixel coordinates to math coordinates. Inverse of `mathToPixels`. */
    pixelsToMath<T extends PartialPoint>(coords: T): ConvertedPoint<T>;
  }

  interface GraphingCalculatorConstructor {
    (element: HTMLElement, options?: GraphingCalculatorOptions): GraphingCalculator;
    new (element: HTMLElement, options?: GraphingCalculatorOptions): GraphingCalculator;
    readonly prototype: GraphingCalculator;
  }

  /**
   * Create a graphing calculator in `element`. The calculator fills the
   * element; give the element a size.
   *
   * @throws If the graphing calculator isn't enabled for the API key.
   *
   * @example
   * const calculator = Desmos.GraphingCalculator(document.getElementById('calculator')!, {
   *   keypad: false,
   * });
   */
  const GraphingCalculator: GraphingCalculatorConstructor;

  /**
   * Alias of {@link Desmos.GraphingCalculator}.
   * @remarks Undocumented alias kept for backward compatibility.
   */
  const Calculator: GraphingCalculatorConstructor;
}

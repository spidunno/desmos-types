/**
 * The 3D graphing calculator. Built on the graphing calculator and shares
 * most of its API.
 */
declare namespace Desmos {
  /**
   * Camera orientation as two angles in radians: the tilt of the z-axis
   * toward the viewer, and the rotation about the z-axis. Inferred from the
   * v1.13 bundle.
   */
  type Orientation3D = [tilt: number, spin: number];

  /**
   * A 3D calculator. Create one with `Desmos.Calculator3D(element, options)`.
   *
   * Compared with {@link GraphingCalculator}: `asyncScreenshot()` always
   * throws in v1.13 (use `screenshot()`), and `mathToPixels` / `pixelsToMath`
   * are `undefined`, so neither is declared here.
   */
  interface Calculator3D extends GraphingCalculatorBase {
    /** Set the bounds, including the z range. */
    setMathBounds(bounds: MathBounds | ViewportBounds | ViewportBounds3D): void;

    /**
     * The current camera orientation.
     * @remarks Undocumented: may change without notice.
     */
    getOrientation(): Orientation3D;

    /**
     * Set the camera orientation immediately and stop any auto-rotation.
     * Non-finite angles are ignored.
     * @remarks Undocumented: may change without notice.
     */
    setOrientation(tilt: number, spin: number): void;

    /**
     * Animate the camera to an orientation. Non-finite angles are ignored.
     * @remarks Undocumented: may change without notice.
     */
    animateToOrientation(tilt: number, spin: number): void;

    /**
     * Set the perspective distortion. `0` gives an orthographic projection;
     * the default is `1`. Values outside the supported range are ignored.
     * @remarks Undocumented: may change without notice.
     */
    setPerspectiveDistortion(value: number): void;
  }

  interface Calculator3DConstructor {
    (element: HTMLElement, options?: Calculator3DOptions): Calculator3D;
    new (element: HTMLElement, options?: Calculator3DOptions): Calculator3D;
    readonly prototype: Calculator3D;
  }

  /**
   * Create a 3D calculator in `element`. It can be created before `element`
   * is in the DOM; the view appears once it is inserted. Call `destroy()`
   * when done.
   *
   * @throws If the 3D calculator isn't enabled for the API key.
   */
  const Calculator3D: Calculator3DConstructor;
}

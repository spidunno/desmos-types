/**
 * The geometry tool. Built on the graphing calculator and shares its API.
 */
declare namespace Desmos {
  /**
   * A geometry tool instance. Create one with `Desmos.Geometry(element, options)`.
   *
   * With `authorFeatures: true`, the settings menu also lets authors
   * customize the toolbar. Toolbar customizations are saved in the state.
   */
  interface Geometry extends GraphingCalculator {}

  interface GeometryConstructor {
    (element: HTMLElement, options?: GeometryOptions): Geometry;
    new (element: HTMLElement, options?: GeometryOptions): Geometry;
    readonly prototype: Geometry;
  }

  /**
   * Create a geometry tool in `element`. It can be created before `element`
   * is in the DOM; the view appears once it is inserted. Call `destroy()`
   * when done.
   *
   * @throws If the geometry tool isn't enabled for the API key.
   */
  const Geometry: GeometryConstructor;
}

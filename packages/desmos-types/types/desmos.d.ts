/**
 * Top-level values on the `Desmos` global that don't belong to a specific
 * calculator.
 */
declare namespace Desmos {
  /**
   * Which calculators the API key allows. Calling a disabled calculator's
   * constructor throws.
   */
  interface EnabledFeatures {
    GraphingCalculator: boolean;
    FourFunctionCalculator: boolean;
    ScientificCalculator: boolean;
    GeometryCalculator: boolean;
    Calculator3D: boolean;
  }

  /** Features enabled for the API key used to load `calculator.js`. */
  const enabledFeatures: Readonly<EnabledFeatures>;

  /**
   * Language codes loaded into this copy of `calculator.js`. `'en'` is always
   * included; others must be requested with the `lang` URL parameter.
   */
  const supportedLanguages: readonly LanguageCode[];

  /**
   * The default `imageUploadCallback`. Converts `file` to a data URL, taking
   * EXIF orientation into account and recompressing large images.
   * `dataURL` is set only when `error` is falsy.
   */
  function imageFileToDataURL(file: File, callback: (error: unknown, dataURL: string) => void): void;

  /**
   * Build version, e.g. `'v1.13'` or `'v1.13-prerelease'`.
   * @remarks Undocumented.
   */
  const version: string;

  /**
   * Git commit the build was made from.
   * @remarks Undocumented.
   */
  const commit: string;
}

interface Window {
  /** The Desmos API, defined by `calculator.js`. */
  Desmos: typeof Desmos;
}

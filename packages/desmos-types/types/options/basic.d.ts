/**
 * Constructor options and settings for the four-function and scientific
 * calculators.
 */
declare namespace Desmos {
  /** Options shared by the four-function and scientific calculators. */
  interface BasicCalculatorOptions {
    /** Allow external hyperlinks (e.g. to Braille examples). @defaultValue `true` */
    links?: boolean;
    /** Base font size in pixels. @defaultValue `16` */
    fontSize?: number;
    /** Display an inverted color scheme. @defaultValue `false` */
    invertedColors?: boolean;
    /** When `false`, hide the "Reverse Contrast" checkbox. @defaultValue `true` */
    invertedColorsControl?: boolean;
    /** **Beta.** Background color as a 3- or 6-digit hex string. @defaultValue `'#fff'` */
    backgroundColor?: HexColor;
    /** **Beta.** Text color as a 3- or 6-digit hex string. @defaultValue `'#000'` */
    textColor?: HexColor;
    /** **Beta.** Accent color for interactive UI elements. @defaultValue `'#2f72dc'` */
    accentColor?: HexColor;
    /** Display the settings menu. @defaultValue `true` */
    settingsMenu?: boolean;
    /** Display language. @defaultValue `'en'` */
    language?: LanguageCode;
    /** Braille code for input and output. @defaultValue `'none'` */
    brailleMode?: BrailleMode;
    /** Allow six-key Braille input on the home row. Requires a Braille mode. @defaultValue `false` */
    sixKeyInput?: boolean;
    /** Let the user export a Braille rendering of the expression list. Requires a Braille mode. @defaultValue `true` */
    brailleExpressionDownload?: boolean;
    /** Display a larger font. @defaultValue `false` */
    projectorMode?: boolean;
    /**
     * Let users toggle between decimal and fraction output.
     * @defaultValue `false` (four-function), `true` (scientific)
     */
    decimalToFraction?: boolean;
    /** Limit expressions to 500 LaTeX tokens and a nesting depth of 30. @defaultValue `false` */
    capExpressionSize?: boolean;
  }

  /** An extra function button for the four-function calculator's top bar. */
  type FourFunctionAdditionalFunction = 'exponent' | 'percent' | 'fraction' | 'sqrt';

  interface FourFunctionCalculatorOptions extends BasicCalculatorOptions {
    /**
     * Extra function(s) shown in the top bar: at least 1, at most 2.
     * @defaultValue `['sqrt']`
     */
    additionalFunctions?:
      | FourFunctionAdditionalFunction
      | readonly [FourFunctionAdditionalFunction]
      | readonly [FourFunctionAdditionalFunction, FourFunctionAdditionalFunction];
    /**
     * Require numbers to be `0` or have magnitude in `[1e-7, 1e8)`; anything
     * else is an error. Results never use scientific notation.
     * @defaultValue `false`
     */
    limitNumberScale?: boolean;
  }

  interface ScientificCalculatorOptions extends BasicCalculatorOptions {
    /** Show the keypad in QWERTY layout (`false` is alphabetical). @defaultValue `true` */
    qwertyKeyboard?: boolean;
    /** Trig functions take degrees instead of radians. @defaultValue `false` */
    degreeMode?: boolean;
    /** Allow function definitions such as `f(x) = 2x`. @defaultValue `true` */
    functionDefinition?: boolean;
    /**
     * Resize automatically when the container element's dimensions change.
     * When `false`, call `.resize()` yourself.
     * @defaultValue `true`
     */
    autosize?: boolean;
    /** Enable the "Complex Mode" toggle in the settings menu. @defaultValue `true` */
    allowComplex?: boolean;
  }

  /**
   * Option keys accepted by a basic calculator but not kept on its
   * `settings` object at runtime.
   */
  type WriteOnlyBasicOption = 'additionalFunctions' | 'limitNumberScale' | 'autosize' | 'allowComplex';

  /** The current value of each option of a basic calculator. */
  type BasicCalculatorSettingsValues<TOptions extends BasicCalculatorOptions> = {
    readonly [K in Exclude<keyof TOptions, WriteOnlyBasicOption>]-?: NonNullable<TOptions[K]>;
  };

  /**
   * `calculator.settings` on a basic calculator: current settings, observable
   * per property.
   *
   * @remarks Undocumented for basic calculators, but present at runtime.
   */
  type BasicCalculatorSettings<TOptions extends BasicCalculatorOptions> = BasicCalculatorSettingsValues<TOptions> &
    Observable<BasicCalculatorSettingsValues<TOptions>>;
}

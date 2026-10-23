/**
 * Abraham: Desmos's library for translating between LaTeX and the Nemeth and
 * UEB Braille math codes, bundled into `calculator.js`.
 *
 * Documented at https://www.desmos.com/api/v1.13/docs/abraham.html. Desmos
 * asks that you contact partnerships@desmos.com before using it.
 */
declare namespace Desmos {
  /** A position in the translator's input. */
  interface AbrahamLocation {
    first_line: number;
    last_line: number;
    first_column: number;
    last_column: number;
  }

  /** A place where permissive Braille→LaTeX translation inserted a missing delimiter. */
  interface AbrahamWarning {
    location: AbrahamLocation;
  }

  /** A successful LaTeX→Braille translation. */
  interface AbrahamBrailleSuccess {
    isError: false;
    /** Six-dot Unicode Braille. */
    value: string;
  }

  /** A successful Braille→LaTeX translation. */
  interface AbrahamLatexSuccess {
    isError: false;
    value: Latex;
    /** Where missing delimiters were inserted. Always empty with `strict: true`. */
    warnings: AbrahamWarning[];
  }

  /** A successful translation in either direction. */
  interface AbrahamSuccess {
    isError: false;
    value: string;
    /** Present on Braille→LaTeX results. */
    warnings?: AbrahamWarning[];
  }

  /** A failed translation (a parse error). */
  interface AbrahamFailure {
    isError: true;
    error: {
      /** Where the parse error occurred. */
      location: AbrahamLocation;
      /** Developer diagnostics. Not part of the public API; its contents may change. */
      _diagnostic?: unknown;
    };
  }

  /** The result of `latexToNemeth` / `latexToUeb`. */
  type AbrahamBrailleResult = AbrahamBrailleSuccess | AbrahamFailure;

  /** The result of `nemethToLatex` / `uebToLatex`. */
  type AbrahamLatexResult = AbrahamLatexSuccess | AbrahamFailure;

  /** The result of any translation. */
  type AbrahamResult = AbrahamSuccess | AbrahamFailure;

  interface AbrahamLatexToBrailleOptions {
    /**
     * Operator names to recognize. Neither Braille code has a convention for
     * `\operatorname`, so these are written as plain letters.
     * @defaultValue Desmos's built-in list (`floor`, `mean`, `normaldist`, ...)
     */
    operatorNames?: readonly string[];
  }

  interface AbrahamBrailleToLatexOptions {
    /**
     * Treat missing delimiters (e.g. an unclosed fraction or radical) as parse
     * errors instead of inserting them and reporting `warnings`.
     * @defaultValue `false`
     */
    strict?: boolean;
    /**
     * Operator names to recognize in the Braille input, e.g. `['blah']` turns
     * `blah(abc)` into `\operatorname{blah}(abc)`.
     * @defaultValue Desmos's built-in list (`floor`, `mean`, `normaldist`, ...)
     */
    operatorNames?: readonly string[];
  }

  interface Abraham {
    /** Library version, e.g. `'1.0.3'`. */
    readonly version: string;

    /**
     * LaTeX → Nemeth Braille.
     * @example Abraham.latexToNemeth('e_{f}^{x^{2}}') // { isError: false, value: '⠑⠰⠋⠘⠭⠘⠘⠆' }
     */
    latexToNemeth(latex: Latex, options?: AbrahamLatexToBrailleOptions): AbrahamBrailleResult;

    /**
     * LaTeX → UEB Braille.
     * @example Abraham.latexToUeb('1+1') // { isError: false, value: '⠼⠁⠐⠖⠼⠁' }
     */
    latexToUeb(latex: Latex, options?: AbrahamLatexToBrailleOptions): AbrahamBrailleResult;

    /**
     * Nemeth Braille → LaTeX. `braille` must be six-dot Unicode Braille; use
     * `UnicodeBraille.coerceToSixDotCells` to convert other formats first.
     * Unless `strict` is set, missing delimiters are inserted and reported in `warnings`.
     * @example Abraham.nemethToLatex('⠹⠂⠌⠆') // value '\\frac{1}{2}', with one warning
     */
    nemethToLatex(braille: string, options?: AbrahamBrailleToLatexOptions): AbrahamLatexResult;

    /**
     * UEB Braille → LaTeX. `braille` must be six-dot Unicode Braille; use
     * `UnicodeBraille.coerceToSixDotCells` to convert other formats first.
     * Unless `strict` is set, missing delimiters are inserted and reported in `warnings`.
     * @example Abraham.uebToLatex('⠼⠁⠐⠖⠼⠁') // { isError: false, value: '1+1', warnings: [] }
     */
    uebToLatex(braille: string, options?: AbrahamBrailleToLatexOptions): AbrahamLatexResult;

    /** Conversions between Unicode Braille and Braille ASCII. */
    readonly UnicodeBraille: {
      /**
       * Unicode Braille → Braille ASCII (upper case letters as a comma + letter digraph).
       * @example toBrailleAscii('⠼⠁⠐⠖⠼⠁') // '#A"6#A'
       */
      toBrailleAscii(braille: string): string;
      /**
       * Unicode Braille → Expanded Braille ASCII, the eight-dot encoding common
       * on refreshable displays.
       * @example toExpandedBrailleAscii('⠼⠁⠐⠖⠼⠁') // '#a"6#a'
       */
      toExpandedBrailleAscii(braille: string): string;
      /**
       * Coerce input to the six-dot Unicode Braille the translators expect:
       * converts Braille ASCII or Expanded Braille ASCII (ignoring case), and
       * strips the bottom pair of dots from eight-dot Unicode cells.
       * @example coerceToSixDotCells('#A"6#A') // '⠼⠁⠐⠖⠼⠁'
       */
      coerceToSixDotCells(input: string): string;
    };
  }

  /** The Abraham Braille translation library. */
  const Abraham: Abraham;
}

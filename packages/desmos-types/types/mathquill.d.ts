/**
 * The MathQuill build bundled into `calculator.js`. It is Desmos's own fork,
 * and some standard MathQuill methods (such as `cmd`, `reflow` and `revert`)
 * are missing. Only methods present in the v1.13 bundle are declared.
 *
 * @remarks Undocumented: may change without notice.
 */
declare namespace Desmos {
  /** A MathQuill config object. The option set of Desmos's fork is not documented. */
  type MathQuillConfig = Record<string, unknown>;

  /** A static (read-only) math field. */
  interface MathQuillStaticMath {
    /** The field's root element. */
    el(): HTMLElement;
    /** The current LaTeX. */
    latex(): Latex;
    /** Replace the contents with `latex`. */
    latex(latex: Latex): this;
    /** A spoken-math description of the contents. */
    mathspeak(): string;
    focus(): this;
    blur(): this;
    getAriaLabel(): string;
    setAriaLabel(label: string): this;
    getAriaPostLabel(): string;
    setAriaPostLabel(label: string): this;
  }

  /** An editable math field. */
  interface MathQuillMathField extends MathQuillStaticMath {
    /** Insert `latex` at the cursor. */
    write(latex: Latex): this;
    /** Simulate typing `text`. */
    typedText(text: string): this;
    /** Simulate a key press, e.g. `'Left'`, `'Shift-Left'` or `'Backspace'`. */
    keystroke(keys: string): this;
    /** Select the whole contents. */
    select(): this;
    clearSelection(): this;
    moveToLeftEnd(): this;
    moveToRightEnd(): this;
  }

  interface MathQuill {
    /** The MathQuill API instance attached to `element`, if any. */
    (element: HTMLElement): MathQuillStaticMath | MathQuillMathField | null | undefined;
    /** Turn `element` into an editable math field. */
    MathField(element: HTMLElement, config?: MathQuillConfig): MathQuillMathField;
    /** Render `element`'s LaTeX text content as static math. */
    StaticMath(element: HTMLElement, config?: MathQuillConfig): MathQuillStaticMath;
    /** Set global MathQuill configuration. */
    config(config: MathQuillConfig): void;
    /** The MathQuill API instance attached to `element`, if any. */
    getApiInstanceForElement(element: Element): MathQuillStaticMath | MathQuillMathField | null | undefined;
  }

  /** @remarks Undocumented: may change without notice. */
  const MathQuill: MathQuill;
}

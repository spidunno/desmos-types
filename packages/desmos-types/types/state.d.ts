/**
 * Serialized calculator states and the options for loading them.
 */
declare namespace Desmos {
  /**
   * A serialized graph, as returned by `getState()` on a graphing, geometry
   * or 3D calculator. Safe to `JSON.stringify`.
   *
   * Treat states as opaque: modifying them by hand can produce a state that
   * `setState()` cannot load.
   */
  interface GraphState {
    /** State format version. */
    readonly version: number;
    readonly [key: string]: unknown;
  }

  /**
   * A serialized four-function or scientific calculator state. Treat as opaque.
   */
  interface BasicCalculatorState {
    readonly [key: string]: unknown;
  }

  interface SetBlankOptions {
    /** Keep the undo/redo history. @defaultValue `false` */
    allowUndo?: boolean;
  }

  interface SetStateOptions extends SetBlankOptions {
    /**
     * Replace colors in the state with the perceptually closest colors in
     * the calculator's current palette (`calculator.colors`).
     * @defaultValue `false`
     */
    remapColors?: boolean;
  }

  /**
   * A snapshot of the current state plus its undo/redo history, for use with
   * `restoreHistory()`. Not serializable.
   *
   * @remarks Undocumented: may change without notice.
   */
  interface CalculatorHistory {
    readonly currentState: GraphState;
  }
}

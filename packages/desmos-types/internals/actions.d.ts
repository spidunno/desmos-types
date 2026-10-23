/**
 * Actions for each dispatch domain:
 *
 * - {@link Action}: the graph controller (`calculator.controller`).
 * - {@link MathFieldAction}: a math field's own controller (`mathField.controller`).
 *   Keystrokes in a math field become these, e.g. `arrow-up-down`.
 * - {@link BasicCalculatorAction}: a four-function or scientific calculator's controller.
 *
 * Each union comes from static analysis of the bundle, which attributes
 * every action to the reducer(s) that handle it. For the graph controller,
 * the payloads in {@link ActionPayloads} are hand-checked and replace the
 * generated ones.
 */
declare namespace Desmos.Internals {
  /** Precise payloads for frequently used actions, keyed by action type. */
  interface ActionPayloads {
    'set-state': { state: GraphState; opts?: { allowUndo?: boolean; remapColors?: boolean; [key: string]: unknown } };
    'set-blank': { opts?: { allowUndo?: boolean } };
    'set-item-latex': { id: ExpressionId; latex: Latex; source?: string };
    'set-item-color': { id: ExpressionId; color: HexColor };
    'set-item-dragmode': { id: ExpressionId; dragMode: DragMode };
    'set-item-label-orientation': { id: ExpressionId; labelOrientation: LabelOrientation };
    'set-item-pointstyle': { id: ExpressionId; pointStyle: PointStyle };
    'set-item-linestyle': { id: ExpressionId; lineStyle: LineStyle };
    'set-item-editable-label-mode': { id: ExpressionId; editableLabelMode: EditableLabelMode };
    'set-selected-id': { id: ExpressionId | undefined; state?: 'selected' | 'tentatively-selected' };
    'set-focus-location': { location: FocusLocation };
    'set-folder-title': { id: ExpressionId; title: string };
    'set-note-text': { id: ExpressionId; text: string };
    'toggle-item-hidden': { id: ExpressionId };
    'remove-item-by-id': { id: ExpressionId };
    'move-focus-to-item': { id: ExpressionId; where?: unknown };
    'set-perspective-distortion': { value: number };
    'update-expression-search-str': { str: string };
    tick: { time: number };
    'toast/show': { toast: ToastData };
    'toast/close': { onHide?: () => void };
  }

  type ActionWithPayload<T extends keyof ActionPayloads> = { type: T } & ActionPayloads[T];

  /** Every action `controller.dispatch()` accepts. Narrow on `type`. */
  type Action =
    | { [T in keyof ActionPayloads]: ActionWithPayload<T> }[keyof ActionPayloads]
    | Exclude<Generated.Action, { type: keyof ActionPayloads }>;

  /** All action type strings. */
  type ActionType = Action['type'];

  /** The action with the given type. */
  type ActionOfType<T extends ActionType> = Extract<Action, { type: T }>;

  /** Every action a math field's controller accepts. */
  type MathFieldAction = Generated.MathFieldAction;
  type MathFieldActionType = MathFieldAction['type'];
  type MathFieldActionOfType<T extends MathFieldActionType> = Extract<MathFieldAction, { type: T }>;

  /** Every action a four-function or scientific calculator's controller accepts. */
  type BasicCalculatorAction = Generated.BasicCalculatorAction;
  type BasicCalculatorActionType = BasicCalculatorAction['type'];
  type BasicCalculatorActionOfType<T extends BasicCalculatorActionType> = Extract<BasicCalculatorAction, { type: T }>;
}

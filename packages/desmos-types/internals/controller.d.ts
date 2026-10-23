/**
 * `calculator.controller`: the state manager behind every graphing-family
 * calculator. Public API methods are thin wrappers around `dispatch()`.
 */
declare namespace Desmos.Internals {
  /** Which product the controller is running. */
  type Product = 'graphing' | 'geometry-calculator' | 'graphing-3d' | 'notebook';

  /**
   * Where keyboard focus is. Variants without an `id` refer to fixed UI
   * elements. `unknown` means nothing in the calculator has focus.
   */
  type FocusLocation =
    | { type: 'unknown' }
    | { type: 'graph-paper' }
    | { type: 'search-expressions' }
    | { type: 'edit-list-toggle' }
    | { type: 'hide-expression-list-btn' }
    | { type: 'show-expression-list-btn' }
    | { type: 'zoom-in-btn' }
    | { type: 'zoom-out-btn' }
    | { type: 'zoom-restore-btn' }
    | { type: 'invalid-graph-bounds-cover' }
    | { type: 'toggle-keypad-from-expression-header' }
    | { type: 'expression'; id: ExpressionId }
    | { type: 'expression-icon'; id: ExpressionId }
    | { type: 'expression-evaluation'; id: ExpressionId; listIndex: number | 'show-more' }
    | { type: 'expression-footer-toggle'; id: ExpressionId; subType: 'cdf' | 'summary' }
    | { type: 'expression-menu'; id: ExpressionId; location: string }
    | { type: 'editable-label'; id: ExpressionId }
    | { type: 'slider-thumb'; id: ExpressionId }
    | { type: 'slider-limit'; id: ExpressionId; location: string }
    | { type: 'domain-limit'; id: ExpressionId; location: string }
    | { type: 'folder'; id: ExpressionId }
    | { type: 'text'; id: ExpressionId }
    | { type: 'image'; id: ExpressionId; location?: string }
    | { type: 'image-icon'; id: ExpressionId }
    | { type: 'table'; id: ExpressionId; location: unknown }
    | { type: 'table-icon'; id: ExpressionId; columnId: string }
    | { type: 'item-container'; id: ExpressionId }
    | { type: 'top-level-icon'; id: ExpressionId }
    | { type: 'regression-output'; id: ExpressionId; parameter: string }
    | { type: 'visualization-prop'; id: ExpressionId; location: string }
    | { type: 'settings'; location: string }
    | { type: 'ticker'; location: 'handler' | 'minstep' | (string & {}) }
    | { type: 'geo-token'; identifier: string }
    | { type: 'geo-basic-tool-group'; group: string }
    | { type: 'geo-header-back-link' }
    | { type: 'geo-show-constructions-icon' }
    | { type: 'color-picker-option'; category: unknown; color: HexColor }
    | { type: 'cell'; tableId: ExpressionId; location: unknown }
    | { type: 'chi-square-table'; id: ExpressionId; row: number; column: number }
    | { type: 'distribution-footer'; id: ExpressionId; subtype: string; item: unknown }
    | { type: 'inference-footer'; id: ExpressionId; subtype: string; item: string }
    | { type: 'add-inference-wizard'; subtype: string; row?: number; column?: number; button?: string }
    | { type: 'add-table-regression-btn'; id: ExpressionId }
    | { type: 'table-regression'; tableId: ExpressionId; location: unknown }
    | {
        type:
          | 'table-regression-copy-btn'
          | 'table-regression-delete-btn'
          | 'table-regression-export-btn'
          | 'table-regression-icon'
          | 'table-regression-model-dropdown'
          | 'table-regression-type-dropdown'
          | 'table-regression-view-source-popover';
        id: ExpressionId;
      }
    | {
        type:
          | 'multi-select-construct-icon'
          | 'multi-select-label-icon'
          | 'multi-select-more-icon'
          | 'multi-select-show-hide-icon'
          | 'multi-select-style-icon'
          | 'new-transformation-number';
      };

  /** A toast notification, shown with `showToast()` or a `toast/show` action. */
  interface ToastData {
    message?: string;
    /** Milliseconds before hiding; `0` or less keeps it open. @defaultValue `6000` */
    hideAfter?: number;
    undo?: { type: 'default' } | { type: 'custom'; action: () => void };
    learnMoreLink?: string;
    onHide?: () => void;
    [key: string]: unknown;
  }

  /** The current viewport and projection settings. */
  interface ViewState {
    viewport: { xmin: number; xmax: number; ymin: number; ymax: number; zmin?: number; zmax?: number };
    screen: unknown;
    xAxisScale: AxisScale;
    yAxisScale: AxisScale;
    degreeMode: boolean;
    showBox3D: boolean;
  }

  interface LayoutModel extends Generated.LayoutModel {
    /** Id of the table whose regression dropdown is open, if any. */
    tableRegressionsDropdownOpenForTableId: ExpressionId | undefined;
    openPopoverGuid: string | undefined;
  }

  interface Controller extends Generated.Controller {
    // -------------------------------------------------------------------------
    // Dispatch
    // -------------------------------------------------------------------------

    /**
     * Dispatch an action. Actions dispatched during another dispatch throw,
     * except `tick`, which is deferred. Use `runAfterDispatch()` to act after
     * the current dispatch.
     */
    dispatch(action: Action): void;
    dispatcher: Dispatcher;
    /** Run `callback` now, or after the current dispatch finishes. */
    runAfterDispatch(callback: () => void): void;
    /** Enqueue a public API event (`'change'`, `'graphReset'`, ...) to emit after the dispatch. */
    enqueueEvent(eventName: string, action?: Action): void;
    /** Whether a dispatch is in progress. */
    isDispatching(): boolean;

    // -------------------------------------------------------------------------
    // Items
    // -------------------------------------------------------------------------

    listModel: ListModel;
    getListModel(): ListModel;
    /** The item with this id. `includePreviewItems` also searches geometry tool previews. */
    getItemModel(id: ExpressionId, options?: { includePreviewItems?: boolean }): ItemModel | undefined;
    getItemModelByIndex(index: number): ItemModel | undefined;
    getAllItemModels(): ItemModel[];
    getItemCount(): number;
    /** Create (but don't insert) an item model from a serialized item state. */
    createItemModel(state: { type: ItemType; id: ExpressionId; [key: string]: unknown }): ItemModel;
    /** Items that define `identifier`. */
    getItemsByIdentifier(identifier: string): ItemModel[];
    /** The id of the single item that defines `identifier`, if exactly one does. */
    getExpressionIdForIdentifier(identifier: string): ExpressionId | undefined;
    /** A new unique item id. */
    generateId(): string;
    /** Remove items (skipping readonly ones) without dispatching. */
    removeListOfItems(ids: ExpressionId[]): { deletedItems: ItemModel[]; readonlyItemsNotDeleted: number };
    isItemReadonly(id: ExpressionId): boolean;
    getPlayingSliders(): ExpressionModel[];
    getTicker(): TickerModel;
    getHelperExpressions(): HelperExpression[];
    getExpressionAnalysis(): Record<ExpressionId, ExpressionAnalysis>;

    // -------------------------------------------------------------------------
    // Selection and focus
    // -------------------------------------------------------------------------

    getSelectedItem(): ItemModel | undefined;
    getAllSelectedItems(): ItemModel[];
    /** The selected item with the lowest index. */
    getFirstSelectedItem(): ItemModel | undefined;
    getSelectedExpressionIds(): ExpressionId[];
    isItemSelected(id: ExpressionId): boolean;
    setSelectedItem(id: ExpressionId | undefined, state?: 'selected' | 'tentatively-selected'): void;
    focusLocation: FocusLocation;
    getFocusLocation(): FocusLocation;
    setFocusLocation(location: FocusLocation): void;
    moveFocusToItem(id: ExpressionId, where?: unknown): void;
    /** The active geometry tool, e.g. `'selection'`. */
    activeTool: string;

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    getState(options?: { stripDefaults?: boolean }): GraphState;
    setState(state: GraphState, options?: { useIncrementalUpdate?: boolean; [key: string]: unknown }): void;
    getBlankState(options?: { degreeMode?: boolean }): GraphState;
    getHistory(): CalculatorHistory;
    getViewState(): ViewState | undefined;

    // -------------------------------------------------------------------------
    // Product and settings
    // -------------------------------------------------------------------------

    getProduct(): Product;
    getLanguage(): LanguageCode;
    getColors(): Record<string, string>;
    /** The color the next new item will get. */
    getNextColor(): HexColor;
    getDegreeMode(): boolean;
    layoutModel: LayoutModel;

    // -------------------------------------------------------------------------
    // Rendering and views
    // -------------------------------------------------------------------------

    /** The active grapher: `grapher3d` in 3D mode, `grapher2d` otherwise. */
    getGrapher(): Grapher2D | Grapher3D | undefined;
    getGrapher2d(): Grapher2D | undefined;
    getGrapher3d(): Grapher3D | undefined;
    grapher2d: Grapher2D;
    evaluator: Evaluator;
    getRootElt(): HTMLElement | undefined;
    /**
     * Call `callback` whenever views should re-render (after each
     * dispatch). Returns an unsubscribe function.
     */
    subscribeToChanges(callback: () => void): () => void;
    subscriptions: Record<string, () => void>;
    /** Notify every `subscribeToChanges` subscriber. */
    updateViews(): void;
    showToast(toast: ToastData): void;
    toastData: ToastData;
    closeToast(): void;

    // -------------------------------------------------------------------------
    // Localization
    // -------------------------------------------------------------------------

    /** Translate `key` into the current language, substituting `variables`. */
    s(key: string, variables?: Record<string, string | number>): string;
    hasTranslation(key: string): boolean;
  }

  interface Grapher2D extends Generated.Grapher2D {
    controller: Controller;
  }

  interface Grapher3D extends Generated.Grapher3D {}

  interface Evaluator extends Generated.Evaluator {}

  /** `calculator._calc`: the object that owns the controller, view and grapher. */
  interface CalcInternals extends Generated.CalcInternals {
    controller: Controller;
  }
}

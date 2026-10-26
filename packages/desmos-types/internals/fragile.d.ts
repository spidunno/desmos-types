/**
 * `Desmos.Private.Fragile`: the expression-list view classes and UI helpers.
 *
 * Each view's props extend the generated props (from live instances, call
 * sites and the class body) with hand-checked types. Each view's instance
 * type includes its own methods, so prototype patches are typed:
 *
 * @example
 * const { ExpressionView } = Desmos.Private.Fragile;
 * const template = ExpressionView.prototype.template;
 * ExpressionView.prototype.template = function () {
 *   console.log(this.props.model().latex);
 *   return template.call(this);
 * };
 */
declare namespace Desmos.Internals {
  /** Returned by `manageFocusHelper` and accepted as a `manageFocus` prop. */
  interface FocusHelper {
    shouldBeFocused: () => boolean;
    onFocusedChanged: (focused: boolean, event?: Event) => void;
  }

  interface FocusHelperOptions {
    controller: Controller;
    location: FocusLocation;
    /** Return truthy to suppress the blur that losing focus would dispatch. */
    suppressBlurEvent?: (event: Event) => unknown;
  }

  /** Popover open state, as passed to dropdown/popover views. */
  interface PopoverOpenState {
    isOpen: boolean;
    setDropdownOpen: (open: boolean) => void;
  }

  type TooltipGravity = 'n' | 's' | 'e' | 'w' | (string & {});

  // ---------------------------------------------------------------------------
  // Expression list item views
  // ---------------------------------------------------------------------------

  interface ExpressionViewProps extends Generated.ExpressionViewProps {
    controller: () => Controller;
    model: () => ExpressionModel;
    /** Whether this view renders the copy shown while dragging. */
    isDragCopy: () => boolean;
    onDragPending: (event: Event) => unknown;
  }

  interface ExpressionIconViewProps extends Generated.ExpressionIconViewProps {
    controller: () => Controller;
    model: () => ExpressionModel;
  }

  interface ExpressionFooterViewProps extends Generated.ExpressionFooterViewProps {
    controller: () => Controller;
    model: () => ExpressionModel;
    isFirstRender: () => boolean;
  }

  interface ExpressionOptionsMenuViewProps extends Generated.ExpressionOptionsMenuViewProps {
    controller: () => Controller;
    model: () => ExpressionModel;
  }

  interface ImageIconViewProps extends Generated.ImageIconViewProps {
    controller: () => Controller;
    model: () => ImageModel;
  }

  /**
   * The "add slider" prompt under expressions with undefined variables, and on the ticker.
   * `model` is widened beyond what the generator saw: the bundle also creates
   * this view with `model: () => controller.getTicker()`.
   */
  interface PromptSliderViewProps extends Omit<Generated.PromptSliderViewProps, 'model'> {
    controller: () => Controller;
    model: () => ExpressionModel | TickerModel;
    /** Variables to offer sliders for, overriding the ones the model reports. */
    missingVariables?: () => string[];
  }

  // ---------------------------------------------------------------------------
  // Math input views
  // ---------------------------------------------------------------------------

  /** Focus props consumed by the wrapper views before forwarding the rest. */
  interface FocusProps {
    isFocused?: () => boolean;
    onFocusedChanged?: (focused: boolean, event?: Event) => void;
    /** Use instead of `isFocused`/`onFocusedChanged`. */
    manageFocus?: () => FocusHelper;
  }

  /** An editable math field. */
  interface MathquillViewProps extends Generated.MathquillViewProps, FocusProps {
    latex?: () => Latex;
    placeholder?: () => string;
    getAriaLabel?: () => string;
    getAriaPostLabel?: () => string;
    /** Called with the new LaTeX and details of the edit. */
    onUserChangedLatex?: (latex: Latex, info?: any) => unknown;
    onUserPressedKey?: (key: string, event?: KeyboardEvent) => unknown;
    manageFocus?: () => FocusHelper;
  }

  /** A small inline math input, as used for slider limits and domains. */
  interface InlineMathInputViewProps extends Generated.InlineMathInputViewProps, FocusProps {
    latex?: () => Latex;
    controller?: () => Controller;
    ariaLabel?: () => string;
    handleLatexChanged?: (latex: Latex) => unknown;
    handlePressedKey?: (key: string, event?: KeyboardEvent) => unknown;
    manageFocus?: () => FocusHelper;
  }

  /** Read-only rendered math. */
  interface StaticMathquillViewProps extends Generated.StaticMathquillViewProps {
    latex: () => Latex;
    getAriaLabel?: () => string;
    didMountMathquill?: (mathField: MathQuillStaticMath) => unknown;
  }

  // ---------------------------------------------------------------------------
  // Controls
  // ---------------------------------------------------------------------------

  interface CheckboxProps extends Generated.CheckboxProps {
    checked: () => boolean;
    /** Called with the new checked state. */
    onChange: (checked: boolean) => unknown;
    ariaLabel?: () => string;
    disabled?: () => boolean;
    manageFocus?: () => FocusHelper;
  }

  /** One option of a {@link SegmentedControlProps}. */
  type SegmentedControlOption = ReturnType<Generated.SegmentedControlProps['staticConfig']>[number];

  interface SegmentedControlProps extends Generated.SegmentedControlProps {
    ariaGroupLabel: () => string;
  }

  interface TooltipProps extends Generated.TooltipProps {
    /** The tooltip text. */
    tooltip: () => string;
    /** Which side of the anchor the tooltip appears on. */
    gravity?: () => TooltipGravity;
  }

  interface DropdownPopoverWithAnchorShimProps extends Generated.DropdownPopoverWithAnchorShimProps {
    /** The element the popover is attached to. */
    anchor?: () => DCGView.Child;
    popoverBody?: () => DCGView.Child;
    orientation?: () => string;
    /** Open state and its setter. */
    controlled?: () => PopoverOpenState;
    tooltip?: () => string;
    tooltipGravity?: () => TooltipGravity;
  }

  // ---------------------------------------------------------------------------
  // Classes
  // ---------------------------------------------------------------------------

  /** An instance of a Fragile view: the DCGView base, its own members and its props. */
  type FragileView<P, Members> = DCGView.View<P> & Members;

  type FragileViewClass<P, Members> = DCGView.ViewClass<P, FragileView<P, Members>>;

  /** Static helpers on `Fragile.MathquillView`. */
  interface MathquillViewStatics {
    /** The math field containing `document.activeElement`, if it's in one. */
    getFocusedMathquill(): Desmos.MathQuillMathField | undefined;
    /**
     * Apply an arrow key to a math field. Returns true if the cursor was
     * already at that edge (so focus should move to the next item).
     */
    applyArrowKeyAndReturnIfWasAtBounds(mathField: Desmos.MathQuillMathField, key: string, event: KeyboardEvent): boolean;
  }

  /** The view classes on `Private.Fragile`. */
  interface FragileViews {
    ExpressionView: FragileViewClass<ExpressionViewProps, Generated.ExpressionViewMembers>;
    ExpressionIconView: FragileViewClass<ExpressionIconViewProps, Generated.ExpressionIconViewMembers>;
    ExpressionFooterView: FragileViewClass<ExpressionFooterViewProps, Generated.ExpressionFooterViewMembers>;
    ExpressionOptionsMenuView: FragileViewClass<ExpressionOptionsMenuViewProps, Generated.ExpressionOptionsMenuViewMembers>;
    ImageIconView: FragileViewClass<ImageIconViewProps, Generated.ImageIconViewMembers>;
    PromptSliderView: FragileViewClass<PromptSliderViewProps, Generated.PromptSliderViewMembers>;
    MathquillView: FragileViewClass<MathquillViewProps, Generated.MathquillViewMembers> & MathquillViewStatics;
    InlineMathInputView: FragileViewClass<InlineMathInputViewProps, Generated.InlineMathInputViewMembers>;
    StaticMathquillView: FragileViewClass<StaticMathquillViewProps, Generated.StaticMathquillViewMembers>;
    Checkbox: FragileViewClass<CheckboxProps, Generated.CheckboxMembers>;
    SegmentedControl: FragileViewClass<SegmentedControlProps, Generated.SegmentedControlMembers>;
    Tooltip: FragileViewClass<TooltipProps, Generated.TooltipMembers>;
    DropdownPopoverWithAnchorShim: FragileViewClass<DropdownPopoverWithAnchorShimProps, Generated.DropdownPopoverWithAnchorShimMembers>;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  interface LatexSpan {
    input: string;
    start: number;
    end: number;
  }

  /** Node types produced by Desmos's LaTeX parsers. */
  type LatexNodeType =
    | 'Group' | 'Letter' | 'Digit' | 'Symbol' | 'Cmd' | 'SupSub' | 'Superscript' | 'Subscript' | 'Frac'
    | 'Sqrt' | 'Nthroot' | 'LeftRight' | 'OperatorName' | 'Paren' | 'Pipes' | 'List' | 'Matrix' | 'BMatrix'
    | 'Row' | 'Add' | 'Sub' | 'Mul' | 'Div' | 'Neg' | 'Pos' | 'Juxt' | 'DotMul' | 'CrossMul' | 'Dot'
    | 'Call' | 'ImplicitCall' | 'Index' | 'Comparator' | 'ComparatorChain' | 'And' | 'Or' | 'Piecewise'
    | 'Integral' | 'Sum' | 'Product' | 'Derivative' | 'Differential' | 'Prime' | 'Bang' | 'Tilde'
    | 'Ellipsis' | 'Seq' | 'SemicolonSeq' | 'Colon' | 'For' | 'With' | 'RightArrow' | 'PercentOf'
    | 'Decimal' | 'Alphanumeric' | 'MixedNumber' | 'StringNode' | 'TokenNode' | 'Err' | 'EmptyCell'
    | 'EmptyIntegral' | 'EmptyPiecewise' | 'EmptyRangeBound' | 'EmptySemicolonSegment';

  /** A node of the tree returned by `parseLatexToGroup`. */
  interface LatexNode {
    type: LatexNodeType | (string & {});
    span: LatexSpan;
    args?: LatexNode[];
    /** For leaves such as `Letter`, `Digit` and `Symbol`. */
    val?: string;
    sup?: LatexNode;
    sub?: LatexNode;
    nprimes?: number;
    [key: string]: unknown;
  }

  /** The non-view helpers on `Private.Fragile`. */
  interface FragileHelpers {
    /** Evaluate LaTeX to a number (`NaN` if it isn't one). */
    evaluateLatex(latex: Latex, degreeMode: boolean, complex?: boolean): number;
    /** Parse LaTeX into a syntax tree. Throws on a parse error. */
    parseLatexToGroup(latex: Latex): LatexNode;
    /** The points/lines/fill display settings that apply to a graph type, given the item's settings. */
    getReconciledExpressionProps(
      graphType: unknown,
      props: { points?: boolean; lines?: boolean; fill?: boolean },
      extra?: unknown
    ): { points: boolean; lines: boolean; fill: boolean };
    /** The current UI language code. */
    currentLanguage(): LanguageCode;
    /** GLSL source prepended to shader expressions. */
    glslHeader: string;
    /** A focus helper that keeps a view's focus in sync with `controller.focusLocation`. */
    manageFocusHelper(options: FocusHelperOptions): FocusHelper;
    /** Same as `manageFocusHelper`, for math fields. */
    mathquillFocusHelper(options: FocusHelperOptions): FocusHelper;
    /** Low-level list model edits. These don't dispatch; call `controller.updateViews()` after. */
    List: {
      /** Move `count` items starting at index `from` to index `to`. */
      moveItemsTo(listModel: ListModel, from: number, to: number, count: number): void;
      /** Remove an item (and a folder's children). Returns the removed items. */
      removeItemById(listModel: ListModel, id: ExpressionId): ItemModel[];
    };
  }
}

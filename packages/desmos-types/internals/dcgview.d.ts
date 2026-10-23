/**
 * DCGView: Desmos's UI framework, available at runtime as
 * `Desmos.Private.Fragile.DCGView` (typed as {@link DCGView.Module}).
 *
 * Every prop is passed as a getter function so views can re-read it on
 * update; wrap constants with `DCGView.const(value)`. Children are element
 * specs created with `createElement`.
 */
declare namespace Desmos.Internals.DCGView {
  /** A prop value as passed to a view: a getter returning the current value. */
  type Getter<T> = () => T;

  /** Props as a view receives them: each value wrapped in a getter (functions are passed as-is). */
  type PropGetters<P> = { [K in keyof P]: NonNullable<P[K]> extends (...args: any[]) => any ? P[K] : Getter<P[K]> };

  /** A description of an element, view or fragment to render. */
  interface ElementSpec {
    readonly isDCGElementSpec: true;
    readonly type: 'element' | 'view' | 'fragment';
    readonly tagName?: string;
    readonly viewClass?: ViewClass<any>;
    readonly props?: Record<string, unknown>;
    readonly children?: unknown;
  }

  /** Anything accepted as a child. */
  type Child = ElementSpec | string | Getter<string> | null | undefined | false | Child[];

  /** Props accepted by `createElement` for an HTML tag. */
  type ElementProps = Record<string, unknown> & { children?: Child };

  /**
   * Props for a view with props `P`: getters, plus `children` if `P` doesn't
   * declare its own (render-prop components like `For` do).
   */
  type ViewProps<P> = PropGetters<P> & ('children' extends keyof P ? {} : { children?: Child });

  /** Blocks inference from a parameter (like `NoInfer`, but works before TS 5.4). */
  type NoInfer_<T> = [T][T extends any ? 0 : never];

  /** Lifecycle hooks a view can implement. */
  interface ViewHooks {
    init?(): void;
    willMount?(): void;
    onMount?(): void;
    didMount?(): void;
    shouldUpdate?(): boolean;
    willUpdate?(): void;
    onUpdate?(): void;
    didUpdate?(): void;
    willUnmount?(): void;
    onUnmount?(): void;
    didUnmount?(): void;
  }

  /** An instance of a view class. */
  interface View<P = Record<string, unknown>> extends ViewHooks {
    props: ViewProps<P>;
    /** Shorthand for `DCGView.const`. */
    const: Module['const'];
    /** Build the view's element tree. Every view must implement this. */
    template(): ElementSpec;
    /** Re-render this view and its children. */
    update(): void;
    updateChildren(): void;
    bindFn<F extends (...args: any[]) => any>(fn: F): F;
    /** Like `bindFn`, but the bound function does nothing once the view is unmounted. */
    bindIfMounted<F extends (...args: any[]) => any>(fn: F): (...args: Parameters<F>) => ReturnType<F> | undefined;
    findFirstRootDOMNode(): Node;
    findLastRootDOMNode(): Node;
    _isMounted: boolean;
    _childViews: View<any>[];
    _element: unknown;
  }

  /**
   * A view class. Subclass `DCGView.Class` to make one.
   *
   * @typeParam P - the view's props.
   * @typeParam V - the instance type, including the class's own members.
   */
  interface ViewClass<P = Record<string, unknown>, V extends View<P> = View<P>> {
    new (props: ViewProps<P>): V;
    readonly IS_DCGVIEW: true;
    /** The class prototype; patch its methods to change how every instance behaves. */
    readonly prototype: V;
  }

  /** The base class constructor. Subclass it with your props as the type argument. */
  interface ClassConstructor {
    new <P = Record<string, unknown>>(props: ViewProps<P>): View<P>;
    readonly IS_DCGVIEW: true;
    readonly prototype: View<any>;
  }

  /** The built-in control-flow components. */
  interface Components {
    /** Render `children(item, index)` for each element of `each()`, keyed by `key`. */
    For: ViewClass<{
      each: () => readonly unknown[];
      key: (item: any, index: number, all: readonly any[]) => string | number;
      children: (item: () => any, index: () => number) => Child;
    }>;

    /** Render `children()` while `predicate()` is truthy. */
    If: ViewClass<{ predicate: () => unknown; children: () => Child }>;

    /** Re-render `children(key)` whenever `key()` changes. */
    Switch: ViewClass<{ key: () => unknown; children: (key: any) => Child }>;

    /** A text `<input>` with two-way bindings. Other props become attributes. */
    Input: ViewClass<{
      value: () => string | number | null | undefined;
      onInput?: (value: string) => void;
      onEnterPressed?: () => void;
      disabled?: () => boolean;
      readOnly?: () => boolean;
      selection?: () => { anchor: number; head: number } | undefined;
      onSelectionChange?: (selection: { anchor: number; head: number }) => void;
      [attribute: string]: unknown;
    }>;

    /** Render one of two branches depending on `predicate()`. */
    IfElse(predicate: () => unknown, branches: { true: () => Child; false: () => Child }): ElementSpec;

    /**
     * Render the branch for the current value of a discriminant.
     *
     * - `SwitchUnion(key, branches)`: branch `branches[key()]`, called with a getter for the key.
     * - `SwitchUnion(object, field, branches)`: branch `branches[object()[field]]`, called with `object`.
     */
    SwitchUnion<K extends string>(key: () => K, branches: { [B in K]?: (key: () => B) => Child }): ElementSpec;
    SwitchUnion<T, F extends keyof T>(
      object: () => T,
      field: F,
      branches: { [key: string]: (object: () => T) => Child }
    ): ElementSpec;
  }

  /** The `DCGView` object itself. */
  interface Module {
    /**
     * Base class for views.
     *
     * @example
     * const { DCGView } = Desmos.Private.Fragile;
     * class Hello extends DCGView.Class<{ name: string }> {
     *   template() {
     *     return DCGView.createElement('div', { children: () => `Hello ${this.props.name()}` });
     *   }
     * }
     */
    Class: ClassConstructor;
    Components: Components;
    /** Wrap a constant prop value in a getter. */
    const<T>(value: T): Getter<T> & { isDCGViewConst: true };
    /** Create an element spec for an HTML tag. Children go in `props.children`. */
    createElement(type: string, props?: ElementProps): ElementSpec;
    /** Create an element spec for a view, with props typed from the view. */
    createElement<P>(type: ViewClass<P>, props: NoInfer_<ViewProps<P>>): ElementSpec;
    /** Same as `createElement`, but throws on invalid input instead of returning an empty spec. */
    createSpec(type: string, props?: ElementProps): ElementSpec;
    createSpec<P>(type: ViewClass<P>, props: NoInfer_<ViewProps<P>>): ElementSpec;
    /** Instantiate `viewClass` and render it into `node`, replacing its contents. Returns the view. */
    mountToNode<P>(viewClass: ViewClass<P>, node: HTMLElement, props: NoInfer_<ViewProps<P>>): View<P>;
    /** Unmount the view previously mounted on `node`. */
    unmountFromNode(node: HTMLElement): void;
  }
}

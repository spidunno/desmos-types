/**
 * A Flux-style dispatcher. The graph controller, every math field and every
 * basic calculator each have one (`controller.dispatcher`), all of the same
 * class but with different actions. Every action passes through it, so
 * registering a callback is the usual way to observe everything a
 * controller does.
 */
declare namespace Desmos.Internals {
  /** Returned by `register()`, in the form `'ID_<n>'`. */
  type DispatchToken = string;

  type DispatchCallback<A = Action> = (action: A) => void;

  /** @typeParam A - the actions this dispatcher carries. */
  interface Dispatcher<A = Action> extends Generated.Dispatcher {
    /**
     * Run `callback` for every dispatched action, after earlier-registered
     * callbacks (the controller's own reducer is registered first).
     *
     * @example
     * const token = calculator.controller.dispatcher.register((action) => {
     *   if (action.type === 'set-item-latex') console.log(action.id, action.latex);
     * });
     */
    register(callback: DispatchCallback<A>): DispatchToken;
    unregister(token: DispatchToken): void;
    /** Inside a callback, wait for the callbacks with these tokens to run first. */
    waitFor(tokens: DispatchToken[]): void;
    /**
     * Dispatch directly through the dispatcher, bypassing the controller's
     * bookkeeping. Prefer `controller.dispatch()`.
     */
    dispatch(action: A): void;
    isDispatching(): boolean;
    _callbacks: Record<DispatchToken, DispatchCallback<A>>;
  }
}

/**
 * `Desmos.Private`: internal modules exposed on the global, including the
 * DCGView framework and the expression view components (`Fragile`).
 */
declare namespace Desmos.Internals {
  /**
   * `Desmos.Private.Fragile`: UI internals. As the name says, these change
   * often between builds.
   */
  type PrivateFragile = Omit<Generated.PrivateFragile, 'DCGView' | keyof FragileViews | keyof FragileHelpers> & {
    DCGView: DCGView.Module;
  } & FragileViews &
    FragileHelpers;

  type Private = Omit<Generated.Private, 'Fragile' | 'Abraham'> & {
    Fragile: PrivateFragile;
    /** The same object as {@link Desmos.Abraham}. */
    Abraham: Desmos.Abraham;
  };
}

declare namespace Desmos {
  /**
   * Internal modules. Only typed when `@spidunno/desmos-types/internals` is included.
   * @remarks Internal: changes without notice between builds.
   */
  const Private: Internals.Private;
}

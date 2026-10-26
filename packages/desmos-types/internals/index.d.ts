// Types for Desmos API v1.13 internals: the controller, item models,
// dispatcher actions, DCGView and `Desmos.Private`.
//
// Opt in with `/// <reference types="@spidunno/desmos-types/internals" />` or by adding
// "@spidunno/desmos-types/internals" to `compilerOptions.types`. This also includes the
// public types.
//
// Internals change between builds. Files in ./generated are regenerated
// from a bundle by scripts/extract-internals.cjs; the other files here
// refine them by hand.

/// <reference path="../index.d.ts" />
/// <reference path="./generated/objects.d.ts" />
/// <reference path="./generated/actions.d.ts" />
/// <reference path="./generated/views.d.ts" />
/// <reference path="./item-models.d.ts" />
/// <reference path="./list-model.d.ts" />
/// <reference path="./actions.d.ts" />
/// <reference path="./dispatcher.d.ts" />
/// <reference path="./graph-sketches.d.ts" />
/// <reference path="./grapher2d.d.ts" />
/// <reference path="./controller.d.ts" />
/// <reference path="./sub-controllers.d.ts" />
/// <reference path="./dcgview.d.ts" />
/// <reference path="./fragile.d.ts" />
/// <reference path="./private.d.ts" />
/// <reference path="./augment.d.ts" />

export = Desmos;

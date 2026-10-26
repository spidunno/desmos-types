/**
 * `controller.listModel`: the expressions list, its lookup tables and
 * selection state.
 */
declare namespace Desmos.Internals {
  /**
   * One pass of drawing. Layer `-1` holds background images (drawn under the
   * grid), `0` everything else, and `1` folders marked "in front of
   * everything". Layers -1 and 1 only exist when non-empty.
   */
  interface DrawLayer {
    layer: -1 | 0 | 1;
    /** Item ids (table column ids for tables) in paint order, back to front. */
    drawOrder: ExpressionId[];
    drawSet: Set<ExpressionId>;
  }

  interface ListModel extends Generated.ListModel {
    controller: Controller;
    /** Every item, in list order. Prefer `controller.getAllItemModels()`. */
    __itemModelArray: ItemModel[];
    /** Items by id. Prefer `controller.getItemModel(id)`. */
    __itemIdToModel: Record<ExpressionId, ItemModel>;
    /** Helper expressions by id. */
    __helperIdToModel: Record<string, unknown>;
    /** Ids of selected items. */
    selectedItemMap: Record<ExpressionId, unknown>;
    /** Item ids in keyboard tab order. */
    tabOrder: ExpressionId[];
    drawLayers: DrawLayer[];
    /** Index into the palette for the next new item's color. */
    colorIdx: number;
    expressionAnalysis: Record<ExpressionId, ExpressionAnalysis>;
    ticker: TickerModel;
  }
}

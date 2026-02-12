/* data.js
   Centralized constants for GPQ Statue Solver.
   Plain JavaScript (no TypeScript typing assumptions).
*/

(() => {
  "use strict";

  // ---- App/Game Config ----
  const CONFIG = Object.freeze({
    slots: 4,
    maxTurns: 7,
    duplicatesAllowed: true,

    // Fixed first guess (good information density)
    firstGuess: Object.freeze(["medal", "medal", "scroll", "scroll"]),
  });

  // ---- Item Catalog ----
  const ITEMS = Object.freeze([
    Object.freeze({ id: "medal", label: "Medal", icon: "assets/img/medal.png" }),
    Object.freeze({ id: "scroll", label: "Scroll", icon: "assets/img/scroll.png" }),
    Object.freeze({ id: "food", label: "Food", icon: "assets/img/food.png" }),
    Object.freeze({ id: "wine", label: "Wine", icon: "assets/img/wine.png" }),
  ]);

  // ---- Convenience Maps ----
  const ITEM_BY_ID = Object.freeze(
    ITEMS.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {})
  );

  const SYMBOLS = Object.freeze(ITEMS.map((x) => x.id));

  // Expose globally
  window.GPQData = Object.freeze({
    CONFIG,
    ITEMS,
    ITEM_BY_ID,
    SYMBOLS,
  });
})();
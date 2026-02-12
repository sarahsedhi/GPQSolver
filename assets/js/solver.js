/* solver.js
   GPQ Statue Solver (Mastermind)
   - 4 slots (configurable)
   - 4 item types (configurable)
   - duplicates allowed (as per your GPQ case: 4 of each type available)

   Exposes: window.GPQSolver
   Functions:
     - generateAllCodes(symbols, slots)
     - score(guess, code) -> { pleased, incorrect, unknown }
     - filterCandidates(candidates, guess, feedback)
     - pickNextGuess(candidates, allCodes?)  // minimax
*/

(() => {
  "use strict";

  const GPQSolver = {};

  /**
   * Generate all possible codes of length `slots` from `symbols` (duplicates allowed).
   * @param {string[]} symbols
   * @param {number} slots
   * @returns {string[][]}
   */
  GPQSolver.generateAllCodes = function generateAllCodes(symbols, slots) {
    const out = [];
    const n = symbols.length;

    const build = (arr) => {
      if (arr.length === slots) {
        out.push(arr.slice());
        return;
      }
      for (let i = 0; i < n; i++) {
        arr.push(symbols[i]);
        build(arr);
        arr.pop();
      }
    };

    build([]);
    return out;
  };

  /**
   * Score a guess against a code using Mastermind rules.
   * - pleased: correct symbol in correct position
   * - incorrect: correct symbol in wrong position (after removing pleased matches)
   * - unknown: symbol not in code (after accounting for pleased/incorrect)
   *
   * Works correctly with duplicates.
   *
   * @param {string[]} guess
   * @param {string[]} code
   * @returns {{ pleased: number, incorrect: number, unknown: number }}
   */
  GPQSolver.score = function score(guess, code) {
    let pleased = 0;

    // Counts for unmatched positions only
    const guessCounts = Object.create(null);
    const codeCounts = Object.create(null);

    for (let i = 0; i < guess.length; i++) {
      const g = guess[i];
      const c = code[i];

      if (g === c) {
        pleased++;
      } else {
        guessCounts[g] = (guessCounts[g] || 0) + 1;
        codeCounts[c] = (codeCounts[c] || 0) + 1;
      }
    }

    // incorrect = overlap of remaining counts
    let incorrect = 0;
    for (const sym in guessCounts) {
      const gc = guessCounts[sym] || 0;
      const cc = codeCounts[sym] || 0;
      incorrect += Math.min(gc, cc);
    }

    const unknown = guess.length - pleased - incorrect;
    return { pleased, incorrect, unknown };
  };

  /**
   * Filter candidates by feedback consistency.
   * @param {string[][]} candidates
   * @param {string[]} guess
   * @param {{ pleased: number, incorrect: number, unknown: number }} feedback
   * @returns {string[][]}
   */
  GPQSolver.filterCandidates = function filterCandidates(candidates, guess, feedback) {
    const p = feedback.pleased | 0;
    const i = feedback.incorrect | 0;
    const u = feedback.unknown | 0;

    return candidates.filter((code) => {
      const s = GPQSolver.score(guess, code);
      return s.pleased === p && s.incorrect === i && s.unknown === u;
    });
  };

  /**
   * Pick the next guess using minimax:
   * Choose a guess that minimizes the size of the largest remaining bucket
   * across all possible feedback results.
   *
   * By default we consider ALL codes as potential guesses (more optimal).
   * If `allCodes` is not provided, we consider only `candidates`.
   *
   * Tie-breakers:
   *  1) Prefer guesses that are themselves in `candidates`
   *  2) Prefer smaller expected bucket size
   *
   * @param {string[][]} candidates
   * @param {string[][]=} allCodes
   * @returns {string[] | null}
   */
  GPQSolver.pickNextGuess = function pickNextGuess(candidates, allCodes) {
    if (!candidates || candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    const guessPool = (allCodes && allCodes.length ? allCodes : candidates);

    // Precompute a fast lookup to prefer candidate guesses
    const candidateKeySet = new Set(candidates.map(codeToKey));

    let bestGuess = null;
    let bestWorst = Infinity;
    let bestExpected = Infinity;
    let bestIsCandidate = false;

    // Evaluate each possible guess
    for (let gIdx = 0; gIdx < guessPool.length; gIdx++) {
      const guess = guessPool[gIdx];

      // Bucket counts by feedback signature
      const buckets = Object.create(null);

      for (let cIdx = 0; cIdx < candidates.length; cIdx++) {
        const code = candidates[cIdx];
        const s = GPQSolver.score(guess, code);
        const key = scoreToKey(s);
        buckets[key] = (buckets[key] || 0) + 1;
      }

      let worst = 0;
      let sumSq = 0; // for expected bucket size proxy
      for (const k in buckets) {
        const size = buckets[k];
        if (size > worst) worst = size;
        sumSq += size * size;
      }

      // Expected remaining if each candidate equally likely:
      // E[remaining] = sum(bucketSize^2) / N
      const expected = sumSq / candidates.length;

      const isCandidateGuess = candidateKeySet.has(codeToKey(guess));

      // Primary: minimize worst-case
      if (worst < bestWorst) {
        bestWorst = worst;
        bestExpected = expected;
        bestGuess = guess;
        bestIsCandidate = isCandidateGuess;
        continue;
      }

      if (worst === bestWorst) {
        // Tie-breaker 1: prefer candidate guesses
        if (isCandidateGuess && !bestIsCandidate) {
          bestExpected = expected;
          bestGuess = guess;
          bestIsCandidate = true;
          continue;
        }
        if (isCandidateGuess === bestIsCandidate) {
          // Tie-breaker 2: smaller expected bucket size
          if (expected < bestExpected) {
            bestExpected = expected;
            bestGuess = guess;
            continue;
          }
        }
      }
    }

    return bestGuess ? bestGuess.slice() : candidates[0];
  };

  // -----------------------------
  // Helpers
  // -----------------------------
  function scoreToKey(s) {
    // Small stable signature
    return `${s.pleased}-${s.incorrect}-${s.unknown}`;
  }

  function codeToKey(code) {
    // Stable join
    return code.join("|");
  }

  // Expose globally
  window.GPQSolver = GPQSolver;
})();
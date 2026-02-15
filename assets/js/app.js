/* app.js
   GPQ Statue Solver (4 slots, 4 types, duplicates allowed)
   UI orchestration only. Solver logic is expected from solver.js as `window.GPQSolver`.

   Notes:
   - Attempts start at 0 and increment ONLY when user clicks "Try".
   - Resets automatically if attempts would exceed 7 (as per your spec).
*/

(() => {
  "use strict";

  // -----------------------------
  // Configuration
  // -----------------------------
  const MAX_TURNS = 7;
  const SLOTS = 4;

  // Item catalog (icons should exist in /assets/img/)
  const ITEMS = [
    { id: "medal", label: "Medal", icon: "assets/img/medal.png" },
    { id: "scroll", label: "Scroll", icon: "assets/img/scroll.png" },
    { id: "food", label: "Food", icon: "assets/img/food.png" },
    { id: "wine", label: "Wine", icon: "assets/img/wine.png" },
  ];

  // Fixed first guess (good info density for duplicates-allowed mastermind)
  // You can change later without touching the UI.
  const FIRST_GUESS = ["medal", "medal", "scroll", "scroll"];

  // -----------------------------
  // DOM Helpers
  // -----------------------------
  const $ = (sel) => document.querySelector(sel);

  const els = {
    startPanel: $("#startPanel"),
    solverPanel: $("#solverPanel"),
    normalBtn: $("#normalBtn"),
    turboBtn: $("#turboBtn"),
    resetBtn: $("#resetBtn"),
    tryBtn: $("#tryBtn"),
    clearHistoryBtn: $("#clearHistoryBtn"),

    attemptCount: $("#attemptCount"),
    remainingCount: $("#remainingCount"),

    feedbackForm: $("#feedbackForm"),
    pleasedInput: $("#pleasedInput"),
    incorrectInput: $("#incorrectInput"),
    unknownInput: $("#unknownInput"),
    validationMessage: $("#validationMessage"),

    noticePanel: $("#noticePanel"),

    historyList: $("#historyList"),

    slot: [
      { icon: $("#slotIcon1"), name: $("#slotName1") },
      { icon: $("#slotIcon2"), name: $("#slotName2") },
      { icon: $("#slotIcon3"), name: $("#slotName3") },
      { icon: $("#slotIcon4"), name: $("#slotName4") },
    ],
  };

  // -----------------------------
  // Fallback Solver (optional)
  // If solver.js is not present yet, this keeps the app usable.
  // When you implement solver.js, it should define window.GPQSolver and this will be ignored.
  // -----------------------------
  const FallbackSolver = {
    generateAllCodes(symbols, slots) {
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
    },

    score(guess, code) {
      // Pleased = exact matches
      let pleased = 0;
      const guessCounts = new Map();
      const codeCounts = new Map();

      for (let i = 0; i < guess.length; i++) {
        const g = guess[i];
        const c = code[i];
        if (g === c) {
          pleased++;
        } else {
          guessCounts.set(g, (guessCounts.get(g) || 0) + 1);
          codeCounts.set(c, (codeCounts.get(c) || 0) + 1);
        }
      }

      // Incorrect = overlaps in remaining counts
      let incorrect = 0;
      for (const [sym, gCount] of guessCounts.entries()) {
        const cCount = codeCounts.get(sym) || 0;
        incorrect += Math.min(gCount, cCount);
      }

      const unknown = guess.length - pleased - incorrect;
      return { pleased, incorrect, unknown };
    },

    filterCandidates(candidates, guess, feedback) {
      return candidates.filter((code) => {
        const s = FallbackSolver.score(guess, code);
        return (
          s.pleased === feedback.pleased &&
          s.incorrect === feedback.incorrect &&
          s.unknown === feedback.unknown
        );
      });
    },

    pickNextGuess(candidates) {
      // Simple: pick the first remaining candidate.
      // Later we’ll replace with minimax in solver.js.
      return candidates[0] || null;
    },
  };

  const Solver = window.GPQSolver || FallbackSolver;

  // -----------------------------
  // App State
  // -----------------------------
  const state = {
    attempts: 0,
    currentGuess: null,
    allCandidates: [],
    candidates: [],
    started: false,
    mode: "normal", // "normal" | "turbo"
    history: [],
  };

  // -----------------------------
  // Rendering
  // -----------------------------
  function setNotice(html, variant = "info") {
    if (!html) {
      els.noticePanel.classList.add("is-hidden");
      els.noticePanel.innerHTML = "";
      return;
    }

    els.noticePanel.classList.remove("is-hidden");

    // Keep styling minimal; CSS can be extended later.
    const prefix =
      variant === "success"
        ? "✅"
        : variant === "danger"
        ? "⚠️"
        : variant === "warning"
        ? "🟡"
        : "ℹ️";

    els.noticePanel.innerHTML = `<div><strong>${prefix}</strong> ${html}</div>`;
  }

  function setValidation(msg, variant = "muted") {
    els.validationMessage.textContent = msg || "";
    // Optional: future styling hooks
    els.validationMessage.dataset.variant = variant;
  }

  function updateHeaderStats() {
    els.attemptCount.textContent = String(state.attempts);
    els.remainingCount.textContent =
      state.started ? String(state.candidates.length) : "—";
  }

  function itemById(id) {
    return ITEMS.find((x) => x.id === id) || { id, label: id, icon: "" };
  }

  function renderGuess(guess) {
    if (!guess || guess.length !== SLOTS) return;

    for (let i = 0; i < SLOTS; i++) {
      const it = itemById(guess[i]);
      els.slot[i].name.textContent = it.label;

      if (it.icon) {
        els.slot[i].icon.src = it.icon;
        els.slot[i].icon.alt = it.label;
        els.slot[i].icon.style.visibility = "visible";
      } else {
        els.slot[i].icon.src = "";
        els.slot[i].icon.alt = "";
        els.slot[i].icon.style.visibility = "hidden";
      }
    }
  }

  function renderHistory() {
    els.historyList.innerHTML = "";

    for (const entry of state.history) {
      const guessText = entry.guess.map((id) => itemById(id).label).join(" / ");
      const li = document.createElement("li");

      li.innerHTML = `
        <div class="history-row">
          <div class="history-guess">#${entry.turn}: ${guessText}</div>
          <div class="history-feedback">P ${entry.feedback.pleased} · I ${entry.feedback.incorrect} · U ${entry.feedback.unknown} · Remaining ${entry.remaining}</div>
        </div>
      `;

      els.historyList.appendChild(li);
    }
  }

  function resetFeedbackInputs() {
    els.pleasedInput.value = "0";
    els.incorrectInput.value = "0";
    els.unknownInput.value = "0";
  }

  function formatGuessForClipboard(guess) {
  return guess.map((id) => itemById(id).label).join(", ");
}

async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {
    // fall through
  }

  // Fallback for some browsers / local file runs
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  ta.style.top = "0";
  document.body.appendChild(ta);
  ta.select();

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (_) {
    ok = false;
  }

  document.body.removeChild(ta);
  return ok;
}

  // -----------------------------
  // Core Flow
  // -----------------------------
  function hardReset(reason = "") {
    state.attempts = 0;
    state.started = false;
    state.history = [];

    const symbols = ITEMS.map((x) => x.id);
    state.allCandidates = Solver.generateAllCodes(symbols, SLOTS);
    state.candidates = state.allCandidates.slice();

    state.currentGuess = null;

    resetFeedbackInputs();
    renderHistory();
    updateHeaderStats();

    // Panels
    els.solverPanel.classList.add("is-hidden");
    els.startPanel.classList.remove("is-hidden");

    setValidation("");
    setNotice(reason ? `${reason} Resetting to the start.` : "", reason ? "warning" : "info");
  }

  function begin() {
    state.started = true;
    state.attempts = 0;
    state.history = [];

    const symbols = ITEMS.map((x) => x.id);
    state.allCandidates = Solver.generateAllCodes(symbols, SLOTS);
    state.candidates = state.allCandidates.slice();

    state.currentGuess = FIRST_GUESS.slice();
    renderGuess(state.currentGuess);
    renderHistory();
    updateHeaderStats();

    resetFeedbackInputs();
    setValidation("Enter the feedback you received, then press Try.");
    setNotice("");

    els.startPanel.classList.add("is-hidden");
    els.solverPanel.classList.remove("is-hidden");
  }

  function parseFeedback() {
    const pleased = clampInt(els.pleasedInput.value, 0, 4);
    const incorrect = clampInt(els.incorrectInput.value, 0, 4);
    const unknown = clampInt(els.unknownInput.value, 0, 4);
    return { pleased, incorrect, unknown };
  }

  function clampInt(v, min, max) {
    const n = Number.parseInt(String(v), 10);
    if (Number.isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function validateFeedback(fb) {
    if (fb.pleased + fb.incorrect + fb.unknown !== 4) {
      return "Counts must add up to 4.";
    }
    if (fb.pleased < 0 || fb.incorrect < 0 || fb.unknown < 0) {
      return "Counts cannot be negative.";
    }
    if (fb.pleased > 4 || fb.incorrect > 4 || fb.unknown > 4) {
      return "Counts cannot exceed 4.";
    }
    return "";
  }

  function computeAllowedSymbolsFromCandidates(candidates) {
    const allowed = new Set();
    for (const code of candidates) {
      for (const sym of code) allowed.add(sym);
    }
    return allowed;
  }

  function restrictCodesToSymbols(codes, allowedSet) {
    return codes.filter((code) => code.every((sym) => allowedSet.has(sym)));
  }


  function onTry() {
    if (!state.started) return;

    const fb = parseFeedback();
    const err = validateFeedback(fb);
    if (err) {
      setValidation(err, "danger");
      return;
    }

    // If solved, record the attempt and finish (do not filter).
    if (fb.pleased === 4) {
      const nextAttempt = state.attempts + 1;
      if (nextAttempt > MAX_TURNS) {
        hardReset(`Exceeded ${MAX_TURNS} tries.`);
        return;
      }

      state.attempts = nextAttempt;
      setValidation("");

      state.history.push({
        turn: state.attempts,
        guess: state.currentGuess.slice(),
        feedback: fb,
        remaining: state.candidates.length,
      });

      renderHistory();
      updateHeaderStats();
      setNotice(`Solved in ${state.attempts} ${state.attempts === 1 ? "try" : "tries"}.`, "success");
      return;
    }

    // Preview filter FIRST (no state changes yet). If feedback is inconsistent, prompt instead of hard-resetting.
    const filtered = Solver.filterCandidates(state.candidates, state.currentGuess, fb);
    if (filtered.length === 0) {
      setValidation("That feedback is impossible given prior tries. Please double-check the counts.", "danger");
      const ok = window.confirm(
        "No candidates remain. This usually means a feedback entry is incorrect.\n\n" +
        "Press OK to restart, or Cancel to go back and edit the feedback."
      );
      if (ok) {
        hardReset("Restarted due to inconsistent feedback.");
      } else {
        setNotice("Adjust the feedback and click Try again.", "warning");
      }
      return;
    }

    // Now commit the attempt (Try consumes a turn only if feedback is consistent).
    const nextAttempt = state.attempts + 1;
    if (nextAttempt > MAX_TURNS) {
      hardReset(`Exceeded ${MAX_TURNS} tries.`);
      return;
    }
    state.attempts = nextAttempt;
    setValidation("");
    setNotice("");

    state.history.push({
      turn: state.attempts,
      guess: state.currentGuess.slice(),
      feedback: fb,
      remaining: filtered.length,
    });

    state.candidates = filtered;

    renderHistory();
    updateHeaderStats();

    if (state.attempts >= MAX_TURNS) {
      hardReset(`Reached ${MAX_TURNS} tries without solving.`);
      return;
    }

    // Pick next guess
    let next;
    if (state.mode === "turbo") {
      const allowed = computeAllowedSymbolsFromCandidates(state.candidates);
      const pool = restrictCodesToSymbols(state.allCandidates, allowed);
      next = Solver.pickNextGuess(state.candidates, pool);
    } else {
      next = Solver.pickNextGuess(state.candidates, state.allCandidates);
    }

    if (!next) {
      renderHistory();
      updateHeaderStats();
      hardReset("Unable to choose a next guess.");
      return;
    }

    state.currentGuess = next.slice();
    renderGuess(state.currentGuess);
    renderHistory();
    updateHeaderStats();

    // Auto-copy the NEXT placement
    (async () => {
      const text = formatGuessForClipboard(state.currentGuess);
      const ok = await copyTextToClipboard(text);
      setNotice(
        ok ? "Next placement copied to clipboard." : "Next placement shown (clipboard blocked by browser).",
        ok ? "success" : "warning"
      );
    })();
  }


  function adjustStepper(field, delta) {
    const input =
      field === "pleased"
        ? els.pleasedInput
        : field === "incorrect"
        ? els.incorrectInput
        : els.unknownInput;

    const current = clampInt(input.value, 0, 4);
    const next = Math.max(0, Math.min(4, current + delta));
    input.value = String(next);
  }

  function bindSteppers() {
    document.addEventListener("click", (ev) => {
      const btn = ev.target.closest(".stepper-btn");
      if (!btn) return;

      const field = btn.getAttribute("data-stepper");
      const delta = Number.parseInt(btn.getAttribute("data-delta") || "0", 10);
      if (!field || !Number.isFinite(delta)) return;

      adjustStepper(field, delta);
    });
  }

  // -----------------------------
  // Event Wiring
  // -----------------------------
  function bindEvents() {
    els.normalBtn.addEventListener("click", () => {
      state.mode = "normal";
      begin();
    });
    els.turboBtn.addEventListener("click", () => {
      state.mode = "turbo";
      begin();
    });

    els.resetBtn.addEventListener("click", () => hardReset("Manual reset."));
    els.clearHistoryBtn.addEventListener("click", () => {
      state.history = [];
      renderHistory();
      setNotice("History cleared.", "info");
    });

    els.feedbackForm.addEventListener("submit", (ev) => {
      ev.preventDefault();
      onTry();
    });

    // Light validation as user types
    const onInput = () => {
      const fb = parseFeedback();
      const err = validateFeedback(fb);
      setValidation(err || "Ready.");
    };

    els.pleasedInput.addEventListener("input", onInput);
    els.incorrectInput.addEventListener("input", onInput);
    els.unknownInput.addEventListener("input", onInput);

    bindSteppers();
  }

  // -----------------------------
  // Boot
  // -----------------------------
  function init() {
    // Initial "cold" state: show start panel, attempts 0
    updateHeaderStats();
    setValidation("");
    setNotice("");

    // Initialize candidates now (cheap), so Remaining can be shown after Begin
    const symbols = ITEMS.map((x) => x.id);
    state.allCandidates = Solver.generateAllCodes(symbols, SLOTS);
    state.candidates = state.allCandidates.slice();

    // Ensure slot placeholders are clean
    renderGuess(["medal", "scroll", "food", "wine"].map(() => "")); // no-op safe
    resetFeedbackInputs();
    renderHistory();

    bindEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
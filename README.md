# GPQ Solver (4×4 Mastermind Helper)

A lightweight web tool for solving a 4-slot, 4-item, duplicate-allowed Mastermind-style puzzle using consistent, step-by-step feedback.

## Game Rules (Assumed)
- **4 slots** make up the hidden combination.
- **4 item types** are available.
- **Duplicates are allowed** (an item may appear multiple times).
- You have **up to 7 tries** to identify the correct combination (then the session restarts).

## Feedback Definitions
After submitting a guess in-game, you enter three counts:

- **Pleased** — correct item in the correct slot.
- **Incorrect** — correct item, but in the wrong slot.
- **Unknown** — item not present in the solution (or extra duplicates beyond what exists in the solution).

**Important:** The three values must always add up to **4**:


## How to Use
1. **Click _Begin_** to start a session.
2. The solver will provide a **recommended placement** (guess).
3. Enter that placement in-game and read the result.
4. Input the feedback counts into the solver:
   - Pleased
   - Incorrect
   - Unknown
5. Click **Try** to submit feedback and receive the next recommended placement.
6. Repeat until the solution is found (Pleased = 4).

### Copy to Clipboard
The solver copies the **next recommended placement** to your clipboard (when supported by the browser), so you can paste it directly into the game.

## Handling Impossible Feedback
If the feedback entered is inconsistent with prior turns (for example, a count was misread or mistyped), the solver may report that **no candidates remain**. When this occurs:
- Double-check the feedback for the most recent guess.
- Correct the values and try again, or restart the session if needed.

## Notes on Accuracy
The solver will converge on the correct solution **as long as the feedback is entered correctly each turn**. Most “solver failures” are caused by inconsistent feedback rather than the underlying solving logic.

## License
Add your preferred license here (e.g., MIT) before wider distribution.

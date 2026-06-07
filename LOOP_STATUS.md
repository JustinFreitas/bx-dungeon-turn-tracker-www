# Loop Status - Investigating "Unknown action" error

## Attempt 1
- **Observation:** User reported "Unknown action" error when adding an effect.
- **Hypothesis:** Typho in `index.js` or casing issue.
- **Action:** Searched for "Unknown action" in `index.js`. Found `case 'addEffect':`.
- **Result:** Code looked correct, but `Select-String` showed trailing spaces on the line.

## Attempt 2
- **Observation:** `reproduce_error.js` showed `addEffect` worked, but `AddEffect` failed with 400.
- **Hypothesis:** Casing or whitespace issue.
- **Action:** Modified `index.js` to use `action.toLowerCase().trim()` and updated `switch` cases to lowercase.
- **Result:** Reproduced 400 with `AddEffect` on old server, fixed on new server (port 3002).

## Attempt 3
- **Observation:** All unit tests pass.
- **Action:** Applied robust action parsing to `index.js`.
- **Result:** Successfully handled `AddEffect` and other casing/whitespace variants.

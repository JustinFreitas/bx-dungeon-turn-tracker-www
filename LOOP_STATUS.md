# Loop Status - B/X D&D Turn Tracker

## Attempt 1
- Analyzed existing codebase.
- Verified that core logic was largely present in `src/tracker.js` and `index.js`.
- Identified missing "Time Header" requirement.
- Implemented `formatTime` helper in `public/index.html` to show "Xhr Ymin completed" next to Turn headers.
- Verified tests pass.

## Attempt 2
- Improved `src/tracker.js` logging to group multiple actions within the same turn under a single header.
- Added `extinguishTorch` functionality to `src/tracker.js`.
- Updated `index.js` to handle the `extinguish` action.
- Added "Extinguish" button to `public/index.html`.
- Updated `tests/tracker.test.js` to include tests for extinguishing and log grouping.
- Verified all tests pass.

## Attempt 3
- Implemented "Turn Notes" feature.
- Modified `src/tracker.js` to accept notes in `nextTurn` and `rest` methods and log them.
- Updated `index.js` to pass `value` (notes) to `next` and `rest` actions.
- Updated `public/index.html` with a text area for notes and logic to send them.
- Updated `tests/tracker.test.js` to verify notes are correctly added to the log.
- Verified all tests pass.

## Attempt 4 (Current)
- Modified `src/tracker.js` to restrict Undo/Redo to "Turn" boundaries ("One turn at a time").
- Removed `saveHistory()` calls from `lightTorch`, `extinguishTorch`, and `setMonsterInterval`.
- Verified using `repro_undo.js` script that granular actions are skipped during undo.
- Added new test case "intra-turn actions do not create undo checkpoints" to `tests/tracker.test.js`.
- Verified all tests pass.

## Final Status
- All requirements from `GEMINI.md` are met.
- Application is functional and tested.
- UI includes all requested features: turn tracking, torch tracking (lit/extinguished), rest warnings/penalties, wandering monster checks (configurable), undo/redo (Turn-based), reset with confirmation, and turn notes.
- Real-time conversion is displayed in the log headers.
- Undo/Redo now behaves "One turn at a time", skipping intra-turn actions.
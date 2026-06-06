# Project: OSR Dungeon Turn Tracker WWW

# Mode: Autonomous / Persistence-First

## Instructions

You are operating in a "Ralph Wiggum" loop. Your goal is to achieve the objectives listed below through iterative trial and error. 

### Rules of Operation:

1. **Self-Correction:** If a command fails or a test stays red, do not ask for permission. Analyze the error, modify the code, and try again.

2. **Tool Usage:** You have full permission to use `run_shell_command` to execute builds, tests, and file manipulations.

3. **Progress Tracking:** After every 3 attempts, update a file named `LOOP_STATUS.md` with what you've tried and why it failed.

4. **Completion:** Only consider the task finished when all success criteria are met and verified by a shell command (e.g., `npm test` or `python -m pytest`).

## Current Objective

> [!IMPORTANT]
> Build a web based node application that serves as a B/X D&D dungeon turn tracker.
> Account for turns completed (there are six 10 minute turns in an hour) starting on the first turn.
> Account for lit/extinguished torches (they last for an hour).
> Account for rest (must rest every hour or suffer a -1 penalty to all rolls until rested).  Warn in log at the start of the rest turn so that the dungeon master can let the players know.
> Account for wandering monster checks (1 in 6 chance using a d6, rolled every two turns but at the start of the turn so that the dungeon master can work the monsters into play that turn).  Show both when an encounter happens but also if there wasn't one so that the DM knows the roll was made.  Have a field where the wandering monster check interval can be changed to any value >= 0, where 0 is no wandering monster checks at all.
> Have a way to undo/redo turn actions/settings taken so that a miss click can be fixed.
> Have a way to reset the Turn Tracker.  When resetting, always confirm the action so it can't be done accidentally.
> The Turn # log header for each turn should have the real time conversion to the right.  Here is an example for the eighth turn:  Turn 8 - 1hr 10min completed

## Success Criteria

- [x] Code compiles without errors.
- [x] All unit tests pass.
- [x] Build a web based node application that serves as a B/X D&D dungeon turn tracker.
- [x] Implement save/restore with custom naming.
- [x] Implement basic security and DOS prevention.

## Tool Registry

- run_shell_command: ENABLED
- write_file: ENABLED
- read_file: ENABLED
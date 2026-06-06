const TurnTracker = require('../src/tracker');

describe('TurnTracker', () => {
  let tracker;
  let mockDie;

  beforeEach(() => {
    mockDie = jest.fn(() => 6); // Default roll, no monster (need 1)
    tracker = new TurnTracker(mockDie);
  });

  test('initial state starts on Turn 1', () => {
    const status = tracker.getStatus();
    expect(status.currentTurn).toBe(1);
    expect(status.messages).toContain("Adventure begins!");
  });

  test('lighting a torch', () => {
    tracker.lightTorch();
    expect(tracker.getStatus().turnsLeftOnTorch).toBe(6);
  });

  test('extinguishing a torch', () => {
    tracker.lightTorch();
    tracker.extinguishTorch();
    expect(tracker.getStatus().turnsLeftOnTorch).toBe(0);
    expect(tracker.getStatus().messages).toContain("Torch extinguished.");
  });

  test('advancing turn reduces torch duration', () => {
    tracker.lightTorch(); // 6
    tracker.nextTurn(); // Turn 2
    expect(tracker.getStatus().turnsLeftOnTorch).toBe(5);
  });

  test('rest warning at start of 6th turn (after 5 active turns)', () => {
    tracker.nextTurn(); // Turn 2, tsr=1
    tracker.nextTurn(); // Turn 3, tsr=2
    tracker.nextTurn(); // Turn 4, tsr=3
    tracker.nextTurn(); // Turn 5, tsr=4
    tracker.nextTurn(); // Turn 6, tsr=5
    expect(tracker.getStatus().messages).toContain("WARNING: This is the 6th turn. The party must REST this turn or suffer a penalty.");
  });

  test('fatigue penalty applies at turn 7 if no rest at turn 6', () => {
    tracker.nextTurn(); // T2, tsr=1
    tracker.nextTurn(); // T3, tsr=2
    tracker.nextTurn(); // T4, tsr=3
    tracker.nextTurn(); // T5, tsr=4
    tracker.nextTurn(); // T6, tsr=5 (warning)
    tracker.nextTurn(); // T7, tsr=6 (penalty)
    expect(tracker.getStatus().penalty).toBe(-1);
    expect(tracker.getStatus().messages).toContain("The party did not rest! They are exhausted: -1 penalty to all rolls until rested.");
  });

  test('wandering monster check happens on even turns by default', () => {
    mockDie.mockReturnValue(6);
    tracker.nextTurn(); // Turn 2
    expect(mockDie).toHaveBeenCalledTimes(1);
    expect(tracker.getStatus().messages).toContain("Wandering Monster Check: Rolled 6 - No encounter.");

    tracker.nextTurn(); // Turn 3
    expect(mockDie).toHaveBeenCalledTimes(1);

    tracker.nextTurn(); // Turn 4
    expect(mockDie).toHaveBeenCalledTimes(2);
  });

  test('configurable wandering monster interval', () => {
    tracker.setMonsterInterval(3);
    expect(tracker.getStatus().monsterInterval).toBe(3);
    
    mockDie.mockClear();
    tracker.nextTurn(); // Turn 2
    expect(mockDie).not.toHaveBeenCalled();
    
    tracker.nextTurn(); // Turn 3
    expect(mockDie).toHaveBeenCalledTimes(1);
  });

  test('disabling wandering monster checks (interval 0)', () => {
    tracker.setMonsterInterval(0);
    mockDie.mockClear();
    tracker.nextTurn(); // Turn 2
    tracker.nextTurn(); // Turn 3
    tracker.nextTurn(); // Turn 4
    expect(mockDie).not.toHaveBeenCalled();
  });

  test('undo/redo functionality works for turn advances', () => {
    tracker.lightTorch();
    tracker.nextTurn(); // Turn 2
    expect(tracker.getStatus().currentTurn).toBe(2);

    tracker.undo(); // Back to T1 (after torch lit)
    expect(tracker.getStatus().currentTurn).toBe(1);
    expect(tracker.getStatus().turnsLeftOnTorch).toBe(6);

    tracker.redo(); // Back to T2
    expect(tracker.getStatus().currentTurn).toBe(2);
  });

  test('undo/redo works for settings and actions', () => {
    // Torch undo
    tracker.lightTorch();
    expect(tracker.getStatus().turnsLeftOnTorch).toBe(6);
    tracker.undo();
    expect(tracker.getStatus().turnsLeftOnTorch).toBe(0);
    tracker.redo();
    expect(tracker.getStatus().turnsLeftOnTorch).toBe(6);

    // Interval undo
    tracker.setMonsterInterval(10);
    expect(tracker.getStatus().monsterInterval).toBe(10);
    tracker.undo();
    expect(tracker.getStatus().monsterInterval).toBe(2);
  });

  test('resting advances turn and resets counters', () => {
    tracker.nextTurn(); // Turn 2, tsr=1
    tracker.rest(); // Turn 3, tsr=0
    expect(tracker.getStatus().currentTurn).toBe(3);
    expect(tracker.getStatus().turnsSinceRest).toBe(0);
    expect(tracker.getStatus().penalty).toBe(0);
  });

  test('log grouping for multiple actions in one turn', () => {
    tracker.lightTorch();
    tracker.setMonsterInterval(4);
    const status = tracker.getStatus();
    const turn1Log = status.fullLog.find(e => e.turn === 1);
    expect(turn1Log.messages).toContain("Adventure begins!");
    expect(turn1Log.messages).toContain("Torch lit. It will last for 6 turns (1 hour).");
    expect(turn1Log.messages).toContain("Wandering monster check interval set to 4.");
  });

  test('adding notes to next turn', () => {
    tracker.nextTurn("Found a mysterious lever");
    const status = tracker.getStatus();
    
    const turn1Log = status.fullLog.find(e => e.turn === 1);
    expect(turn1Log.messages).toContain("Note: Found a mysterious lever");
    
    const turn2Log = status.fullLog.find(e => e.turn === 2);
    expect(turn2Log.messages).not.toContain("Note: Found a mysterious lever");
  });

  test('adding notes to rest', () => {
    tracker.rest("Camped in the hallway");
    const status = tracker.getStatus();
    
    const turn1Log = status.fullLog.find(e => e.turn === 1);
    expect(turn1Log.messages).toContain("Note: Camped in the hallway");
    
    expect(status.currentTurn).toBe(2);
    const turn2Log = status.fullLog.find(e => e.turn === 2);
    expect(turn2Log.messages).toContain("Party rested. Fatigue penalty removed.");
  });
});
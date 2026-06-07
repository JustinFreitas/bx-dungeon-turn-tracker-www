const TurnTracker = require('../src/tracker');

describe('TurnTracker', () => {
  let tracker;
  let mockDie;

  beforeEach(() => {
    mockDie = jest.fn(() => 6); // Default roll, no monster (need 1)
    tracker = new TurnTracker(mockDie);
    tracker.start({ interval: 2 }); // Standard B/X interval
  });

  test('initial state starts on Turn 1', () => {
    const status = tracker.getStatus();
    expect(status.currentTurn).toBe(1);
    expect(status.messages).toContain("Adventure begins!");
  });

  test('starting with a lit torch', () => {
    const trackerWithTorch = new TurnTracker(mockDie);
    trackerWithTorch.start({ interval: 2, initialLights: [{ type: 'torch', label: 'Party' }] });
    const status = trackerWithTorch.getStatus();
    expect(status.activeLights[0].type).toBe('torch');
    expect(status.activeLights[0].turnsRemaining).toBe(5);
    expect(status.fullLog[0].messages).toContain("Party lit a torch. It will last for 6 turns.");
  });

  test('lighting a torch', () => {
    tracker.activateLight('torch', 'Grog');
    expect(tracker.getStatus().activeLights[0].turnsRemaining).toBe(5);
  });

  test('extinguishing a light', () => {
    tracker.activateLight('torch', 'Grog');
    const id = tracker.getStatus().activeLights[0].id;
    tracker.extinguishLight(id);
    expect(tracker.getStatus().activeLights.length).toBe(0);
    expect(tracker.getStatus().messages).toContain("Grog's torch extinguished.");
  });

  test('advancing turn reduces light duration', () => {
    tracker.activateLight('torch', 'Grog'); // 5 left on T1
    tracker.nextTurn(); // Turn 2, 4 left
    expect(tracker.getStatus().activeLights[0].turnsRemaining).toBe(4);
  });

  test('spell/effect duration tracking', () => {
    tracker.addEffect('Bless', 6);
    expect(tracker.getStatus().activeEffects[0].label).toBe('Bless');
    expect(tracker.getStatus().activeEffects[0].turnsRemaining).toBe(5);
    
    tracker.nextTurn(); // Turn 2, 4 left
    expect(tracker.getStatus().activeEffects[0].turnsRemaining).toBe(4);
    
    tracker.nextTurn(); // Turn 3, 3 left
    tracker.nextTurn(); // Turn 4, 2 left
    tracker.nextTurn(); // Turn 5, 1 left
    tracker.nextTurn(); // Turn 6, 0 left (warning)
    expect(tracker.getStatus().messages).toContain("WARNING: The effect 'Bless' is ending soon!");
    
    tracker.nextTurn(); // Turn 7, -1 (burnout)
    expect(tracker.getStatus().activeEffects.length).toBe(0);
    expect(tracker.getStatus().messages).toContain("The effect 'Bless' has ended.");
  });

  test('rest warning at start of 6th turn (after 5 active turns)', () => {
    tracker.nextTurn(); // Turn 2
    tracker.nextTurn(); // Turn 3
    tracker.nextTurn(); // Turn 4
    tracker.nextTurn(); // Turn 5
    tracker.nextTurn(); // Turn 6
    expect(tracker.getStatus().messages).toContain("WARNING: This is the 6th turn. The party must REST this turn or suffer a penalty.");
  });

  test('fatigue penalty applies at turn 7 if no rest at turn 6', () => {
    tracker.nextTurn(); // T2
    tracker.nextTurn(); // T3
    tracker.nextTurn(); // T4
    tracker.nextTurn(); // T5
    tracker.nextTurn(); // T6 (warning)
    tracker.nextTurn(); // T7 (penalty)
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
    tracker = new TurnTracker(mockDie);
    tracker.start({ interval: 3 });
    expect(tracker.getStatus().monsterInterval).toBe(3);
    
    mockDie.mockClear();
    tracker.nextTurn(); // Turn 2
    expect(mockDie).not.toHaveBeenCalled();
    
    tracker.nextTurn(); // Turn 3
    expect(mockDie).toHaveBeenCalledTimes(1);
  });

  test('disabling wandering monster checks (interval 0)', () => {
    tracker = new TurnTracker(mockDie);
    tracker.start({ interval: 0 });
    mockDie.mockClear();
    tracker.nextTurn(); // Turn 2
    tracker.nextTurn(); // Turn 3
    tracker.nextTurn(); // Turn 4
    expect(mockDie).not.toHaveBeenCalled();
  });

  test('undo/redo functionality works for turn advances', () => {
    tracker.activateLight('torch', 'Grog');
    tracker.nextTurn(); // Turn 2
    expect(tracker.getStatus().currentTurn).toBe(2);

    tracker.undo(); // Back to T1 (after torch lit)
    expect(tracker.getStatus().currentTurn).toBe(1);
    expect(tracker.getStatus().activeLights[0].turnsRemaining).toBe(5);

    tracker.redo(); // Back to T2
    expect(tracker.getStatus().currentTurn).toBe(2);
  });

  test('undo/redo works for settings and actions', () => {
    tracker.activateLight('torch', 'Grog');
    expect(tracker.getStatus().activeLights.length).toBe(1);
    tracker.undo();
    expect(tracker.getStatus().activeLights.length).toBe(0);
    tracker.redo();
    expect(tracker.getStatus().activeLights.length).toBe(1);
  });

  test('resting advances turn and resets counters', () => {
    tracker.nextTurn(); // Turn 2
    tracker.rest(); // Turn 3
    expect(tracker.getStatus().currentTurn).toBe(3);
    expect(tracker.getStatus().turnsSinceRest).toBe(0);
    expect(tracker.getStatus().penalty).toBe(0);
  });

  test('log grouping for multiple actions in one turn', () => {
    tracker.activateLight('torch', 'Grog');
    const status = tracker.getStatus();
    const turn1Log = status.fullLog.find(e => e.turn === 1);
    expect(turn1Log.messages).toContain("Adventure begins!");
    expect(turn1Log.messages).toContain("Grog lit a torch. It will last for 6 turns.");
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
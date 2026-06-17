const TurnTracker = require('../src/tracker');

describe('TurnTracker Serialization', () => {
  test('toJSON and fromJSON should preserve state', () => {
    const tracker = new TurnTracker(() => 6); 
    tracker.start({ interval: 2 });
    tracker.nextTurn('Turn 2 note'); 
    tracker.activateLight('torch', 'Grog');            
    tracker.nextTurn('Turn 3 note'); 
    
    const serialized = tracker.toJSON();
    const newTracker = new TurnTracker();
    newTracker.fromJSON(serialized);
    
    expect(newTracker.state.currentTurn).toBe(3);
    expect(newTracker.state.activeLights[0].turnsRemaining).toBe(4);
    expect(newTracker.state.fullLog.length).toBe(2); // Turn 1, Turn 2. Turn 3 has no messages yet.
    expect(newTracker.history.length).toBe(3);
  });

  test('fromJSON backfills fields missing from older saves', () => {
    // A save written before activeEffects existed: advancing a turn must not throw.
    const legacyState = new TurnTracker(() => 6).getInitialState();
    legacyState.started = true;
    delete legacyState.activeEffects;

    const tracker = new TurnTracker(() => 6);
    tracker.fromJSON({ state: legacyState });
    expect(tracker.state.activeEffects).toEqual([]);
    expect(() => tracker.nextTurn()).not.toThrow();
  });

  test('fromJSON should handle empty/missing data gracefully', () => {
    const tracker = new TurnTracker();
    const initialState = JSON.parse(JSON.stringify(tracker.state));
    
    tracker.fromJSON(null);
    expect(tracker.state).toEqual(initialState);
    
    tracker.fromJSON({});
    expect(tracker.state).toEqual(initialState);
  });
});
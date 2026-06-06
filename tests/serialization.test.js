const TurnTracker = require('../src/tracker');

describe('TurnTracker Serialization', () => {
  test('toJSON and fromJSON should preserve state', () => {
    const tracker = new TurnTracker(() => 6); 
    tracker.start(2);
    tracker.nextTurn('Turn 2 note'); 
    tracker.lightTorch();            
    tracker.nextTurn('Turn 3 note'); 
    
    const serialized = tracker.toJSON();
    const newTracker = new TurnTracker();
    newTracker.fromJSON(serialized);
    
    expect(newTracker.state.currentTurn).toBe(3);
    expect(newTracker.state.turnsLeftOnTorch).toBe(5);
    expect(newTracker.state.fullLog.length).toBe(2); // Turn 1, Turn 2. Turn 3 has no messages yet.
    expect(newTracker.history.length).toBe(3);
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
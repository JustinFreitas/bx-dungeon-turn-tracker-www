const TurnTracker = require('../src/tracker');

describe('TurnTracker Wandering Monster', () => {
  let tracker;
  let mockDie;

  beforeEach(() => {
    mockDie = jest.fn(() => 6);
    tracker = new TurnTracker(mockDie);
    tracker.start({ interval: 1 }); // Roll every turn
  });

  test('manual roll adds message and is undoable', () => {
    tracker.manualMonsterCheck();
    // Turn 1 should have: begins, scheduled, manual roll
    const messages = tracker.state.fullLog[0].messages;
    expect(messages).toContain("Manual Wandering Monster Check: Rolled 6");
    expect(tracker.history.length).toBe(1);
    
    tracker.undo();
    expect(tracker.state.fullLog[0].messages).not.toContain("Manual Wandering Monster Check: Rolled 6");
  });

  test('prevent duplicate automatic rolls for same turn', () => {
    // Already rolled on start(1)
    mockDie.mockClear();
    tracker.checkWanderingMonster(false); 
    expect(mockDie).not.toHaveBeenCalled();
  });
});
const TurnTracker = require('../src/tracker');

describe('TurnTracker Edge Cases', () => {
  test('start with interval 1 should roll for turn 1', () => {
    let tracker = new TurnTracker(() => 1); 
    tracker.start({ interval: 1 });
    expect(tracker.state.fullLog[0].messages).toContain("Wandering Monster Check: Rolled 1 - ENCOUNTER!");
    expect(tracker.state.monsterInterval).toBe(1);
  });
});
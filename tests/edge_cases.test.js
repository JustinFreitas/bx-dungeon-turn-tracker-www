const TurnTracker = require('../src/tracker');

describe('TurnTracker Edge Cases', () => {
  test('start with interval 1 should roll for turn 1', () => {
    let tracker = new TurnTracker(() => 1);
    tracker.start({ interval: 1 });
    expect(tracker.state.fullLog[0].messages).toContain("Wandering Monster Check: Rolled 1 - ENCOUNTER!");
    expect(tracker.state.monsterInterval).toBe(1);
  });

  test('extinguishLight works when id arrives as a string (UI path)', () => {
    const tracker = new TurnTracker(() => 6);
    tracker.start({ interval: 2 });
    tracker.activateLight('torch', 'Grog');
    const numericId = tracker.getStatus().activeLights[0].id;
    // The browser interpolates ids into a string before POSTing them.
    tracker.extinguishLight(String(numericId));
    expect(tracker.getStatus().activeLights.length).toBe(0);
  });

  test('removeEffect works when id arrives as a string (UI path)', () => {
    const tracker = new TurnTracker(() => 6);
    tracker.start({ interval: 2 });
    tracker.addEffect('Bless', 6);
    const numericId = tracker.getStatus().activeEffects[0].id;
    tracker.removeEffect(String(numericId));
    expect(tracker.getStatus().activeEffects.length).toBe(0);
  });

  test('setMonsterInterval changes the interval mid-game and is undoable', () => {
    const mockDie = jest.fn(() => 6);
    const tracker = new TurnTracker(mockDie);
    tracker.start({ interval: 2 });

    tracker.setMonsterInterval(3);
    expect(tracker.getStatus().monsterInterval).toBe(3);

    mockDie.mockClear();
    tracker.nextTurn(); // Turn 2 - no roll at interval 3
    expect(mockDie).not.toHaveBeenCalled();
    tracker.nextTurn(); // Turn 3 - roll
    expect(mockDie).toHaveBeenCalledTimes(1);

    tracker.undo(); // back to Turn 2
    tracker.undo(); // back to Turn 1
    tracker.undo(); // back before interval change
    expect(tracker.getStatus().monsterInterval).toBe(2);
  });

  test('setMonsterInterval rejects negative/invalid values', () => {
    const tracker = new TurnTracker(() => 6);
    tracker.start({ interval: 2 });
    tracker.setMonsterInterval(-5);
    expect(tracker.getStatus().monsterInterval).toBe(2);
    tracker.setMonsterInterval('abc');
    expect(tracker.getStatus().monsterInterval).toBe(2);
    tracker.setMonsterInterval(0); // 0 is valid (disabled)
    expect(tracker.getStatus().monsterInterval).toBe(0);
  });

  test('activateLight and addEffect handle non-string and null labels gracefully', () => {
    const tracker = new TurnTracker(() => 6);
    tracker.start();

    // Verify it doesn't throw when passing null, object, or undefined labels
    expect(() => tracker.activateLight('torch', null)).not.toThrow();
    expect(() => tracker.activateLight('torch', {})).not.toThrow();
    
    expect(() => tracker.addEffect(null, 6)).not.toThrow();
    expect(() => tracker.addEffect({}, 6)).not.toThrow();
  });
});
class TurnTracker {
  constructor(rollDie = () => Math.floor(Math.random() * 6) + 1) {
    this.history = [];
    this.redoStack = [];
    this.rollDie = rollDie;
    
    this.state = {
      currentTurn: 1,
      turnsSinceRest: 0,
      turnsLeftOnTorch: 0,
      penalty: 0,
      monsterInterval: 2,
      messages: ["Adventure begins!"],
      fullLog: [{ turn: 1, messages: ["Adventure begins!"] }]
    };

    this.checkWanderingMonster(true);
  }

  saveHistory() {
    this.history.push(JSON.stringify(this.state));
    this.redoStack = [];
  }

  undo() {
    if (this.history.length > 0) {
      this.redoStack.push(JSON.stringify(this.state));
      this.state = JSON.parse(this.history.pop());
      return true;
    }
    return false;
  }

  redo() {
    if (this.redoStack.length > 0) {
      this.history.push(JSON.stringify(this.state));
      this.state = JSON.parse(this.redoStack.pop());
      return true;
    }
    return false;
  }

  addLogMessages(msgs) {
    if (!msgs || msgs.length === 0) return;
    
    const lastEntry = this.state.fullLog[this.state.fullLog.length - 1];
    if (lastEntry && lastEntry.turn === this.state.currentTurn) {
      lastEntry.messages.push(...msgs);
    } else {
      this.state.fullLog.push({ turn: this.state.currentTurn, messages: [...msgs] });
    }
    this.state.messages = msgs;
  }

  lightTorch() {
    this.saveHistory();
    this.state.turnsLeftOnTorch = 6;
    this.addLogMessages(["Torch lit. It will last for 6 turns (1 hour)."]);
  }

  extinguishTorch() {
    if (this.state.turnsLeftOnTorch > 0) {
      this.saveHistory();
      this.state.turnsLeftOnTorch = 0;
      this.addLogMessages(["Torch extinguished."]);
    }
  }

  rest(notes) {
    this.saveHistory();

    if (notes) {
      this.addLogMessages([`Note: ${notes}`]);
    }

    this.state.penalty = 0;
    this.state.currentTurn++;
    this.state.turnsSinceRest = 0;
    
    const turnMessages = ["Party rested. Fatigue penalty removed."];
    
    // Torch consumption during rest
    if (this.state.turnsLeftOnTorch > 0) {
      this.state.turnsLeftOnTorch--;
      if (this.state.turnsLeftOnTorch === 0) {
        turnMessages.push("The torch burns out!");
      }
    }

    this.addLogMessages(turnMessages);
    this.checkWanderingMonster(false);
  }

  nextTurn(notes) {
    this.saveHistory();

    if (notes) {
      this.addLogMessages([`Note: ${notes}`]);
    }

    this.state.currentTurn++;
    this.state.turnsSinceRest++;

    const turnMessages = [];

    // Torch consumption
    if (this.state.turnsLeftOnTorch > 0) {
      this.state.turnsLeftOnTorch--;
      if (this.state.turnsLeftOnTorch === 0) {
        turnMessages.push("The torch burns out!");
      }
    }

    // Rest check: B/X says rest every 6th turn (after 5 turns of activity)
    if (this.state.turnsSinceRest === 5) {
      turnMessages.push("WARNING: This is the 6th turn. The party must REST this turn or suffer a penalty.");
    } else if (this.state.turnsSinceRest >= 6) {
      this.state.penalty = -1;
      turnMessages.push("The party did not rest! They are exhausted: -1 penalty to all rolls until rested.");
    }

    this.addLogMessages(turnMessages);
    this.checkWanderingMonster(false);
  }

  setMonsterInterval(interval) {
    const intervalInt = parseInt(interval, 10);
    if (isNaN(intervalInt) || intervalInt < 0) return;

    this.saveHistory();
    this.state.monsterInterval = intervalInt;
    this.addLogMessages([`Wandering monster check interval set to ${intervalInt}.`]);
  }

  checkWanderingMonster(isInitial) {
    if (this.state.monsterInterval <= 0) return;

    // Check every monsterInterval turns
    if (this.state.currentTurn % this.state.monsterInterval === 0) {
      const roll = this.rollDie();
      const msg = roll === 1 
        ? `Wandering Monster Check: Rolled ${roll} - ENCOUNTER!` 
        : `Wandering Monster Check: Rolled ${roll} - No encounter.`;
      
      const lastEntry = this.state.fullLog[this.state.fullLog.length - 1];
      if (lastEntry && lastEntry.turn === this.state.currentTurn) {
        lastEntry.messages.push(msg);
      } else {
        this.state.fullLog.push({ turn: this.state.currentTurn, messages: [msg] });
      }
      
      if (!isInitial) {
        this.state.messages.push(msg);
      }
    }
  }

  getStatus() {
    return {
      ...this.state,
      canUndo: this.history.length > 0,
      canRedo: this.redoStack.length > 0
    };
  }
}

module.exports = TurnTracker;
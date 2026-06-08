/**
 * TurnTracker Class
 * Manages the state, history, and rules for a B/X D&D Dungeon Turn Tracker.
 */
class TurnTracker {
  constructor(rollDie = () => Math.floor(Math.random() * 6) + 1) {
    this.history = [];
    this.redoStack = [];
    this.rollDie = rollDie;
    this.state = this.getInitialState();
  }

  /**
   * Returns a fresh, unstarted state.
   */
  getInitialState() {
    return {
      started: false,
      currentTurn: 1,
      turnsSinceRest: 0,
      activeLights: [], // Array of { id, label, type, turnsRemaining }
      activeEffects: [], // Array of { id, label, turnsRemaining }
      penalty: 0,
      monsterInterval: 2,
      movementRate: 'Unset', // '120/40', '90/30', '60/20', '30/10'
      ambientLight: 'dark', // 'dark' or 'lit'
      messages: [],
      fullLog: [] 
    };
  }

  toJSON() { return { state: this.state, history: this.history, redoStack: this.redoStack }; }
  
  fromJSON(data) {
    if (!data || !data.state) return;
    this.state = data.state;
    this.history = data.history || [];
    this.redoStack = data.redoStack || [];
  }

  saveHistory() {
    this.history.push(JSON.stringify(this.state));
    if (this.redoStack.length > 0) this.redoStack = [];
    if (this.history.length > 50) this.history.shift();
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
    let entry = this.state.fullLog.find(e => e.turn === this.state.currentTurn);
    if (!entry) {
      entry = { turn: this.state.currentTurn, messages: [] };
      this.state.fullLog.push(entry);
    }
    msgs.forEach(msg => {
      if (!entry.messages.includes(msg)) entry.messages.push(msg);
      if (!this.state.messages) this.state.messages = [];
      if (!this.state.messages.includes(msg)) this.state.messages.push(msg);
    });
  }

  start({ interval = 2, initialLights = [], ambientLight = 'dark', movementRate = 'Unset' } = {}) {
    if (this.state.started) return;

    this.state.started = true;
    this.state.monsterInterval = parseInt(interval) >= 0 ? parseInt(interval) : 2;
    this.state.ambientLight = (ambientLight === 'lit') ? 'lit' : 'dark';
    this.state.movementRate = movementRate || 'Unset';
    
    this.addLogMessages([
      "Adventure begins!",
      `Movement Rate: ${this.state.movementRate}`,
      this.state.monsterInterval > 0 
        ? `Monster check frequency: every ${this.state.monsterInterval} turn(s).`
        : "Monster checks are disabled.",
      this.state.ambientLight === 'lit' ? "The area is illuminated by ambient light." : "The area is dark."
    ]);

    if (Array.isArray(initialLights)) {
      initialLights.forEach(l => {
        this.activateLight(l.type, l.label, false);
      });
    }

    this.checkWanderingMonster(true);
  }

  setMovementRate(rate) {
    this.saveHistory();
    this.state.movementRate = rate;
    this.addLogMessages([`Party movement rate set to ${rate}.`]);
  }

  setMonsterInterval(interval) {
    const parsed = parseInt(interval);
    if (isNaN(parsed) || parsed < 0) return;
    this.saveHistory();
    this.state.monsterInterval = parsed;
    this.addLogMessages([
      parsed > 0
        ? `Monster check frequency changed: every ${parsed} turn(s).`
        : "Monster checks disabled."
    ]);
  }

  toggleAmbientLight() {
    this.saveHistory();
    this.state.ambientLight = this.state.ambientLight === 'dark' ? 'lit' : 'dark';
    const msg = this.state.ambientLight === 'lit' 
      ? "The area is illuminated by ambient light." 
      : "The party enters a lightless area.";
    this.addLogMessages([msg]);
  }

  activateLight(type, label = "Party", shouldSave = true) {
    if (shouldSave) this.saveHistory();
    
    const maxTurns = type === 'lantern' ? 24 : 6;
    const cleanLabel = label.trim() || "Party";
    
    const existing = this.state.activeLights.find(l => l.label === cleanLabel && l.type === type);
    
    if (existing) {
        existing.turnsRemaining = maxTurns;
        this.addLogMessages([`${cleanLabel}'s ${type} refreshed. It will last for ${maxTurns} turns starting NEXT turn.`]);
    } else {
        const newLight = {
            id: Date.now() + Math.random(),
            label: cleanLabel,
            type: type,
            turnsRemaining: maxTurns - 1
        };
        this.state.activeLights.push(newLight);
        this.addLogMessages([`${cleanLabel} lit a ${type}. It will last for ${maxTurns} turns.`]);
    }
  }

  extinguishLight(id) {
    // IDs are generated as numbers but arrive from the client as strings; compare loosely.
    const index = this.state.activeLights.findIndex(l => String(l.id) === String(id));
    if (index !== -1) {
      this.saveHistory();
      const light = this.state.activeLights[index];
      this.state.activeLights.splice(index, 1);
      this.addLogMessages([`${light.label}'s ${light.type} extinguished.`]);
    }
  }

  addEffect(label, turns) {
    const turnsInt = parseInt(turns);
    if (!label || isNaN(turnsInt) || turnsInt <= 0) return;

    this.saveHistory();
    const cleanLabel = label.trim();
    
    const existing = this.state.activeEffects.find(e => e.label === cleanLabel);
    if (existing) {
        existing.turnsRemaining = turnsInt;
        this.addLogMessages([`Effect '${cleanLabel}' refreshed. It will last for ${turnsInt} turns starting NEXT turn.`]);
    } else {
        const newEffect = {
            id: Date.now() + Math.random(),
            label: cleanLabel,
            turnsRemaining: turnsInt - 1
        };
        this.state.activeEffects.push(newEffect);
        this.addLogMessages([`Effect '${cleanLabel}' started. It will last for ${turnsInt} turns.`]);
    }
  }

  removeEffect(id) {
    // IDs are generated as numbers but arrive from the client as strings; compare loosely.
    const index = this.state.activeEffects.findIndex(e => String(e.id) === String(id));
    if (index !== -1) {
      this.saveHistory();
      const effect = this.state.activeEffects[index];
      this.state.activeEffects.splice(index, 1);
      this.addLogMessages([`Effect '${effect.label}' ended.`]);
    }
  }

  nextTurn(notes) {
    if (!this.state.started) return;
    this.saveHistory();
    if (notes) this.addLogMessages([`Note: ${notes}`]);
    this.state.currentTurn++;
    this.state.turnsSinceRest++;
    this.state.messages = []; 
    
    this.processTurnConsumption();
    this.checkWanderingMonster(false);
  }

  rest(notes) {
    if (!this.state.started) return;
    this.saveHistory();
    if (notes) this.addLogMessages([`Note: ${notes}`]);
    this.state.penalty = 0;
    this.state.currentTurn++;
    this.state.turnsSinceRest = 0;
    this.state.messages = [];
    this.addLogMessages(["Party rested. Fatigue penalty removed."]);
    this.processTurnConsumption();
    this.checkWanderingMonster(false);
  }

  processTurnConsumption() {
    // Process Lights
    const expiredLightIds = [];
    this.state.activeLights.forEach(light => {
      light.turnsRemaining--;
      if (light.turnsRemaining === 0) {
        this.addLogMessages([`WARNING: ${light.label}'s ${light.type} is flickering and will soon burn out!`]);
      } else if (light.turnsRemaining === -1) {
        this.addLogMessages([`The ${light.type} held by ${light.label} burns out!`]);
        expiredLightIds.push(light.id);
      }
    });
    this.state.activeLights = this.state.activeLights.filter(l => !expiredLightIds.includes(l.id));

    // Process Effects
    const expiredEffectIds = [];
    this.state.activeEffects.forEach(effect => {
      effect.turnsRemaining--;
      if (effect.turnsRemaining === 0) {
        this.addLogMessages([`WARNING: The effect '${effect.label}' is ending soon!`]);
      } else if (effect.turnsRemaining === -1) {
        this.addLogMessages([`The effect '${effect.label}' has ended.`]);
        expiredEffectIds.push(effect.id);
      }
    });
    this.state.activeEffects = this.state.activeEffects.filter(e => !expiredEffectIds.includes(e.id));

    if (this.state.turnsSinceRest === 5) {
      this.addLogMessages(["WARNING: This is the 6th turn. The party must REST this turn or suffer a penalty."]);
    } else if (this.state.turnsSinceRest >= 6) {
      this.state.penalty = -1;
      this.addLogMessages(["The party did not rest! They are exhausted: -1 penalty to all rolls until rested."]);
    }
  }

  checkWanderingMonster(isInitial) {
    const interval = this.state.monsterInterval;
    if (interval <= 0) return;
    if (this.state.currentTurn % interval === 0) {
      const entry = this.state.fullLog.find(e => e.turn === this.state.currentTurn);
      const alreadyRolled = entry && entry.messages.some(m => m.includes("Wandering Monster Check:"));
      if (!alreadyRolled) {
        const roll = this.rollDie();
        const msg = roll === 1 ? `Wandering Monster Check: Rolled ${roll} - ENCOUNTER!` : `Wandering Monster Check: Rolled ${roll} - No encounter.`;
        this.addLogMessages([msg]);
      }
    }
  }

  manualMonsterCheck() {
    this.saveHistory();
    const roll = this.rollDie();
    this.addLogMessages([`Manual Wandering Monster Check: Rolled ${roll}`]);
  }

  getStatus() { return { ...this.state, canUndo: this.history.length > 0, canRedo: this.redoStack.length > 0 }; }
}

module.exports = TurnTracker;
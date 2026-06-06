const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const TurnTracker = require('./src/tracker');

const app = express();
const port = process.env.PORT || 3000;

let tracker = new TurnTracker();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/status', (req, res) => {
  res.json(tracker.getStatus());
});

app.post('/action', (req, res) => {
  const { action, value } = req.body;
  
  if (action === 'reset') {
    tracker = new TurnTracker();
  } else {
    switch (action) {
      case 'next':
        tracker.nextTurn(value);
        break;
      case 'rest':
        tracker.rest(value);
        break;
      case 'torch':
        tracker.lightTorch();
        break;
      case 'extinguish':
        tracker.extinguishTorch();
        break;
      case 'undo':
        tracker.undo();
        break;
      case 'redo':
        tracker.redo();
        break;
      case 'setInterval':
        if (value !== undefined) {
          tracker.setMonsterInterval(value);
        }
        break;
    }
  }
  
  res.json({ success: true, status: tracker.getStatus() });
});

app.listen(port, () => {
  console.log(`B/X D&D Turn Tracker listening at http://localhost:${port}`);
});
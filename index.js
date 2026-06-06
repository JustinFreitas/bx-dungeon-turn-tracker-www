const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const hpp = require('hpp');
const xss = require('xss-clean');
const TurnTracker = require('./src/tracker');

const app = express();
const port = process.env.PORT || 3000;
const SAVES_FILE = path.join(__dirname, 'saves.json');
const ADMIN_KEY = process.env.ADMIN_KEY || 'dungeon-master';
const MAX_SAVES = 50;

let tracker = new TurnTracker();

// Basic Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
      "script-src-attr": ["'unsafe-inline'"],
      "style-src": ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
      "img-src": ["'self'", "data:"],
      "connect-src": ["'self'", "https://cdn.jsdelivr.net"],
    },
  },
}));
app.use(hpp());
app.use(xss());
app.use(bodyParser.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Security: Rate Limiting
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const sensitiveLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

// Global Key Middleware
const checkAuth = (req, res, next) => {
  const key = req.body.key;
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Valid Admin Key Required' });
  }
  next();
};

// Persistence Helpers
const getSaves = () => {
  if (!fs.existsSync(SAVES_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(SAVES_FILE, 'utf8')); } catch (e) { return {}; }
};

const saveSaves = (saves) => {
  fs.writeFileSync(SAVES_FILE, JSON.stringify(saves, null, 2), 'utf8');
};

const sanitizeName = (name) => {
  if (typeof name !== 'string') return '';
  return name.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 30);
};

// API Endpoints - Changed all data-fetching to POST to keep the key in the request body
app.post('/status', checkAuth, (req, res) => {
  res.json(tracker.getStatus());
});

app.post('/saves', checkAuth, (req, res) => {
  res.json(Object.keys(getSaves()));
});

app.post('/save', checkAuth, (req, res) => {
  const { name } = req.body;
  const cleanName = sanitizeName(name);
  if (!cleanName) return res.status(400).json({ error: 'Valid name is required' });
  
  const saves = getSaves();
  if (Object.keys(saves).length >= MAX_SAVES && !saves[cleanName]) {
    return res.status(400).json({ error: 'Save limit reached' });
  }
  
  saves[cleanName] = tracker.toJSON();
  saveSaves(saves);
  res.json({ success: true });
});

app.post('/peek', checkAuth, (req, res) => {
  const { name } = req.body;
  const cleanName = sanitizeName(name);
  const saves = getSaves();
  if (!saves[cleanName]) return res.status(404).json({ error: 'Save not found' });
  res.json({ success: true, data: saves[cleanName] });
});

app.post('/delete', checkAuth, (req, res) => {
  const { name } = req.body;
  const cleanName = sanitizeName(name);
  const saves = getSaves();
  if (!saves[cleanName]) return res.status(404).json({ error: 'Save not found' });
  delete saves[cleanName];
  saveSaves(saves);
  res.json({ success: true });
});

app.post('/load', checkAuth, (req, res) => {
  const { name } = req.body;
  const cleanName = sanitizeName(name);
  const saves = getSaves();
  if (!saves[cleanName]) return res.status(404).json({ error: 'Save not found' });
  tracker.fromJSON(saves[cleanName]);
  res.json({ success: true, status: tracker.getStatus() });
});

app.post('/action', checkAuth, (req, res) => {
  const { action, value, label, initialLights, ambientLight, movementRate } = req.body;
  
  switch (action) {
    case 'reset':
      tracker = new TurnTracker();
      break;
    case 'start':
      tracker.start({ 
        interval: value, 
        initialLights: initialLights,
        ambientLight: ambientLight,
        movementRate: movementRate
      });
      break;
    case 'next':
      tracker.nextTurn(value);
      break;
    case 'rest':
      tracker.rest(value);
      break;
    case 'lightSource':
      tracker.activateLight(value, label);
      break;
    case 'extinguish':
      tracker.extinguishLight(value);
      break;
    case 'setMovementRate':
      tracker.setMovementRate(value);
      break;
    case 'undo':
      tracker.undo();
      break;
    case 'redo':
      tracker.redo();
      break;
    case 'rollMonster':
      tracker.manualMonsterCheck();
      break;
    case 'toggleAmbient':
      tracker.toggleAmbientLight();
      break;
    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
  
  res.json({ success: true, status: tracker.getStatus() });
});

app.listen(port, () => {
  console.log(`B/X D&D Turn Tracker listening at http://localhost:${port}`);
  console.log(`Admin key is: ${ADMIN_KEY}`);
});
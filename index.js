const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const hpp = require('hpp');
const TurnTracker = require('./src/tracker');

const app = express();
const port = process.env.PORT || 3000;
const SAVES_FILE = process.env.SAVES_FILE || path.join(__dirname, 'saves.json');
const ADMIN_KEY = process.env.ADMIN_KEY || 'dungeon-master';
const MAX_SAVES = 50;

const sslOptions = {
  key: process.env.SSL_KEY && fs.existsSync(process.env.SSL_KEY) ? fs.readFileSync(process.env.SSL_KEY) : null,
  cert: process.env.SSL_CERT && fs.existsSync(process.env.SSL_CERT) ? fs.readFileSync(process.env.SSL_CERT) : null,
};

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
app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Security: Rate Limiting.
// generalLimiter covers high-frequency gameplay (turns, lights, undo); sensitiveLimiter
// is stricter for save/load/delete; playerLimiter is generous for the 5s read-only poll.
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
const sensitiveLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });
const playerLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });

// Global Key Middleware (timing-safe comparison to avoid leaking the key length/prefix).
const checkAuth = (req, res, next) => {
  const key = typeof req.body.key === 'string' ? req.body.key : '';
  const a = Buffer.from(key);
  const b = Buffer.from(ADMIN_KEY);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
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
  // Write to a temp file then rename so a crash mid-write can't corrupt saves.json.
  const tmp = `${SAVES_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(saves, null, 2), 'utf8');
  fs.renameSync(tmp, SAVES_FILE);
};

const sanitizeName = (name) => {
  if (typeof name !== 'string') return '';
  return name.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 30);
};

// --- ROUTES ---

// Public Player Route
app.get('/player', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'player.html'));
});

// Public Status Endpoint (Sanitized)
app.get('/player-status', playerLimiter, (req, res) => {
  const status = tracker.getStatus();
  const publicStatus = {
    started: status.started,
    currentTurn: status.currentTurn,
    turnsSinceRest: status.turnsSinceRest,
    activeLights: status.activeLights,
    activeEffects: status.activeEffects,
    penalty: status.penalty,
    ambientLight: status.ambientLight,
    movementRate: status.movementRate
  };
  res.json(publicStatus);
});

app.post('/status', generalLimiter, checkAuth, (req, res) => {
  res.json(tracker.getStatus());
});

app.post('/saves', generalLimiter, checkAuth, (req, res) => {
  res.json(Object.keys(getSaves()));
});

app.post('/save', sensitiveLimiter, checkAuth, (req, res) => {
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

app.post('/peek', sensitiveLimiter, checkAuth, (req, res) => {
  const { name } = req.body;
  const cleanName = sanitizeName(name);
  const saves = getSaves();
  if (!saves[cleanName]) return res.status(404).json({ error: 'Save not found' });
  res.json({ success: true, data: saves[cleanName] });
});

app.post('/delete', sensitiveLimiter, checkAuth, (req, res) => {
  const { name } = req.body;
  const cleanName = sanitizeName(name);
  const saves = getSaves();
  if (!saves[cleanName]) return res.status(404).json({ error: 'Save not found' });
  delete saves[cleanName];
  saveSaves(saves);
  res.json({ success: true });
});

app.post('/load', sensitiveLimiter, checkAuth, (req, res) => {
  const { name } = req.body;
  const cleanName = sanitizeName(name);
  const saves = getSaves();
  if (!saves[cleanName]) return res.status(404).json({ error: 'Save not found' });
  tracker.fromJSON(saves[cleanName]);
  res.json({ success: true, status: tracker.getStatus() });
});

app.post('/action', generalLimiter, checkAuth, (req, res) => {
  const { action, value, label, initialLights, ambientLight, movementRate, duration } = req.body;
  
  const actionLower = action ? action.toLowerCase().trim() : '';
  switch (actionLower) {
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
    case 'lightsource':
      tracker.activateLight(value, label);
      break;
    case 'extinguish':
      tracker.extinguishLight(value);
      break;
    case 'addeffect':
      tracker.addEffect(label, duration);
      break;
    case 'removeeffect':
      tracker.removeEffect(value);
      break;
    case 'setmovementrate':
      tracker.setMovementRate(value);
      break;
    case 'setmonsterinterval':
      tracker.setMonsterInterval(value);
      break;
    case 'undo':
      tracker.undo();
      break;
    case 'redo':
      tracker.redo();
      break;
    case 'rollmonster':
      tracker.manualMonsterCheck();
      break;
    case 'toggleambient':
      tracker.toggleAmbientLight();
      break;
    default:
      console.log('Unknown action received:', action);
      return res.status(400).json({ error: 'Unknown action' });
  }
  
  res.json({ success: true, status: tracker.getStatus() });
});

const warnOnStartup = (secure) => {
  if (ADMIN_KEY === 'dungeon-master') {
    console.warn('WARNING: Using the default admin key. Set the ADMIN_KEY environment variable before exposing this server.');
  }
  if (!secure) {
    console.warn('WARNING: Running over plain HTTP. The admin key is sent in cleartext; configure SSL_KEY/SSL_CERT for anything beyond localhost.');
  }
};

// Only bind a port when run directly (`node index.js`); when required by tests
// we just export the configured app.
if (require.main === module) {
  if (sslOptions.key && sslOptions.cert) {
    https.createServer(sslOptions, app).listen(port, () => {
      console.log(`B/X D&D Turn Tracker listening at https://localhost:${port}`);
      warnOnStartup(true);
    });
  } else {
    app.listen(port, () => {
      console.log(`B/X D&D Turn Tracker listening at http://localhost:${port}`);
      warnOnStartup(false);
    });
  }
}

module.exports = app;
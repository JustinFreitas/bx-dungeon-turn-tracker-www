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

// 1. Adjusted Security Headers (Helmet)
// Broadened to allow Bootstrap CDN and inline event handlers (onclick)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
      "script-src-attr": ["'unsafe-inline'"], // Required for inline event handlers (onclick)
      "style-src": ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
      "img-src": ["'self'", "data:"],
      "connect-src": ["'self'", "https://cdn.jsdelivr.net"], // Allow fetching source maps/CDN resources
    },
  },
}));

// 2. Prevent HTTP Parameter Pollution
app.use(hpp());

// 3. Data Sanitization against XSS
app.use(xss());

// 4. Tighten Body Parsing (Payload limits)
app.use(bodyParser.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 5. Hardened Rate Limiting (Anti-Hammer)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP per window
  message: { error: 'Too many requests from this IP. Anti-hammer triggered.' }
});

const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Increased slightly to accommodate setup
  message: { error: 'Excessive secure operations. Please wait 15 minutes.' }
});

app.use('/action', globalLimiter);
app.use('/save', sensitiveLimiter);
app.use('/load', sensitiveLimiter);
app.use('/peek', sensitiveLimiter);
app.use('/delete', sensitiveLimiter);

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

// API Endpoints
app.get('/status', (req, res) => res.json(tracker.getStatus()));

app.get('/saves', (req, res) => res.json(Object.keys(getSaves())));

app.post('/save', (req, res) => {
  const { name, key } = req.body;
  if (key !== ADMIN_KEY) return res.status(403).json({ error: 'Unauthorized' });
  
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

app.post('/peek', (req, res) => {
  const { name, key } = req.body;
  if (key !== ADMIN_KEY) return res.status(403).json({ error: 'Unauthorized' });
  
  const cleanName = sanitizeName(name);
  const saves = getSaves();
  if (!saves[cleanName]) return res.status(404).json({ error: 'Save not found' });
  
  res.json({ success: true, data: saves[cleanName] });
});

app.post('/delete', (req, res) => {
  const { name, key } = req.body;
  if (key !== ADMIN_KEY) return res.status(403).json({ error: 'Unauthorized' });
  
  const cleanName = sanitizeName(name);
  const saves = getSaves();
  if (!saves[cleanName]) return res.status(404).json({ error: 'Save not found' });
  
  delete saves[cleanName];
  saveSaves(saves);
  res.json({ success: true });
});

app.post('/load', (req, res) => {
  const { name, key } = req.body;
  if (key !== ADMIN_KEY) return res.status(403).json({ error: 'Unauthorized' });
  
  const cleanName = sanitizeName(name);
  const saves = getSaves();
  if (!saves[cleanName]) return res.status(404).json({ error: 'Save not found' });
  
  tracker.fromJSON(saves[cleanName]);
  res.json({ success: true, status: tracker.getStatus() });
});

app.post('/action', (req, res) => {
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
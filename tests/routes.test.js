const path = require('path');
const os = require('os');
const fs = require('fs');

// Point persistence at a throwaway file before the app is required, so the
// save/load tests never touch the real saves.json.
const TMP_SAVES = path.join(os.tmpdir(), `bx-saves-test-${process.pid}.json`);
process.env.SAVES_FILE = TMP_SAVES;
process.env.ADMIN_KEY = 'test-key';

const request = require('supertest');
const app = require('../index');

const KEY = 'test-key';

afterAll(() => {
  if (fs.existsSync(TMP_SAVES)) fs.unlinkSync(TMP_SAVES);
});

// The app keeps a single module-global tracker, so reset between tests that
// depend on a known starting point.
const reset = () => request(app).post('/action').send({ key: KEY, action: 'reset' });

describe('Auth', () => {
  test('rejects missing key', async () => {
    const res = await request(app).post('/status').send({});
    expect(res.status).toBe(401);
  });

  test('rejects wrong key', async () => {
    const res = await request(app).post('/status').send({ key: 'nope' });
    expect(res.status).toBe(401);
  });

  test('accepts valid key', async () => {
    const res = await request(app).post('/status').send({ key: KEY });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('currentTurn');
  });
});

describe('/action', () => {
  beforeEach(async () => { await reset(); });

  test('start begins the adventure', async () => {
    const res = await request(app).post('/action').send({ key: KEY, action: 'start', value: 2 });
    expect(res.status).toBe(200);
    expect(res.body.status.started).toBe(true);
  });

  test('action parsing is case-insensitive and whitespace-tolerant', async () => {
    const res = await request(app).post('/action').send({ key: KEY, action: '  START  ' });
    expect(res.status).toBe(200);
    expect(res.body.status.started).toBe(true);
  });

  test('unknown action returns 400', async () => {
    const res = await request(app).post('/action').send({ key: KEY, action: 'teleport' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Unknown action');
  });

  test('addEffect flows through to tracker state', async () => {
    await request(app).post('/action').send({ key: KEY, action: 'start', value: 2 });
    const res = await request(app).post('/action')
      .send({ key: KEY, action: 'addEffect', label: 'Bless', duration: 6 });
    expect(res.body.status.activeEffects[0].label).toBe('Bless');
  });
});

describe('save / load', () => {
  test('round-trips tracker state through disk', async () => {
    await reset();
    await request(app).post('/action').send({ key: KEY, action: 'start', value: 2 });
    await request(app).post('/action').send({ key: KEY, action: 'next' }); // Turn 2

    const save = await request(app).post('/save').send({ key: KEY, name: 'campaign' });
    expect(save.body.success).toBe(true);

    const list = await request(app).post('/saves').send({ key: KEY });
    expect(list.body).toContain('campaign');

    await reset(); // wipe live state back to Turn 1, unstarted
    const load = await request(app).post('/load').send({ key: KEY, name: 'campaign' });
    expect(load.status).toBe(200);
    expect(load.body.status.currentTurn).toBe(2);
    expect(load.body.status.started).toBe(true);
  });

  test('rejects names that sanitize to empty', async () => {
    const res = await request(app).post('/save').send({ key: KEY, name: '///' });
    expect(res.status).toBe(400);
  });

  test('load of a missing save returns 404', async () => {
    const res = await request(app).post('/load').send({ key: KEY, name: 'does-not-exist' });
    expect(res.status).toBe(404);
  });
});

describe('/player-status', () => {
  test('is public and omits the full log / messages', async () => {
    await reset();
    await request(app).post('/action').send({ key: KEY, action: 'start', value: 2 });
    const res = await request(app).get('/player-status'); // no key
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('currentTurn');
    expect(res.body).not.toHaveProperty('fullLog');
    expect(res.body).not.toHaveProperty('messages');
  });
});

import request from 'supertest';
import app from '../src/app.js';

describe('Health Check API', () => {
  it('GET /api/v1/health should return 200 with healthy status', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('status', 'healthy');
    expect(res.body.data).toHaveProperty('timestamp');
    expect(res.body.data).toHaveProperty('services');
    expect(res.body.data.services).toHaveProperty('api', 'online');
  });

  it('GET /api/v1/nonexistent should return 404 with standard error shape', async () => {
    const res = await request(app).get('/api/v1/nonexistent');

    expect(res.statusCode).toEqual(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    expect(res.body.error).toHaveProperty('message');
  });
});

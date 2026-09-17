const request = require('supertest');
const app = require('../src/app');

describe('GET /api/v1/health', () => {
  it('should return 200 with standard health check envelope', async () => {
    const res = await request(app).get('/api/v1/health');
    
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('status', 'healthy');
    expect(res.body.data).toHaveProperty('version', '1.0.0');
    expect(res.body.data).toHaveProperty('timestamp');
  });

  it('should return 404 with standard error envelope for unknown routes', async () => {
    const res = await request(app).get('/api/v1/non-existent-route');
    
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });
});

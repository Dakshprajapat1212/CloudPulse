import request from 'supertest';
import app from '../../src/index';

describe('CloudPulse Backend System & Health Check APIs', () => {
  it('GET /health should return status UP', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.service).toBe('cloudpulse-backend');
  });

  it('POST /api/v1/auth/register should validate missing body parameters', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

const request = require('supertest');
const app = require('./server');
const mongoose = require('mongoose');

describe('Server Tests', () => {
  beforeAll(async () => {
    // Setup test database connection
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should respond to health check', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
  });
});
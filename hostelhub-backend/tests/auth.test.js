const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterEach(async () => {
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Auth flow', () => {
  const payload = {
    name: 'Test Student',
    email: 'test.student@example.com',
    phone: '9876543210',
    password: 'Password123',
  };

  it('registers a new student and returns tokens', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.role).toBe('student');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects duplicate registration', async () => {
    await request(app).post('/api/v1/auth/register').send(payload);
    const res = await request(app).post('/api/v1/auth/register').send(payload);
    expect(res.status).toBe(409);
  });

  it('logs in with correct credentials', async () => {
    await request(app).post('/api/v1/auth/register').send(payload);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: payload.email, password: payload.password });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('rejects login with wrong password', async () => {
    await request(app).post('/api/v1/auth/register').send(payload);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: payload.email, password: 'WrongPass123' });
    expect(res.status).toBe(401);
  });

  it('blocks unauthenticated access to /students', async () => {
    const res = await request(app).get('/api/v1/students');
    expect(res.status).toBe(401);
  });
});

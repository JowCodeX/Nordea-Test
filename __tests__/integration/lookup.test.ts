import request from 'supertest';
import { createTestServer } from '../test-utils/testServer';

describe('Person Lookup API', () => {
let app: Express.Application;

beforeAll(async () => {
    app = await createTestServer();
});

test('Valid personnummer returns 200', async () => {
    const response = await request(app)
    .get('/lookup?personnummer=570413-3106');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('name');
});

test('Invalid personnummer returns 400', async () => {
    const response = await request(app)
    .get('/lookup?personnummer=invalid');
    
    expect(response.status).toBe(400);
});
});
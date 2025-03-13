// test-utils/testServer.ts
import express, { Application } from 'express';
import lookup from '../../src/routes/lookup';

export async function createTestServer(): Promise<Application> {
const app: Application = express();

  // Add your actual middleware and routes
app.use('/lookup', lookup);

return app;
}
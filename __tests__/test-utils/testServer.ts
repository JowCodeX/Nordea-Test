// test-utils/testServer.ts
import express, { Express } from 'express';
import lookupRouter from '../../src/routes/lookup';
import validatePersonnummer from '../../src/middleware/validation';

export const createTestServer = async (): Promise<Express> => {
    const app = express();
    app.use(express.json());
    app.use('/lookup', validatePersonnummer, lookupRouter);
    return app;
};
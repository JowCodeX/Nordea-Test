// test-utils/testServer.ts
import express, { Express } from 'express';
import lookupRouter from '../../routes/lookup';
import validatePersonnummer from '../../middleware/validation';

export async function createTestServer() {
    const app = express();
    
    // Add proper body parser
    app.use(express.json());
    
    // Mock validation middleware
    app.use('/lookup', (req, res, next) => {
        res.locals = { personnummer: '195704133106' }; // Valid test number
        next();
    });
    
    app.use('/lookup', lookupRouter);
    return app;
}
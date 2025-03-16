// test-utils/testServer.ts
import express, { Express } from 'express';
import lookupRouter from '../../routes/lookup';
import validatePersonnummer from '../../middleware/validation';

export async function createTestServer() {
    const app = express();
    
    // Add proper body parser
    app.use(express.json());
    
    // For tests, bypass the real validation middleware
    // and inject the valid test personnummer into res.locals
    app.use('/lookup', (req, res, next) => {
        // Use the personnummer from the query if provided, otherwise use default test number
        const personnummer = req.query.personnummer as string || '195704133106'; 
        res.locals.personnummer = personnummer;
        next();
    });
    
    app.use('/lookup', lookupRouter);
    return app;
}
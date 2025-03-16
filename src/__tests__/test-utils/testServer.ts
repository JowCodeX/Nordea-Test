// test-utils/testServer.ts
import express, { Express, Request, Response, NextFunction } from 'express';
import lookupRouter from '../../routes/lookup';

// Custom error handler for test environment
const testErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Test server error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        code: err.code || 'TEST_ERROR',
        stack: process.env.NODE_ENV === 'test' ? err.stack : undefined
    });
};

export async function createTestServer() {
    const app = express();
    
    // Add proper body parser
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // For tests, bypass the real validation middleware
    // and inject the valid test personnummer into res.locals
    app.use('/lookup', (req: Request, res: Response, next: NextFunction) => {
        try {
            // Use the personnummer from the query if provided, otherwise use default test number
            const personnummer = req.query.personnummer as string || '195704133106'; 
            
            // Normalize the personnummer to 12-digit format as the real middleware would
            let normalizedPnr = personnummer;
            
            // If it's a 10-digit number, add the century prefix
            if (/^\d{10}$/.test(personnummer)) {
                normalizedPnr = `19${personnummer}`;
            }
            // If it has a separator, remove it and add century if needed
            else if (personnummer.includes('-')) {
                const cleanPnr = personnummer.replace('-', '');
                normalizedPnr = cleanPnr.length === 10 ? `19${cleanPnr}` : cleanPnr;
            }
            
            console.log('Test server setting personnummer:', normalizedPnr);
            res.locals.personnummer = normalizedPnr;
            next();
        } catch (error) {
            next(error instanceof Error ? error : new Error(String(error)));
        }
    });
    
    // Register the lookup router with better error handling
    app.use('/lookup', lookupRouter);
    
    // Add error handling middleware at the end
    app.use(testErrorHandler);
    
    return app;
}
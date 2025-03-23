import express, { Express, Request, Response, NextFunction } from 'express';
import lookupRouter from '../src/routes/lookup';

const testErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {

    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        code: err.code || 'TEST_ERROR',
        stack: process.env.NODE_ENV === 'test' ? err.stack : undefined
    });
};

export async function createTestServer() {
    const app = express();
    
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    app.use('/lookup', (req: Request, res: Response, next: NextFunction) => {
        try {
            const personnummer = req.query.personnummer as string || '195704133106'; 
            
            let normalizedPnr = personnummer;
            
            if (/^\d{10}$/.test(personnummer)) {
                normalizedPnr = `19${personnummer}`;
            }
            else if (personnummer.includes('-')) {
                const cleanPnr = personnummer.replace('-', '');
                normalizedPnr = cleanPnr.length === 10 ? `19${cleanPnr}` : cleanPnr;
            }
            
            res.locals.personnummer = normalizedPnr;
            next();
        } catch (error) {
            next(error instanceof Error ? error : new Error(String(error)));
        }
    });
    
    app.use('/lookup', lookupRouter);
    app.use(testErrorHandler);
    
    return app;
}
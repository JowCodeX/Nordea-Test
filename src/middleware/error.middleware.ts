// error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { SERVER_CONFIG } from '../config/env';

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    
    // SOAP Fault handling
    if (err.root?.Envelope?.Body?.Fault) {
        const fault = err.root.Envelope.Body.Fault;
        return res.status(500).json({
            code: 'SOAP_FAULT',
            message: fault.faultstring,
            detail: fault.detail
        });
    }

    // SPAR-specific errors
    if (err.code === 'ECONNREFUSED') {
        return res.status(503).json({
            code: 'SPAR_UNAVAILABLE',
            message: 'SPAR service unavailable'
        });
    }

    res.status(status).json({
        code: err.code || 'UNKNOWN_ERROR',
        message,
        ...(SERVER_CONFIG.ENV === 'development' && {
            stack: err.stack,
            details: err.details
        })
    });
};
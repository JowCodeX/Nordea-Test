import { Response } from 'express';

declare global {
namespace Express {
    interface Locals {
    personnummer: string;
    }
    
    interface Response {
    locals: Locals;
    }
}
}
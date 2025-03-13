import { Response } from 'express';
import { Personnummer } from '../middleware/validation';

declare global {
namespace Express {
    interface Locals {
    personnummer?: string;
    }
    
    interface Response {
    locals: Locals;
    }
}
}
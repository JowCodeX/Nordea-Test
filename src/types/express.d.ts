// Update your Express type declarations
import 'express';

declare global {
    namespace Express {
        interface Locals {
            personnummer?: string;
            [key: string]: any;
        }
    }
}
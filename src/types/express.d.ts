import 'express';

declare global {
    namespace Express {
        interface Locals {
            personnummer?: string;
            [key: string]: any;
        }
    }
}
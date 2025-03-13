// src/types/express.d.ts
import { Personnummer } from '../middleware/validation';

declare global {
namespace Express {
    interface Locals {
    personnummer: string;
    }
}
};

export interface SparResponse {
    Envelope?: {
    Body?: {
        PersonsokningSvar?: {
        PersonsokningSvarspost?: {
            Status?: string;
            Namn?: {
                Fornamn?: string | string[];
                Efternamn?: string | string[];
            };
            Persondetaljer?: {
            Fodelsedatum?: string;
            };
            Folkbokforingsadress?: {
            SvenskAdress?: {
                Utdelningsadress2?: string;
                PostNr?: string;
                Postort?: string;
            };
            };
            SkyddadIdentitet?: string;
            SenastAndrad?: string; // Add this line
        };
        };
    };
    };
}
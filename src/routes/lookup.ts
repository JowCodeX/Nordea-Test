import { Router, Request, Response, NextFunction } from 'express';
import { XMLParser } from 'fast-xml-parser';
import SparClient from '../services/spar.client'; // Corrected import path
import { SparResponse } from '../types/spar'; // Adjust the import path as necessary
import { SPAR_CONFIG } from '../config/env'; // Adjust the import path as necessary

const router = Router();
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    preserveOrder: false,
    processEntities: true,
    allowBooleanAttributes: true,
    tagValueProcessor: (_, val) => val.trim()
});

// Response transformation utilities
const formatName = (name?: { Fornamn?: string; Efternamn?: string }): string => 
    [name?.Fornamn, name?.Efternamn].filter(Boolean).join(' ') || 'Name not available';

const formatAddress = (address?: { 
    Utdelningsadress2?: string;
    PostNr?: string;
    Postort?: string;
}) => ({
    street: address?.Utdelningsadress2 || 'Unknown',
    postalCode: address?.PostNr || 'Unknown',
    city: address?.Postort || 'Unknown'
});

// Main lookup endpoint
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const pnr = res.locals.personnummer;
        const client = await SparClient.getClient();

        // Use SOAP client's native request format
        const [soapResponse] = await client.PersonsokAsync({
            fraga: {
                Identifieringsinformation: {
                    KundNrLeveransMottagare: SPAR_CONFIG.CUSTOMER_NUMBER,
                    KundNrSlutkund: SPAR_CONFIG.CUSTOMER_NUMBER,
                    UppdragId: SPAR_CONFIG.ASSIGNMENT_ID,
                    SlutAnvandarId: 'spar-lookup'
                },
                PersonsokningFraga: {
                    IdNummer: pnr
                }
            }
        });

        const parsedData: SparResponse = parser.parse(soapResponse);
        res.json(parsedData);
    } catch (error) {
        next(error);
    }
});

export default router;
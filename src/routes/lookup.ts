import { Request, Response, NextFunction, Router } from 'express';
import { SparClient } from '../services/spar.client';
import { XMLParser } from 'fast-xml-parser';
import { SparResponse } from '../types/spar';
import { SPAR_CONFIG } from '../config/env';

const router = Router();

// Update XML parser config in lookup.ts
// src/routes/lookup.ts
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: '#text',
    trimValues: true,
    processEntities: true,
    tagValueProcessor: (_, val) => val.trim(),
    
    // Remove namespace prefixes from tags
    transformTagName: (tagName) => tagName.replace(/^.*:/, ''),
    
    // Array handling configuration
    isArray: (name, jpath) => {
        // List of elements that should ALWAYS be arrays
        const arrayElements = [
            'Fornamn',       // First name(s)
            'Efternamn'      // Last name(s)
        ];
        
        // List of elements that should NEVER be arrays
        const singleElements = [
            'PersonsokningSvarspost',  // Main response object
            'Namn',                    // Name container
            'Folkbokforingsadress',    // Registered address
            'SvenskAdress'             // Swedish address details
        ];
        
        // Decision logic:
        if (arrayElements.includes(name)) return true;  // Force array
        if (singleElements.includes(name)) return false; // Force single
        return false; // Default: single element
    }
});

// In lookup.ts transformResponse
const transformResponse = (data: SparResponse) => {
    const person = data.Envelope?.Body?.PersonsokningSvar?.PersonsokningSvarspost;
    
    if (!person || person.Status !== '1') return null;

    return {
    name: formatName(person.Namn),
    birthDate: person.Persondetaljer?.Fodelsedatum,
    address: formatAddress(person.Folkbokforingsadress?.SvenskAdress),
    protectedIdentity: person.SkyddadIdentitet === 'true',
      lastUpdated: person.SenastAndrad || 'Unknown' // Safe access
    };
};

// Response transformation utilities
// In lookup.ts
const formatName = (name?: { 
    Fornamn?: string | string[];
    Efternamn?: string | string[];
}): string => {
    const firstName = Array.isArray(name?.Fornamn) 
    ? name?.Fornamn.join(' ') 
    : name?.Fornamn || '';

    const lastName = Array.isArray(name?.Efternamn)
    ? name?.Efternamn.join(' ')
    : name?.Efternamn || '';

    return [firstName, lastName].filter(Boolean).join(' ') || 'Name not available';
};

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
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
        const personData = transformResponse(parsedData);

        console.log('Raw SPAR response:', soapResponse);
        console.log('Parsed structure:', parsedData);

        if (!personData) {
            res.status(404).json({ 
                error: 'Person not found',
                code: 'PERSON_NOT_FOUND'
            });
            return;
        }

        res.json(personData);
    } catch (error) {
        console.error('SPAR lookup failed:', error);
        next({
            status: 500,
            code: 'SPAR_INTEGRATION_ERROR',
            message: 'Failed to communicate with SPAR registry',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
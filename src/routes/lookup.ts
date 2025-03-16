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
const formatName = (name?: { 
    Fornamn?: string | string[]; 
    Efternamn?: string | string[]; // Allow string array for Efternamn
}): string => {
    const fornamn = Array.isArray(name?.Fornamn) ? 
        name.Fornamn.join(' ') : 
        name?.Fornamn;
        
    const efternamn = Array.isArray(name?.Efternamn) ? 
        name.Efternamn.join(' ') : 
        name?.Efternamn;

    return [fornamn, efternamn].filter(Boolean).join(' ') || 'Name not available';
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

        console.log('Raw SOAP Response:', soapResponse); // Add this line

        const parsedData = parser.parse(soapResponse);
        const result = parsedData?.Envelope?.Body.PersonsokningSvar?.PersonsokningSvarspost;

        if (!result) {
            console.error('Invalid SPAR response structure:', parsedData);
            throw new Error('Invalid SPAR response structure');
        }

        console.log('SPAR Status:', result.Status); // Add this line

        // Handle SPAR status codes
        const statusMap: { [key: string]: number } = {
            '1': 200,  // Found
            '2': 403,  // Protected identity
            '4': 404   // Not found
        } as const;

        const statusCode = statusMap[result.Status as keyof typeof statusMap] ?? 500;

        // Transform response format
        const responseData = result.Status === '1' ? {
            data: {
                name: formatName(result.Namn),
                birthDate: result.Persondetaljer?.Fodelsedatum,
                address: formatAddress(result.Folkbokforingsadress?.SvenskAdress),
                protectedIdentity: result.SkyddadIdentitet === 'true',
                lastUpdated: result.SenastAndrad
            }
        } : {
            error: result.Status === '2' ? 'Protected identity' : 'Person not found',
            code: result.Status === '2' ? 'PROTECTED' : 'PERSON_NOT_FOUND'
        };

        res.status(statusCode).json(responseData);

    } catch (error) {
        next(error);
    }
});

export default router;
import { Request, Response, NextFunction, Router } from 'express';
import { SparClient } from '../services/spar.client';
import { XMLParser } from 'fast-xml-parser';
import { SparResponse } from '../types/spar';
import { SPAR_CONFIG } from '../config/env';

const router = Router();

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@',
    textNodeName: '#text',
    trimValues: true,
    processEntities: true,
    tagValueProcessor: (_, val) => val.trim(),
    transformTagName: (tagName) => tagName.replace(/^.*:/, ''),
    isArray: (name) => new Set(['Fornamn', 'Efternamn']).has(name)
});

const transformResponse = (data: SparResponse) => {
    const person = data.Envelope?.Body?.PersonsokningSvar?.PersonsokningSvarspost;
    
    if (!person) return null;

    const statusMapping: Record<string, { code: string; message: string }> = {
        '1': { code: 'FOUND', message: 'Person found' },
        '2': { code: 'PROTECTED', message: 'Protected identity' },
        '3': { code: 'DECEASED', message: 'Deceased person' },
        '4': { code: 'NOT_FOUND', message: 'Person not found' }
    };

    return {
        status: statusMapping[person.Status] || { code: 'UNKNOWN', message: 'Unknown status' },
        data: person.Status === '1' ? {
            name: formatName(person.Namn),
            birthDate: person.Persondetaljer?.Fodelsedatum,
            address: formatAddress(person.Folkbokforingsadress?.SvenskAdress),
            protectedIdentity: person.SkyddadIdentitet === 'true',
            lastUpdated: person.SenastAndrad
        } : null
    };
};

const formatName = (name?: { 
    Fornamn?: string | string[];
    Efternamn?: string | string[];
}): string => {
    const firstNames = Array.isArray(name?.Fornamn) ? name.Fornamn : [name?.Fornamn];
    const lastNames = Array.isArray(name?.Efternamn) ? name.Efternamn : [name?.Efternamn];
    
    return [
        ...(firstNames?.filter(Boolean) || []),
        ...(lastNames?.filter(Boolean) || [])
    ].join(' ') || 'Name not available';
};

const formatAddress = (address?: { 
    Utdelningsadress2?: string;
    PostNr?: string;
    Postort?: string;
}) => ({
    street: address?.Utdelningsadress2,
    postalCode: address?.PostNr,
    city: address?.Postort
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const pnr = res.locals.personnummer;
        const client = await SparClient.getClient();

        const [soapResponse] = await client.PersonsokAsync({
            fraga: {
                Identifieringsinformation: {
                    KundNrLeveransMottagare: SPAR_CONFIG.CUSTOMER_NUMBER,
                    KundNrSlutkund: SPAR_CONFIG.CUSTOMER_NUMBER,
                    UppdragId: SPAR_CONFIG.ASSIGNMENT_ID,
                    SlutAnvandarId: 'spar-lookup'
                },
                PersonsokningFraga: { IdNummer: pnr }
            }
        });

        const parsedData = parser.parse(soapResponse) as SparResponse;
        const result = transformResponse(parsedData);

        if (!result?.data) {
            return res.status(404).json({ 
                error: result?.status.message || 'Person not found',
                code: result?.status.code || 'UNKNOWN_ERROR'
            });
        }

        res.json(result);
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
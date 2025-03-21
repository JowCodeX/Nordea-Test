import { Router, Request, Response, NextFunction } from 'express';
import { XMLParser } from 'fast-xml-parser';
import axios, {AxiosError } from 'axios';
import https from 'https';
import fs from 'fs';
import { SPAR_CONFIG } from '../config/env';

const router = Router();
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    preserveOrder: false,
    processEntities: true,
    allowBooleanAttributes: true,
    tagValueProcessor: (_, val) => val?.trim() // Added null check
});

// Response transformation utilities
const formatName = (name?: { 
    Fornamn?: string | string[]; 
    Efternamn?: string | string[]; // Allow string array for Efternamn
}): string => {
    if (!name) return 'Name not available';
    
    const fornamn = Array.isArray(name.Fornamn) ? 
        name.Fornamn.join(' ') : 
        name.Fornamn;
        
    const efternamn = Array.isArray(name.Efternamn) ? 
        name.Efternamn.join(' ') : 
        name.Efternamn;

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
        if (!pnr) {
            return res.status(400).json({
                error: 'Missing personnummer',
                code: 'MISSING_PARAM'
            });
        }

        const customerNumber = SPAR_CONFIG.CUSTOMER_NUMBER;
        const assignmentId = SPAR_CONFIG.ASSIGNMENT_ID;

        let soapBody = fs.readFileSync('../config/personsok-request.xml', 'utf8');

        soapBody = soapBody.replace('{{customerNumber}}', customerNumber);
        soapBody = soapBody.replace('{{assignmentId}}', assignmentId);
        soapBody = soapBody.replace('{{personnummer}}', pnr);

        const url = SPAR_CONFIG.WSDL_URL.replace('?wsdl', '');
        const soapActionHeader = 'http://skatteverket.se/spar/personsok/2023.1/PersonsokService/Personsok';
        const contentTypeHeader = 'text/xml';

        const httpsAgent = new https.Agent({
            cert: fs.readFileSync(SPAR_CONFIG.CERTS.CERT),
            key: fs.readFileSync(SPAR_CONFIG.CERTS.KEY),
            ca: fs.readFileSync(SPAR_CONFIG.CERTS.CA),
            secureProtocol: 'TLSv1_2_method',
            rejectUnauthorized: true
        });

        console.log('Sending SOAP Request', soapBody);

        const response = await axios.post(url, soapBody, {
            headers: {
                'Content-Type': contentTypeHeader,
                'SOAPAction': soapActionHeader
            },
            httpsAgent: httpsAgent
        });

        console.log('Raw Axios Response:', response.data);

        let result;
        if(process.env.NODE_ENV === 'test') {
            const parsedData = parser.parse(response.data);
            result = parsedData?.Envelope?.Body?.PersonsokningSvar?.PersonsokningSvarspost;
        } else {
            try {
                const parsedData = parser.parse(response.data);
                result = parsedData?.Envelope?.Body?.PersonsokningSvar?.PersonsokningSvarspost;
            } catch (error) {
                console.error('XML parsing error:', error);
                return res.status(500).json({
                    error: 'Failed to parse SOAP response',
                    code: 'XML_PARSE_ERROR'
                });
            }
        }

        if(!result) {
            console.error('Invalid SPAR response structure:', response.data);
            return res.status(500).json({
                error: 'Invalid SPAR response structure',
                code: 'INVALID_RESPONSE'
            });
        }

        console.log('SPAR Status:', result.Status);

        const statusMap: { [key: string]: number } = {
            '1': 200,
            '2': 403,
            '4': 404
        } as const;

        const statusCode = statusMap[result.Status as keyof typeof statusMap] ?? 500;

        const responseData = result.Status === '1' ? {
            data: {
                name: formatName(result.Namn),
                birthDate: result.Persondetaljer?.Fodelsedatum,
                adress: formatAddress(result.Folkbokforingsadress?.SvenskAdress),
                protectedIdentity: result.SkyddadIdentitet === 'true',
                lastUpdated: result.SenastAndrad
            }
        } : {
            error: result.Status === '2' ? 'Protected identity' : 'Person not found',
            code: result.Status === '2' ? 'PROTECTED' : 'PERSON_NOT_FOUND'
        };

        res.status(statusCode).json(responseData);
    } catch (error) {
        console.error('Lookup route error:', error);
        if (axios.isAxiosError(error)) {
            console.error('Axios Error Details:', error.response ? error.response.data : error.message);
        }
        next(error);
    }
});

export default router;
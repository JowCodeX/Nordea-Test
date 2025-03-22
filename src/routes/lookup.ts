import { Router, Request, Response, NextFunction } from 'express';
import { XMLParser } from 'fast-xml-parser';
import axios, { AxiosError } from 'axios';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { SPAR_CONFIG } from '../config/env';

const router = Router();
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    preserveOrder: false,
    processEntities: true,
    allowBooleanAttributes: true,
    tagValueProcessor: (_, val) => val?.trim(), // Added null check
    removeNSPrefix: true,
    isArray: (name) => [
        'PersonsokningSvarspost',
        'Namn',
        'Folkbokforingsadress',
        'SvenskAdress',
        'Persondetaljer'
    ].includes(name)
}); 

// Response transformation utilities
const formatName = (nameData: any): string => {
    const namn = nameData?.Namn?.[0];
    return [
        namn?.Fornamn,
        namn?.Mellannamn,
        namn?.Efternamn
    ].filter(Boolean).join(' ') || 'Name not available';
};

const formatAddress = (addressData: any) => ({
    street: addressData?.Folkbokforingsadress?.[0]?.SvenskAdress?.[0]?.Utdelningsadress2 || 'Unknown',
    postalCode: addressData?.Folkbokforingsadress?.[0]?.SvenskAdress?.[0]?.PostNr || 'Unknown',
    city: addressData?.Folkbokforingsadress?.[0]?.SvenskAdress?.[0]?.Postort || 'Unknown'
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

        // Use path.resolve to correctly locate the XML template file
        const templatePath = path.resolve(__dirname, '../../src/config/personsok-request.xml');
        //console.log('Loading SOAP template from:', templatePath);
        
        let soapBody;
        try {
            soapBody = fs.readFileSync(templatePath, 'utf8');
        } catch (error) {
            console.error(`Failed to read XML template: ${error}`);
            return res.status(500).json({
                error: 'Failed to load SOAP request template',
                code: 'TEMPLATE_NOT_FOUND'
            });
        }

        // Replace placeholders with actual values
        soapBody = soapBody
        .replace(/\$\{customerNumber\}/g, customerNumber)  // <- Add regex syntax
        .replace(/\$\{assignmentId\}/g, assignmentId)
        .replace(/\$\{personnummer\}/g, pnr);

        const url = SPAR_CONFIG.WSDL_URL.replace('?wsdl', '');
        const soapActionHeader = 'http://skatteverket.se/spar/personsok/2023.1/PersonsokService/Personsok';
        const contentTypeHeader = 'text/xml';

        // Read certificate files with proper error handling and typed buffer storage
        let cert: Buffer;
        let key: Buffer;
        let ca: Buffer;

        try {
            cert = fs.readFileSync(SPAR_CONFIG.CERTS.CERT);
            key = fs.readFileSync(SPAR_CONFIG.CERTS.KEY);
            ca = fs.readFileSync(SPAR_CONFIG.CERTS.CA);
            console.log('Certificates loaded successfully');
        } catch (error) {
            console.error(`Failed to read certificate files: ${error}`);
            return res.status(500).json({
                error: 'Failed to load SSL certificates',
                code: 'CERT_LOAD_ERROR'
            });
        }

        // Configure HTTPS agent with proper cert verification
        const httpsAgent = new https.Agent({
            cert,
            key,
            ca,
            secureProtocol: 'TLSv1_2_method',
            // Use rejectUnauthorized based on environment
            // In development/test, we might want to disable strict verification
            rejectUnauthorized: process.env.NODE_ENV === 'production'
        });

        console.log(`SSL verification: ${process.env.NODE_ENV === 'production' ? 'Enabled' : 'Disabled for non-production environment'}`);
        console.log('Sending SOAP Request to:', url);

        const response = await axios.post(url, soapBody, {
            headers: {
                'Content-Type': contentTypeHeader,
                'SOAPAction': soapActionHeader
            },
            httpsAgent: httpsAgent,
            // Add timeout to prevent hanging requests
            timeout: 30000
        });

        console.log('SOAP Response received, status:', response.status);

        let result;
        if (process.env.NODE_ENV === 'test') {
            const parsedData = parser.parse(response.data);
            console.log('Parsed XML structure:', JSON.stringify(parsedData, null, 2));


            const body = parsedData?.Envelope?.Body || {};
            const responsePart = body.SPARPersonsokningSvar || body['ns26:SPARPersonsokningSvar'];

            result = 
            responsePart?.['ns26:PersonsokningSvarspost']?.[0] ||
            responsePart?.PersonsokningSvarspost?.[0] ||
            responsePart?.PersonsokningSvarspost;

        } else {
            try {
                const parsedData = parser.parse(response.data);
                console.log('Parsed XML structure:', JSON.stringify(parsedData, null, 2));
    
    
                const body = parsedData?.Envelope?.Body || {};
                const responsePart = body.SPARPersonsokningSvar || body['ns26:SPARPersonsokningSvar'];
    
                result = 
                responsePart?.['ns26:PersonsokningSvarspost']?.[0] ||
                responsePart?.PersonsokningSvarspost?.[0] ||
                responsePart?.PersonsokningSvarspost;

                if(!result) {
                    result = parsedData?.Envelope?.Body?.[0]?.['ns26:SPARPersonsokningSvar']?.[0]?.
                    ['ns26:PersonsokningSvarspost']?.[0];
                }

                console.log('Processed result:', JSON.stringify(result, null, 2));

            } catch (error) {
                console.error('XML parsing error:', error);
                console.error('Raw XML response:', response.data.substring(0, 500) + '...');
                return res.status(500).json({
                    error: 'Failed to parse SOAP response',
                    code: 'XML_PARSE_ERROR'
                });
            }
        }

        if (!result) {
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
            
            // Handle specific Axios errors with more informative responses
            if (error.code === 'ECONNREFUSED') {
                return res.status(503).json({
                    error: 'SPAR service unavailable',
                    code: 'SPAR_UNAVAILABLE'
                });
            }
            
            if (error.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY') {
                return res.status(500).json({
                    error: 'SSL certificate validation failed',
                    code: 'SSL_CERT_ERROR',
                    message: 'The application could not verify the SPAR server\'s SSL certificate'
                });
            }
        }
        next(error);
    }
});

export default router;
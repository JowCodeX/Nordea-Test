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
    tagValueProcessor: (_, val) => val?.trim(),
    removeNSPrefix: true,
    isArray: (name) => [
        'PersonsokningSvarspost',
        'Namn',
        'Folkbokforingsadress',
        'SvenskAdress',
        'Persondetaljer'
    ].includes(name)
});


const formatName = (nameData: any): string => {
    const namn = nameData?.[0];
    return [
        namn?.Fornamn,
        namn?.Mellannamn,
        namn?.Efternamn
    ].filter(Boolean).join(' ') || 'Name not available';
};

const formatAddress = (addressData: any) => ({
    street: addressData?.[0]?.SvenskAdress?.[0]?.Utdelningsadress2 || 'Unknown',
    postalCode: addressData?.[0]?.SvenskAdress?.[0]?.PostNr || 'Unknown',
    city: addressData?.[0]?.SvenskAdress?.[0]?.Postort || 'Unknown'
});


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

        const templatePath = path.resolve(__dirname, '../../src/config/personsok-request.xml');


        let soapBody;
        try {
            soapBody = fs.readFileSync(templatePath, 'utf8');
        } catch (error) {
            return res.status(500).json({
                error: 'Failed to load SOAP request template',
                code: 'TEMPLATE_NOT_FOUND'
            });
        }

        soapBody = soapBody
        .replace(/\$\{customerNumber\}/g, customerNumber)   
        .replace(/\$\{assignmentId\}/g, assignmentId)
        .replace(/\$\{personnummer\}/g, pnr);

        const url = SPAR_CONFIG.WSDL_URL.replace('?wsdl', '');
        const soapActionHeader = 'http://skatteverket.se/spar/personsok/2023.1/PersonsokService/Personsok';
        const contentTypeHeader = 'text/xml';

        let cert: Buffer;
        let key: Buffer;
        let ca: Buffer;

        try {
            cert = fs.readFileSync(SPAR_CONFIG.CERTS.CERT);
            key = fs.readFileSync(SPAR_CONFIG.CERTS.KEY);
            ca = fs.readFileSync(SPAR_CONFIG.CERTS.CA);
        } catch (error) {

            return res.status(500).json({
                error: 'Failed to load SSL certificates',
                code: 'CERT_LOAD_ERROR'
            });
        }


        const httpsAgent = new https.Agent({
            cert,
            key,
            ca,
            secureProtocol: 'TLSv1_2_method',
            rejectUnauthorized: process.env.NODE_ENV === 'production'
        });

        const response = await axios.post(url, soapBody, {
            headers: {
                'Content-Type': contentTypeHeader,
                'SOAPAction': soapActionHeader
            },
            httpsAgent: httpsAgent,
            timeout: 30000
        });

        let result;
        if (process.env.NODE_ENV === 'test') {
            const parsedData = parser.parse(response.data);


            const body = parsedData?.Envelope?.Body || {};
            const responsePart = body.SPARPersonsokningSvar || body['ns26:SPARPersonsokningSvar'];

            const svarspost = responsePart?.['ns26:PersonsokningSvarspost'] || responsePart?.PersonsokningSvarspost;
            result = Array.isArray(svarspost) ? svarspost[0] : svarspost;
        } else {
            try {
                const parsedData = parser.parse(response.data);


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


            } catch (error) {
                return res.status(500).json({
                    error: 'Failed to parse SOAP response',
                    code: 'XML_PARSE_ERROR'
                });
            }
        }

        if (!result) {
            return res.status(500).json({
                error: 'Invalid SPAR response structure',
                code: 'INVALID_RESPONSE'
            });
        }

        let statusCode = 500;
        let responseData: any;

        if (result?.Persondetaljer && Array.isArray(result.Persondetaljer) && result.Persondetaljer.length > 0) {
            statusCode = 200;
            responseData = {
                data: {
                    name: Array.isArray(result.Namn) ? formatName(result.Namn) : 'Name not available',
                    birthDate: result.Persondetaljer[0]?.Fodelsedatum,
                    adress: Array.isArray(result.Folkbokforingsadress) && result.Folkbokforingsadress.length > 0 ? formatAddress(result.Folkbokforingsadress) : { street: 'Unknown', postalCode: 'Unknown', city: 'Unknown' },
                    protectedIdentity: result.SkyddadFolkbokforing === 'JA',
                    lastUpdated: result.SenasteAndringSPAR
                }
            };
        } else if (result?.Sekretessmarkering === 'JA') {
            statusCode = 403;
            responseData = { error: 'Protected identity', code: 'PROTECTED' };
        } else {
            statusCode = 404;
            responseData = { error: 'Person not found', code: 'PERSON_NOT_FOUND' };
        }


        res.status(statusCode).json(responseData);

    } catch (error) {
        if (axios.isAxiosError(error)) {
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
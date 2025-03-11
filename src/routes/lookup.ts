import { Request, Response, NextFunction, Router } from 'express';
import { SparClient } from '../services/spar.client';
import { XMLParser } from 'fast-xml-parser';
import { SparResponse } from '../types/spar';
import { SPAR_CONFIG } from '../config/env';
import path from 'path';
import fs from 'fs';

console.log("Is Router a function?", typeof Router === 'function'); // Add this line

const router = Router();
// const soapRequestXmlPath = path.join(__dirname, '../config/personsok-request.xml'); // Construct absolute path
// const soapRequestTemplate = fs.readFileSync(soapRequestXmlPath, 'utf-8');

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    preserveOrder: false,
    transformTagName: (tag) => tag,
    processEntities: true,
    allowBooleanAttributes: true,
    parseTagValue: false,
    tagValueProcessor: (_, val) => val.trim()
});

const formatName = (name?: { Fornamn?: string; Efternamn?: string }): string => {
return [name?.Fornamn, name?.Efternamn]
    .filter(Boolean)
    .join(' ') || 'Name not available';
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

router.get('/', async (
req: Request,
res: Response,
next: NextFunction
): Promise<void> => {
try {
    const pnr = res.locals.personnummer;
    const client = await SparClient.getClient();

    // Updated SOAP request with proper XML structure and namespaces
    const [soapResponse] = await client.PersonsokAsync({
    _xml: `<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope
        xmlns:fraga="http://statenspersonadressregister.se/schema/personsok/2023.1/personsokningfraga"
        xmlns:idinfo="http://statenspersonadressregister.se/schema/komponent/metadata/identifieringsinformationWs-1.1"
        xmlns:person="http://statenspersonadressregister.se/schema/komponent/person/person-1.2"
        xmlns:sok="http://statenspersonadressregister.se/schema/komponent/sok/personsokningsokparametrar-1.1"
        xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        
        <soap:Header/>
        <soap:Body>
            <fraga:SPARPersonsokningFraga>
            <idinfo:Identifieringsinformation>
                <idinfo:KundNrLeveransMottagare>${SPAR_CONFIG.CUSTOMER_NUMBER}</idinfo:KundNrLeveransMottagare>
                <idinfo:KundNrSlutkund>${SPAR_CONFIG.CUSTOMER_NUMBER}</idinfo:KundNrSlutkund>
                <idinfo:UppdragId>${SPAR_CONFIG.ASSIGNMENT_ID}</idinfo:UppdragId>
                <idinfo:SlutAnvandarId>spar-lookup</idinfo:SlutAnvandarId>
            </idinfo:Identifieringsinformation>
            <sok:PersonsokningFraga>
                <person:IdNummer>${pnr}</person:IdNummer>
            </sok:PersonsokningFraga>
            </fraga:SPARPersonsokningFraga>
        </soap:Body>
        </soap:Envelope>`
    });

    const parsedData: SparResponse = parser.parse(soapResponse);
    const personData = transformResponse(parsedData);

    if (!personData) {
    res.status(404).json({ error: 'Person not found in SPAR registry' });
    return;
    }

    res.json(personData);
} catch (error) {
    next(error);
}
});

const transformResponse = (data: SparResponse) => {
    const response = data.Envelope?.Body?.PersonsokResponse;
    const person = response?.SPARPersonsokningSvar?.PersonsokningSvarspost;

    if (!person || person.Status !== '1') return null;

    return {
    name: formatName(person.Namn),
    birthDate: person.Persondetaljer?.Fodelsedatum || 'Unknown',
    address: formatAddress(person.Folkbokforingsadress?.SvenskAdress)
    };
};

export default router;
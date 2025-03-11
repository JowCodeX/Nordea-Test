import soap, { createClientAsync, Client } from 'soap';
import https from 'https';
import fs from 'fs';
import { SPAR_CONFIG, SERVER_CONFIG } from '../config/env';

export class SparClient {
private static instance: Promise<Client>;

static async getClient(): Promise<Client> {
    if (!this.instance) {
    this.instance = this.createClient();
    }
    return this.instance;
}

private static async createClient(): Promise<Client> {
    const agent = new https.Agent({
    cert: fs.readFileSync(`${SPAR_CONFIG.CERT_DIR}/bolag-a.crt`),
    key: fs.readFileSync(`${SPAR_CONFIG.CERT_DIR}/bolag-a.key`),
    ca: fs.readFileSync(`${SPAR_CONFIG.CERT_DIR}/bolag-a.pem`),
    rejectUnauthorized: SERVER_CONFIG.ENV === 'production'
    });

    const client = await createClientAsync(SPAR_CONFIG.WSDL_URL, {
    wsdl_options: { agent },
      forceSoap12Headers: false, // SPAR uses SOAP 1.1
    namespaceArrayElements: false
    });

    // Add SOAP headers required by SPAR
    client.addSoapHeader({
    'wsse:Security': {
        $: {
        'xmlns:wsse': 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd'
        },
        'wsse:UsernameToken': {
        'wsse:Username': SPAR_CONFIG.CUSTOMER_NUMBER,
        'wsse:Password': SPAR_CONFIG.ASSIGNMENT_ID
        }
    }
    });

    return client;
}
}
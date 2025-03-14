import soap, { createClientAsync, Client } from 'soap';
import https from 'https';
import fs from 'fs';
import { constants } from 'crypto';
import { SPAR_CONFIG, SERVER_CONFIG } from '../config/env';
import * as mockSoapClient from '../__tests__/test-utils/mockSoapClient';

export class SparClient {
    private static instance: Promise<Client> | null = null; // Allow null for test environment
    private static lastClientCreation: number = 0;

    static async getClient(): Promise<Client> {
        if (process.env.NODE_ENV === 'test') {
            // Return a resolved promise of a mock client object for tests
            return Promise.resolve({
                PersonsokAsync: mockSoapClient.currentMockImplementation.PersonsokAsync
            } as unknown as Client);
        }

        // Recreate client if older than 5 minutes or if instance is null
        if (!this.instance || Date.now() - this.lastClientCreation > 300000) {
            this.instance = this.createClient();
            this.lastClientCreation = Date.now();
        }
        return this.instance;
    }

    private static async createClient(): Promise<Client> {
        if (process.env.NODE_ENV === 'test') {
            throw new Error('Should not create real SOAP client in test environment');
        }
        try {
            const wsdlOptions = {
                strictSSL: true,
                rejectUnauthorized: SERVER_CONFIG.ENV === 'production',
                secureOptions:
                    constants.SSL_OP_NO_SSLv3 |
                    constants.SSL_OP_NO_TLSv1 |
                    constants.SSL_OP_NO_TLSv1_1,
                cert: fs.readFileSync(SPAR_CONFIG.CERTS.CERT),
                key: fs.readFileSync(SPAR_CONFIG.CERTS.KEY),
                ca: fs.readFileSync(SPAR_CONFIG.CERTS.CA),
                agent: new https.Agent({ keepAlive: true })
            };

            const client = await createClientAsync(SPAR_CONFIG.WSDL_URL, {
                wsdl_options: wsdlOptions,
                forceSoap12Headers: true,
                overridePromiseSuffix: 'Async'
            });

            this.configureSecurityHeaders(client);
            this.setupClientHooks(client);

            return client;
        } catch (error) {
            console.error('SOAP client creation failed:', error);
            throw new Error('Failed to initialize SPAR client');
        }
    }

    private static configureSecurityHeaders(client: Client) {
        const securityHeader = {
            'wsse:Security': {
                $: {
                    'xmlns:wsse': 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd',
                    'xmlns:wsu': 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd'
                },
                'wsse:UsernameToken': {
                    'wsse:Username': SPAR_CONFIG.CUSTOMER_NUMBER,
                    'wsse:Password': {
                        $: {
                            Type: 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText'
                        },
                        _: SPAR_CONFIG.ASSIGNMENT_ID
                    }
                }
            }
        };

        client.addSoapHeader(securityHeader);
    }

    private static setupClientHooks(client: Client) {
        client.on('request', (xml, eid) => {
            console.debug(`SOAP Request (${eid}):`, xml);
        });

        client.on('response', (xml, eid) => {
            console.debug(`SOAP Response (${eid}):`, xml);
        });

        client.on('soapError', (error, eid) => {
            console.error(`SOAP Error (${eid}):`, error);
        });
    }
}

export default SparClient;
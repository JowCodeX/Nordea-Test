import soap, { createClientAsync, Client, ISecurity } from 'soap';
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
        // Configure mutual TLS
        const wsdlOptions = {
            cert: fs.readFileSync(SPAR_CONFIG.CERTS.CERT),
            key: fs.readFileSync(SPAR_CONFIG.CERTS.KEY),
            ca: fs.readFileSync(SPAR_CONFIG.CERTS.CA),
            rejectUnauthorized: SERVER_CONFIG.ENV === 'production',
            forever: true // Keep TCP connection alive
        };

        const client = await createClientAsync(SPAR_CONFIG.WSDL_URL, {
            wsdl_options: wsdlOptions,
            forceSoap12Headers: true,
            overridePromiseSuffix: 'Async' // Enable promise-style calls
        });

        // Add WS-Security headers
        const securityHeader: ISecurity = {
            postProcess: (xml: string) => {
                return xml.replace(
                    '<soap:Header/>',
                    `<soap:Header>
                        <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
                            <wsse:UsernameToken>
                                <wsse:Username>${SPAR_CONFIG.CUSTOMER_NUMBER}</wsse:Username>
                                <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">
                                    ${SPAR_CONFIG.ASSIGNMENT_ID}
                                </wsse:Password>
                            </wsse:UsernameToken>
                        </wsse:Security>
                    </soap:Header>`
                );
            }
        };
        client.setSecurity(securityHeader);

        return client;
    }
}
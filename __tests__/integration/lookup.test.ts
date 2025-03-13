import request from 'supertest';
import { createTestServer } from '../test-utils/testServer';
import { mockSparResponse } from '../test-utils/mockSoapClient';

describe('Person Lookup API', () => {
    let app: Express.Application;

    beforeAll(async () => {
        app = await createTestServer();
    });

    test('Successful lookup returns person data', async () => {
        mockSparResponse({
            Status: '1',
            Namn: { Fornamn: ['Test', 'User'], Efternamn: 'Testsson' },
            Persondetaljer: { Fodelsedatum: '1957-04-13' },
            Folkbokforingsadress: {
                SvenskAdress: {
                    Utdelningsadress2: 'Test Street 123',
                    PostNr: '12345',
                    Postort: 'Stockholm'
                }
            }
        });

        const response = await request(app)
            .get('/lookup?personnummer=570413-3106');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: { code: 'FOUND', message: 'Person found' },
            data: {
                name: 'Test User Testsson',
                birthDate: '1957-04-13',
                address: {
                    street: 'Test Street 123',
                    postalCode: '12345',
                    city: 'Stockholm'
                },
                protectedIdentity: false,
                lastUpdated: expect.any(String)
            }
        });
    });

    test('Protected identity returns 403', async () => {
        mockSparResponse({ Status: '2' });

        const response = await request(app)
            .get('/lookup?personnummer=570413-3106');

        expect(response.status).toBe(403);
        expect(response.body).toEqual({
            error: 'Protected identity',
            code: 'PROTECTED'
        });
    });

    test('Invalid personnummer returns 400', async () => {
        const response = await request(app)
            .get('/lookup?personnummer=invalid');

        expect(response.status).toBe(400);
    });
});
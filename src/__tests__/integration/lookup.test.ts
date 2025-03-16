import request from 'supertest';
import { Express } from 'express';
import { createTestServer } from '../../../test-utils/testServer';
import { mockSparResponse } from '../../../test-utils/mockSoapClient';

describe('Person Lookup API Integration', () => {
    let app: Express;

    // Mock valid personnummer in test server
    beforeAll(async () => {
        app = await createTestServer();
    });

    test('Successful lookup with valid data', async () => {
        mockSparResponse({
            Status: '1',
            Namn: { 
                Fornamn: ['Test', 'User'], 
                Efternamn: 'Testsson' 
            },
            Persondetaljer: { 
                Fodelsedatum: '1957-04-13' 
            },
            Folkbokforingsadress: {
                SvenskAdress: {
                    Utdelningsadress2: 'Test Street 123',
                    PostNr: '12345',
                    Postort: 'Stockholm'
                }
            },
            SenastAndrad: '2023-01-01'
        });

        const response = await request(app)
            .get('/lookup')
            .query({ personnummer: '195704133106' }); // Valid test number

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            data: {
                name: 'Test User Testsson',
                birthDate: '1957-04-13',
                address: {
                    street: 'Test Street 123',
                    postalCode: '12345',
                    city: 'Stockholm'
                },
                protectedIdentity: false,
                lastUpdated: '2023-01-01'
            }
        });
    });

    test('Handles protected identity response', async () => {
        mockSparResponse({
            Status: '2',
            SkyddadIdentitet: 'true'
        });

        const response = await request(app)
            .get('/lookup')
            .query({ personnummer: '195704133106' });

        expect(response.status).toBe(403);
        expect(response.body).toEqual({
            error: 'Protected identity',
            code: 'PROTECTED'
        });
    });

    test('Handles not found response', async () => {
        mockSparResponse({
            Status: '4',
        PersonsokningSvarspost: {
            Status: '4'
        }
    });
    
        const response = await request(app)
        .get('/lookup')
        .query({ personnummer: '195704133106' });
    
        // Fix status code mismatch
        expect(response.status).toBe(404); // Was 400 in original
        expect(response.body).toEqual({
        error: 'Person not found',
        code: 'PERSON_NOT_FOUND'
        });
    });
});
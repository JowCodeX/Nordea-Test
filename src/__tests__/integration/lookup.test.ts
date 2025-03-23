import request from 'supertest';
import { Express } from 'express';
import { createTestServer } from '../../../test-utils/testServer';
import { mockSparResponse } from '../../../test-utils/mockSoapClient';

describe('Person Lookup API Integration', () => {
    let app: Express;

    beforeAll(async () => {
        app = await createTestServer();
    });

    test('Successful lookup with valid data', async () => {
        mockSparResponse({
            PersonId: {
                IdNummer: '195704133106',
                Typ: 'PERSONNUMMER'
            },
            Namn: [{
                Fornamn: 'Christina Birgitta Ulrika',
                Mellannamn: 'Thomeaus',
                Efternamn: 'Efternamn3542',
                Aviseringsnamn: 'Efternamn3542, Christina Birgitta'
            }],
            Persondetaljer: [{
                Fodelsedatum: '1957-04-13',
                Kon: 'KVINNA'
            }],
            Folkbokforingsadress: [{
                SvenskAdress: [{
                    Utdelningsadress2: 'Gatan142 8',
                    PostNr: 11146,
                    Postort: 'STOCKHOLM'
                }]
            }],
            SenasteAndringSPAR: '2021-09-25',
            SkyddadFolkbokforing: 'NEJ'
        });

        const response = await request(app)
            .get('/lookup')
            .query({ personnummer: '195704133106' });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            data: {
                name: 'Christina Birgitta Ulrika Thomeaus Efternamn3542',
                birthDate: '1957-04-13',
                adress: {
                    street: 'Gatan142 8',
                    postalCode: 11146,
                    city: 'STOCKHOLM'
                },
                protectedIdentity: false,
                lastUpdated: '2021-09-25'
            }
        });
    });

    test('Handles protected identity response', async () => {
        mockSparResponse({
            SkyddadFolkbokforing: 'JA',
            Sekretessmarkering: 'JA',
            PersonsokningSvarspost: []
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
            PersonsokningSvarspost: [],
            Status: '4'
        });

        const response = await request(app)
            .get('/lookup')
            .query({ personnummer: '195704133106' });

        expect(response.status).toBe(404);
        expect(response.body).toEqual({
            error: 'Person not found',
            code: 'PERSON_NOT_FOUND'
        });
    });
});
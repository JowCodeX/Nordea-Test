// mockSoapClient.ts
import soap from 'soap';

export let currentMockImplementation: any = {
    PersonsokAsync: jest.fn().mockResolvedValue([{
        Envelope: {
            Body: {
                PersonsokningSvar: {
                    PersonsokningSvarspost: {
                        Status: '1', // Default successful status
                        Namn: { 
                            Fornamn: ['Test'], 
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
                    }
                }
            }
        }
    }])
};

jest.mock('soap', () => ({
    createClientAsync: jest.fn().mockImplementation(() => ({
        PersonsokAsync: currentMockImplementation.PersonsokAsync
    }))
}));

export const mockSparResponse = (responseData: object) => {
    currentMockImplementation.PersonsokAsync = jest.fn().mockResolvedValue([{
        Envelope: {
            Body: {
                PersonsokningSvar: {
                    PersonsokningSvarspost: responseData
                }
            }
        }
    }]);
};
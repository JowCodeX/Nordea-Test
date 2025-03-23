interface MockSparResponse {
  PersonId?: {
    IdNummer: string;
    Typ: string;
  };
  Namn?: Array<{
    Fornamn?: string | string;
    Mellannamn?: string;
    Efternamn?: string | string;
    Aviseringsnamn?: string;
  }>;
  Persondetaljer?: Array<{
    Fodelsedatum?: string;
    Kon?: string;
  }>;
  Folkbokforingsadress?: Array<{
    SvenskAdress?: Array<{
      Utdelningsadress2?: string;
      PostNr?: number;
      Postort?: string;
    }>;
  }>;
  SkyddadFolkbokforing?: string;
  Sekretessmarkering?: string;
  SenasteAndringSPAR?: string;
  Status?: string;
  PersonsokningSvarspost?: any;
  [key: string]: any;
}
  
  export const currentMockImplementation = {
    PersonsokAsync: async () => {
      return [
        {
          Envelope: {
            Body: {
              PersonsokningSvar: {
                PersonsokningSvarspost: {
                  Status: '1',
                  Namn: { 
                    Fornamn: ['Default', 'Mock'],
                    Efternamn: 'User'
                  },
                  Persondetaljer: {
                    Fodelsedatum: '1990-01-01'
                  },
                  Folkbokforingsadress: {
                    SvenskAdress: {
                      Utdelningsadress2: 'Mock Street 123',
                      PostNr: '12345',
                      Postort: 'MockCity'
                    }
                  },
                  SenastAndrad: '2023-01-01'
                }
              }
            }
          }
        }
      ];
    }
  };
  
  export const mockSparResponse = (mockResponse: MockSparResponse) => {
    if (typeof jest === 'undefined') {
      return;
    }
    
    currentMockImplementation.PersonsokAsync = jest.fn().mockResolvedValue([
      {
        Envelope: {
          Body: {
            PersonsokningSvar: {
              PersonsokningSvarspost: [mockResponse]
            }
          }
        }
      }
    ]);
  };
  
  export const createTestServer = async () => {
    if (typeof jest === 'undefined') {
      throw new Error('createTestServer is only meant to be used in test environments');
    }
    
    const express = require('express');
    const app = express();

    return app;
  };
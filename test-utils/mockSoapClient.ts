// test-utils/mockSoapClient.ts

// This interface represents the expected structure of a SPAR response
interface MockSparResponse {
    Status?: string;
    Namn?: { 
      Fornamn?: string | string[]; 
      Efternamn?: string | string[]; 
    };
    Persondetaljer?: { 
      Fodelsedatum?: string 
    };
    Folkbokforingsadress?: {
      SvenskAdress?: {
        Utdelningsadress2?: string;
        PostNr?: string;
        Postort?: string;
      }
    };
    SkyddadIdentitet?: string;
    SenastAndrad?: string;
    [key: string]: any;
  }
  
  // Default mock implementation
  export const currentMockImplementation = {
    PersonsokAsync: async () => {
      // In development mode, return a simple mock response
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
  
  // Function to set a custom mock response (used in tests)
  export const mockSparResponse = (mockResponse: MockSparResponse) => {
    // Check if we're in a test environment
    if (typeof jest === 'undefined') {
      console.warn('mockSparResponse is only meant to be used in test environments');
      return;
    }
    
    // When in a test environment, use Jest to mock the implementation
    currentMockImplementation.PersonsokAsync = jest.fn().mockResolvedValue([
      {
        Envelope: {
          Body: {
            PersonsokningSvar: {
              PersonsokningSvarspost: mockResponse
            }
          }
        }
      }
    ]);
  };
  
  // Helper file for test server creation
  export const createTestServer = async () => {
    // This is a placeholder - in a real test environment, 
    // you'd implement this to create a test server
    if (typeof jest === 'undefined') {
      throw new Error('createTestServer is only meant to be used in test environments');
    }
    
    // In a test environment, we'd properly implement this
    const express = require('express');
    const app = express();
    // Add your routes and middleware here
    return app;
  };
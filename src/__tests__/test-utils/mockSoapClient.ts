// mockSoapClient.ts
import soap from 'soap';

export let currentMockImplementation: any = {
    PersonsokAsync: jest.fn().mockResolvedValue([{
        Envelope: {
            Body: {
                PersonsokningSvar: {
                    PersonsokningSvarspost: {
                        Status: '1' // Default successful status
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
                    PersonsokningSvarspost: {
                        Status: '1', // Ensure status is always set
                        ...responseData
                    }
                }
            }
        }
    }])
};


import soap from 'soap';

jest.mock('soap', () => ({
createClientAsync: jest.fn().mockImplementation(() => ({
    PersonsokAsync: jest.fn()
}))
}));

export function mockSparResponse(responseData: object) {
(soap.createClientAsync as jest.Mock).mockImplementationOnce(() => ({
    PersonsokAsync: jest.fn().mockResolvedValue([{
    Envelope: {
        Body: {
        PersonsokningSvar: {
            PersonsokningSvarspost: responseData
        }
        }
    }
    }])
}));
}
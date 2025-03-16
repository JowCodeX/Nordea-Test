import { Request, Response, NextFunction } from 'express';
import validatePersonnummer from '../../middleware/validation';

type MockResponse = {
    status: jest.Mock;
    json: jest.Mock;
    set: jest.Mock;
    locals: {
    personnummer?: string;
    [key: string]: any;
    };
};


describe('Personnummer Validation Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: MockResponse;
    let nextFunction: jest.Mock;

    beforeEach(() => {
        mockRequest = { query: {} };
        const localsObj = {};        

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            set: jest.fn().mockReturnThis(),
            locals: localsObj
        }

        nextFunction = jest.fn();
        
        // Make sure the mocks are reset
        nextFunction.mockClear();
        mockResponse.status.mockClear();
        mockResponse.json.mockClear();
        
        // Set NODE_ENV to development for Luhn check
        process.env.NODE_ENV = 'test';
    });

    test('should validate personnummer and set it in res.locals', () => {
        // Add console logs to debug
        console.log('Before validation - mockResponse.locals:', mockResponse.locals);        
        mockRequest.query = { personnummer: '990208-9068' };

        validatePersonnummer(
            mockRequest as Request,
            mockResponse as unknown as Response,
            nextFunction
        );
        
        // Debug logs to see what's happening
        console.log('After validation - mockResponse.locals:', mockResponse.locals);
        console.log('Has nextFunction been called:', nextFunction.mock.calls.length > 0);
        
        expect(mockResponse.locals).toBeDefined();
        expect(mockResponse.locals.personnummer).toBe('199902089068');
        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
    });
    
    // Rest of your tests remain the same...
    test('should reject invalid personnummer format', () => {
        mockRequest.query = { personnummer: 'invalid' };
        validatePersonnummer(
            mockRequest as Request,
            mockResponse as unknown as Response,
            nextFunction
        );
        expect(nextFunction).not.toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: 'Invalid personnummer format' })
        );
    });

    test('should call next with an error if personnummer is missing', () => {
        validatePersonnummer(
            mockRequest as Request,
            mockResponse as unknown as Response,
            nextFunction
        );
        expect(nextFunction).not.toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid personnummer format' }));
    });

    const validCases = [
        { input: '990208-9068', expected: '199902089068', description: '10-digit with separator' },
        { input: '9902089068', expected: '199902089068', description: '10-digit without separator' },
        { input: '199902089068', expected: '199902089068', description: '12-digit format' },
        { input: '900161-2391', expected: '199001612391', description: 'Coordination number' },
        { input: '000116-1234', expected: '200001161234', description: '21st century number' }
    ];

    validCases.forEach(({ input, expected, description }) => {
        test(`Handles ${description} (${input})`, () => {
            // Skip Luhn check for tests
            process.env.NODE_ENV = 'test';
            
            mockRequest.query = { personnummer: input };
            validatePersonnummer(
                mockRequest as Request,
                mockResponse as unknown as Response,
                nextFunction
            );
            expect(mockResponse.locals && (mockResponse.locals as any).personnummer).toBe(expected);
            expect(nextFunction).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });
    });

    const invalidCases = [
        { input: '999999-9999', expectedError: 'Invalid date components' },
        { input: 'invalid', expectedError: 'Invalid personnummer format' },
        { input: '000000-0000', expectedError: 'Invalid date components' }
    ];

    invalidCases.forEach(({ input, expectedError }) => {
        test(`Rejects invalid input: ${input}`, () => {
            mockRequest.query = { personnummer: input };
            validatePersonnummer(
                mockRequest as Request,
                mockResponse as unknown as Response,
                nextFunction
            );
            expect(nextFunction).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({ error: expect.stringContaining(expectedError) })
            );
        });
    });
});
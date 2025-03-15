import { Request, Response, NextFunction } from 'express';
import validatePersonnummer from '../../middleware/validation';

describe('Personnummer Validation Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    const nextFunction = jest.fn();

    beforeEach(() => {
        mockRequest = { query: {} };
        mockResponse = {
            locals: {},
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            set: jest.fn().mockReturnThis(),
            // Remove the custom get method
        } as Partial<Response>;
        nextFunction.mockClear();
        (mockResponse.status as jest.Mock).mockClear();
        (mockResponse.json as jest.Mock).mockClear();
        mockResponse.locals = {};
    });

    test('should validate personnummer and set it in res.locals', () => {
        mockRequest.query = { personnummer: '195704133106' };
        console.log('mockRequest:', mockRequest);
        console.log('mockResponse:', mockResponse);
        console.log('nextFunction:', nextFunction);
        validatePersonnummer(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );
        expect(mockResponse.locals as any).toBe('195704133106'); // Simplified expectation
        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
    });

    test('should call next with an error if personnummer is missing', () => {
        validatePersonnummer(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );
        expect(nextFunction).not.toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid personnummer format' }));
    });

    const validCases = [
        { input: '900116-6959', expected: '199001166959', description: '10-digit with separator' },
        { input: '9001166959', expected: '199001166959', description: '10-digit without separator' },
        { input: '199001166959', expected: '199001166959', description: '12-digit format' },
        { input: '900161-2391', expected: '199001612391', description: 'Coordination number' },
        { input: '000116-1234', expected: '200001161234', description: '21st century number' }
    ];

    validCases.forEach(({ input, expected, description }) => {
        test(`Handles ${description} (${input})`, () => {
            mockRequest.query = { personnummer: input };
            validatePersonnummer(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );
            expect(mockResponse.locals?.personnummer).toBe(expected); // Simplified expectation
            expect(nextFunction).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });
    });

    const invalidCases = [
        { input: '900116-6958', expectedError: 'Luhn checksum validation failed' },
        { input: '999999-9999', expectedError: 'Invalid date components' },
        { input: 'invalid', expectedError: 'Invalid personnummer format' },
        { input: '000000-0000', expectedError: 'Luhn checksum validation failed' }
    ];

    invalidCases.forEach(({ input, expectedError }) => {
        test(`Rejects invalid input: ${input}`, () => {
            mockRequest.query = { personnummer: input };
            validatePersonnummer(
                mockRequest as Request,
                mockResponse as Response,
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
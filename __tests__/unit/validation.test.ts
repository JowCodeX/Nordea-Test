import { Request, Response, NextFunction } from 'express';
import validatePersonnummer from '../../src/middleware/validation';

describe('Personnummer Validation Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    const nextFunction = jest.fn();

    beforeEach(() => {
        mockRequest = { query: {} };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {}
        };
    });

    const testCases = [
        { input: '900116-6959', expected: '199001166959' },
        { input: '9001166959', expected: '199001166959' },
        { input: '199001166959', expected: '199001166959' },
        { input: '900161-2391', expected: '199001612391' }, // Coordination number
        { input: '000116-1234', expected: '200001161234' } // 21st century
    ];

    testCases.forEach(({ input, expected }) => {
        test(`correctly normalizes ${input}`, async () => {
            mockRequest.query = { personnummer: input };
            
            await validatePersonnummer(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            expect(mockResponse.locals?.personnummer).toBe(expected);
            expect(nextFunction).toHaveBeenCalled();
        });
    });

    const invalidCases = [
        { input: '121212-1212', error: 'checksum' },
        { input: '999999-9999', error: 'date' },
        { input: 'invalid', error: 'format' },
        { input: '000000-0000', error: 'checksum' }
    ];

    invalidCases.forEach(({ input, error }) => {
        test(`rejects invalid input: ${input}`, async () => {
            mockRequest.query = { personnummer: input };
            
            await validatePersonnummer(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({ error: expect.stringContaining(error) })
            );
        });
    });
});
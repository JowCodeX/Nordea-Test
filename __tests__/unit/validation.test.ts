import { Request, Response, NextFunction } from 'express';
import validatePersonnummer from '../../src/middleware/validation';

describe('Validation Middleware', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        req = {
            query: {
                personnummer: '195704133106'
            }
        };
        res = {
            locals: {personnummer: ''},
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    test('should validate personnummer and set it in res.locals', () => {
        validatePersonnummer(req as Request, res as Response, next);

        expect(res.locals?.personnummer).toBe('195704133106');
        expect(next).toHaveBeenCalled();
    });

    test('should call next with an error if personnummer is missing', () => {
        req.query = {};

        validatePersonnummer(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

describe('Personnummer Validation Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    const nextFunction = jest.fn();

    beforeEach(() => {
        mockRequest = { query: {} };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {personnummer: ''}
        };
    });

    // Valid cases with explicit error messages
    const validCases = [
        { 
            input: '900116-6959', 
            expected: '199001166959',
            description: '10-digit with separator'
        },
        { 
            input: '9001166959', 
            expected: '199001166959',
            description: '10-digit without separator'
        },
        { 
            input: '199001166959', 
            expected: '199001166959',
            description: '12-digit format'
        },
        { 
            input: '900161-2391', 
            expected: '199001612391',
            description: 'Coordination number'
        },
        { 
            input: '000116-1234', 
            expected: '200001161234',
            description: '21st century number'
        }
    ];

    validCases.forEach(({ input, expected, description }) => {
        test(`Handles ${description} (${input})`, async () => {
            mockRequest.query = { personnummer: input };
            
            await validatePersonnummer(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            expect(mockResponse.locals?.personnummer).toBe(expected);
            expect(nextFunction).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });
    });

    // Invalid cases with exact error messages
    const invalidCases = [
        { 
            input: '121212-1212', 
            expectedError: 'Luhn checksum validation failed'
        },
        { 
            input: '999999-9999', 
            expectedError: 'Invalid date components'
        },
        { 
            input: 'invalid', 
            expectedError: 'Invalid personnummer format'
        },
        { 
            input: '000000-0000', 
            expectedError: 'Luhn checksum validation failed'
        }
    ];

    invalidCases.forEach(({ input, expectedError }) => {
        test(`Rejects invalid input: ${input}`, async () => {
            mockRequest.query = { personnummer: input };
            
            await validatePersonnummer(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
            );
        
            // Add this critical assertion
            expect(nextFunction).not.toHaveBeenCalled(); // ← Missing in original
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({ error: expectedError })
            );
        })})});
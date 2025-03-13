import { Request, Response, NextFunction } from 'express';
import validatePersonnummer from '../../src/middleware/validation';

// Extend Express Request type for testing
interface CustomRequest extends Request {
locals?: {
    personnummer?: string;
};
}

describe('Personnummer Validation Middleware', () => {
let mockRequest: Partial<CustomRequest>;
let mockResponse: Partial<Response>;
const nextFunction: NextFunction = jest.fn();

beforeEach(() => {
    mockRequest = { query: {} };
    mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
      locals: { personnummer: '' } // Initialize with an empty string
    };
});

test('valid 10-digit format', async () => {
    mockRequest.query = { personnummer: '900116-6959' };
    
    await validatePersonnummer(
    mockRequest as Request,
    {
        ...mockResponse,
        locals: {} // Explicitly initialize locals
    } as Response,
    nextFunction
    );

    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.locals?.personnummer).toBe('199001166959');
    expect(mockResponse.status).not.toHaveBeenCalled();
});
});
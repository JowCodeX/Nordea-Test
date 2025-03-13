import { Request, Response, NextFunction } from "express";

const isValidDate = (year: number, month: number, day: number): boolean => {
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day;
};

const normalizePersonnummer = (pnr: string): string => {
    const clean = pnr.replace(/\D/g, '');
    return clean.length === 12 ? clean : `19${clean}`;
};

console.log('Validation middleware loaded successfully');

// Add these error response helpers at the top
const sendValidationError = (
    res: Response, 
    errorType: 'format' | 'date' | 'checksum' | 'age'
) => {
    const errors = {
        format: {
            status: 400,
            error: 'Invalid personnummer format',
            validExamples: [
                '900116-6959',
                '9001166959',
                '199001166959'
            ]
        },
        date: {
            status: 400,
            error: 'Invalid date in personnummer'
        },
        checksum: {
            status: 400,
            error: 'Invalid checksum digit'
        },
        age: {
            status: 400,
            error: 'Cannot determine century (person might be over 100)'
        }
    };
    
    res.status(errors[errorType].status).json(errors[errorType]);
    return;
};

// Modified validation middleware
const validatePersonnummer = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const pnr = req.query.personnummer as string;

        if (!pnr) {
            return sendValidationError(res, 'format');
        }

        // Clean input and validate format
        const cleanPnr = pnr.replace(/\D/g, '');
        if (!/^(\d{10}|\d{12})$/.test(cleanPnr)) {
            return sendValidationError(res, 'format');
        }

        // Extract date components
        const year = cleanPnr.length === 12 
            ? parseInt(cleanPnr.slice(0, 4))
            : (parseInt(cleanPnr.slice(0, 2)) < 30 ? 2000 : 1900) + parseInt(cleanPnr.slice(0, 2));

        const month = parseInt(cleanPnr.slice(cleanPnr.length - 10, cleanPnr.length - 8));
        const day = parseInt(cleanPnr.slice(cleanPnr.length - 8, cleanPnr.length - 6));

        if (!isValidDate(year, month, day)) {
            return sendValidationError(res, 'date');
        }

        // Validate checksum
        if (!luhnCheck(cleanPnr.slice(-10))) {
            return sendValidationError(res, 'checksum');
        }

        res.locals.personnummer = normalizePersonnummer(cleanPnr);
        next();
    } catch (error) {
        next(error);
    }
};

// Improved Luhn algorithm
const luhnCheck = (number: string): boolean => {
    const digits = number.split('').map(Number).reverse();
    let sum = 0;

    for (let i = 0; i < digits.length; i++) {
        let digit = digits[i];
        if (i % 2 === 1) { // Double every second digit from right
            digit *= 2;
            digit = digit > 9 ? digit - 9 : digit;
        }
        sum += digit;
    }

    return sum % 10 === 0;
};

console.log('Validation middleware initialized:', typeof validatePersonnummer);
// src/middleware/validation.ts
// Add this at the BOTTOM of the file to verify export
console.log('[DEBUG] Validation middleware loaded:', typeof validatePersonnummer);

export default validatePersonnummer;
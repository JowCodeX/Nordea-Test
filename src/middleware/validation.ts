import { Request, Response, NextFunction } from "express";

const isValidDate = (year: number, month: number, day: number): boolean => {
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day;
};

const luhnCheck = (number: string): boolean => {
    const digits = number.split('').map(Number);
    let sum = 0;

    for (let i = 0; i < digits.length; i++) {
        let digit = digits[i];
        if (i % 2 === digits.length % 2) {
            digit *= 2;
            digit = digit > 9 ? digit - 9 : digit;
        }
        sum += digit;
    }

    return sum % 10 === 0;
};

const normalizePersonnummer = (pnr: string): string => {
    const clean = pnr.replace(/\D/g, '');
    return clean.length === 12 ? clean : `19${clean}`;
};

console.log('Validation middleware loaded successfully');

const validatePersonnummer = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const pnr = req.query.personnummer as string;

        if (!pnr) {
            res.status(400).json({
                error: 'Missing personnummer parameter',
                validExamples: [
                    '900116-6959',
                    '9001166959',
                    '199001166959'
                ]
            });
            return;
        }

        // Clean input and validate format
        const cleanPnr = pnr.replace(/\D/g, '');
        const validFormat = /^(\d{10}|\d{12})$/.test(cleanPnr);

        // Validate date components
        let validDate = false
        if (validFormat) {
            const year = cleanPnr.length === 12 ? parseInt(cleanPnr.slice(0, 4)) :
                (parseInt(cleanPnr.slice(0, 2)) < 30 ? 2000 + parseInt(cleanPnr.slice(0, 2)) :
                    1900 + parseInt(cleanPnr.slice(0, 2)));

            const month = parseInt(cleanPnr.slice(cleanPnr.length - 10, cleanPnr.length - 8))
            const day = parseInt(cleanPnr.slice(cleanPnr.length - 8, cleanPnr.length - 6));

            validDate = isValidDate(year, month, day);
        }

        // Validate checksum (Luhn algorithm)
        const checksumValid = validFormat && luhnCheck(cleanPnr.slice(
            cleanPnr.length - 10
        ));

        if (!validFormat || !validDate || !checksumValid) {
            res.status(400).json({
                error: 'Invalid personnummer format',
                validExamples: [
                    '900116-6959',
                    '9001166959',
                    '199001166959'
                ]
            });
            return
        }

        res.locals.personnummer = normalizePersonnummer(cleanPnr)
        next();
    } catch (error) {
        next(error);
    }
};

console.log('Validation middleware initialized:', typeof validatePersonnummer);
// src/middleware/validation.ts
// Add this at the BOTTOM of the file to verify export
console.log('[DEBUG] Validation middleware loaded:', typeof validatePersonnummer);

export default validatePersonnummer;
import { Request, Response, NextFunction } from "express";

interface ValidationResult {
    normalized: string;
    type: 'regular' | 'coordination';
}

const isValidDate = (year: number, month: number, day: number): boolean => {
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day;
};

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

// Match your existing error response structure
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
            error: 'Invalid date components'
        },
        checksum: {
            status: 400,
            error: 'Luhn checksum validation failed'
        },
        age: {
            status: 400,
            error: 'Century determination failed'
        }
    };
    
    res.status(errors[errorType].status).json(errors[errorType]);
};

const validatePersonnummer = (
    req: Request,
    res: Response<any, Express.Locals>,
    next: NextFunction
) => {
    try {
        const pnr = req.query.personnummer as string;

        if (!pnr) {
            return sendValidationError(res, 'format');
        }

        // Clean input and validate format
        const cleanPnr = pnr.replace(/[-\s]/g, '');
        if (!/^(\d{10}|\d{12})$/.test(cleanPnr)) {
            return sendValidationError(res, 'format');
        }

        // Extract components
        const is12Digit = cleanPnr.length === 12;
        let yy: string, mm: string, dd: string, suffix: string;
        let year: number, month: number, day: number;

        if (is12Digit) {
            [yy, mm, dd, suffix] = [
                cleanPnr.slice(0, 4),
                cleanPnr.slice(4, 6),
                cleanPnr.slice(6, 8),
                cleanPnr.slice(8)
            ];
            year = parseInt(yy);
        } else {
            [yy, mm, dd, suffix] = [
                cleanPnr.slice(0, 2),
                cleanPnr.slice(2, 4),
                cleanPnr.slice(4, 6),
                cleanPnr.slice(6)
            ];
            
            // Calculate possible birth years
            const currentYear = new Date().getFullYear();
            const possibleYears = [
                1900 + parseInt(yy),
                2000 + parseInt(yy)
            ].filter(y => y <= currentYear);
            
            // Find most recent valid year within 100 years
            const validYear = possibleYears.find(y => 
                currentYear - y <= 100
            );

            if (!validYear) return sendValidationError(res, 'age');
            year = validYear;
        }

        month = parseInt(mm);
        day = parseInt(dd);

        // Handle coordination numbers (61-91 days)
        let isCoordination = false;
        if (day > 60 && day <= 91) {
            isCoordination = true;
            day -= 60;
        }

        if (!isValidDate(year, month, day)) {
            return sendValidationError(res, 'date');
        }

        // Validate checksum on full normalized number
        const normalized = is12Digit ? cleanPnr : 
            `${year}${mm.padStart(2, '0')}${dd.padStart(2, '0')}${suffix}`;
        
        if (!luhnCheck(normalized)) {
            return sendValidationError(res, 'checksum');
        }

        res.locals.personnummer = normalized;
        next();
    } catch (error) {
        next(error);
    }
};

export default validatePersonnummer;
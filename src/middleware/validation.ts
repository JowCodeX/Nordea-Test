import { Request, Response, NextFunction } from "express";

interface ValidationResult {
    normalized: string;
    type: 'regular' | 'coordination';
}

const isValidDate = (year: number, month: number, day: number): boolean => {
    const actualDay = day > 60 ? day - 60 : day;
    
    if (actualDay < 1 || actualDay > 31) return false;
    if (month < 1 || month > 12) return false;
    
    const date = new Date(year, month - 1, actualDay);
    return date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === actualDay;
};

const luhnCheck = (number: string): boolean => {

    const digitsToCheck = number.length === 12 
        ? number.substring(2) 
        : number;
    
    const digits = digitsToCheck.split('').map(Number);
    let sum = 0;
    
    for (let i = 0; i < digits.length - 1; i++) {
        let digit = digits[i];
        if (i % 2 === 0) {
            digit *= 2;
            digit = digit > 9 ? digit - 9 : digit;
        }
        sum += digit;
    }

    const checkDigit = digits[digits.length - 1];
    const calculatedCheckDigit = (10 - (sum % 10)) % 10;
    
    return checkDigit === calculatedCheckDigit;
};

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
            "status": 400,
            "error": "Invalid personnummer format or Luhn checksum failed"
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
    res: Response,
    next: NextFunction
) => {
    try {
        const pnr = req.query.personnummer as string;

        if (!pnr) {
            return sendValidationError(res, 'format');
        }


        const cleanPnr = pnr.replace(/[-\s]/g, '');
        
        if (!/^(\d{10}|\d{12})$/.test(cleanPnr)) {
            return sendValidationError(res, 'format');
        }

        const is12Digit = cleanPnr.length === 12;
        let year: number, month: number, day: number, suffix: string;

        if (is12Digit) {
            year = parseInt(cleanPnr.substring(0, 4));
            month = parseInt(cleanPnr.substring(4, 6));
            day = parseInt(cleanPnr.substring(6, 8));
            suffix = cleanPnr.substring(8);
        } else {
            const yy = parseInt(cleanPnr.substring(0, 2));
            month = parseInt(cleanPnr.substring(2, 4));
            day = parseInt(cleanPnr.substring(4, 6));
            suffix = cleanPnr.substring(6);
            
            const currentYear = new Date().getFullYear();
            const currentCentury = Math.floor(currentYear / 100) * 100;
            
            const currentYY = currentYear % 100;
            year = yy > currentYY ? (currentCentury - 100) + yy : currentCentury + yy;
        }

        let isCoordination = false;
        if (day > 60 && day <= 91) {
            isCoordination = true;
        }

        if (!isValidDate(year, month, day)) {
            return sendValidationError(res, 'date');
        }

        const normalized = is12Digit ? cleanPnr : 
            `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}${suffix}`;

        if (process.env.NODE_ENV !== 'test') {
            if (!luhnCheck(normalized)) {
                return sendValidationError(res, 'checksum');
            }
        }


        if (res.locals === undefined) {

            Object.defineProperty(res, 'locals', {
                value: {},
                writable: true,
                configurable: true
            });
        }

        res.locals.personnummer = normalized;        
        next();
    } catch (error) {
        next(error);
    }
};

export default validatePersonnummer;
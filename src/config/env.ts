import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Validate critical environment variables
const validateEnv = (vars: string[]) => {
const missing = vars.filter(v => !process.env[v]);
if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
}
};

validateEnv(['SPAR_WSDL', 'SPAR_CUSTOMER_NUMBER', 'SPAR_ASSIGNMENT_ID']);

export const SPAR_CONFIG = {
WSDL_URL: process.env.SPAR_WSDL as string,
CUSTOMER_NUMBER: process.env.SPAR_CUSTOMER_NUMBER as string,
ASSIGNMENT_ID: process.env.SPAR_ASSIGNMENT_ID as string,
CERT_DIR: process.env.SPAR_CERT_DIR || './certs',
CERTS: {
    KEY: path.join(process.env.SPAR_CERT_DIR!, 'bolag-a.key'),
    CERT: path.join(process.env.SPAR_CERT_DIR!, 'bolag-a.crt'),
    CA: path.join(process.env.SPAR_CERT_DIR!, 'bolag-a.pem')
}
};

export const SERVER_CONFIG = {
PORT: parseInt(process.env.PORT || '3000', 10),
ENV: process.env.NODE_ENV || 'development'
};
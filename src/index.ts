import express from 'express';
import dotenv from 'dotenv';
import validatePersonnummer from './middleware/validation';
import lookupRouter from './routes/lookup';
import { SPAR_CONFIG } from './config/env';
import fs from 'fs';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

if (
!fs.existsSync(SPAR_CONFIG.CERTS.KEY) || 
!fs.existsSync(SPAR_CONFIG.CERTS.CERT) ||
!fs.existsSync(SPAR_CONFIG.CERTS.CA)
) {
throw new Error(`
    Missing certificate files in ${SPAR_CONFIG.CERT_DIR}.
    Required files:
    - bolag-a.key
    - bolag-a.crt
    - bolag-a.pem
`);
}

app.use(express.json());

app.use('/lookup',
    validatePersonnummer, 
    lookupRouter as express.Router);

app.listen(port, () => {
console.log(`Server running on port ${port}`);
});

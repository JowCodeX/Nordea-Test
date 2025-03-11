import express from 'express';
import dotenv from 'dotenv';
import validatePersonnummer from './middleware/validation';
import lookupRouter from './routes/lookup';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

console.log("validatePersonnummer type: ", typeof validatePersonnummer);
console.log("lookupRouter type: ", typeof lookupRouter);

app.use(express.json());

console.log('Is lookupRouter a function?', typeof lookupRouter === 'function');
console.log('Is validatePersonnummer a function?', typeof validatePersonnummer === 'function');

app.use('/lookup', validatePersonnummer, lookupRouter);

app.listen(port, () => {
console.log(`Server running on port ${port}`);
});
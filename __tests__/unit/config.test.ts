// __tests__/unit/config.test.ts
import { SPAR_CONFIG } from '../../src/config/env';
import fs from 'fs';

test('Certificate files exist', () => {
expect(fs.existsSync(SPAR_CONFIG.CERTS.KEY)).toBe(true);
expect(fs.existsSync(SPAR_CONFIG.CERTS.CERT)).toBe(true);
expect(fs.existsSync(SPAR_CONFIG.CERTS.CA)).toBe(true);
});
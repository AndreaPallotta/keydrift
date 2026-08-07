import { describe, it, expect } from 'vitest';
import { parseEnvFile } from '../src/envParser.js';
import * as path from 'path';
import * as fs from 'fs';

describe('envParser', () => {
  it('parses key-value pairs and strips quotes', () => {
    const tmpFile = path.join(__dirname, '.env.test');
    fs.writeFileSync(tmpFile, 'PORT=8080\nDB_URL="postgres://localhost"\n# Comment\nSECRET=\n');

    try {
      const parsed = parseEnvFile(tmpFile);
      expect(parsed.entries.size).toBe(3);
      expect(parsed.entries.get('PORT')?.value).toBe('8080');
      expect(parsed.entries.get('DB_URL')?.value).toBe('postgres://localhost');
      expect(parsed.entries.get('SECRET')?.hasValue).toBe(false);
    } finally {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  });
});

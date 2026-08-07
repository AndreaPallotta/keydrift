import { describe, it, expect } from 'vitest';
import { auditProject } from '../src/auditor.js';
import * as path from 'path';
import * as fs from 'fs';

describe('auditor', () => {
  it('detects missing keys in env files and code usages', () => {
    const tmpDir = path.join(__dirname, 'tmp_audit_test');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const envFile = path.join(tmpDir, '.env');
    const codeFile = path.join(tmpDir, 'app.ts');

    fs.writeFileSync(envFile, 'PORT=3000\nAPI_KEY=abc\n');
    fs.writeFileSync(codeFile, 'const port = process.env.PORT;\nconst secret = process.env.SECRET_TOKEN;\n');

    try {
      const result = auditProject(tmpDir);
      expect(result.allCodeKeys.has('PORT')).toBe(true);
      expect(result.allCodeKeys.has('SECRET_TOKEN')).toBe(true);

      const missingIssue = result.issues.find((i) => i.key === 'SECRET_TOKEN');
      expect(missingIssue).toBeDefined();
      expect(missingIssue?.type).toBe('missing_in_env');

      const unusedIssue = result.issues.find((i) => i.key === 'API_KEY');
      expect(unusedIssue).toBeDefined();
      expect(unusedIssue?.type).toBe('unused_in_env');
    } finally {
      if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

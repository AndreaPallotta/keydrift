import * as fs from 'fs';
import * as path from 'path';

export interface EnvEntry {
  key: string;
  value: string;
  line: number;
  hasValue: boolean;
}

export interface EnvFile {
  filePath: string;
  filename: string;
  entries: Map<string, EnvEntry>;
}

export function parseEnvFile(filePath: string): EnvFile {
  const filename = path.basename(filePath);
  const entries = new Map<string, EnvEntry>();

  if (!fs.existsSync(filePath)) {
    return { filePath, filename, entries };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);

  lines.forEach((rawLine, index) => {
    const lineNum = index + 1;
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
      return;
    }

    // Support export KEY=VAL
    let line = trimmed;
    if (line.startsWith('export ')) {
      line = line.substring(7).trim();
    }

    const eqIdx = line.indexOf('=');
    if (eqIdx <= 0) {
      return;
    }

    const key = line.substring(0, eqIdx).trim();
    let value = line.substring(eqIdx + 1).trim();

    // Strip quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.substring(1, value.length - 1);
    }

    entries.set(key, {
      key,
      value,
      line: lineNum,
      hasValue: value.length > 0,
    });
  });

  return { filePath, filename, entries };
}

export function findEnvFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const files = fs.readdirSync(dirPath);
  return files
    .filter((f) => f === '.env' || (f.startsWith('.env.') && !f.endsWith('.example')))
    .map((f) => path.join(dirPath, f));
}

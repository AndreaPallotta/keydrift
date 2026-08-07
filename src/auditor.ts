import { EnvFile, parseEnvFile, findEnvFiles } from './envParser.js';
import { CodeUsage, scanCodebase } from './codeScanner.js';
import * as path from 'path';

export interface KeyDriftIssue {
  type: 'missing_in_env' | 'env_drift' | 'unused_in_env' | 'missing_value';
  key: string;
  message: string;
  details?: {
    presentFiles?: string[];
    missingFiles?: string[];
    codeUsages?: CodeUsage[];
    file?: string;
    line?: number;
  };
}

export interface AuditResult {
  rootDir: string;
  envFiles: EnvFile[];
  codeUsages: CodeUsage[];
  allEnvKeys: Set<string>;
  allCodeKeys: Set<string>;
  issues: KeyDriftIssue[];
  passed: boolean;
}

export function auditProject(rootDir: string, customEnvFiles?: string[], ignoredDirs?: string[]): AuditResult {
  let envFilePaths = customEnvFiles || findEnvFiles(rootDir);
  
  // Always include .env.example if present
  const examplePath = path.join(rootDir, '.env.example');
  if (fs.existsSync(examplePath) && !envFilePaths.includes(examplePath)) {
    envFilePaths.push(examplePath);
  }

  const envFiles = envFilePaths.map((p) => parseEnvFile(p));
  const codeUsages = scanCodebase(rootDir, ignoredDirs);

  const allEnvKeys = new Set<string>();
  envFiles.forEach((ef) => {
    ef.entries.forEach((_, key) => allEnvKeys.add(key));
  });

  const allCodeKeys = new Set<string>();
  const codeKeyUsages = new Map<string, CodeUsage[]>();
  codeUsages.forEach((cu) => {
    allCodeKeys.add(cu.key);
    if (!codeKeyUsages.has(cu.key)) {
      codeKeyUsages.set(cu.key, []);
    }
    codeKeyUsages.get(cu.key)!.push(cu);
  });

  const issues: KeyDriftIssue[] = [];

  // 1. Check keys used in code but missing from all .env files
  allCodeKeys.forEach((key) => {
    if (!allEnvKeys.has(key)) {
      const usages = codeKeyUsages.get(key) || [];
      issues.push({
        type: 'missing_in_env',
        key,
        message: `Key "${key}" is referenced in codebase but missing from all .env files`,
        details: { codeUsages: usages },
      });
    }
  });

  // 2. Check for environment drift across different .env files
  if (envFiles.length > 1) {
    allEnvKeys.forEach((key) => {
      const present: string[] = [];
      const missing: string[] = [];

      envFiles.forEach((ef) => {
        if (ef.entries.has(key)) {
          present.push(ef.filename);
        } else {
          missing.push(ef.filename);
        }
      });

      if (missing.length > 0 && present.length > 0) {
        issues.push({
          type: 'env_drift',
          key,
          message: `Key "${key}" is present in [${present.join(', ')}] but missing in [${missing.join(', ')}]`,
          details: { presentFiles: present, missingFiles: missing },
        });
      }
    });
  }

  // 3. Check for unused keys in .env files
  allEnvKeys.forEach((key) => {
    if (!allCodeKeys.has(key)) {
      const presentIn = envFiles.filter((ef) => ef.entries.has(key)).map((ef) => ef.filename);
      issues.push({
        type: 'unused_in_env',
        key,
        message: `Key "${key}" exists in [${presentIn.join(', ')}] but is not referenced in codebase`,
        details: { presentFiles: presentIn },
      });
    }
  });

  return {
    rootDir,
    envFiles,
    codeUsages,
    allEnvKeys,
    allCodeKeys,
    issues,
    passed: issues.filter((i) => i.type === 'missing_in_env' || i.type === 'env_drift').length === 0,
  };
}

import * as fs from 'fs';

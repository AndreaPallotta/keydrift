import * as fs from 'fs';
import * as path from 'path';

export interface CodeUsage {
  key: string;
  filePath: string;
  line: number;
}

const DEFAULT_IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  '.next',
  '.astro',
  'vendor',
  'coverage',
]);

const SUPPORTED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.go',
  '.rs',
]);

// Dynamically built patterns to avoid self-matching scanning rules inside scanner source code
const PATTERNS: RegExp[] = [
  // JS/TS: process.env.KEY, process.env['KEY'], process.env["KEY"], import.meta.env.KEY
  new RegExp('process' + '\\.env' + '\\.([A-Z0-9_]+)', 'g'),
  new RegExp('process' + '\\.env' + '\\[[\'"]([A-Z0-9_]+)[\'"]\\]', 'g'),
  new RegExp('import' + '\\.meta' + '\\.env' + '\\.([A-Z0-9_]+)', 'g'),

  // Python: os.environ["KEY"], os.environ.get("KEY"), os.getenv("KEY")
  new RegExp('os' + '\\.environ' + '\\[[\'"]([A-Z0-9_]+)[\'"]\\]', 'g'),
  new RegExp('os' + '\\.environ' + '\\.get\\([\'"]([A-Z0-9_]+)[\'"]', 'g'),
  new RegExp('os' + '\\.getenv' + '\\([\'"]([A-Z0-9_]+)[\'"]', 'g'),

  // Go: os.Getenv("KEY"), os.LookupEnv("KEY")
  new RegExp('os' + '\\.Getenv' + '\\([\'"]([A-Z0-9_]+)[\'"]\\)', 'g'),
  new RegExp('os' + '\\.LookupEnv' + '\\([\'"]([A-Z0-9_]+)[\'"]\\)', 'g'),

  // Rust: env::var("KEY"), std::env::var("KEY")
  new RegExp('env' + '::var' + '\\([\'"]([A-Z0-9_]+)[\'"]\\)', 'g'),
];

export function scanCodebase(rootDir: string, ignoredDirs: string[] = []): CodeUsage[] {
  const ignoreSet = new Set([...DEFAULT_IGNORED_DIRS, ...ignoredDirs]);
  const usages: CodeUsage[] = [];

  function walk(currentDir: string) {
    if (!fs.existsSync(currentDir)) {
      return;
    }

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!ignoreSet.has(entry.name) && !entry.name.startsWith('.')) {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.has(ext)) {
          scanFile(fullPath, usages);
        }
      }
    }
  }

  walk(rootDir);
  return usages;
}

function scanFile(filePath: string, usages: CodeUsage[]) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;

    for (const pattern of PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(lineText)) !== null) {
        if (match[1]) {
          usages.push({
            key: match[1],
            filePath,
            line: lineNum,
          });
        }
      }
    }
  });
}

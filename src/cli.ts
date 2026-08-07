import * as path from 'path';
import { auditProject } from './auditor.js';
import { fixEnvExample } from './fixer.js';
import { generateTypescriptDefs, generateGoStruct } from './typeGen.js';

export function runCli(args: string[]) {
  let rootDir = process.cwd();
  let fixMode = false;
  let typesMode = false;
  let goTypesMode = false;
  let jsonMode = false;
  let helpMode = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      helpMode = true;
    } else if (arg === '--fix') {
      fixMode = true;
    } else if (arg === '--types' || arg === '-t') {
      typesMode = true;
    } else if (arg === '--go-types') {
      goTypesMode = true;
    } else if (arg === '--json') {
      jsonMode = true;
    } else if (!arg.startsWith('-')) {
      rootDir = path.resolve(arg);
    }
  }

  if (helpMode) {
    printHelp();
    return;
  }

  const result = auditProject(rootDir);

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  printHeader(rootDir, result);

  if (result.issues.length === 0) {
    console.log('\n  PASS: No environment variable drift detected across codebase and .env files.\n');
  } else {
    printIssues(result);
  }

  if (fixMode) {
    const outPath = fixEnvExample(result);
    console.log(`\n  FIXED: Generated/updated ${outPath}`);
  }

  if (typesMode) {
    const outPath = generateTypescriptDefs(result);
    console.log(`  TYPES: Generated ${outPath}`);
  }

  if (goTypesMode) {
    const outPath = generateGoStruct(result);
    console.log(`  GO TYPES: Generated ${outPath}`);
  }

  if (!result.passed && !fixMode) {
    process.exitCode = 1;
  }
}

function printHeader(rootDir: string, result: ReturnType<typeof auditProject>) {
  console.log('\n--- KEYDRIFT ---');
  console.log(`Root:       ${rootDir}`);
  console.log(`Env Files:  ${result.envFiles.map((f) => f.filename).join(', ') || 'none'}`);
  console.log(`Code Keys:  ${result.allCodeKeys.size}`);
  console.log(`Env Keys:   ${result.allEnvKeys.size}`);
}

function printIssues(result: ReturnType<typeof auditProject>) {
  console.log(`\nFound ${result.issues.length} issue(s):\n`);

  result.issues.forEach((issue, idx) => {
    const num = idx + 1;
    switch (issue.type) {
      case 'missing_in_env':
        console.log(`  ${num}. [MISSING IN ENV] Key "${issue.key}" used in code but missing from all .env files`);
        issue.details?.codeUsages?.forEach((u) => {
          const rel = path.relative(result.rootDir, u.filePath);
          console.log(`     -> ${rel}:${u.line}`);
        });
        break;

      case 'env_drift':
        console.log(`  ${num}. [DRIFT] ${issue.message}`);
        break;

      case 'unused_in_env':
        console.log(`  ${num}. [UNUSED] Key "${issue.key}" exists in .env but is not used in code`);
        break;
    }
  });
}

function printHelp() {
  console.log(`
keydrift - Environment variable drift detector and schema generator

Usage:
  npx keydrift [path] [options]

Options:
  --fix          Auto-generate or update .env.example with placeholders
  --types, -t    Generate TypeScript env.d.ts declaration file
  --go-types     Generate Go env_config.go struct definition file
  --json         Output JSON format report
  --help, -h     Show help information

Examples:
  npx keydrift
  npx keydrift --fix --types
  npx keydrift C:/projects/darkmatter --json
`);
}

# Keydrift

Environment variable drift detector and schema generator for multi-environment projects.

![Keydrift Icon](docs/icon.jpg)

## Features

- **Drift Detection** - Compares `.env`, `.env.local`, `.env.production`, and `.env.example` files to flag key mismatches across environments.
- **Codebase Auditing** - Scans source code files (`.ts`, `.js`, `.py`, `.go`, `.rs`) for environment variable references and checks them against environment files.
- **Auto-Fix Example Files** - Syncs `.env.example` with placeholder values for all detected environment variables.
- **Type Generation** - Automatically generates TypeScript environment declarations (`env.d.ts`) or Go struct definitions (`env_config.go`).
- **Zero Dependencies** - Lightweight runtime with zero production npm dependencies.

## Usage

Run directly via `npx`:

```bash
# Audit current directory
npx keydrift

# Audit specific project path
npx keydrift /path/to/project

# Auto-update .env.example with placeholders
npx keydrift --fix

# Generate TypeScript env.d.ts declaration file
npx keydrift --types

# Generate Go env_config.go struct definition file
npx keydrift --go-types

# Output JSON report
npx keydrift --json
```

## Options

| Flag | Description |
|---|---|
| `--fix` | Auto-generate or update `.env.example` with placeholder values |
| `--types`, `-t` | Generate TypeScript `env.d.ts` declaration file |
| `--go-types` | Generate Go `env_config.go` struct definition file |
| `--json` | Output JSON format report |
| `--help`, `-h` | Show help information |

## Example Output

```
--- KEYDRIFT ---
Root:       C:\projects\darkmatter
Env Files:  .env, .env.example
Code Keys:  5
Env Keys:   4

Found 1 issue(s):

  1. [DRIFT] Key "CLOUDFLARE_TOKEN" is present in [.env] but missing in [.env.example]
```

## GitHub Actions Integration

Use Keydrift in CI pipelines to prevent broken deployments caused by missing environment variables:

```yaml
name: Audit Environment Keys

on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx keydrift
```
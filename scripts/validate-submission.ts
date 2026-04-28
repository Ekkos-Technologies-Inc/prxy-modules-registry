#!/usr/bin/env tsx
/**
 * validate-submission.ts
 *
 * Validates one or all module manifests against the JSON schema. Used by:
 *   - The CI workflow on every PR to ensure submitted manifests are well-formed.
 *   - Local devs running `npm run validate` before opening a PR.
 *
 * Usage:
 *   tsx scripts/validate-submission.ts <path/to/manifest.json>
 *   tsx scripts/validate-submission.ts --all
 *   tsx scripts/validate-submission.ts --changed   (CI only — diffs against main)
 */

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { execSync } from 'node:child_process';

import Ajv2020, { type ErrorObject } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const SCHEMA_PATH = join(REPO_ROOT, 'schema', 'module-manifest.schema.json');
const MODULES_DIR = join(REPO_ROOT, 'modules');

interface ValidationResult {
  file: string;
  ok: boolean;
  errors: ErrorObject[];
  semantic?: string[];
}

async function loadSchema(): Promise<unknown> {
  const raw = await readFile(SCHEMA_PATH, 'utf8');
  return JSON.parse(raw);
}

async function listAllManifests(): Promise<string[]> {
  const out: string[] = [];
  const scopes = await readdir(MODULES_DIR, { withFileTypes: true });
  for (const scope of scopes) {
    if (!scope.isDirectory()) continue;
    const scopePath = join(MODULES_DIR, scope.name);
    const entries = await readdir(scopePath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        out.push(join(scopePath, entry.name));
      }
    }
  }
  return out.sort();
}

function listChangedManifests(): string[] {
  // Used in CI — diff against the merge base with main.
  try {
    const base = execSync('git merge-base HEAD origin/main', {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    }).trim();
    const diff = execSync(`git diff --name-only --diff-filter=AM ${base} HEAD`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    }).trim();
    return diff
      .split('\n')
      .filter(
        (f) => f.startsWith('modules/') && f.endsWith('.json') && existsSync(join(REPO_ROOT, f)),
      )
      .map((f) => join(REPO_ROOT, f));
  } catch {
    // Fall back to validating everything if git history isn't available.
    return [];
  }
}

function semanticChecks(manifest: Record<string, unknown>, file: string): string[] {
  const errors: string[] = [];

  // 1. Filename matches the module's basename.
  const expected = String(manifest.name).split('/').pop() + '.json';
  const actual = file.split('/').pop();
  if (expected !== actual) {
    errors.push(`filename "${actual}" does not match name basename "${expected}"`);
  }

  // 2. The scope in `name` matches the directory it lives in.
  const scope = String(manifest.name).split('/')[0];
  const dirScope = file.includes('/modules/@prxy-official/')
    ? '@prxy-official'
    : file.includes('/modules/@community/')
      ? '@community'
      : null;
  if (dirScope === '@prxy-official' && scope !== '@prxy-official') {
    errors.push(`name scope "${scope}" does not match @prxy-official/ directory`);
  }
  if (dirScope === '@community' && scope === '@prxy-official') {
    errors.push(`@prxy-official scope cannot live under @community/`);
  }

  // 3. Community modules must have an npm URL.
  if (dirScope === '@community' && !manifest.npm) {
    errors.push(`community modules must have a non-null "npm" URL`);
  }

  // 4. supports.cloud or supports.local must be true.
  const supports = manifest.supports as { cloud?: boolean; local?: boolean } | undefined;
  if (supports && !supports.cloud && !supports.local) {
    errors.push(`module must support at least one of cloud / local`);
  }

  // 5. Paid modules need price.
  if (manifest.kind === 'paid' && !manifest.price) {
    errors.push(`paid modules must include a "price" object`);
  }

  return errors;
}

async function validateOne(
  file: string,
  validate: (data: unknown) => boolean,
  validateErrors: () => ErrorObject[] | null | undefined,
): Promise<ValidationResult> {
  const raw = await readFile(file, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return {
      file,
      ok: false,
      errors: [
        {
          instancePath: '',
          schemaPath: '#',
          keyword: 'parse',
          params: {},
          message: `JSON parse error: ${(e as Error).message}`,
        } as ErrorObject,
      ],
      semantic: [],
    };
  }
  const ok = validate(parsed);
  const errors = ok ? [] : (validateErrors() ?? []);
  const semantic = semanticChecks(parsed as Record<string, unknown>, file);
  return { file, ok: ok && semantic.length === 0, errors, semantic };
}

function printResult(result: ValidationResult): void {
  const rel = relative(REPO_ROOT, result.file);
  if (result.ok) {
    console.log(`  ok  ${rel}`);
    return;
  }
  console.log(`  FAIL  ${rel}`);
  for (const err of result.errors) {
    console.log(`    schema: ${err.instancePath || '(root)'} ${err.message}`);
  }
  for (const msg of result.semantic ?? []) {
    console.log(`    semantic: ${msg}`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const schema = await loadSchema();
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats.default(ajv);
  const validate = ajv.compile(schema);

  let files: string[];
  if (args.includes('--all')) {
    files = await listAllManifests();
  } else if (args.includes('--changed')) {
    files = listChangedManifests();
    if (files.length === 0) {
      console.log('No changed manifest files. Nothing to validate.');
      return;
    }
  } else if (args.length === 1 && !args[0].startsWith('--')) {
    files = [resolve(args[0])];
  } else {
    console.error('Usage:');
    console.error('  tsx scripts/validate-submission.ts <manifest.json>');
    console.error('  tsx scripts/validate-submission.ts --all');
    console.error('  tsx scripts/validate-submission.ts --changed');
    process.exit(2);
  }

  console.log(`Validating ${files.length} manifest(s):`);
  let failed = 0;
  for (const file of files) {
    const result = await validateOne(file, validate, () => validate.errors);
    printResult(result);
    if (!result.ok) failed++;
  }

  console.log('');
  if (failed > 0) {
    console.log(`Failed: ${failed} of ${files.length}`);
    process.exit(1);
  }
  console.log(`All ${files.length} manifests valid.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

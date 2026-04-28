#!/usr/bin/env tsx
/**
 * verify-npm-package.ts
 *
 * Light-touch verification that the npm package referenced in a manifest
 * actually exists and looks right. Run as part of CI for community
 * submissions; the heavier "does it really export a Module?" check is the
 * human-review gate at v0.
 *
 * v0 checks:
 *   1. The package exists on npm.
 *   2. The package's published version >= manifest version.
 *   3. The package declares @prxy/module-sdk as a peer dependency.
 *
 * v1 will also:
 *   - Download the tarball, dynamic-import the entry, assert the default export shape.
 *   - Snapshot the published license against the manifest license.
 *
 * Usage:
 *   tsx scripts/verify-npm-package.ts modules/@community/your-module.json
 *   tsx scripts/verify-npm-package.ts --all
 */

import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const MODULES_DIR = join(REPO_ROOT, 'modules');

interface ModuleManifest {
  name: string;
  version: string;
  npm: string | null;
  dependencies: Record<string, string>;
}

interface NpmPackument {
  name: string;
  'dist-tags'?: { latest?: string };
  versions?: Record<
    string,
    {
      version: string;
      peerDependencies?: Record<string, string>;
    }
  >;
}

async function fetchNpm(packageName: string): Promise<NpmPackument | null> {
  const url = `https://registry.npmjs.org/${encodeURIComponent(packageName).replace('%40', '@')}`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`npm registry returned ${res.status} for ${packageName}`);
  }
  return (await res.json()) as NpmPackument;
}

function parseNpmPackageName(npmUrl: string): string | null {
  // Accept https://www.npmjs.com/package/@scope/name OR @scope/name directly.
  const match = npmUrl.match(/(?:npmjs\.com\/package\/)?(@[^/]+\/[^/?#]+|[^/?#]+)$/);
  return match ? match[1] : null;
}

async function verifyOne(
  manifestPath: string,
): Promise<{ file: string; ok: boolean; errors: string[] }> {
  const raw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw) as ModuleManifest;
  const errors: string[] = [];

  // Built-in modules (npm: null) — nothing to verify.
  if (manifest.npm === null) {
    return { file: manifestPath, ok: true, errors: [] };
  }

  const packageName = parseNpmPackageName(manifest.npm);
  if (!packageName) {
    return {
      file: manifestPath,
      ok: false,
      errors: [`could not parse npm package name from "${manifest.npm}"`],
    };
  }

  let pack: NpmPackument | null;
  try {
    pack = await fetchNpm(packageName);
  } catch (e) {
    return {
      file: manifestPath,
      ok: false,
      errors: [(e as Error).message],
    };
  }
  if (!pack) {
    return {
      file: manifestPath,
      ok: false,
      errors: [`package "${packageName}" not found on npm`],
    };
  }

  // Latest version >= manifest version (string compare is fine for semver basics).
  const latest = pack['dist-tags']?.latest;
  if (latest && compareSemver(latest, manifest.version) < 0) {
    errors.push(
      `manifest claims version ${manifest.version} but latest on npm is ${latest}`,
    );
  }

  // Peer-dep declares @prxy/module-sdk.
  const versionEntry = (latest && pack.versions?.[latest]) || undefined;
  const peers = versionEntry?.peerDependencies ?? {};
  if (!peers['@prxy/module-sdk']) {
    errors.push(
      `published package does not declare @prxy/module-sdk as a peerDependency`,
    );
  }

  return { file: manifestPath, ok: errors.length === 0, errors };
}

function compareSemver(a: string, b: string): number {
  const pa = a.split('-')[0].split('.').map(Number);
  const pb = b.split('-')[0].split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
  }
  return 0;
}

async function listAll(): Promise<string[]> {
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

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let files: string[];
  if (args.includes('--all')) {
    files = await listAll();
  } else if (args.length === 1 && !args[0].startsWith('--')) {
    files = [resolve(args[0])];
  } else {
    console.error('Usage:');
    console.error('  tsx scripts/verify-npm-package.ts <manifest.json>');
    console.error('  tsx scripts/verify-npm-package.ts --all');
    process.exit(2);
  }

  let failed = 0;
  for (const file of files) {
    const result = await verifyOne(file);
    if (result.ok) {
      console.log(`  ok  ${file}`);
    } else {
      console.log(`  FAIL  ${file}`);
      for (const msg of result.errors) console.log(`    ${msg}`);
      failed++;
    }
  }

  if (failed > 0) {
    console.log(`\nFailed: ${failed} of ${files.length}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

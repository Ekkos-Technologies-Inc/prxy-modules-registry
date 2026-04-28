#!/usr/bin/env tsx
/**
 * generate-index.ts
 *
 * Walks modules/* and emits a single index.json at repo root that
 * modules.prxy.monster (and any other consumer) can fetch in one request.
 *
 * Index shape:
 *   {
 *     generatedAt: ISO-8601 timestamp,
 *     count: number,
 *     official: ModuleManifest[],   // @prxy-official/*
 *     community: ModuleManifest[],  // everything else
 *     byCategory: { [category]: ModuleManifest[] }
 *   }
 *
 * Run on push to main via .github/workflows/index.yml.
 */

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const MODULES_DIR = join(REPO_ROOT, 'modules');
const INDEX_PATH = join(REPO_ROOT, 'index.json');

interface ModuleManifest {
  name: string;
  displayName: string;
  version: string;
  description: string;
  category: string;
  verified: boolean;
  featured?: boolean;
  kind: 'free' | 'paid';
  [key: string]: unknown;
}

async function loadManifests(): Promise<ModuleManifest[]> {
  const out: ModuleManifest[] = [];
  const scopes = await readdir(MODULES_DIR, { withFileTypes: true });
  for (const scope of scopes) {
    if (!scope.isDirectory()) continue;
    const scopePath = join(MODULES_DIR, scope.name);
    const entries = await readdir(scopePath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const raw = await readFile(join(scopePath, entry.name), 'utf8');
      out.push(JSON.parse(raw) as ModuleManifest);
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

async function main(): Promise<void> {
  const manifests = await loadManifests();
  const official = manifests.filter((m) => m.name.startsWith('@prxy-official/'));
  const community = manifests.filter((m) => !m.name.startsWith('@prxy-official/'));

  const byCategory: Record<string, ModuleManifest[]> = {};
  for (const m of manifests) {
    (byCategory[m.category] ??= []).push(m);
  }

  const index = {
    generatedAt: new Date().toISOString(),
    count: manifests.length,
    counts: {
      official: official.length,
      community: community.length,
      verified: manifests.filter((m) => m.verified).length,
      featured: manifests.filter((m) => m.featured).length,
      paid: manifests.filter((m) => m.kind === 'paid').length,
      free: manifests.filter((m) => m.kind === 'free').length,
    },
    official,
    community,
    byCategory,
  };

  await writeFile(INDEX_PATH, JSON.stringify(index, null, 2) + '\n', 'utf8');
  console.log(`Wrote index.json — ${manifests.length} module(s) total`);
  console.log(`  official: ${official.length}`);
  console.log(`  community: ${community.length}`);
  console.log(`  categories: ${Object.keys(byCategory).sort().join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

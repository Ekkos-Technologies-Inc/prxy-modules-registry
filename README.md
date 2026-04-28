# prxy-modules-registry

Curated registry of community modules for [prxy.monster](https://prxy.monster).

A **module** is composable middleware for an LLM API pipeline — it can
pre-process requests, post-process responses, observe streaming chunks, or
short-circuit the pipeline (e.g. on a cache hit). Modules are built against the
public [`@prxy/module-sdk`](https://www.npmjs.com/package/@prxy/module-sdk) and
the same module runs in both the cloud edition and the self-hosted local
edition.

This repo is the **source of truth** for what's listed at
[modules.prxy.monster](https://modules.prxy.monster). Submit a PR to list yours.

---

## What's here

```
prxy-modules-registry/
├── modules/
│   ├── @prxy-official/    ← the 12 modules shipped with prxy.monster
│   └── @community/        ← submit yours here
├── schema/
│   └── module-manifest.schema.json   ← JSON schema for manifests
├── scripts/
│   ├── validate-submission.ts        ← runs in CI on every PR
│   ├── generate-index.ts             ← rebuilds index.json on merge
│   └── verify-npm-package.ts         ← (v1) checks the npm package exports
├── docs/
│   ├── publishing.md       ← full publisher guide
│   ├── certification.md    ← verification policy
│   └── revenue-share.md    ← for paid modules (deferred to v1)
├── .github/workflows/
│   ├── ci.yml              ← validates every PR
│   └── index.yml           ← regenerates index.json on push to main
└── index.json              ← auto-generated, consumed by modules.prxy.monster
```

---

## Submit a module

1. Build it with [`@prxy/module-sdk`](https://www.npmjs.com/package/@prxy/module-sdk).
2. Publish to npm under your own scope (`@your-name/your-module`).
3. Open a PR adding a manifest at `modules/@community/your-module.json`. See
   [`docs/publishing.md`](./docs/publishing.md) for the manifest schema.
4. CI validates the manifest. A maintainer reviews and merges within 5
   business days.
5. Your module appears at https://modules.prxy.monster within an hour of merge.

---

## Manifest schema

Every entry in `modules/` is a JSON file matching
[`schema/module-manifest.schema.json`](./schema/module-manifest.schema.json).

Minimal example:

```json
{
  "name": "@your-name/slack-notifier",
  "displayName": "Slack Notifier",
  "version": "1.0.0",
  "description": "Posts to Slack when an LLM call exceeds a token threshold.",
  "author": {
    "name": "Jane Developer",
    "github": "janedev",
    "email": "jane@example.com"
  },
  "license": "MIT",
  "category": "side-effect",
  "tags": ["notifications", "slack", "alerts"],
  "supports": { "cloud": true, "local": true },
  "documentation": "https://github.com/janedev/prxy-slack-notifier",
  "repository": "https://github.com/janedev/prxy-slack-notifier",
  "npm": "https://www.npmjs.com/package/@your-name/slack-notifier",
  "submittedAt": "2026-04-27T14:30:00Z",
  "verified": false,
  "dependencies": { "@prxy/module-sdk": "^1.0.0" },
  "kind": "free"
}
```

---

## Verification levels

| Tier | What it means | Badge |
|---|---|---|
| `unverified` | Submitted but not reviewed | none |
| `verified` | Manual review by the prxy team — code audit, no telemetry, follows SDK contract | ✅ Verified |
| `featured` | Recommended by prxy team for specific use cases | ⭐ Featured |
| `official` | Maintained by ekkOS Technologies Inc. | 🏛 Official |

See [`docs/certification.md`](./docs/certification.md) for the full policy.

---

## Categories

- `cache` — semantic-cache, exact-cache, tool-cache style
- `optimization` — mcp-optimizer, prompt-optimizer style
- `context` — ipc, rehydrator, compaction-bridge style
- `injection` — patterns, system-context style
- `routing` — router style
- `safety` — cost-guard, guardrails, airgap style
- `side-effect` — webhooks, notifications, audit logging
- `observability` — tracing, metrics, alerting
- `ai-augment` — agents that call back to the provider for sub-tasks

Pick the closest match. If nothing fits, open an issue and we'll discuss
adding a new category.

---

## Development

```bash
# Install dev deps (just tsx + ajv for the validator scripts)
npm install

# Validate a single manifest
npx tsx scripts/validate-submission.ts modules/@community/your-module.json

# Validate everything
npx tsx scripts/validate-submission.ts --all

# Regenerate index.json (CI does this on merge)
npx tsx scripts/generate-index.ts
```

---

## License

MIT. The registry, schema, and scripts are MIT-licensed. Each listed module
ships under its own license — see the manifest's `license` field.

Maintained by [ekkOS Technologies Inc.](https://ekkos.dev) — questions:
hello@ekkos.dev.

# Publishing a community module

Step-by-step guide to listing your module in the prxy-modules-registry.

> **Prerequisite reading:** [`@prxy/module-sdk` README](https://www.npmjs.com/package/@prxy/module-sdk) and [docs.prxy.monster/sdk/interface](https://docs.prxy.monster/sdk/interface).

---

## 1. Build the module

A module is an npm package whose default export implements the `Module`
interface from `@prxy/module-sdk`. Minimal example:

```ts
// src/index.ts
import type { Module } from '@prxy/module-sdk';

const myModule: Module = {
  name: 'my-module',
  version: '1.0.0',

  async pre(ctx) {
    ctx.logger.info('saw request', { model: ctx.request.model });
    return { continue: true };
  },
};

export default myModule;
```

Compile to ESM (`tsc`) and ship the `dist/` folder.

### Required `package.json` shape

```json
{
  "name": "@your-name/your-module",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "peerDependencies": {
    "@prxy/module-sdk": "^1.0.0"
  },
  "devDependencies": {
    "@prxy/module-sdk": "^1.0.0",
    "typescript": "^5"
  }
}
```

**Hard rules:**

- `"type": "module"` — ESM only.
- Default export is a `Module`, not a factory (factories work too — keep
  things simple if possible).
- `@prxy/module-sdk` lives in `peerDependencies`, NOT `dependencies`. The
  gateway hoists a single SDK copy.
- Errors in `pre()` should degrade to `{ continue: true }`.
- Errors in `post()` should be caught and logged, never thrown.

---

## 2. Publish to npm

```bash
npm login
npm publish --access public
```

Use the `@your-name` scope (anything you own). Modules submitted under
`@community/` directly are not allowed unless you've negotiated that with the
prxy team — `@community` is the registry-side scope, not an npm scope you
publish under.

---

## 3. Submit to the registry

Open a PR to this repo adding a manifest at
`modules/@community/your-module.json`. Use the schema at
[`schema/module-manifest.schema.json`](../schema/module-manifest.schema.json).

Minimal manifest:

```json
{
  "name": "@community/your-module",
  "displayName": "Your Module",
  "version": "1.0.0",
  "description": "What it does, in one sentence.",
  "author": {
    "name": "Your Name",
    "github": "your-github-handle",
    "email": "you@example.com"
  },
  "license": "MIT",
  "category": "side-effect",
  "tags": ["whatever", "applies"],
  "supports": { "cloud": true, "local": true },
  "documentation": "https://github.com/your-handle/your-module#readme",
  "repository": "https://github.com/your-handle/your-module",
  "npm": "https://www.npmjs.com/package/@your-name/your-module",
  "submittedAt": "2026-04-27T14:30:00Z",
  "verified": false,
  "dependencies": { "@prxy/module-sdk": "^1.0.0" },
  "kind": "free"
}
```

The `name` field uses the **registry scope** (`@community/...`), not your npm
scope. Your npm package URL goes in the `npm` field.

### Field-by-field

| Field | Required | Notes |
|---|---|---|
| `name` | yes | Must start with `@community/` for non-official modules. The basename must match the JSON filename. |
| `displayName` | yes | Human-readable; shown in the marketplace UI. |
| `version` | yes | Semver. Should match the version of your published npm package. |
| `description` | yes | One sentence, ≤280 chars. |
| `author.name` | yes | Real name or org. |
| `author.github` | recommended | Your GitHub handle (no @). |
| `author.email` | recommended | For verification badge correspondence. |
| `license` | yes | SPDX identifier — `MIT`, `Apache-2.0`, etc. |
| `category` | yes | One of: `cache`, `optimization`, `context`, `injection`, `routing`, `safety`, `side-effect`, `observability`, `ai-augment`. |
| `tags` | recommended | Up to 12 short keywords. |
| `supports.cloud` / `supports.local` | yes | At least one must be true. |
| `documentation` | recommended | URL to module docs. |
| `repository` | recommended | URL to source repo. |
| `npm` | yes (community) | Full npm package URL. |
| `submittedAt` | yes | ISO 8601 timestamp. |
| `verified` | yes | Always `false` on initial submission. Set by maintainer after review. |
| `dependencies."@prxy/module-sdk"` | yes | Caret-range version like `"^1.0.0"`. |
| `kind` | yes | `free` or `paid`. Paid modules also need a `price` object — but paid support lands at v1+. |

---

## 4. CI validates the manifest

On PR open, the `.github/workflows/ci.yml` workflow runs:

1. Schema validation against the JSON schema.
2. Semantic checks (filename matches name, scope matches directory, etc.).
3. npm verification — package exists, latest version matches manifest, peer
   dep is declared.

If any check fails, the PR is blocked until you push fixes. Re-run locally:

```bash
npm install
npm run validate
npm run verify-npm
```

---

## 5. Maintainer review and merge

A prxy maintainer reviews the PR within 5 business days. We're looking for:

- A package that actually exports a usable `Module`.
- A useful description and tags.
- License is OSI-approved (for free modules).
- No obvious telemetry / data-exfiltration in the source.
- Repo has at least a basic README.

Once merged, `index.json` regenerates within an hour and the module appears at
[modules.prxy.monster](https://modules.prxy.monster).

---

## 6. (Optional) Request the verified badge

After your module has a few weeks of community usage, you can request the
✅ Verified badge via a follow-up issue titled
"Verification request: @your-name/your-module". See
[`certification.md`](./certification.md) for what we look for.

---

## Naming conventions

- `@your-name/...` — your npm scope. Pick something distinctive.
- Including `prxy` in the name (`@you/prxy-slack-notifier`) helps npm search.
- The registry-side `name` uses `@community/your-module` — drop any `prxy-`
  prefix because `@community/prxy-foo` reads weirdly.

---

## Gotchas

- **Do not bundle `@prxy/module-sdk`.** Use it as a peerDep. Bundling causes
  duplicate-class issues at runtime when the gateway type-checks against its
  own SDK copy.
- **Do not access `ctx.apiKey.providerKey` unless your module legitimately
  needs to make a provider call.** The reviewer will flag suspicious
  credential access.
- **Do not write to KV with an unbounded key prefix.** Namespace your keys
  under your module name (e.g. `myModule:user:{user_id}:...`).
- **Do not throw out of `pre()` or `post()`.** Use try/catch and log the
  error.

---

## Questions

Open an issue on this repo, or email hello@ekkos.dev.

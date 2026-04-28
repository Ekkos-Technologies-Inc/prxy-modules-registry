# Community modules

Submit your module by adding a JSON manifest in this directory.

See [`../../docs/publishing.md`](../../docs/publishing.md) for the full guide,
or the schema at [`../../schema/module-manifest.schema.json`](../../schema/module-manifest.schema.json)
for the format.

Quick start:

1. Build and publish your module to npm under `@your-name/your-module`.
2. Add a manifest file here named `your-module.json`. The basename MUST
   match the second segment of the manifest's `name` field
   (`@community/your-module` → `your-module.json`).
3. Open a PR. CI validates the manifest. A maintainer reviews and merges.
4. Your module appears at https://modules.prxy.monster within an hour.

This directory is intentionally empty at v0 launch — be the first.

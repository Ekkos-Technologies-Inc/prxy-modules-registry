# Module certification policy

The registry recognises four trust tiers. Verification is async — submit your
module first, then optionally request a higher tier.

---

## Tiers

| Tier | What it means | Badge | How to get it |
|---|---|---|---|
| `unverified` | Submitted but not reviewed | none | Default state of every new submission. |
| `verified` | Manual code review by the prxy team — passes the checklist below | ✅ Verified | Open an issue requesting it after a few weeks of community usage. |
| `featured` | Recommended by prxy team for specific use cases | ⭐ Featured | Maintainer judgement — modules that solve real problems for many users. |
| `official` | Maintained by ekkOS Technologies Inc. | 🏛 Official | Reserved for `@prxy-official/*` modules. |

---

## Verified review checklist

To earn the ✅ Verified badge, your module must pass all of these:

### Code quality

- [ ] Source is on GitHub (or another reviewable git host).
- [ ] Has a README that covers: what it does, when to use it, full config
      schema, metrics emitted (if any), and a link to source.
- [ ] At least one happy-path test.
- [ ] At least one storage-unavailable / degraded-mode test.
- [ ] No `console.log` in production code paths (use `ctx.logger`).
- [ ] TypeScript types pass without `any` in the public API.

### Safety

- [ ] No telemetry that phones home to anywhere outside the user's gateway.
- [ ] No use of `ctx.apiKey.providerKey` unless the module legitimately needs
      to make a provider API call (and that's documented in the README).
- [ ] All side effects in `post()` are wrapped in try/catch.
- [ ] `pre()` errors degrade to `{ continue: true }` instead of throwing.
- [ ] No use of `eval`, `Function(string)`, or other code-from-strings.
- [ ] No native binaries or postinstall scripts that fetch / build at install
      time. (Pure-JS modules only at v0.)

### License + attribution

- [ ] License is OSI-approved (MIT, Apache-2.0, BSD, ISC, MPL-2.0, etc.) for
      free modules. Proprietary licenses are accepted for `kind: paid`
      modules at v1+.
- [ ] All bundled / vendored code is properly attributed in NOTICE or
      LICENSE files.

### SDK contract

- [ ] `@prxy/module-sdk` is in `peerDependencies`, not `dependencies`.
- [ ] Default export is a `Module` matching the SDK interface.
- [ ] The `name` field on the `Module` matches the npm package basename.
- [ ] The `version` field matches the package's `version`.

### Storage hygiene

- [ ] All KV keys are namespaced under the module name (e.g.
      `your-module:user:{user_id}:...`).
- [ ] All DB tables created by the module use a `your_module_*` prefix.
- [ ] Module documents its TTLs / retention policy in the README.

---

## Requesting verification

Open an issue on this repo titled:

> Verification request: @your-name/your-module

Body should include:

```
- npm: <link>
- repo: <link>
- docs: <link>
- demo / use case: <one paragraph>
- tests pass on: <node version>
- Anything notable a reviewer should know.
```

A maintainer responds within 10 business days. If accepted, your manifest's
`verified: true` and `verifiedAt` are set, the ✅ badge appears on the
marketplace page.

---

## Revocation

Verified status can be revoked if:

- The module starts phoning telemetry home in a later release.
- A security advisory is filed against a published version.
- The author is unresponsive to security reports for >30 days.

Revocation is announced in the registry's commit log and the marketplace page
shows a deprecated state. The module entry stays in the registry — verification
flag is just flipped back to `false`.

---

## Featured

Featured is at our discretion. Modules we feature tend to:

- Solve a real, common problem (not a toy).
- Have a polished README + meaningful test coverage.
- Have non-trivial download counts on npm.
- Have a community signal — GitHub stars, issues opened against the module
  with helpful resolutions, etc.

Email us if you think your module qualifies. We don't accept paid placement.

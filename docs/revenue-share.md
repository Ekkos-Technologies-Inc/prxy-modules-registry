# Revenue share for paid modules

> **Status:** Deferred to v1+. The marketplace ships free-only at v0.
>
> This document captures the intended shape so authors building free modules
> today can understand what's coming.

---

## Headline

- **Free modules:** No money changes hands. Author keeps 100% of nothing,
  prxy.monster keeps 100% of nothing. License-of-author's-choice (MIT, Apache,
  etc.).
- **Paid modules (planned, v1+):** Author sets a monthly USD subscription
  price. prxy.monster handles billing via Stripe Connect. Revenue split is
  **70% author / 30% prxy.monster** — industry standard.

---

## Free vs paid in the manifest

Free (v0):

```json
{
  "kind": "free",
  ...
}
```

Paid (v1+, schema accepts it now but no billing infra exists yet):

```json
{
  "kind": "paid",
  "price": {
    "currency": "USD",
    "monthly": 9.00
  },
  ...
}
```

The schema validator already accepts `kind: paid` so the surface is forward-
compatible. Submitting a paid-kind manifest at v0 is allowed but it'll be
listed as "coming soon" — billing won't fire.

---

## How the v1+ flow will work (planned)

### For authors

1. Sign up as a Stripe Connect Express account through the prxy.monster
   dashboard. Onboarding flow handles tax / bank account collection.
2. Submit the module with `kind: paid` and a `price` object.
3. Maintainer reviews + merges (same flow as free modules).
4. Stripe Connect transfers the author's 70% net cut at the end of each month.

### For cloud users

- Add the paid module name to `PRXY_PIPE`.
- The first time a request hits the module, the user's billing account is
  charged the monthly fee (prorated for the first month).
- The 30% platform fee is taken at the Stripe transfer level — no separate
  invoice.
- If the user removes the module from `PRXY_PIPE`, billing stops at the next
  billing cycle.

### For local users

- Local users buy a license key directly from the author. The author's site /
  Gumroad / wherever — out of scope for prxy.monster.
- The author publishes a `validateLicense(key)` function in their module that
  the gateway calls on init. If invalid, the module no-ops and logs a clear
  error.
- We provide an SDK helper for license validation (planned: `@prxy/license`).

---

## Why 70/30

Industry standard:

- App Store: 70/30 (15/85 after year 1 for subscriptions)
- Steam: 70/30 (drops to 75/25 after $10M)
- Patreon: 88/12 to 95/5 depending on tier
- Substack: 90/10
- npm itself: 100/0 (npm is free; this is a different model — we run
  payment + cloud delivery infrastructure, npm doesn't)

70/30 covers Stripe processing fees, fraud risk, billing reconciliation,
the marketplace UX, and gateway hosting for cloud users. Authors keep most of
the value while not having to run any of that infrastructure themselves.

---

## What's NOT planned

- Performance-based revenue (per-call billing). Too complicated to debug,
  too easy to game. Subscription-only.
- Auction-based pricing or tiering. Authors set their price, market signals
  whether it's right.
- Marketplace-set minimum prices. Authors can charge $0.99 or $999.

---

## Questions

Open an issue on this repo or email hello@ekkos.dev. The v1 paid-module
launch will have its own RFC before any billing code ships.

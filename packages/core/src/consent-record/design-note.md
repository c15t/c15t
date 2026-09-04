# Internal consent records

These helpers track #1025 and are not exported from `@c15t/core/consent-record` or the package root. The kernel, persistence, transports and framework adapters still use `hasConsented` and flat `consents`. Runtime integration remains separate work.

## Files

| File | Role |
| --- | --- |
| `types.ts` | One latest `CategoryDecision` per optional category, plus separate notice dismissal, privacy directive, policy and evaluation types. |
| `validation.ts` | Checks own fields on objects with a plain or null prototype. Includes non-enumerable category keys and copies validated basis fields explicitly. Timestamps must be safe non-negative integer milliseconds no later than the supplied `now`. |
| `normalize.ts` | Reads raw v2 `{ consents, consentInfo }` with its encoding. Compact cookies restore omitted `false`; JSON keeps absent keys absent. Retains original times and legacy fingerprints. |
| `record.ts` | Replaces each supplied own optional key at the captured action time with the current choice basis. Omitted decisions retain their time and basis. |
| `evaluation-policy.ts` | Validates model, prompt and scope mode, fingerprints, durations, scope and GPC mappings. Copies validity fields explicitly. Fingerprints arrive precomputed. |
| `evaluate.ts` | Derives permissions, restrictions, the prompt requirement and the next deadline from records and an explicit `now`. |

## Semantics

Opt-in and IAB default to denied within scope; opt-out defaults to allowed. Outside scope, strict mode denies and permissive mode allows. A compatible, unexpired positive decision grants within scope. Explicit false, strict scope exclusion, applicable GPC and standing opt-out directives override grants and defaults. Denials do not expire. An expired opt-out grant can still be allowed by default, with its source reported as `default`.

A `choice-v1` basis must match the policy's choice fingerprint. A `legacy-v2` basis compares only with the policy's legacy material fingerprint. If either legacy fingerprint is absent, the decision is grandfathered.

Positive decisions expire at `confirmedAt + choice.maxAgeMs` and remain valid while `now < expiresAt`. An explicit `maxAgeMs: null` retains unbounded compatibility behavior and does not meet the eventual requirement to bound grant lifetimes.

A choice prompt uses the active optional scope. Empty scope requires no prompt. Otherwise, no decisions yields `missing`; any incompatible in-scope basis yields `policy-changed`; missing required coverage yields `missing`; any expired positive decision yields `expired`. Complete matching coverage requires no prompt. Matching denials satisfy coverage regardless of age.

A notice prompt depends only on its dismissal. Missing dismissal yields `missing`, a fingerprint mismatch yields `policy-changed`, and expiry yields `expired`. Category saves, category expiry and GPC do not acknowledge a notice.

`nextDeadline` is the earliest expiry that changes a permission or the aggregate prompt. An unmasked opt-in or IAB grant still needs an expiry deadline when choice coverage is missing. A masked grant or opt-out grant needs one only when expiry changes satisfied choice coverage to `expired`. Existing `missing`, `policy-changed` and `expired` prompts keep their reason as other grants expire. A notice deadline uses the dismissal's independent lifetime.

## Remaining integration

Kernel wiring and events, storage codecs and raw reads, all/none/no-input save expansion, fingerprint producers, the resolved-policy bridge, resolution status, IAB target gates, GPC directive recording, informed exceptions and failed-init prompt visibility remain outside these helpers.

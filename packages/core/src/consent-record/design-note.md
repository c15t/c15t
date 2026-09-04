# Consent record foundation (internal)

Status: internal, not exported from `@c15t/core/consent-record` or the package root. Tracks #1025. The kernel, persistence, transports and framework adapters still run the old `hasConsented` plus flat `consents` model; nothing here changes runtime behavior yet.

## Files

| File | Role |
| --- | --- |
| `types.ts` | `ExplicitChoice` (one latest `CategoryDecision` per optional category), `NoticeDismissal`, `PrivacyOptOut`, `EvaluationPolicy`, `ConsentEvaluation`. |
| `validation.ts` | Structural checks. Own fields on plain-prototype objects only. Timestamps are safe non-negative integer epoch milliseconds not later than `now`; no clock-skew tolerance. |
| `normalize.ts` | v2 `{ consents, consentInfo }` reader. Takes the raw parsed record plus its encoding. Compact cookies restore omitted `false`; JSON keeps absent keys absent. Never writes, never renews time, never stamps a new fingerprint. |
| `record.ts` | `recordCategoryPatch`: an object patch replaces exactly its own optional keys at one captured action time and the current `choice-v1` basis. Omitted keys keep their decision. |
| `evaluation-policy.ts` | `createEvaluationPolicy`: validates model/prompt pairing, durations, scope and the explicit GPC deny mapping. Fingerprints arrive precomputed; this module does not hash. |
| `evaluate.ts` | `evaluateConsentRecord`: pure, explicit `now`. Returns permissions, a separate restriction map, the prompt requirement and the next deadline. |

## Semantics

Per optional category: start from the model default (opt-in and IAB deny in scope, opt-out allows; outside scope strict denies and permissive allows). A compatible unexpired positive decision grants in scope. Then restrictions apply and always win: explicit `false`, strict scope exclusion, an active mapped GPC signal, and standing opt-out directives. A denial never ages into a grant. Opt-out reports an expired grant as `default`, not consent.

Compatibility: a `choice-v1` decision must equal the policy's choice fingerprint. A `legacy-v2` decision is compared only to the policy's legacy material fingerprint, and only when both exist; otherwise it is grandfathered. The two hash domains are never compared to each other.

Expiry is `confirmedAt + choice.maxAgeMs`, effective while `now < expiresAt`. `maxAgeMs: null` is an explicit unbounded compatibility projection, not a default.

Choice prompt, in order: no decisions at all yields `missing`; any in-scope decision with an incompatible basis yields `policy-changed`; any in-scope category without a decision yields `missing`; any in-scope positive decision past expiry yields `expired`; otherwise `none`. A matching denial satisfies coverage regardless of age. An empty scope yields `none`.

Notice prompt depends only on the dismissal: `missing`, then fingerprint mismatch (`policy-changed`), then exact expiry (`expired`). Category saves, category expiry and GPC never acknowledge a notice.

`nextDeadline` is the earliest future grant expiry that can change a permission or a choice prompt, or the notice dismissal expiry under a notice prompt.

## Not in this slice

Kernel wiring and events, storage codecs and the raw-read boundary, `'all'`/`'none'`/no-input save expansion, fingerprint producers, the `ResolvedPolicy` bridge, the resolution status union, IAB target gating, GPC directive recording, the GPC exception question, and failed-init prompt visibility.

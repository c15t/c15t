---
title: TCF readiness
description: Internal assessment of what implementing IAB TCF would take, with registration lead times and the gaps that remain open.
---

Internal assessment. Not published on c15t.com. Written 2026-09-18 against
branch `KayleeWilliams/tcf-readiness`.

Context: issue [c15t/c1010](https://github.com/c15t/c15t/issues/1010) requires
IAB TCF for launch, while `native/CONTRACT.md:7` defers it for mobile. The
scope call is the owner's. This document is input to it, not a decision.

Line references are to the tree on this branch, after the fixes listed in
[Gaps fixed on this branch](#gaps-fixed-on-this-branch).

## Decision memo

The TCF has two separate registrations, and they lead to two different products.
IAB Europe's own wording is the tiebreaker: "Publishers do not have to register
to participate in the TCF. Publishers can then either select a CMP [...] from
the list that they would like to work with or publishers can register as a CMP
themselves (i.e. Private CMP)."
([https://iabeurope.eu/join-the-tcf/](https://iabeurope.eu/join-the-tcf/))

**What c15t implements today is the Private CMP model.** Every doc page puts
`cmpId` on the customer: `manifest.iab` for self-host
(`docs/self-host/guides/iab-tcf.mdx:30`), a provider prop for React and Next
(`docs/frameworks/react/iab/overview.mdx:20`,
`docs/frameworks/next/iab/overview.mdx:25`), an argument for headless
(`docs/frameworks/javascript/iab/overview.mdx:16`), and an inline script option
(`docs/frameworks/javascript/script-tag.mdx:318`). There is no code path that
supplies a c15t-owned ID. The backend only echoes what the operator configured:
`config.iab?.cmpId` becomes `manifest.cmpId`
(`packages/schema/src/shared/consent-manifest.ts:413`) and `/init` returns it
only when it was set (same file, lines 313-317). No c15t-owned CMP ID
appears anywhere in the repo.

### Option A: c15t registers one CMP ID as a platform CMP

Cost: EUR 1,575/year CMP membership, plus passing IAB Europe's CMP Validation
test ([https://iabeurope.eu/join-the-tcf/](https://iabeurope.eu/join-the-tcf/)). Lead time is not published; see
[Registration path](#registration-path).

What it buys: customers are publishers, and publishers register for nothing. One
ID, one validation, one audit surface. `cmpId` stops being something a customer
can get wrong, which is today's default posture.

What it forecloses: a single CMP ID means every customer's TC Strings are
attributed to c15t. Validation is against one banner, so a customer who
heavily customises the UI can put the whole ID at risk, and c15t carries that
risk. Large customers who must own their CMP relationship, and any customer
that needs its own consent records under its own identity, are outside the
platform ID and need Option B as an escape hatch anyway.

### Option B: every customer registers their own CMP ID

Cost: EUR 1,575/year and a validation cycle per customer, in their name, at
their pace. Nothing in the repo changes to support it, because this is what the
code already does.

What it forecloses: TCF cannot be a default that "just works". Onboarding
gains a legal/procurement step at each customer with a lead time c15t does not
control, and the addressable set shrinks to publishers already willing to
become a registered CMP. The docs already assume this and are honest about it.

### Recommendation

Pursue Option A as the default and keep Option B as a documented escape hatch,
because they are not exclusive and the code already supports the second one.
The reason is asymmetric cost: Option A is one fee and one validation cycle
paid by c15t, Option B is a fee and a validation cycle per customer paid by
people who bought a consent tool to avoid exactly that. Keep `cmpId` settable
per deployment so a customer with their own registration can use it, which is
the current behaviour and costs nothing to preserve.

Two things are true under either branch and are not scope-dependent:

1. c15t/Inth operates a GVL proxy at `gvl.inth.app`, which is a compliance
   surface regardless of whose CMP ID is in the string. See
   [GVL proxy](#gvl-proxy-and-what-its-staleness-does).
2. The Google side imposes a timing constraint that nothing in the client
   currently bounds, independently of whose CMP ID is in the string. See
   [Gaps open on either branch](#gaps-open-on-either-branch).

Mobile TCF is a separate question and this document does not answer it. IAB
Europe maintains a "TCF v2.2 Compliance Form For Non-Web CMPs" listed at
[https://iabeurope.eu/tcf-supporting-resources/](https://iabeurope.eu/tcf-supporting-resources/), which is the artefact a
mobile branch would start from.

## What `packages/iab` implements today

17 hand-written source files before this branch, 18 after `cmp-id.ts`. There
were 27 `.ts` files including tests, so the "28 source files" figure in earlier
notes counted test files. TCF policy version is not hardcoded: the encoder takes it from the served list.
`TCModel` defaults to 5 (TCF 2.3), and a list declaring 4 encodes 4. Verified
against `@iabtechlabtcf/core@1.5.21`.

| Piece | State | Evidence |
| --- | --- | --- |
| `window.__tcfapi` install, sync stub, queue flush | Implemented | `packages/iab/src/tcf/stub.ts:169-203` |
| `__tcfapiLocator` iframe and `postMessage` bridge | Implemented | `packages/iab/src/tcf/stub.ts:75-92,203` |
| `ping`, `getTCData`, event listeners, `removeEventListener` | Implemented | `packages/iab/src/tcf/cmp-api.ts:197-330` |
| TC String encode and decode | Implemented via lazy `@iabtechlabtcf/core` | `packages/iab/src/tcf/tc-string.ts:67-166,232-281` |
| `euconsent-v2` cookie plus localStorage, 395 day expiry | Implemented | `packages/iab/src/tcf/constants.ts:14`, `cmp-api.ts:395-397` |
| GVL fetch, in-flight dedupe, vendor allowlist | Implemented | `packages/iab/src/tcf/fetch-gvl.ts:96-186` |
| Purpose consent vs purpose legitimate interest | Both encoded | `tc-string.ts:109-125` |
| Vendor consent vs vendor legitimate interest | Both encoded | `tc-string.ts:127-143` |
| Special features opt-in | Encoded | `tc-string.ts:145-152` |
| `vendorsDisclosed` (TCF 2.3) | Encoded, but approximate | `index.ts:812-828` |
| Consent receipts with expiry and revalidation | Implemented | `packages/iab/src/authority.ts` |
| Dialog rendering data for purposes, features, special purposes, stacks | Implemented (display only) | `packages/iab/src/headless/dialog-data.ts:140,185,291` |
| TCF purpose to c15t category mapping | All 11 purposes mapped | `packages/iab/src/tcf/purpose-mapping.ts:30-40` |
| Cross-domain/consent forwarding | Not implemented | no CMP-side forwarding code |
| Publisher restrictions, custom purposes | Not implemented | see below |

### TC String completeness

Encoded: version, created, lastUpdated, encoding type, CMP ID, CMP version,
consent screen, consent language, vendor list version, TCF policy version,
is service specific, publisher country code, purpose consents, purpose
legitimate interests, special feature opt-ins, vendor consents, vendor
legitimate interests, `vendorsDisclosed`. Verified by encode/decode round trip
in `packages/iab/src/__tests__/tc-string.test.ts`.

Absent, most consequential first:

1. **Special purposes legitimate interest is not encodable.** There is no
   special-purposes bitfield in `@iabtechlabtcf/core@1.5.21` at all: `Fields`
   exposes `purposeConsents`, `purposeLegitimateInterests`,
   `specialFeatureOptins` and `publisherRestrictions`, and nothing for special
   purposes (`model/Fields.js`). This is a dependency limit, not a c15t
   oversight. Purposes 1 to 4 are exactly the LI basis most vendors cite for
   "numbering digital networks" and "measuring ad performance", so a c15t TC
   String under-represents LI for those vendors.
2. **`vendorsDisclosed` is an approximation, and the code says so.**
   `index.ts:812-828` discloses the vendors that have appeared in consent or LI
   state, with an inline "For MVP" comment. TCF 2.3 wants every vendor the CMP
   made available to the user. A vendor shown in the UI but never toggled is
   missing from the string. The behaviour is pinned by a test that names the
   limitation, so it is visible rather than latent.
3. **`purposeOneTreatment` is never set.** `TCModel` supports it and c15t does
   not touch it, so it encodes 0. With the shipped defaults
   (`publisherCountryCode: 'US'`, `isServiceSpecific: true`) the string claims
   purpose 1 was offered to the user. Whether that is true is a product
   question about the banner, not an encoder question, so it is left open.
   Verified: encoding c15t's defaults yields `purposeOneTreatment=0`.
4. **Publisher restrictions are not produced.** `TCModel.publisherRestrictions`
   exists and the read model already parses them
   (`packages/iab/src/tcf/iab-tcf-types.ts:58`), but nothing on the encode side
   writes them. This is the mechanism behind Daisy-signal style limits.
5. **`supportOOB` and custom purposes are untouched.** Both default to off and
   zero, which is correct for a first-party CMP but wrong for any publisher
   using publisher custom purposes.

`TCData` reported over `__tcfapi` also disagrees with the TC String.
`cmp-api.ts:159,170,175` hardcode `isServiceSpecific: true`, `publisherCC:
'US'`, `purposeOneTreatment: false` regardless of the options the caller passed
to `createIAB`, which do reach the encoded string (`index.ts:848-852`). A vendor
reading `getTCData` can be told something different from what the same
object's `tcString` field decodes to.

## The `cmpId` question, answered

The starting claim was that a `CMP_ID = 0` fallback exists. **It did, at
`packages/iab/src/tcf/cmp-defaults.ts:14`, and it is now removed.** It was
reachable only through `createCMPApi`, which is not exported from the package,
but `createIAB` passing an unset ID reached it in practice: `cmp-api.ts`
defaulted `cmpId` to 0, so `ping` reported `cmpId: 0` to every vendor script
while no TC String could ever be written.

What a caller who omits `cmpId` gets today, by path:

- **Framework provider** (`iab()` / `IABUserConfig`, `index.ts:98-106`): the
  addon is silently not mounted. `packages/core/src/runtime/index.ts:312-315`
  returns `null` unless `cmpId` is a number, so no stub, no `__tcfapi`, no TC
  String, and no error. This is the quiet one.
- **`createIAB` directly**: previously installed the CMP API and then threw an
  opaque `TCModelError: invalid value 0 passed for cmpId` from inside
  `save()`. Now throws at mount.

Can a TC String be produced with an unusable CMP ID? **No, and it could not
have been.** Verified directly against the installed encoder:

| `cmpId` | Result |
| --- | --- |
| `0`, `1` | `TCModelError: invalid value N passed for cmpId` at `TCModel` setter |
| `undefined`, `null`, `NaN`, `2.5` | same, via `Number()` coercion |
| `2` to `4095` | encodes and decodes losslessly |
| `4096` and above | `EncodingError: Error encoding core->cmpId: N too large to encode into 12` |

The setter's floor is `> 1` (`TCModel.js:142-149`) and the core-string field is
12 bits (`encoder/BitLength.js:3`). So a zero CMP ID is rejected, just in the
wrong place with the wrong message: after the CMP had already announced itself
to the page, and only when the user tried to save.

Is `cmpId: 0` spec-legal? No. The field carries the ID IAB Europe assigns at
registration, and the library's own TSDoc says the setter throws unless the
value is a registered-style ID. 0 and 1 are not assignable.

`cmpVersion: 1` needed verifying rather than assuming. The TCF `cmpVersion`
field is **not** the framework version. It is a CMP-assigned integer the CMP
increments per release; the framework version lives in `policyVersion` (5 for
TCF 2.3, correctly sourced from the GVL). So defaulting to 1 was legal but
useless: every c15t release from 1.x to 3.x reported `cmpVersion: 1`, which
destroys the "which CMP build produced this string" signal that exists for
debugging and audit. It was also internally inconsistent:
`packages/iab/src/tcf/cmp-defaults.ts` documented itself as the single source of
truth and derived the version from the package, while `createIAB` hardcoded 1.

## Registration path

All four were checked on 2026-09-18. Fees are quoted from the pages that state
them. Where a page does not state something, that is said.

| Registration | Prerequisite for launch? | Published cost | Lead time | Source |
| --- | --- | --- | --- | --- |
| IAB Europe CMP registration (get a CMP ID) | Yes, for whichever party's ID is in the string | EUR 1,575/year | not published | `join-the-tcf` |
| IAB Europe GVL vendor listing | Only if c15t itself is a vendor | EUR 1,575/year | not published | `join-the-tcf` |
| Google certified CMP programme | Claimed by the issue; not verifiable from public pages | unknown | unknown | see below |
| IAB US / US privacy string | Not a registration | n/a | n/a | GPP page |

Sources:

- CMP and vendor fees, and the publisher exemption:
  [https://iabeurope.eu/join-the-tcf/](https://iabeurope.eu/join-the-tcf/)
- Portals the same page links: vendor
  [https://register.consensu.org/](https://register.consensu.org/), CMP [https://register.consensu.org/CMP](https://register.consensu.org/CMP)
- What a CMP must do under the TCF: [https://iabeurope.eu/tcf-for-cmps/](https://iabeurope.eu/tcf-for-cmps/)
- GVL vendor listing is a separate registration from CMP registration: the two
  are different portals with separate fees on `join-the-tcf`.
- TCF v2.3 supporting documents, including the non-web CMP compliance form:
  [https://iabeurope.eu/tcf-supporting-resources/](https://iabeurope.eu/tcf-supporting-resources/)

**Lead time is the gap in the public record.** The pages state that a CMP
receives an ID after passing "the CMP Validation test managed by IAB Europe" and
that a vendor receives an ID after a compliance questionnaire, and neither
states a turnaround. Treat "weeks, not days" as the planning assumption and get
a number from IAB Europe before committing to a launch date. Do not treat the
fee as the expensive part.

**GVL vendor listing is probably not needed, and is not free to dismiss.** A CMP
does not need to be on the GVL to be a CMP. It needs a vendor ID if c15t or Inth
is itself a vendor processing personal data for TCF purposes. Two facts make
that a real question rather than a rhetorical one: Inth operates
`gvl.inth.app`, and the hosted backend keeps durable consent records and audit
logs. Answer it as a data-processing question with counsel, not from the repo.

**Google certified CMP programme: not verified, and I want to be explicit about
that.** The pages below are the live public Google pages on this surface, and
the word "certified" does not appear on any of them. I read all four.

- [https://support.google.com/google-ads/answer/10000067](https://support.google.com/google-ads/answer/10000067) (About consent mode)
- [https://support.google.com/google-ads/answer/10021549](https://support.google.com/google-ads/answer/10021549) (Google Ads
  integration with the IAB TCF)
- [https://support.google.com/google-ads/answer/14009343](https://support.google.com/google-ads/answer/14009343) (Set up a consent banner)
- [https://developers.google.com/tag-platform/security/concepts/consent-mode](https://developers.google.com/tag-platform/security/concepts/consent-mode)

The CMP-partner help centre at `support.google.com/cmppartners/` resolves to the
generic Google Help index rather than a programme page. The certification
requirements and application flow appear to sit behind a Google account, which I
cannot read. So: the issue's claim that certification is required for Consent
Mode v2 signals to be read unblocked is **plausible and unconfirmed by me**.
Treat it as an open item with a named owner, not as a settled prerequisite.

What I did confirm from Google, and it is more actionable than the certificate
question, is a timing constraint: "If your CMP doesn't respond within 500
milliseconds or you find 'error', 'stub', or 'loading' status, the tag will
proceed in a restricted mode", with `tcloaded` or `cmpuishown` plus
`useractioncomplete` required inside the window
([https://support.google.com/google-ads/answer/10021549](https://support.google.com/google-ads/answer/10021549)).

**US privacy string: this is engineering work, not a queue.** IAB Tech Lab
publishes the Global Privacy Platform as an API and string format to implement,
with `ping`/`getSection`/`getField` commands and a `signalStatus` read flag
([https://iabtechlab.com/standards/global-privacy-platform/](https://iabtechlab.com/standards/global-privacy-platform/)). No registration
or ID issuance appears in what I could read, and IAB Europe's only registration
portals are the vendor and CMP ones above. If c15t needs a US string, the lead
time is an engineer, not an application form.

## GVL proxy, and what its staleness does

`https://gvl.inth.app` (`packages/iab/src/tcf/constants.ts:25`) is c15t
infrastructure, not an IAB endpoint: Inth is the company behind c15t
(`README.md:127`, `NOTICE:5`). Both the client default and the backend default
point at it (`docs/self-host/guides/iab-tcf.mdx:42`). The proxy is therefore
load-bearing for every TCF customer on either registration branch.

Three properties of the current client path matter:

1. **No timeout and no abort.** `fetchGVL` calls `fetch` with no signal
   (`packages/iab/src/tcf/fetch-gvl.ts:143-145`). The stub queues vendor calls
   until the real CMP API replaces it, and Google restricts tags when it sees
   `stub` or `loading` past 500 ms. A slow `gvl.inth.app` is not just a slow
   banner, it is silently restricted Google tags across every customer. This is
   the highest-severity finding in this document that has nothing to do with
   registration.
2. **Staleness is inherited silently into the TC String.** Response validation
   checks only `vendorListVersion`, `purposes` and `vendors`
   (`fetch-gvl.ts:171-174`). `tcfPolicyVersion` is not checked, and
   `TCModel` derives `policyVersion` from it. Verified: a list declaring
   `tcfPolicyVersion: 4` produces a TC String with `policyVersion=4`. Nothing in
   c15t notices or reports that it is encoding pre-2.3 signals.
3. **Compliance exposure of the proxy itself.** Serving the GVL means c15t
   decides which vendor list a customer's users see, and for how long. A
   customer's TC Strings are only as accurate as the copy `gvl.inth.app` holds.
   `gvl.ttlMs` defaults to one day per the docs, so the worst case is a day of
   strings against a superseded list. That is defensible if the upstream
   refresh is monitored; it is a liability if it is not, and no code in this
   repo monitors it.

## Gaps open on either branch

Ordered by how much they can cost.

1. No timeout on the GVL fetch, against Google's 500 ms CMP response budget.
   `fetch-gvl.ts:143-145`.
2. `vendorsDisclosed` under-reports what the user was shown.
   `index.ts:812-828`.
3. Special purposes LI cannot be encoded by the pinned dependency.
   `@iabtechlabtcf/core@1.5.21` `model/Fields.js`.
4. `TCData` hardcodes `publisherCC`, `isServiceSpecific` and
   `purposeOneTreatment` instead of using the configured values, so it can
   contradict the `tcString` in the same payload. `cmp-api.ts:159,170,175`.
5. No check that the served list declares TCF 2.3.
   `fetch-gvl.ts:171-174`.
6. `ping` reports `cmpVersion` as a string while `getTCData` reports a number,
   because `PingData.cmpVersion` is typed `string` in
   `packages/core/src/options/iab-tcf.ts:127`. Fixing this crosses into
   `packages/core`, outside this branch's write scope.
7. `isValidTCStringFormat` (`tc-string.ts:291-312`) is a regex over base64url
   characters plus a length floor. Its comment about version 2 strings starting
   with C or B is not true, and the function accepts anything base64url-shaped
   that is 10 characters or longer. Replacing it is a public behaviour change
   that deserves its own decision rather than a ride-along.
8. Publisher restrictions and publisher custom purposes are absent on the encode
   side.

## Gaps fixed on this branch

Chosen because they are correct whichever way the scope decision goes: they
remove ways to silently produce an invalid or misleading consent record, and
none of them requires a CMP ID to exist.

- `createIAB` now validates `cmpId` before installing anything, so a page can
  no longer advertise a CMP over `__tcfapi` that cannot write a consent record.
  The error names the accepted range and the registration URL.
  `index.ts:432`, new `packages/iab/src/tcf/cmp-id.ts`.
- `iab()` rejects a present-but-unusable `cmpId` at configuration time, and
  still accepts an absent one for the hosted path where `/init` supplies it.
  `index.ts:134-146`.
- `createCMPApi` validates rather than defaulting, since this is the last place
  a bad ID could reach `ping`. `cmp-api.ts:90`.
- `CMP_ID = 0` is gone, and the comment that pointed at a nonexistent
  `advanced.iab.cmpId` config key with it. The real key is `manifest.iab.cmpId`.
  `packages/iab/src/tcf/cmp-defaults.ts`.
- `cmpVersion` now defaults to the package major from the single source of
  truth instead of a hardcoded 1, so the TC String and `__tcfapi` agree and the
  value moves with releases. `cmp-defaults.ts:23`, `index.ts:431`.

Tests: new `packages/iab/src/__tests__/cmp-id.test.ts` (24 cases), plus encoder
floor cases and the `cmpVersion` default pinned in `tc-string.test.ts`. All 9
new boundary tests were confirmed to fail with the fix removed, and the
`cmpVersion` assertion fails against the old default of 1.

## Not in scope here

`packages/react-native/**`, `native/**` and `examples/react-native-bare/**` are
untouched. `native/CONTRACT.md:7` states the mobile deferral and reserves the
`iab` slot so a later addition is additive. One pre-existing failure in
`@c15t/react-native:test` (missing `src/protocol/version`) is on that lane, is
present without any change of mine, and is left alone.

## Verification

| Gate | Result |
| --- | --- |
| `bun turbo run build --filter=@c15t/iab` | pass |
| `bun run --cwd packages/iab test` | pass, 121 tests, 8 files |
| `bun turbo run check-types --filter=@c15t/iab` | pass |
| `bun run lint` | pass, 34 tasks, 0 warnings 0 errors |
| `bun run fmt:check` | pass |
| `@c15t/core`, `@c15t/browser` tests | pass, 76 and 19 files |
| `@c15t/react`, `@c15t/ui`, `@c15t/scripts` tests | pass, 71, 23, 73 files |
| `@c15t/schema`, `@c15t/backend` tests | pass |
| `bun run test` | fails in `@c15t/react-native`, pre-existing, other lane |

Backend and schema were read but not modified, so their builds were not run
beyond what the affected graph rebuilt.

Encoder behaviour above was checked directly against
`@iabtechlabtcf/core@1.5.21` rather than inferred from its docs.

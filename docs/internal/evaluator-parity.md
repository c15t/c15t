# Consent evaluator parity (mobile versus web)

Status: written 2026-09-18 against local checkout `v3-3` at `32628df38`.
The clock is unsynced, so treat "current" here relative to that commit.
Live behaviour changes this answer: web-side `@c15t/PLAYGROUND`, the platform
policy API and any editor that edits a policy. Re-derive before trusting it for
a release note.

Who should read this: anyone about to change `PolicyEvaluator` in either native
kernel, or the evaluation scenarios in
`packages/react-native/scripts/generate-protocol-fixtures.ts`.

## What was measured, and how

`packages/core/src/consent-record/evaluate.ts` is a pure evaluator: policy plus
stored records plus an explicit `now` in, permissions and restrictions out. The
measurement ran it directly through Vitest, one call per case, reading only the
`marketing` category:

```bash
# temporary spec, run then removed
bun run --cwd packages/core test src/consent-record/__tests__/__probe.test.ts
```

Axes swept: `model` (opt-in, iab, opt-out, none) x `scopeMode` (permissive,
strict) x whether `marketing` is in `scope` x the stored `marketing` decision
(absent, true, false) x `policy.choice.maxAgeMs` (null, 0). `confirmedAt` was
one day before `now`, so `maxAgeMs: 0` makes every decision expired and
`null` makes every decision current. Prompt was `choice` throughout, because
`createEvaluationPolicy` requires `choice` for every model but `opt-out`.
Nothing was inferred from a type or a name; every cell below is printed output.

`permission source` is the evaluator's own explanation of the answer, so it is
reported next to the answer.

## The web answers (`marketing` column)

| model | scopeMode | in scope | decision | expired | permitted | restrictions | source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| all four | permissive | no | absent | any | **true** | none | default |
| all four | permissive | no | true | any | **true** | none | default |
| all four | permissive | no | false | any | **false** | `explicit-denial` | restricted |
| all four | strict | no | absent | any | false | `strict-scope` | restricted |
| all four | strict | no | true | any | false | `strict-scope` | restricted |
| all four | strict | no | false | any | false | `explicit-denial`, `strict-scope` (that order) | restricted |
| opt-in, iab | any | yes | absent | any | false | none | default |
| opt-in, iab | any | yes | true | no | true | none | grant |
| opt-in, iab | any | yes | true | yes | false | none | default |
| opt-in, iab | any | yes | false | any | false | `explicit-denial` | restricted |
| opt-out, none | any | yes | absent | any | true | none | default |
| opt-out, none | any | yes | true | any | true | none | default (`maxAgeMs: 0`: source `default`, still true) |
| opt-out, none | any | yes | false | any | false | `explicit-denial` | restricted |

`opt-in` and `iab` produced identical cells on every one of these axes, which is
the behaviour `defaultPermission` in `evaluate.ts` states: in scope, a category
permits by default only for `opt-out` or `none`. Out of scope the model is not
consulted at all: permissive allows, strict refuses.

Two consequences worth saying out loud, because both are easy to get wrong:

- A stored `false` is a denial that **never ages**. It restricts whether or not
  the receipt is expired, and whether or not its basis still matches the policy,
  because `collectRestrictions` reads the raw decision value and ignores
  authority.
- Refusals remove the automatic prompt. Wherever the table shows
  `explicit-denial`, `promptRequirement.kind` was `none`, and a valid grant also
  gives `none` (nothing left to ask). An expired grant gives `choice` back.

## Divergences found in the native kernels

All three are graded today only where the committed scenarios happen to reach.
Every `evaluation-*.json` scenario lists all four optional categories in `scope`
and uses `permissive`, so the out-of-scope rows are not covered at all, and no
scenario pairs a refusal with an expired receipt.

1. Out of scope under `permissive`, both kernels consult the model.
   `PolicyEvaluator.kt` (native/core-android/c15t-core/src/main/kotlin/com/c15t/core/policy/PolicyEvaluator.kt,
   the `else` branch of the scope test) answers a model default, so an `opt-in`
   or `iab` rule denies an ungoverned category with no receipt; web allows it.
   The same branch answers `true` for `opt-out` and `none` before looking at the
   receipt, so a recorded refusal of an ungoverned category is ignored; web
   denies it. The correct rule mentions no model: allow, unless a `false`
   decision exists for that category.
   Swift reaches the same wrong answer by a different route
   (`PolicyEvaluator.swift`, `if !inScope` only overrides for `.strict`).
2. `explicit-denial` is missing from Kotlin entirely.
   `PolicyEvaluator.kt` declares `strict-scope`, `gpc` and `opt-out-directive`
   and never a denial reason, so `effectiveRestrictions` cannot agree with the web answer
   or the Swift answer. Swift already appends `.explicitDenial`
   (`PolicyEvaluator.swift:108`). Ordering matters for the wire: web puts
   `explicit-denial` first, so `["explicit-denial", "strict-scope"]` is the pair
   a strict out-of-scope refusal must produce.
3. An expired or policy-changed receipt re-opens a recorded refusal.
   `PolicyEvaluator.kt` gates the whole decision on `choiceCurrent`, so under
   `opt-out` an expired `false` restores permission; web keeps it denied.
   Swift's `.policyChanged` branch falls back to `defaultPermission(for: model)`,
   so under `opt-out` a refusal made under an older policy restores permission;
   web keeps that denied too. Swift is right about denial never aging only on the
   `.valid` path.

Fixing these changes what the reference bridge and both kernels put in a saved
`consents` and `restrictions`. That is user-visible behaviour and needs a
changeset, not just a green suite.

## What closing this looks like

1. Add scenarios to `generate-protocol-fixtures.ts` that sweep exactly the
   uncovered axes: `scope: ["functionality"]` with a `marketing` decision in each
   of absent/true/false, once permissive and once strict, once with
   `choiceMaxAge: 0`; plus one refusal recorded under an older policy revision.
   Then add `model: "iab"` scenarios. Fixture expectations come from the real
   kernel, so the regenerated JSON is the corrected answer, not a hand-written
   one.
2. Regenerate (`bun run --cwd packages/react-native generate:fixtures`)
   and let the Swift and Kotlin claim tests fail. Fix the kernels until they
   pass. Do not edit an expectation to make a core pass.
3. Record here what the fix cost in stored-envelope shape or wire reasons, and
   add the changeset.

## What it cost

Closed 2026-09-19 against `v3-3`, in both cores, graded by the fixtures rather
than by this table.

- Nothing moved in storage. The envelope, the save body and the snapshot gained
  no key and lost none, so an install written before the fix reads correctly
  after it. What changed is which values those keys hold.
- The wire reason needed no new vocabulary either. `reason` is already optional
  on the prompt object (`packages/react-native/src/protocol/wire-shape.ts:93`),
  and Swift already wrote all three values. The Android core was the one
  collapsing them: `SnapshotWire.reasonOf` derived the reason from `purpose`, so
  `expired` was unreachable from that platform no matter what its evaluator
  found. It now copies the evaluator's answer, and keeps the `purpose` fallback
  for the two paths that build a prompt without reading a policy at all, a
  pending resolution and a rule that never matched, where nothing was ever
  recorded whatever the answer says.
- `explicit-denial` appears in Kotlin's `restrictions` for the first time, for
  every stored `false`, under any authority, and in the kernel's push order
  rather than sorted. Any consumer that treated the reason list as a set has to
  read it as a sequence now; `["explicit-denial", "strict-scope"]` is the value a
  strict out-of-scope refusal produces.
- Under a `choice` rule the snapshot carries the choice obligation only. The
  notice beneath it stops being projected as a second thing owed, which is what
  `derivePromptRequirement` returns for that arm.
- The expiry instant did not move. Kotlin keeps `now - actionAt > choiceMs` and
  Swift keeps `expiry(of:maxAgeMs:) <= now`; those are the same comparison, and
  neither was touched while the three answers were, so a receipt that lapsed on
  the same millisecond before the fix does so after it.
- One packaging step is now part of the change. The pod compiles a copy of the
  core at `packages/react-native/vendor/C15tCore`, not
  `native/core-swift/Sources/C15tCore`, so a Swift evaluator fix that is not
  followed by `bun run scripts/sync-vendored-core.ts` ships the old answer to
  every iOS app. `--check` catches it and `scripts/check-publish-artifacts.ts`
  runs it at release, which is the only reason this is a note and not an
  incident.

Coverage closed the blind spot rather than the kernels alone: `native/protocol`
is at 74 fixtures with eleven new `evaluation-*` rows covering a four-category
scope cut to one, permissive and strict, a refusal paired with an expired
receipt and with a revision the record predates, and an `iab` rule held to
`opt-in`'s table. The anti-rot ledger in both fixture suites shed four
`explicit-denial` rows that stopped reproducing and gained the new ones, which is
the expected direction: a divergence fixed is a row deleted.

Gates at close: Kotlin 237 tests, Swift 187 tests, `@c15t/react-native` 578
tests, `check-types` clean, and the five-step Android journey on an emulator
with the banner and dialog geometry at web parity.

c15t mobile contract
====================

Authoritative reference for `@c15t/react-native`, the Swift core, and the Kotlin
core. Issue: https://github.com/c15t/c15t/issues/1010

IAB TCF is out of scope for this phase. No TC string, no GVL state, no
`IABTCF_*` keys. The types reserve the `iab` slot so adding it later is an
additive protocol change, not a rewrite.

Layout
------

    native/
      CONTRACT.md              this file
      protocol/                protocol fixtures, generated and consumed by all three impls
      core-swift/              C15tCore: SwiftPM package, no React Native, no UIKit
      core-android/            com.c15t.core: Gradle project, pure-JVM module + android lib module
      react-native/            (lives at packages/react-native, listed here for orientation)

Rules that hold everywhere
--------------------------

1. Native owns consent state. There is no second consent kernel in JavaScript.
   The React Native layer renders native state and forwards user actions. It may
   import `@c15t/core` for types and pure selectors, never for state ownership.
2. `core-swift` and `core-android` must not import React Native, Expo, UIKit, or
   Android UI classes. React Native bindings live in the `C15tReactNative` and
   `com.c15t.reactnative` targets only.
3. The Kotlin core logic must run on a plain JVM with no Android dependency.
   Storage, clock, and HTTP go through interfaces the Android layer implements.
   Same rule for Swift: no UIKit, and no Keychain outside the store conformances.
4. Both native cores must produce the same request bodies as `@c15t/core` for
   the same inputs. The fixtures in `native/protocol/` decide this. If a fixture
   disagrees, the TypeScript kernel is right until the contract says otherwise.
5. Unknown wire values fail closed. A native core that cannot parse a policy
   resolution serves `policyPending: true` with every optional category denied,
   and never invents a permission.
6. Never read or write IDFV, ADID, or any persistent device identifier for
   identity. The subject id is a generated UUID owned by c15t.

State model
-----------

Native holds one immutable `ConsentSnapshot`, versioned by `revision`. It mirrors
the fields of `ConsentSnapshot` in `packages/core/src/types.ts` that matter on
mobile, minus IAB:

    revision: number                  // monotonic, bumps on every mutation
    policyPending: boolean            // true until the first init resolves
    ready: boolean                    // false until hydrate() completed
    model: 'opt-in' | 'opt-out' | 'none'
    activeUI: 'none' | 'banner' | 'dialog' | null
    promptRequirement: { notice: boolean, acknowledge: boolean, purpose: 'initial'|'update'|null }
    effectivePermissions: { necessary, functionality, experience, measurement, marketing }  // all boolean
    explicitChoice: { consents, action, actionAt } | null
    consentCategories: string[] | null
    restrictions: { [category]: string[] }
    resolution: { status, policyId, fingerprint }
    policySnapshotToken: string | null
    subject: { id, externalId | null } | null
    location: { country, region, language } | null
    overrides: { country | null, region | null, language, gpc | null }
    privacySignals: { gpc: { detected, override | null, active } }
    optOutDirectives: []
    translations: KernelTranslations | null
    nextDeadline: number | null
    evaluatedAt: number
    error: { code, message } | null

`iab` is reserved. Serialize it as `null` and keep the key so an older JavaScript
layer does not have to branch.

`ready` and `policyPending` are the two flags a native SDK gate must consult.
While either is unset, every optional category reads `false`.

Native API (Swift and Kotlin, same shape)
-----------------------------------------

    bootstrap(config) -> Void         // idempotent, safe from any launch hook
    snapshot() -> ConsentSnapshot     // synchronous, never blocks on I/O
    isAllowed(_ category) -> Bool     // synchronous read of effectivePermissions
    gate(_ category, onChange)        // fires now and on every change
    onChange(_ observer)              // snapshot observer, weakly held
    save(_ intent) -> CommitResult    // 'all' | 'necessary' | explicit map
    dismissNotice()
    refresh()
    identify(user) / logout()
    setOverrides({ country, region, language, test })
    flushPending()                    // retry the offline queue

`snapshot()` and `isAllowed()` must not touch the network, the disk, or a lock
that can be held across either. They are called from ad SDKs on the main thread.

Persistence
-----------

iOS writes the snapshot envelope plus the consent records to the Keychain, using
a generic password item keyed by `com.c15t.subject` and `com.c15t.snapshot`.
Android writes them to encrypted storage backed by an AndroidKeyStore key, and
falls back to `SharedPreferences` when the keystore fails, logging once.

Hydration must complete before the React Native surface is useful, and the
cached snapshot must be readable without any network. Store the last known
snapshot so a cold start with no connectivity still answers `snapshot()` in the
first synchronous call. First launch with nothing stored returns
`ready: false, policyPending: true`, all optional categories `false`.

Transports
----------

Same three modes as the web SDK, same backend endpoints, same headers.

    x-c15t-version:            <native sdk version, prefixed rn->
    x-c15t-policy-contract:    <POLICY_CONTRACT_VERSION from @c15t/schema>

A backend that answers `unsupported-contract` is a hard configuration error. The
core emits `error` and stays deny-all rather than guessing the wire.

Writes go through a pending queue:

- Persist the `SavePayload` before the request, not after.
- One payload per explicit action, replayed unchanged. A later init that changes
  policy must not rewrite a queued payload.
- Retry on the next launch, on foreground, and on reachability change.
- Keep at most the newest 20 payloads, oldest dropped first.

Subject identity
----------------

Generate a UUID v4 at first launch, store it in the same protected storage as the
records, and send it as the subject id. Do not derive it from any hardware
identifier. If the app is reinstalled, the store is gone and the subject starts
fresh, which matches the web SDK when storage is cleared.

React Native boundary
---------------------

New Architecture only. TurboModule plus Codegen, no legacy bridge, no
`NativeModules` string lookups.

    getBootstrap(): BootstrapPayload          // sync, once per provider mount
    getSnapshot(): ConsentSnapshot            // sync, JSON string
    commit(intent: CommitIntent): Promise<CommitResult>
    setOverrides(overrides): Promise<void>
    dismissNotice(): void
    refresh(): Promise<void>
    identify(externalId): Promise<void>
    logout(): Promise<void>
    addListener(eventName): void              // RNEventEmitter spec
    removeListeners(count): void

Events: `snapshot`, `error`, `initialized`. The payload is a JSON string. The
module never sends a snapshot the JavaScript side already holds: it emits the new
`revision` and JavaScript pulls with `getSnapshot()` only when a mounted
subscriber needs it. Selector subscriptions in `@c15t/react-native` compare the
selected value and rerender only on a change.

Version handshake
-----------------

`getBootstrap()` returns `protocolVersion`. The provider throws a readable error
when `protocolVersion` is outside the range the installed JavaScript package
supports. This catches the Expo Updates case where a JavaScript-only update ships
against an older embedded native build.

Conformance fixtures
--------------------

`native/protocol/*.json`, generated by `packages/react-native/scripts/` from the
TypeScript kernel. Three kinds:

- `evaluation-*.json`  policy resolution plus stored records in, snapshot out.
- `save-body-*.json`   snapshot plus action in, exact request body out.
- `storage-*.json`     serialized envelope round-trip.

Each native core runs every fixture in its own test runner. A fixture that only
one platform passes is a bug on that platform, not a permitted difference.

Benchmarks
----------

Budgets, measured on the reference device profile agreed in the issue:

- `bootstrap()` to first synchronous `snapshot()`: under 5 ms warm, under 15 ms cold.
- `snapshot()` and `isAllowed()`: no allocation of a new snapshot per call.
- Hydrate from stored envelope: under 3 ms for a realistic payload.
- Consent action to native commit acknowledged: under 50 ms without network.
- React rerenders per consent change: at most one per subscribed component.
- Cold-start overhead attributable to c15t: under 10 ms.

Report them as numbers from the bench tasks, not as claims.

Implemented layout
------------------

Recorded here as the pieces land, so the Swift, Kotlin, and JavaScript workers
build against the same reality.

- `packages/react-native/src/protocol/` is the TypeScript source of truth for the
  boundary types. `PROTOCOL_VERSION` and the supported range live in `version.ts`.
- The Codegen spec is `packages/react-native/src/specs/NativeC15t.ts`. The
  codegen config name is `C15tSpec` and the module name is `C15t`. Native targets
  must register exactly that module name.
- The package expects iOS at `packages/react-native/ios/` with
  `C15tReactNative.xcodeproj`, and Android at `packages/react-native/android/`.
- Fixtures live in `native/protocol/*.json`. Each object carries `id`, `kind`,
  `description`, `notes`, `protocolVersion`, `input`, and `expected`. A native
  test reads `input`, computes, and asserts against `expected`. Regenerate with
  `bun run --cwd packages/react-native generate:fixtures`, which is byte-stable.
- The fixture kinds so far are `evaluation-*` and `save-body-*`. Storage
  round-trip fixtures are still missing and are owed by whoever adds the native
  envelope format.

Kotlin core, as built
---------------------

`native/core-android/` is a Gradle 9.4.1 project with the wrapper checked in.

- `c15t-core` is the pure-JVM consent engine. A test asserts that no source file
  imports `android.*`, so keep it that way. Run it with
  `./gradlew :c15t-core:test --console=plain`.
- `c15t-android` implements the storage and lifecycle ports: AndroidKeyStore
  encrypted storage with a `SharedPreferences` fallback, an `androidx.startup`
  `Initializer` that calls `bootstrap()`, and a `ProcessLifecycleOwner` observer
  that calls `flushPending()` and `refresh()`.
- Measured on the development machine, release JVM: hydrate 25.4 us, policy
  evaluation 0.63 us, snapshot plus three `isAllowed` reads 0.04 us, save
  acknowledged without network 102 us. `./gradlew :c15t-core:bench` reproduces them.
- Known gap, still open: losing the keystore key regenerates the subject id
  instead of keeping the previous one, so audit continuity breaks across a keystore
  reset. The subject id is a random UUID and not sensitive, so it belongs in
  unencrypted storage that survives a key reset.

Swift core, as built
--------------------

`native/core-swift/` is a standalone SwiftPM package, `C15tCore`, plus a
`C15tCoreBench` executable. No UIKit, React Native, or Expo imports.

- Verified with `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`. The
  machine's `xcode-select` still points at Command Line Tools, whose SwiftPM is
  broken, so every Swift command needs that environment variable. Set it in CI too.
- Layout: `ConsentCore`, `ConsentSnapshot`, `ConsentRecord`, `ConsentCategory`,
  `ConsentStore` with in-memory, file, and Keychain conformances, `PolicyEvaluator`,
  `PolicyWire`, `SavePayload`, `StoredEnvelope`, `PendingSaveQueue`,
  `SubjectIdentity`, `Transports`, `Events`, `Lock`, `JSONValue`.
- Measured: hydrate from store 212.67 us, policy evaluation 1.82 us mean, snapshot
  and isAllowed 0.09 us each over 500000 iterations, save acknowledged without
  network 205.74 us in memory and 1434.66 us on FileStore. `swift run -c release
  C15tCoreBench` reproduces them.
- The iOS simulator slice builds with
  `xcodebuild -destination 'generic/platform=iOS Simulator' build`.
- Open defect in the fixtures, not the core: the `evaluation-*.json` inputs carry
  raw `policyRules` rather than the `policyResolution` a client actually receives
  from `/init`. Neither native core can assert against them yet. Fix the generator
  to emit the wire shape and wire both native test suites to it.

Corrections to this contract
----------------------------

The first draft of this file was wrong in two places, and both were caught by an
implementation rather than by review. The TypeScript kernel is the authority, so
the contract moved, not the kernel.

- Overrides are `KernelOverrides`: `country`, `region`, `language`, and `gpc`.
  There is no `test` override. Publisher test mode is a client option, not an
  override, and it never reaches the save body. The `gpc` override is load
  bearing: `decisionInputsMatchOverrides` in `@c15t/core` compares it against the
  decision inputs remembered from the last init, and a save whose inputs no
  longer match is rejected as stale. A native core that drops `gpc` cannot
  produce a valid save body.
- Privacy signals follow `KernelPrivacySignals`: `gpc` is an object with
  `detected`, `override`, and `active`, and the evaluator honors `active`. There
  is no `msa` signal anywhere in v3.

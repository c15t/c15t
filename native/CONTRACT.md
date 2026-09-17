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
    overrides: { country | null, region | null, language, test | null }
    privacySignals: { gpc: boolean, msa: boolean }
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

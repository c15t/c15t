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

Revisions and error writes
--------------------------

One committed mutation is one revision bump and one publication. The two are not
independent knobs, and a core that splits them breaks the boundary in a way no
single core can see from its own tests.

A committed mutation is one `/init` response folded, one consent commit accepted,
one notice dismissal recorded, and one identity change. Each of them bumps
`revision` by exactly one, and is published exactly once through the core's whole
publication path: the snapshot event, every registered snapshot observer, and the
envelope write. Not a subset of those three. A core may report several mutations
from one operation (hydrate and then re-evaluate), and it may do nothing at all
when nothing arrives, but it may not bump without publishing or publish without
bumping.

**An error is snapshot state, so it travels on a revision.** `error` is a field
of the snapshot the way `model` and `location` are, and that settles the question
the first draft of this file left open: there is no revision-free write. A core
that records `unsupported-contract` has committed a change, and that change
reaches JavaScript on the `snapshot` event, from the observers, in the persisted
envelope. The paired `error` event is a convenience for a host that wants the
code without pulling a snapshot. It is never the only route, and nothing may rely
on it rescuing a snapshot event that was dropped.

That reliance is what makes the pair load-bearing rather than tidy. The pump
dedups by revision: it drops a `snapshot` event whose revision it has already
announced, and `client.ts` returns early when a snapshot event carries the
revision it already holds. A mutation that bumps without publishing is therefore
invisible to JavaScript twice over, and a snapshot event with an unchanged
revision is discarded twice over. The rule is what lets the pump dedup by
revision and stay correct.

The rejected alternative was to declare error writes revision-free and forbid the
bridge from carrying an error on a `snapshot` event at all. It fails on the
observers: an error write that is not a mutation would still be a publication, so
every repeated error would wake every subscriber for nothing, and "exactly one
event per committed change" would need an exception per error path. It also is
not what the kernel does -- `@c15t/core` folds a refused `/init` into a committed
patch like any other.

Two things this rule deliberately does not decide. Whether a re-served response
whose every field already matches is a value change: the kernel counts an
`/init` as a mutation each time it is folded, `revision-trace-*.json` carries the
numbers the kernel produced, and both cores match them. And the revision a core
*starts* from: hydration and bootstrap are mutations in some cores and not in
others, and `reset()` installs a fresh baseline instead of moving one, so absolute
revisions are still not comparable across the three implementations. What each
step costs is comparable, and the fixture pins that.

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

That dedup is only safe because of "Revisions and error writes" above. The pump is
fed by the core's snapshot observers, not by the core's own event hub, so a
mutation that never reached the observers is a mutation JavaScript cannot learn
about by any route except the paired `error` event -- which is the accident the
iOS core had instead of the rule.

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

- `evaluation-*.json`  transport response plus stored records in, snapshot out.
- `save-body-*.json`   transport response plus action in, exact request body out.
- `storage-*.json`     serialized envelope round-trip.
- `revision-trace-*.json` a mutation sequence in, the revision trace the kernel
  produced for it out: one `{ step, revisionDelta, publications }` per step. This
  is the cross-core parity fixture. It pins what each step costs rather than the
  absolute revision, because that is the half the three implementations can share.

An `input` is what a client actually sees, never a convenience shape a generator
invented. Every fixture carries `now` (the fixed clock every side must use),
`hydrated`, the literal `transport` response (`status`, `headers`, and the `/init`
`body`, which holds the `policyResolution` wire value rather than raw
`policyRules`), the `storedRecords` protected storage holds at start, the device's
`overrides` and `privacySignals`, and `user`. A `save-body-*` input adds the
`intent`. Nothing is derived from a random value: the subject id is always
supplied, and it is a UUID v4 because the Swift core refuses any other identity.

An `expected` is what the kernel produced for that input. It is not hand-written.
`evaluation-*` and `storage-*` pin `snapshot`, the subset of the mobile snapshot
named above. `save-body-*` pin `snapshotBefore`, `snapshotAfter`, the `savePayload`
the core must hold, and `request`: the exact `method`, `path`, `headers`, and `body`
the backend receives, including the `x-c15t-policy-contract` value. `storage-*` pin
`decode`, `reEncoded`, and the snapshot.

`index.json` lists every fixture with `id`, `kind`, `protocolVersion`, `file`,
`bytes`, and `sha256`, plus the shared `clock`, `count`, `protocolVersion`, and
`policyContractHeader`. A runner enumerates the index rather than the directory, so
no platform hard-codes file names, silently skips a fixture, or reads a file that
was edited after generation. Every runner verifies each hash, and the generator
refuses to write a fixture whose `protocolVersion` differs from `PROTOCOL_VERSION`.

Each native core runs every fixture in its own test runner and prints how many it
ran. A fixture that only one platform passes is a bug on that platform, not a
permitted difference. Where a core is knowingly wrong, its runner keeps an explicit
row per field with the reason; a difference that is not listed fails the run, and so
does a listed row that no longer reproduces. Nothing may be skipped silently.

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
- Fixtures live in `native/protocol/*.json`, one file per case plus `index.json`.
  Each fixture carries `id`, `kind`, `description`, `notes`, `protocolVersion`,
  `input`, and `expected`. A native test reads `input`, computes, and asserts
  against `expected` field by field. Regenerate with
  `bun run --cwd packages/react-native generate:fixtures`, which is byte-stable:
  two runs produce the same bytes, so a diff in `native/protocol/` is always a
  real change and never a timestamp.
- All four kinds are generated. `evaluation-*`, `save-body-*`, and
  `revision-trace-*` are claimed and run by both native cores. `storage-*` are
  claimed by neither: they pin the web v3 envelope codec, which no native core
  implements. Both runners report them as unclaimed by name rather than dropping
  them from the count, and a kind with no runner in a core fails that core's run
  rather than being skipped, which is what keeps the parity fixture parity.

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
- Losing the keystore key keeps the subject id. It lives in its own plain
  `c15t.subject` preference file, outside the encrypted records, because it is a
  random UUID and carries nothing sensitive. `SubjectPreservingStore` routes it
  there and migrates installs that had it encrypted, once and idempotently. When
  a key dies, `ResilientKeyValueStore` deletes the blobs it can no longer open,
  warns once, and serves deny-all with `policyPending: true`. The SPI exposes
  `KeyValueStore.keys()` for that purge only, and defaults to `emptySet()`.
- Every mutation in `C15tKernel` already ended in `persist()` and
  `notifySnapshot()` together, including the failed-init path that records
  `unsupported-contract`, so this core needed no change to satisfy "Revisions and
  error writes". `ProtocolFixtureTest` runs the revision trace to keep it that way:
  the same four steps, the same two numbers per step, the same expectations the
  Swift runner reads.

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
- `Tests/C15tCoreTests/ProtocolFixtureTests.swift` runs the shared fixtures: it
  enumerates `index.json`, verifies every hash and `protocolVersion`, dispatches on
  `kind`, and diffs the produced snapshot against `expected` recursively, so a
  mismatch names the field and both values. It claims 13 of 16 fixtures; the three
  `storage-*` cases are reported unclaimed.
- Fixed while wiring the revision trace: the unsupported-contract branch of
  `reportInitFailure` wrote `error` and announced the new revision on the core's own
  event hub, but never called `publish()`. The React Native pump is fed by
  `onChange`, not by that hub, so iOS bumped the revision with no observer
  notification and no envelope write: the error write was committed and unpublished,
  exactly what "Revisions and error writes" forbids. It goes through `publish` now.
  The `revision-trace-*` fixture is what catches it, and only on the `publications`
  column: the revision deltas agree either way, which is why the fixture observes
  both.
- Fixed while wiring the fixtures: `save()` reported `uiSource` from the snapshot
  published after the commit, so a save made from the dialog after the banner had
  already cleared said `banner`. The surface the subject acted on is now captured
  before the state changes. The fixtures pin the save body, so this was visible.
- Fixed while wiring the fixtures: `restrictions` encoded as one flat array of
  alternating keys and values (`["marketing",["gpc"]]`), because a Swift
  dictionary keyed by an enum has no coding key of its own. The protocol says an
  object keyed by category, which is what the kernel and Kotlin send, so the field
  was unreadable to JavaScript even though the reasons inside it were right.
  `OptionalConsentCategory` now supplies the coding key and the categories are
  written in name order, so a stored snapshot does not depend on dictionary order.
  Snapshots stored by an earlier build no longer decode, and the store treats an
  unreadable envelope as nothing stored, which fails closed.

iOS packaging, as built
-----------------------

A host app integrates two pods, both resolvable from this repository:

    platform :ios, '16.4'

    pod 'C15tCore',         :path => '../native/core-swift'
    pod 'C15tReactNative',  :path => '../packages/react-native'

- `C15tCore.podspec` mirrors `Package.swift`: the iOS 16.4 floor, `Sources/C15tCore`
  only, and `Resources/Privacy.xcprivacy` in a `C15tCore` resource bundle, the same
  shape the binding's podspec uses. `C15tCoreBench` is an executable and has no pod
  product. The app must declare iOS 16.4, which is above RN 0.87's own 15.1 floor.
- `packages/react-native/package.json` needs
  `codegenConfig.ios.modules.C15t.className = "C15tReactNativeModule"`, because RN
  0.87 resolves TurboModules through generated `RCTModuleProviders`. Verified by
  running RN's own generator against this package: it emits
  `@"C15t": @"C15tReactNativeModule", // @c15t/react-native`.
- `com.c15t.reactnative.AutoBootstrap = false` in `Info.plist` skips the constructor
  that starts the core before React Native initializes. An app that does that must
  call `C15tReactNativeRuntime.install(core:)` or `startCore()` itself, before the
  React host starts, or the module reads an empty deny-all store.
- Resolution is proven, not parsed: `pod install` in a throwaway RN 0.87.1 app under
  /tmp installed 85 pods including both c15t pods from those paths, under
  CocoaPods 1.17.0 and `DEVELOPER_DIR` pointing at Xcode 27.
- The binding's RN config file is `react-native.config.cjs`, not `.js`. RN's tooling
  loads that file with `require`, and inside a package declaring `"type": "module"` a
  plain `.js` file is ESM to every loader that respects the field. This is preventive,
  not a reproduced fix: no task in this repository runs library-mode codegen (see the
  next bullet), so nobody here has watched it fail. Node 24 hides the hazard locally
  anyway, because its module-syntax detection reads `module.exports` as CommonJS and a
  bare `require` probe succeeds. `.cjs` removes the question for loaders that do not
  guess. App-mode codegen reads `autolinking.json` and is unaffected either way.
- `c15t.spec.source` is documented in the binding's `gradle.properties` as
  `auto`/`stub`/`codegen`, but no build script reads it: `:c15t-spec` always compiles
  the stand-in. So nothing in this repository has ever run RN's generator against
  `src/specs/NativeC15t.ts`, and the claim that the stand-in matches Codegen output is
  unverified. Setting the property to `codegen` now fails the build with an explicit
  message instead of reporting a green run that never asked Codegen anything. Wiring a
  real codegen task, and running it in CI, is open work.

Expo config plugin, as built
----------------------------

`packages/react-native/src/expo-plugin/` is published as
`@c15t/react-native/expo-plugin`. It runs at `expo prebuild`, `expo run:*`, and
`eas build` time and ships nothing that executes in the app, so Continuous
Native Generation needs no patch step and `prebuild --clean` loses nothing. Its
default export is `withC15t` inside `createRunOncePlugin`, and
`applyParamsOnConfig` is exported next to it because that is the pure core the
tests drive. A standard install adds one `plugins` entry and nothing else:

    ["@c15t/react-native/expo-plugin", {
      "backendURL": "https://consent.example.com",
      "publicKey": "pk_live_7f3a9c"
    }]

`backendURL` is required in every mode but `offline`, and a base path is allowed
so a same-origin deployment works unchanged. `mode` is `hosted`, `selfHosted`,
`offline`, or `custom`. `publicKey` is a publishable key only: the plugin refuses
anything shaped `sk_`, `secret_`, `private_`, or `rk_`, because the value lands
in a public IPA and APK. `forceGPC` is for staged builds. `autoBootstrap`
defaults to `true`, and to `false` under `mode: 'custom'`, where leaving it on
would race the host. `skipNativeBuildCheck` waives the Expo Go check for a
harness that drives `expo start` in a container without opening Expo Go.

Keys the plugin writes
----------------------

Both platforms get the flat reverse-DNS names their readers already use, not a
`C15t` dictionary. iOS reads them through `C15tBridgeConfiguration.InfoPlistKey`,
Android through `C15tAndroid` and `C15tReactNativeBootstrap`:

    iOS Info.plist                      Android <meta-data>
    com.c15t.backend.url                com.c15t.PORTAL_URL
    com.c15t.backend.mode               (mode is presence and absence)
    com.c15t.backend.domain             com.c15t.DOMAIN
    com.c15t.gpc                        com.c15t.FORCE_GPC
    com.c15t.backend.initUrl            com.c15t.INIT_URL
    com.c15t.backend.publicKey          com.c15t.PUBLIC_KEY
    com.c15t.reactnative.AutoBootstrap  com.c15t.reactnative.AUTO_BOOTSTRAP

The two spellings differ because the readers already did, and a plugin that
tidied that up would write keys nothing reads. Absent values stay absent: the
bridge treats a missing key as "not configured" and has to parse an empty
string. `AutoBootstrap` is written only in the opt-out case, since on is the
bridge's own default.

Two keys have no reader yet: `com.c15t.backend.publicKey` /
`com.c15t.PUBLIC_KEY`, and iOS `com.c15t.backend.initUrl`. The cores identify a
project by backend URL, so these are written for proxy routing and so support can
read them off a build. The next bridge pass either adopts them or the plugin
drops them.

`mode` is spelled three ways on purpose. `custom` is the iOS bridge's `none` and
no androidx.startup initializer on Android. `offline` embeds no backend URL at
all. `selfHosted` reaches JavaScript as `hosted`, because
`ProviderTransportKind` in `@c15t/core` has no self-hosted kind. JavaScript reads
the same values from `extra.c15t`: `backendURL`, `initURL`, `domain`,
`publicKey`, `mode`, `enableAppTrackingTransparency`, and the `protocol` range.
There is no second config source.

Rules the plugin enforces at build time
---------------------------------------

- App Tracking Transparency is opt-in and never implied.
  `NSUserTrackingUsageDescription` and `SKAdNetworkItems` are written only under
  `enableAppTrackingTransparency: true`, which also requires
  `trackingUsageDescription` because Apple rejects a string the plugin invented.
  A prompt string the host already wrote survives. Consent to marketing cookies
  is not Apple tracking authorization, so no consent setting turns these on.
- The privacy manifest is declared as `ios.privacyManifests`
  (`NSPrivacyTracking`, `NSPrivacyTrackingDomains`) instead of as a
  `PrivacyInfo.xcprivacy` the plugin writes itself, because prebuild's default
  plugins already merge that field and would fight the file.
  `NSPrivacyTracking` mirrors the ATT opt-in. `NSPrivacyTrackingDomains` defaults
  to the backend host, has to contain it when ATT is on, and is refused when ATT
  is off, because a tracking domain with no tracking prompt is not a claim the
  plugin can make for the host. The core declares no required-reason API: the
  Keychain and its own application-support files are not on Apple's list.
- Android gets `android.permission.INTERNET` and an
  `androidx.startup.InitializationProvider` with authority
  `${applicationId}.androidx-startup` pointing at
  `com.c15t.reactnative.C15tReactNativeInitializer`, so the core is hydrated
  before the first Activity exists. Starting it twice is harmless, since
  `C15t.bootstrap` ignores the second call. In an SDK 57 prebuild only the
  provider is observable in a diff against the same app with no plugin: the
  bare template already asks for INTERNET, so the plugin's write lands on a
  permission that is already there.
- The root and app gradle files have `minSdk` and `compileSdk` raised to 24 and
  36, the floors in `native/core-android/gradle/libs.versions.toml`. Below them
  the manifest merger fails with a message that names neither c15t nor the
  number. Only literal values are touched, never `targetSdkVersion` or a
  `rootProject.ext` indirection. That carve-out now swallows the whole rule: an
  SDK 57 template writes no literal SDK number anywhere, because
  `app/build.gradle` reads `rootProject.ext.compileSdkVersion` and the
  `expo-root-project` Gradle plugin supplies it at build time. So the raise
  never fires on a current template, and nothing here has measured what that
  plugin resolves. Checking the floors against the resolved values, or dropping
  this step, is open work.
- Expo Go fails the build with a message rather than failing at runtime. The
  check stays quiet when an `EAS_BUILD*` variable is set, when the command is a
  native one (`prebuild`, `run:`, `build`, `config`, `doctor`), or when an `ios/`
  or `android/` directory exists.
- Registering the module by hand as well is an error, detected in
  `MainApplication` (`C15tReactNativePackage`), in `ios/Podfile`
  (`pod 'C15tReactNative'`), and in `android/app/build.gradle`
  (`project(":c15t-react-native")`). Autolinking and the plugin are the only two
  supported routes, and combining them yields two registrations.
- An over-the-air bundle cannot outrun the binary. With `updates.url` set and no
  `runtimeVersion` the plugin throws, since that combination serves any JavaScript
  revision to any shipped binary. The supported range goes out in
  `extra.c15t.protocol`, which is what `getBootstrap()`'s `protocolVersion` gets
  checked against in the version handshake above.

How Expo loads the plugin
-------------------------

`@expo/config-plugins` is CommonJS, and `@expo/require-utils` hands a plugin
specifier to Node's CommonJS resolver, then `require()`s whichever file comes
back. Resolution takes the first matching condition in `exports`, so
`./expo-plugin` lists `require` ahead of `import` and points it at
`dist/expo-plugin/index.cjs`: one bundled CommonJS file from a second `rslib`
entry with `bundle: true` and `format: 'cjs'`, which `autoExtension` names
`.cjs` because the package declares `"type": "module"`.

Bundling is the load-bearing half, not the extension. An unbundled CommonJS tree
fails the way the ESM tree did: the entry itself loads, then the real `require`
of its `./constants.js` sibling throws `ERR_REQUIRE_ESM`. That is the exact error
a real `expo config` produced before this was settled, and it is why the entry is
`bundle: true` while the rest of the package stays bundleless.
`@expo/config-plugins` stays external, so the plugin registers its mods through
the host's own `withMod` rather than a second copy of the library.

Node versions that are safe: `require()` of an ES module is unflagged on
Node 20.19+, 22.12+, and 24+, and `@expo/require-utils` names that same set as
its own floor. On anything older, and on any of those with
`--no-experimental-require-module`, only a CommonJS entry loads. Metro and every
bundler still take the `import` condition, and nothing outside
`src/expo-plugin/` imports it, so the ES module entry stays the public one for
the app bundle.

Proven against a generated project rather than a unit harness: Expo SDK 57.0.23,
`expo` CLI 57.0.25, `@expo/config-plugins` 57.0.9, in a `create-expo-app` blank
template under /tmp. `expo config --type prebuild` loaded the plugin on Node
24.21.0, 22.22.2, and 20.19.6, and again on 24.21.0 with
`--no-experimental-require-module`; the same run on the ESM-only build threw
`ERR_REQUIRE_ESM` under that flag. `expo prebuild --platform ios --no-install`
and `--platform android --no-install` both finished clean, and the `Info.plist`,
`PrivacyInfo.xcprivacy`, and `AndroidManifest.xml` they wrote carry the keys
above, including the `mode: 'custom'` shape: `com.c15t.backend.mode` of `none`,
both auto-bootstrap keys `false`, and no androidx.startup provider at all. The
privacy manifest is the plugin's doing and not the template's, since the same
template with no plugin writes no `PrivacyInfo.xcprivacy`.

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
- `optOutDirectives` is not "always empty on mobile". A live GPC signal commits a
  standing directive the moment init is applied, with `recordedAt` equal to the
  clock the init was evaluated at, so a fixture with an active signal carries one
  directive and its categories carry the `opt-out-directive` restriction as well as
  `gpc`. Both native cores were told to expect an empty array and neither recorded
  directives at all.
- `revision` is a monotonic counter over committed mutations, not a count of the
  steps a runner took. An active privacy signal commits a directive during init, so
  that fixture is already at 2 where the others reach 1. It is not comparable
  across the three implementations, because hydration and bootstrap are mutations in
  some cores and not in others, and the absolute number a fixture states is therefore
  each core's own business. Pin the number a fixture states; do not derive it from
  how many calls the runner made. What *is* comparable is the cost of a step, and
  `revision-trace-*.json` pins that per step; "Revisions and error writes" is the
  rule it pins.

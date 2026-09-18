# c15t native core (Swift)

`C15tCore` is the consent kernel behind `@c15t/react-native` on Apple platforms. It owns
consent state on the device: the snapshot model, policy evaluation, gated reads,
persistence, the offline write queue, and subject identity.
[`../CONTRACT.md`](../CONTRACT.md) is the shared model; this package implements it in
Swift, and `../core-android` implements it in Kotlin against the same fixtures.

IAB TCF here is the wire, not the flow: TC Strings decode and encode
byte-for-byte against the shared fixtures in `../protocol`, the vendor list `/init`
served is kept and only that list ever reaches the device, and `snapshot.iab`
carries it as `{ gvl }`. The flow is not wired: the strict policy reader still
rejects a wire model of `iab`, no `tcString` is saved with a decision, and the
`IABTCF_*` bus is not written. See `../CONTRACT.md`.

Depends on Foundation and Security only. No UIKit, no AppKit, no React Native, no Expo,
which is what lets the same sources serve SwiftPM, CocoaPods (`C15tCore.podspec`), an app
extension, and a `swift test` run on macOS. The React Native bindings live in
`../../packages/react-native` and are the only target allowed to import this one and
React at the same time.

## Commands

```bash
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
swift build                              # the library and the bench executable
swift test                               # the whole suite, including the protocol fixtures
swift run C15tCoreBench                  # measured numbers against the contract budgets
```

`Tests/C15tCoreTests/ProtocolFixtureTests.swift` runs every fixture in
`../protocol/index.json`, so a wire-format change here has to agree with the TypeScript
kernel and the Kotlin core before it merges.

## Public surface

`C15t` is the process-wide install point (`install`, `bootstrap`, `current`), so an
`AppDelegate` and the bridge share one kernel instead of starting two over one Keychain.
Everything below is on `ConsentCore`, and `C15t` forwards the synchronous reads.

| Read | Answer |
| --- | --- |
| `snapshot()` | The whole state, synchronously. |
| `isAllowed(_:)` | Boolean permission for one category. `false` covers a refusal and an unresolved policy alike. |
| `decision(for:)` | `granted`, `denied`, or `pending` for one category, for a host app's own SDK code. |
| `isReady()` | Hydrated, and the first init resolved a readable policy. |
| `gate(_:_)` | Boolean gate on one category: fires now and on every change. Used by the bridge. |
| `gate(_:_:)` (decision) | Same, carrying `ConsentDecision`, so a `pending` category keeps listening. |
| `onChange(_:)` | Snapshot observer, held weakly. |
| `eventStream` | `CoreEvent`s as an `AsyncStream`. |

Writes are `save(_:)`, `dismissNotice()`, `refresh()`, `identify(_:)`, `logout()`,
`setOverrides(_:)`, and `flushPending()`. `bootstrap(_:)` is idempotent and safe from any
launch hook, and hydrates synchronously so the first `snapshot()` after it already
reflects stored consent with no network.

### Hot path

`snapshot()`, `isAllowed(_:)`, `decision(for:)`, and `isReady()` are one read of the
in-memory `ConsentSnapshot` behind `Lock`. No disk, no network, and the lock is never held
across either, which `Lock.withLock`'s synchronous closure makes unrepresentable. Ad SDKs
call them from `applicationDidFinishLaunching`, where a block is a watchdog kill billed to
the host app.

`decision(for:)` derives from the snapshot and nothing else: `necessary` is `granted`;
while `ready` is false or `policyPending` is true every optional category is `pending`;
otherwise the effective permission decides. `ready` means the core has been told rather
than that a file existed: it comes from hydration restoring an envelope or from the first
init resolving, and a failed init leaves it low. No platform authorization participates. ATT
granted with consent refused is `denied`, and the identifier stays unavailable.
`pending` carries no timeout: a device that never reaches its backend stays `pending`, and
a core that picked a deadline would be inventing an answer the policy never gave.

### Fail closed

Anything this build cannot read is indistinguishable from a fresh install: `policyPending`
true, every optional category `false`, and nothing from those bytes applied. That covers an
unreadable policy resolution, an unknown category, a producer on another policy contract,
and a stored envelope this build cannot decode. The subject id survives all of them.

## Storage

The host chooses one of `KeychainStore`, `FileStore`, or `InMemoryStore` by picking a
storage mode; the core has no default store, and a binding that cannot build the one it was
asked for stays inactive rather than substituting a plaintext file. Both protected items go
through `StorageKey`, and the subject id has its own item, so losing a consent envelope
never costs a device its identity.

`Resources/Privacy.xcprivacy` declares the collected identifiers. It ships in the
`C15tCore` resource bundle, and an app that links the kernel still merges it into its own
`PrivacyInfo.xcprivacy`. The core never reads IDFV, ADID, or any other persistent hardware
identifier: the subject id is a `sub_` identifier this package generates.

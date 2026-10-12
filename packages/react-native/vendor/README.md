# Vendored native sources

Generated. Do not edit anything in this directory.

`C15tCore/` is a byte-for-byte copy of `../../../native/core-swift/Sources/C15tCore`, written
by `bun scripts/sync-vendored-core.ts`. The binding's pod compiles that copy into its own
module, which is what lets an app installed from npm resolve a consent kernel: CocoaPods cannot
point `s.dependency` at a path, so a `C15tCore` dependency is a pod the consumer does not have.

`native/core-swift` stays the source of truth. `packages/react-native/Package.swift` stays
two-module and keeps the core as its own SwiftPM target, so a later Swift Package Manager
release of the core is unaffected by this directory. The bridge's `import C15tCore` sites are
wrapped in `#if canImport(C15tCore)`, so one set of core sources serves both build paths.

After changing anything under `native/core-swift/Sources/C15tCore`, run:

```sh
bun scripts/sync-vendored-core.ts
```

`bun scripts/sync-vendored-core.ts --check` reports every missing, differing, and orphaned
file instead of writing. The release gate runs it, so a stale copy fails the pull request and
cannot be published.

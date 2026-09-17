# c15t React Native fixture (bare)

A bare React Native 0.87 app on the New Architecture, wired to `@c15t/react-native`.
It exists to be run, not to be looked at: one screen reports what the native consent
kernel says, the rest of the buttons drive every action a subject can take, and the
UI is as plain as the information it shows.

It is a test fixture for the SDK in this repository. Nothing here is a starter kit or
a design reference.

## What it exercises

- `C15tProvider` and the protocol handshake against the Swift/Kotlin core in the
  binary, with the mismatch error surfaced on screen instead of a red box.
- The headless surface: `useConsent`, `useConsentActions`, `useC15tBootstrap`,
  `useIsAllowed`, `ConsentGate`, `ConsentReady`, `ConsentPrompt`.
- The built-in `ConsentBanner`, `ConsentDialog`, and `ConsentPreferences`.
- Consent-gated loading, shown as a vendor component that mounts and unmounts and
  counts its own mounts, so a gate that opens early is visible rather than inferred.
- Persistence and the offline write queue, through the checklist below.
- A fake native core that samples `isAllowed` on a timer, so the gating path can be
  watched without a device, a backend, or a rebuild. See
  [Fake core](#fake-core).

Only the public package entry point is imported. There are no imports from
`packages/react-native/src`, so what breaks here breaks for a developer who installs
the package from the registry.

## Setup

```sh
bun install                        # from the repository root
cp .env.example .env
```

`.env` is ignored; `.env.example` is the committed template. `babel.config.js` loads
it and inlines every `process.env.C15T_*` read at build time, which is the only way a
value reaches a React Native bundle. A variable already in the real environment wins,
so `C15T_FAKE_NATIVE=true bun run android` overrides the file.

Point the native core at a backend by editing the two files the core actually reads:

- `ios/C15tBare/Info.plist` → `com.c15t.backend.url`, `com.c15t.backend.mode`
- `android/app/src/main/AndroidManifest.xml` → `com.c15t.PORTAL_URL`

Android has no mode key; it infers the transport from which keys are present. An
absent key means "not configured", so leave a value out rather than setting it to an
empty string. `examples/expo-dev` gets the same keys written by the config plugin.

There is no key to add. A c15t project is identified by its backend URL, and neither
`/init` nor `/subjects` carries a credential, so nothing here takes one.

For a local backend, `examples/demo` serves one at `/api/self-host`:

```sh
bun run --cwd examples/demo dev:localhost      # http://localhost:3000
adb reverse tcp:3000 tcp:3000                  # Android emulator -> host
```

The default `http://localhost:3000/api/self-host` works on the iOS simulator and on
Android after `adb reverse`. The manifest already allows cleartext on debug builds;
iOS ships `NSAllowsLocalNetworking`.

## Commands

Run them from this directory, or from the root with `bun run --cwd examples/react-native-bare <script>`.

| Command | What it does |
| --- | --- |
| `bun run start` | Metro. `start:reset` adds `--reset-cache` |
| `bun run pod-install` | `pod install` for `ios/` |
| `bun run ios` / `bun run android` | Build and launch |
| `bun run bundle` | Release bundle for both platforms into `.artifacts/` |
| `bun run check-types` | `tsc --noEmit` |
| `bun run lint` / `bun run fmt` | Oxlint and Oxfmt, from the repo presets |

Both native cores are built from this repository rather than resolved from a package
registry, and both need one line of wiring an app outside the monorepo would not carry.
Neither is c15t behaviour; both are marked in the file.

- iOS: the first run needs `bun run pod-install`. The Podfile adds `pod 'C15tCore',
  :path => '../../../native/core-swift'` and sets the deployment target to 16.4, which is
  the core's floor and above RN's. `@c15t/react-native`'s own pod is autolinked. Build
  against the published pod with `C15T_LOCAL_PODS=false`.
- Android: `android/settings.gradle` includes `../../../native/core-android` and
  substitutes `com.c15t:c15t-core` and `com.c15t:c15t-android` into that build, because
  the autolinked library depends on those coordinates and a host app's settings script
  is what resolves them. Pass `-Pc15t.core.fromSource=false` to resolve published
  artifacts instead. JDK 17 and an Android SDK are required; set `ANDROID_HOME` or write
  `sdk.dir` into `android/local.properties`.

This machine's `xcode-select` points at Command Line Tools, so every Xcode invocation
needs `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`.

## Native build status

Verified here: `bun run check-types` is clean, `bun run bundle` writes a release bundle
for both platforms, `pod install` completes, and the Android app gets through Gradle
configuration. Both platforms have been built, installed and launched;
[Device run](#device-run) says what each one proved and what it still cannot.

iOS resolves. `pod install` from `ios/`, with `DEVELOPER_DIR` set, prints:

```console
Auto-linking React Native module for target `C15tBare`: C15tReactNative
Pod installation complete! There are 88 dependencies from the Podfile and 87 total pods installed.
```

with `C15tCore` and `C15tReactNative` both at 3.0.0-alpha.1, so the podspec, the `C15t`
TurboModule codegen, and the local core path all hold. Nothing is scoped away to get that:
the Podfile calls `use_native_modules!` with no arguments and so runs the same unscoped
`react-native config` a Gradle build would.

Android configures, which is the half that used to fail. `autolinkLibrariesFromCommand()` in
`settings.gradle` runs an unscoped `react-native config`, so it is the check that a package's
autolinking metadata is usable at all:

```console
$ npx react-native config --platform android
  "@c15t/react-native": {
      "sourceDir": ".../node_modules/@c15t/react-native/android/c15t-react-native",
      "packageImportPath": "import com.c15t.reactnative.C15tReactNativePackage;",

$ cd android && sh ./gradlew :app:mergeDebugResources --console=plain
BUILD SUCCESSFUL in 28s
```

Before the fix in [packages/react-native](../../packages/react-native/android#autolinking),
the first command exited 1 with `Failed to build the app: No package name found`, and with it
this app's Gradle configuration died before compiling a single file; `pod install` only worked
because the Podfile passed an iOS-scoped autolink command around it. Both workarounds are gone.
`bun run check:react-native-autolink` re-runs that first command from this app's own install,
and the mobile SDK CI group runs it.

Two warnings from that `pod install` belong to the package too.
`C15tReactNative.podspec` declares `license => '../../LICENSE.md'`, which is this
repository's root license and exists two directories above the package only in a
checkout, not in a consumer's `node_modules`. And React Native notes that calling
`pod install` directly is deprecated in favour of its own build integration.

Two more notes for anyone building natively from a checkout:

- `@react-native/gradle-plugin` is a devDependency of this app on purpose. The template
  includes it at the literal path `../node_modules/@react-native/gradle-plugin`, and Bun's
  isolated install layout does not link a package that only `react-native` depends on into
  this directory, so the `includeBuild` would not resolve.
- `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer` is required for `pod install`
  and every `xcodebuild` call on this machine, because `xcode-select` points at Command
  Line Tools and CocoaPods reads an empty `xcodebuild -version` otherwise.

## Device run

iPhone 17 Pro on iOS 26.4, built by `xcodebuild` against `C15tBare.xcworkspace`, installed
with `simctl`, talking to `examples/demo` serving `@c15t/backend` at
`http://localhost:3000/api/self-host`. The app came up on the native core: the CORE panel
read `native (TurboModule)`, the handshake reported protocol 1, and the banner rendered with
copy from the backend, so `bootstrap()`, `snapshot()` and the subscription pump all held over
the real bridge rather than only against the fake.

Two things were only visible on a device. The banner's controls sat under the home indicator
and a sheet's heading sat by the clock, which is what the inset work in the package fixed.
Still open: this app's own top tab bar overlaps the status bar clock. That is fixture chrome
rather than a consent surface, so the package's insets do not reach it.

What this machine cannot do is drive a tap. It has both iOS runtimes and `simctl`, but no
`Simulator.app` anywhere in the Xcode bundle, so the device boots headless and can only be
observed through `simctl io screenshot`. Everything in the checklist that needs a finger
needs a machine with the full Xcode app, or a real device.

### Android

An API 36 `sdk_gphone64_arm64` emulator, `assembleDebug` from `android/` with the core
compiled from source through the `includeBuild` in `settings.gradle`, talking to the same
`examples/demo` backend over `adb reverse`. Unlike the iOS setup this one can be driven:
`adb shell input tap` at coordinates read out of `uiautomator dump`, which is how every
step in the checklist below was run. Process death is `am force-stop`, not a swipe.

The core came up native, and `no_backup/c15t` holds `com.c15t.snapshot` and
`com.c15t.pending` as AES/GCM blobs. After a force-stop and relaunch the first frame
reported `stored snapshot: true`, `ready: true`, `policyPending: false` and the revision it
had before the kill, and the banner stayed dismissed.

Four defects were only visible here, and each is named in its own commit: Codegen output
written somewhere an app's build never looks, `accessibilityRole` carrying ARIA values
that Android's TalkBack enum rejects, subject ids in a shape the backend answers with
HTTP 400, and a caller-supplied GCM IV that AndroidKeyStore refuses on encrypt. The last
one is worth reading twice: `encrypt` had never once succeeded on a device, so no consent
ever reached disk, and the storage layer's silent answer to a non-key failure is what kept
it invisible. `ResilientKeyValueStore` now names that write out loud.

## Fake core

The example ships an in-JavaScript fake core (`src/c15t/fake-native.ts`) built only on
`createConsentClient(module, events)` and `ConsentClientContext`, which is how the
package says to inject a mock. It implements the same TurboModule surface: hydrate and
init on timers, a 1 Hz `isAllowed` sampler whose recent samples print on screen, a
drift timer that flips one permission every few seconds so a subscription has
something to react to, a pending-write queue capped at 20 that refuses to send while
the online toggle is off, and a restart that rebuilds the client from stored state.

It is a fixture, not a second implementation. A green run in fake mode proves the
JavaScript side: subscription counts, gating, prompt requirements, the offline queue.
It proves nothing about Swift, Kotlin, Keychain, AndroidKeyStore, or Codegen, and the
app prints a red strip across the top whenever it is active so a result cannot be
misread. The real core is the default; `C15T_FAKE_NATIVE=true` forces the fake, and a
binary without the module offers it as the way past the build error.

## Persistence and cold-start checklist

Run against the real core on a device or simulator. Do it with a backend you can
stop, or the offline steps just look like latency.

Steps 3 to 5 passed on iOS, run headless with the backend stopped and the app relaunched:
the first frame carried `ready: true`, `policyPending: false`, a non-zero `revision`, and an
`evaluatedAt` about an hour old. The stale timestamp is the proof that it was stored state,
not a response that happened to be quick.

The cached-snapshot steps and the queued-save steps below passed on Android, driven over
`adb` with the backend stopped and restarted between them. An accept committed while the
backend was down grew `com.c15t.pending` from 44 to 1612 bytes, which is the payload on
disk rather than a promise in memory; after a force-stop and a relaunch with the backend
back up, the queue drained to its empty 44 bytes and the backend held exactly one
`accept_all` row for that install's new `sub_` subject, carrying the five purposes the
policy offered. Judged from the backend, as step 6 asks.

Cached snapshot before any network:

1. Load the app, accept all, wait for the revision to settle.
2. Kill the app by swiping it away, not by reloading from the dev menu. A reload keeps
   the process and proves nothing.
3. Turn on airplane mode, or stop the backend.
4. Relaunch. The first frame must already show the accepted permissions and a
   non-zero revision, with `ready: true` and `policyPending: false`.
5. Fail if the first frame is deny-all with `policyPending: true`, or if the
   permissions appear only after a visible delay: `snapshot()` is a synchronous read
   of stored state and must not wait on the network.
6. In fake mode, press **Simulate cold start** instead of killing the app. It rebuilds
   the client under a fresh React key, which is what a relaunch does to the
   JavaScript side. **Wipe storage (uninstall)** does the reinstall step below.

Queued save replayed on relaunch:

1. Start from a clean state: clear the app's storage, or press **Wipe storage
   (uninstall)** in fake mode.
2. Turn on airplane mode.
3. Accept all, or save a custom set. The action must report as queued, not failed.
4. Kill the app.
5. Turn the network back on and relaunch.
6. Pass when the backend has exactly one save record for that action, with the same
   category set that was chosen. Judge that from the backend rather than the revision:
   `revision` is local, it bumps on every committed mutation, and one bootstrap commits
   both a hydrate and a re-evaluate, so it moves past the stored number on an offline
   relaunch that saved nothing.
7. Fail when the record is missing, when the queue sent twice, or when the replayed
   body was rebuilt from the current policy instead of the payload that was queued.
8. Repeat with two actions queued back to back. Both must arrive, in order, unchanged.
   This fixture has no surface for it: once the banner is dismissed the Consent tab offers
   nothing that commits, and the preference centre needs the policy only a reachable
   backend can serve. The same assertion runs natively as
   `two payloads queued back to back fly oldest first, unchanged` in
   `native/core-android`, which is where a queue that sends only the newest, or rebuilds a
   payload on the way out, gets caught.

Reinstall:

1. Delete the app, reinstall, launch. The subject id must be new, permissions must be
   deny-all with `policyPending: true` until the first init resolves, and no prompt
   may be owed that the policy does not ask for.

Handset detail that changes results: on Android, force-stopping and swiping away are
different. Use force-stop for a real process death.

## Monorepo notes

Two things in `metro.config.js` are consequences of running an app inside a Bun
workspace, not SDK behaviour, and both are commented in the file:

- `watchFolders` has to include the repository root, because the real files behind
  the `@c15t/react-native` symlink live outside the app directory. Without it Metro
  cannot see the package it is bundling.
- `extraNodeModules` points `@babel/runtime` at this app's copy. React Native's Babel
  preset rewrites every transformed file, the linked SDK included, to import helpers
  from `@babel/runtime`, and an isolated install layout hides the app's copy from a
  linked package. This does not apply to an app that installs from the registry.

No Jest, ESLint, or Prettier config came across from the RN template. The repository
runs Vitest, Oxlint, and Oxfmt.

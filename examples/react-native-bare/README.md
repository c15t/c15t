# c15t React Native fixture (bare)

A bare React Native 0.87 app on the New Architecture, wired to `@c15t/react-native`.
It opens as an app: a privacy screen with one action, the banner and sheets the package
draws over it, and a Diagnostics tab that starts closed and holds everything the kernel
reports. The harness buttons that drive every action a subject can take live there, next
to the snapshot, rather than on the first thing a viewer sees.

It is a test fixture for the SDK in this repository. The chrome reads its colours, steps,
and control heights from the package's own theme so the host screens and the consent
surfaces are visibly one design, but nothing here is a starter kit.

## What it exercises

- `C15tProvider` and the protocol handshake against the Swift/Kotlin core in the
  binary, with the mismatch error surfaced on screen instead of a red box.
- The headless surface: `useConsent`, `useConsentActions`, `useC15tBootstrap`,
  `useIsAllowed`, `ConsentGate`, `ConsentReady`, `ConsentPrompt`.
- The built-in `ConsentBanner`, `ConsentDialog`, and `ConsentPreferences`.
- `useTrackingRequest`, the Apple tracking journey on the Privacy screen: the sheet, the
  centre that opens when the subject taps Additional Information, and the second sheet
  that follows while Marketing is still granted. The committed iOS project carries no
  `NSUserTrackingUsageDescription`, so the arm reads `unsupported` and the request
  rejects until you add one. See [Setup](#setup).
- Consent-gated loading, shown as a vendor component that mounts and unmounts and
  counts its own mounts, so a gate that opens early is visible rather than inferred.
- Persistence and the offline write queue, through the checklist below.
- A fake native core that samples `isAllowed` on a timer, so the gating path can be
  watched without a device, a backend, or a rebuild. See
  [Fake core](#fake-core).
- The `theme` prop and the light/dark/system control in the header, which is the only
  way to see both palettes without leaving the app: the surfaces resolve a scheme from
  `useColorScheme()` on their own, and a forced choice passes `lightTheme` or `darkTheme`
  instead of a theme this app invented.
- `safeAreaInsets` on `C15tProvider`, measured from React Native core in
  `src/safe-area.ts`, so the surfaces and this app's own header lay out against the same
  bands and nothing lands under a clock or a home indicator.
- `c15t-demo://` links, which is how a consent journey is run on a machine that cannot
  tap a screen. See [Drive it from a shell](#drive-it-from-a-shell).

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

To make the ads card ask Apple for anything, add `NSUserTrackingUsageDescription` to
`ios/C15tBare/Info.plist` with a prompt App Review will accept. Add
`NSUserTrackingMarkdownUsageDescription` too if you want the expanded European Union
sheet, which iOS 27.2 draws in place of the plain one for a device inside the countries
Apple enabled. The plain key is not optional either way: Apple falls back to it on older
systems and outside those countries. Per-locale Markdown goes in
`<locale>.lproj/InfoPlist.strings`, not in the plist, which is what
[examples/expo-dev](../expo-dev) has the config plugin write. Then set
`NSPrivacyTracking` to `true` in `ios/C15tBare/PrivacyInfo.xcprivacy`. An app that asks
for the identifier is usually linking data across apps, and that key currently says it
does not. Leave it `false` only if you ask and then never track.

For a local backend, `examples/demo` serves one at `/api/self-host`. It needs a Postgres
`DATABASE_URL` and starts fine without one, which is the trap: the backend answers `404`,
the core retries quietly, and the app sits on `policyPending: true` with
`resolution: unconfigured no policy` and never renders a prompt. Nothing on screen says the
backend is missing. Point it at the same Postgres CI uses:

```sh
DATABASE_URL='postgres://postgres:c15t@localhost:5432/c15t' \
  bun run --cwd examples/demo dev:localhost      # http://localhost:3000
```

Then forward both ports the app dials. Metro and the backend are two separate connections,
and `adb reverse` is per device and is dropped when the emulator restarts:

```sh
adb reverse tcp:8081 tcp:8081                    # Android emulator -> Metro
adb reverse tcp:3000 tcp:3000                    # Android emulator -> backend
```

The default `http://localhost:3000/api/self-host` works on the iOS simulator and on
Android after `adb reverse`. The manifest already allows cleartext on debug builds;
iOS ships `NSAllowsLocalNetworking`.

## Drive it from a shell

The app registers `c15t-demo://`, so a consent journey is one command in and one
screenshot out. This exists because a Mac with no `Simulator.app` has no `simctl tap`, no
`idb`, and no Maestro, which means the iOS half of this fixture cannot be driven any other
way. Android takes the identical link through an intent filter, so a step written once
runs on both platforms.

```sh
xcrun simctl openurl <udid> c15t-demo://accept
adb -s emulator-5554 shell am start -a android.intent.action.VIEW -d 'c15t-demo://accept'

xcrun simctl io <udid> screenshot after-accept.png
adb -s emulator-5554 exec-out screencap -p > after-accept.png
```

iOS 26 does not hand a custom-scheme open to the app without asking. `simctl openurl`
raises "Open in “c15t Bare”?" and the journey waits there for that tap; in a Simulator
window with the keyboard attached, Return answers it. Where there is no finger for it, the
same link goes in as a launch variable. It enters through the launch options, so
JavaScript cannot tell it apart from a link the OS delivered, and the verbs are unchanged.

```sh
SIMCTL_CHILD_C15T_DEMO_LINK='c15t-demo://accept' \
  xcrun simctl launch --terminate-running-process <udid> org.reactjs.native.example.C15tBare
```

Both platforms want the backend answering before a verb can do anything visible. Check it
with `curl -s localhost:3000/api/self-host/init`, which should return JSON. When
`examples/demo` is mid-build that route answers 500 instead, and the app sits on
`Loading stored consent` with no banner for a verb to act on.

The grammar is `c15t-demo://<verb>[/<argument>][?name=value[&name=value]]`. Quote the URL
on Android: `?` and `&` belong to the shell otherwise.

| Verb | What it calls |
| --- | --- |
| `accept` | `acceptAll()`, every category the policy scope offers |
| `reject` | `rejectAll()`, strictly necessary only |
| `save?experience=1&marketing=0` | `save()` with one boolean per category named; unmentioned categories keep their receipts, and a `save` that names none writes experience on, marketing off |
| `dismiss` | closes any open sheet, then `dismissNotice()` |
| `customize` | opens `ConsentDialog`, the path the banner's Customize button takes |
| `preferences` | opens `ConsentPreferences`, with no prompt owed |
| `scheme/light`, `scheme/dark`, `scheme/system` | forces that palette on every surface, or gives the choice back to the platform |
| `identify?id=runner-42` | `identify()` |
| `logout` | `logout()` |
| `overrides?country=DE`, `overrides?country=` | `setOverrides()`, and an empty value clears it |
| `refresh` | `refresh()`: re-resolve policy and retry the offline queue |
| `reset` | see below |
| `help` | prints this list on screen |
| `report=1`, on any verb | answers on **Diagnostics**, so the receipt is in the same screenshot as the step that wrote it |

Every verb answers with one line, and the app prints it on **Diagnostics** under **Demo
links** next to the link it answered. A scripted run leaves behind a screenshot and
nothing else, so the receipt belongs in the frame that proves the step. A verb that does
not exist says so on screen, with the list, rather than doing nothing.

Which is what `report=1` is for. On iOS a link can only arrive at launch, and the tab the
receipt is printed on is app state, so the next launch wipes the receipt along with the tab.
A step that wants its receipt on screen has to ask for the tab in the same link:
`c15t-demo://save?measurement=1&report=1`. Without the flag the answer exists only in the
JavaScript instance that the next step terminates.

Three things worth knowing:

- The table is `DEMO_VERBS` in `src/deep-links/verbs.ts`: one row per verb, and the row is
  the only place a verb is named, so the on-screen list and `help` cannot drift from it.
- `reset` is a row already, and reports that the installed package has no such action.
  When the SDK's reset consent action lands, wiring the verb is the one line that calls
  it, and the documentation, the list, and the receipt all come along.
- Android hands the launch link to JavaScript twice over a cold start, so an app answers a
  given link once per JavaScript instance. That also means a Metro reload replays the link
  that launched the app: kill it first when the next step starts from a clean run.

## Prove the iOS journey in one command

`scripts/ios-journey.sh` builds the fixture, erases a simulator so the subject has never
answered before, walks first run through a saved preference, a relaunch, the preference
centre and a reset in both colour schemes, and writes one numbered frame per step.

```sh
scripts/ios-journey.sh              # Release: the bundle is inside the binary
scripts/ios-journey.sh debug        # Debug: starts its own Metro, never on 8081
IOS_JOURNEY_ONLY=01-fresh-banner scripts/ios-journey.sh   # one step, for a re-run
```

Evidence lands in `IOS_JOURNEY_OUT`, which defaults to `/tmp/ios-journey`. `IOS_JOURNEY_SIM`,
`IOS_JOURNEY_DEVICE`, `IOS_JOURNEY_RUNTIME` and `IOS_JOURNEY_BACKEND` move the device and the
backend it talks to.

It refuses to start without a policy from `GET /api/self-host/init`. With no backend the core
resolves nothing and no prompt is ever owed, which looks exactly like a banner that never ships.

Four things it does that are easy to get wrong:

- It **erases the simulator** rather than reinstalling into one. `simctl uninstall` does not
  clear the Keychain, the consent snapshot lives in the Keychain, and so an app that was
  "freshly installed" is still a subject who already answered and never shows a prompt.
- It **keeps the ad-hoc signature**. Building a simulator binary with
  `CODE_SIGNING_ALLOWED=NO` produces an app whose Keychain writes fail: `/init` is a read,
  so the banner still renders, but every decision comes back
  `refused (queue-write-failed)`. Nothing else on screen says the signature is the cause.
- It builds **Release** by default, so the JavaScript bundle is inside the app. In Debug the
  binary dials a Metro server, and on a machine with several worktrees checked out that is
  whichever server started first, so Debug starts its own and probes upward from 8084.
- It sends links through `C15T_DEMO_LINK`, not `simctl openurl`. iOS asks
  "Open in “c15t Bare”?" before it hands a custom-scheme open to the app, and a headless
  run has no finger for it. One link per cold start also means every step survives process
  death on its own. Set `IOS_JOURNEY_PROBE_OPENURL=1` to re-test that claim rather than
  repeat it.

The evidence is not only pictures. Each step records the md5 of the whole frame and the md5 of
the frame below the system status band, plus the percentage of the app area that changed since
the previous step. Hashing the whole PNG is not enough on its own: the status bar carries a
clock, so a step that never happened still produced a fresh hash, and that is how an earlier
run reported eight steps while delivering none of them. Whether a consent surface is actually
on screen is read off the pixels by `ios-surface-metrics.py` rather than assumed from a verb
that exited 0. A receipt that reads `queued` is correct and expected: the core applies a commit
to the device durably and tells the backend afterwards, so no synchronous answer can promise
the server has it.


## Prove the Android journey in one command

`scripts/android-journey.sh` walks the same route on a connected device or emulator. It clears
the app with `pm clear`, sends each verb as a real `c15t-demo://` deep link, and asserts the
outcome out of the view hierarchy rather than off a screenshot, so a step fails on the exact
word it did not find.

```sh
ANDROID_SERIAL=emulator-5554 scripts/android-journey.sh
```

It refuses to run with more than one device attached until `ANDROID_SERIAL` says which one, and
it takes a lock per serial, because two runs driving one device read each other's screens and
one of them reports a step that never happened. Frames and the hierarchies behind them land in
`JOURNEY_OUT`, which defaults to `/tmp/android-journey/<worktree>`.

The geometry half of that proof is `scripts/android-surface-metrics.py`, which the journey
runs for the banner and the consent manager:

```sh
ANDROID_SERIAL=emulator-5554 scripts/android-surface-metrics.py --mode dialog
```

It reads the two bands rather than assuming them, which is the part that is easy to get
wrong. The status band comes out of the dump, because with no host measurement the SDK takes
it from `StatusBar.currentHeight`, which is the status bar window the system reports. The
bottom band defaults to the SDK's `RESERVED_BOTTOM_INSET` floor and not to this device's
navigation bar, because the bare example passes no insets to the provider; wire
`react-native-safe-area-context` into the provider and pass `--nav-inset` with the device's
real number instead. Both bands are printed on every run, and a run that cannot read them
exits 2 rather than measuring against a guess. A saved hierarchy grades too, so the evidence
stays re-runnable after the device is gone:

```sh
ANDROID_SERIAL=emulator-5554 scripts/android-surface-metrics.py --mode dialog \
    --from-xml /tmp/android-journey/v3-3/02-customize-dialog.xml
```

To confirm a decision reached the backend rather than only the device, read the consent table
the demo writes to:

```sh
psql "$DATABASE_URL" -c 'select "givenAt", jurisdiction, "uiSource", "consentAction", "purposeIds" from consent order by "givenAt" desc limit 5;'
```

A `custom` action from `banner` naming exactly the purposes you switched on is the receipt.
`acceptAll` records `accept_all` with every purpose, and a dismissal records nothing at all,
because a dismissal is not a choice.

The registration lives in three files, and all three are needed. `CFBundleURLTypes` in
`ios/C15tBare/Info.plist` and the intent filter in `AndroidManifest.xml` are what make
iOS and Android deliver the link at all, and `AppDelegate.swift` forwards it to
`RCTLinkingManager`, which is what puts it in front of `Linking`. Drop the forward and the
OS accepts the URL while the app stays silent, which looks exactly like a broken verb.

To get back to a first-install prompt:

```sh
adb uninstall com.c15t.bare                                          # Android: enough
xcrun simctl uninstall <udid> org.reactjs.native.example.C15tBare     # iOS: not enough
xcrun simctl reset <udid>                                             # iOS: this part matters
```

Uninstalling is not enough on iOS. The core keeps the subject id and the stored envelope in
the Keychain, and Keychain items outlive an app uninstall, so a reinstall comes back as a
returning user holding the previous decision and no prompt is owed. Use a simulator that has
never run the build, or `xcrun simctl reset`. Android keeps both in app-private storage, so
`adb uninstall` really does give a clean install.

## Commands

Run them from this directory, or from the root with `bun run --cwd examples/react-native-bare <script>`.

| Command | What it does |
| --- | --- |
| `bun run start` | Metro. `start:reset` adds `--reset-cache` |
| `bun run pod-install` | `pod install` for `ios/` |
| `bun run ios` / `bun run android` | Build and launch |
| `bun run bundle` | Release bundle for both platforms into `.artifacts/` |
| `bun run test` | Vitest over `src/`, which is the demo-link grammar and the verb table |
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

`xcode-select -p` points at `/Applications/Xcode.app/Contents/Developer` here, so no
`DEVELOPER_DIR` override is needed for `pod install` or `xcodebuild`. Where it points at
Command Line Tools instead, CocoaPods reads an empty `xcodebuild -version`, and every Xcode
invocation needs `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`.

## Native build status

Verified here: `bun run check-types` is clean, `bun run bundle` writes a release bundle
for both platforms, `pod install` completes, and the Android app gets through Gradle
configuration. Both platforms have been built, installed and launched;
[Device run](#device-run) says what each one proved and what it still cannot.

iOS resolves. `pod install` from `ios/` prints:

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

## Device run

iPhone 17 Pro on iOS 26.4, built by `xcodebuild` against `C15tBare.xcworkspace`, installed
with `simctl`, talking to `examples/demo` serving `@c15t/backend` at
`http://localhost:3000/api/self-host`. The app came up on the native core: the CORE panel
read `native (TurboModule)`, the handshake reported protocol 1, and the banner rendered with
copy from the backend, so `bootstrap()`, `snapshot()` and the subscription pump all held over
the real bridge rather than only against the fake.

Two things were only visible on a device. The banner's controls sat under the home indicator
and a sheet's heading sat by the clock, which is what the inset work in the package fixed.
The fixture's own chrome wanted the same treatment and now has it: the header pads itself by
the bands `src/safe-area.ts` measures (`StatusBar.currentHeight` on Android,
`StatusBarManager.HEIGHT` on iOS, a documented floor beneath both), and the tab bar clears
the clock on either platform with a banner on screen.

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

Re-running that journey on the current tree, after the kernel key-name fix and the change
that made a committed save owe its delivery, comes out the same with one thing missing from
the log. `installDebug`, `pm clear`, launch: CORE read `native (TurboModule)`, the snapshot
carried a fresh `sub_` subject at `ready: true` and `activeUI: banner`, and the
`ConsentClient` key-name warning did not appear at all, which is the whole claim of the fix.
One `input tap` on the banner's accept moved revision 2 to 3, left the subject id alone, and
put a `consent_given` audit row against that same id in the backend. `am force-stop` and a
relaunch came back at `stored snapshot: true` on the same subject, banner still dismissed,
and no second write arrived over the next minute.

One trap is worth naming because it looks like a contract break and is not. Metro serves the
current JavaScript while the installed APK carries whichever Kotlin was compiled when it was
last built, so a stale binary against a live bundle reads as the two cores disagreeing: the
`ConsentClient` warning fires with a dozen "the kernel owns these key names" lines while both
sides of the tree agree with each other. Rebuild with `sh gradlew installDebug` in `android/`.
A JavaScript reload will not clear it, and the warning will keep firing.

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
app says so on screen whenever it is active: a `Fake core` badge under the header, and the
CORE panel on **Diagnostics** reading `fake stub, not a device core`, so a result cannot be
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

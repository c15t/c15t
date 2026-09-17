# c15t React Native fixture (Expo development build)

The same fixture as [examples/react-native-bare](../react-native-bare), inside an Expo
SDK 57 project that gets its native consent core from the
`@c15t/react-native/expo-plugin`. Screens, buttons, fake core, and checks are identical
so that a difference between the two apps points at the native wiring and not at the
consent code.

## Expo Go will not run this app

`@c15t/react-native` is a custom native module: the consent kernel is Swift on iOS and
Kotlin on Android, registered through Codegen as the `C15t` TurboModule. Expo Go ships
a fixed set of native modules and cannot carry one added by a config plugin, so there
is no path where this app works there.

Opening it in Expo Go does not fail loudly. The JavaScript bundle loads, finds no
module, and every read answers from the deny-all default: the banner never appears,
every category is `false`, `policyPending` stays `true`, and it looks exactly like a c15t
bug. That is why the config plugin checks the launch target at configure time and
refuses rather than letting you find this out at runtime.

What you need is a development build:

```sh
bun run ios        # expo run:ios
bun run android    # expo run:android
```

Both prebuild the native projects, install pods, build, and launch into the dev client.
For a device or a shareable build, `eas build --profile development --platform all`
then `bun run start`.

`bun run start` on its own is only half a command: it serves the bundle, and you still
need the built client to open it.

## Setup

```sh
bun install                      # from the repository root
cp .env.example .env
```

`.env` is ignored; `.env.example` is the committed template. The Expo CLI loads it
before it evaluates `app.config.ts`, so one file feeds both halves:

- `app.config.ts` passes `backendURL` and `publicKey` to the config plugin, which writes
  `com.c15t.backend.url` / `com.c15t.backend.mode` into `ios/Info.plist` and
  `com.c15t.PORTAL_URL` into `AndroidManifest.xml` at prebuild time.
- The `EXPO_PUBLIC_` copies are inlined into the JavaScript bundle and drive what the
  screens report and which core the app attaches to.

Only the `EXPO_PUBLIC_` prefix survives into the bundle, and that is the warning: those
strings are in the shipped app. Publishable keys only. The plugin rejects anything
shaped `sk_`, `secret_`, `private_`, or `rk_` rather than embedding it in a public
`.ipa` and `.apk`.

The core reads its backend from the native keys, not from `.env`. After changing the
URL, run `bun run prebuild` again; a running binary keeps the value it was built with.
That the bundle and the binary each carry a copy of the backend URL is a property of
the design, not a mistake in this example.

For a local backend, `examples/demo` serves one at `/api/self-host`:

```sh
bun run --cwd examples/demo dev:localhost      # http://localhost:3000
adb reverse tcp:3000 tcp:3000                  # Android emulator -> host
```

## Commands

| Command | What it does |
| --- | --- |
| `bun run prebuild` | Regenerate `ios/` and `android/` from the config (`--clean`) |
| `bun run ios` / `bun run android` | Prebuild, build, and launch the dev client |
| `bun run ios:release` | Same, release configuration, bundle inside the binary |
| `bun run start` | Dev server for a development client |
| `bun run bundle` | `expo export --platform all` into `.artifacts/export` |
| `bun run config` | Resolved prebuild config as JSON, to see what the plugin wrote |
| `bun run check-types` | `tsc --noEmit` |
| `bun run lint` / `bun run fmt` | Oxlint and Oxfmt, from the repo presets |

`ios/` and `android/` are generated and gitignored. Delete them freely; prebuild writes
them back from `app.config.ts`, and the plugin is idempotent.

`app.config.ts` also adds one Podfile line pointing `C15tCore` at
`../../native/core-swift`, which the binding's podspec needs inside this repository and
a registry install does not. `C15T_LOCAL_PODS=false` leaves the Podfile alone.

## Native build status

Verified here: `bun run check-types` is clean, `expo export --platform all` writes
2.2 MB Hermes bundles for iOS and Android, `expo prebuild --clean --no-install` exits 0
with the `com.c15t.*` keys and the startup initializer in place, and `pod install` inside
the generated `ios/` prints

```console
Pod installation complete! There are 96 dependencies from the Podfile and 95 total pods installed.
```

with `C15tCore` and `C15tReactNative` both at 3.0.0-alpha.1, so the plugin's Podfile line,
the podspec, and the `C15t` TurboModule codegen all hold. `pod install` and `xcodebuild`
need `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer` on this machine, because
`xcode-select` points at Command Line Tools.

Nobody has launched a simulator or an emulator from this fixture, and no Gradle build has
run, so the checklist below is entirely open.

Android autolinking here runs `expo-modules-autolinking`, not `@react-native-community/cli`,
which is what `expoAutolinking.rnConfigCommand` in the generated Podfile wires. So this app
never asked the question the bare app used to fail on, and it stays that way: the community
autolinking branch (`EXPO_USE_COMMUNITY_AUTOLINKING=1`) needs `@react-native-community/cli`,
which this fixture does not depend on. The bare app is where the community CLI's answer about
this package gets exercised, on CI, by `bun run check:react-native-autolink`; see
[examples/react-native-bare](../react-native-bare#native-build-status).

## Fake core

The example ships an in-JavaScript fake core (`src/c15t/fake-native.ts`) built only on
`createConsentClient(module, events)` and `ConsentClientContext`, which is how the
package says to inject a mock: hydrate and init on timers, a 1 Hz `isAllowed` sampler
whose recent samples print on screen, a drift timer that flips one permission every few
seconds so a subscription has something to react to, a pending-write queue capped at 20
that refuses to send while the online toggle is off, and a restart that rebuilds the
client from stored state.

It is a fixture, not a second implementation. Fake mode proves the JavaScript side and
nothing about Swift, Kotlin, Keychain, AndroidKeyStore, or Codegen, and the app prints a
red strip across the top while it is active so a result cannot be misread. The real core
is the default; `EXPO_PUBLIC_C15T_FAKE_NATIVE=true` forces the fake.

## Persistence and cold-start checklist

**Do these in a build with the bundle inside the binary**, not against the dev server.
With `bun run ios`, the JavaScript comes from Metro over the network, so airplane mode
kills the app instead of the backend and every offline result you collect is meaningless.
Use `bun run ios:release`, or `eas build --profile production`.

On Android a release variant needs a signing config this example does not ship, so use
`eas build --profile production --platform android`, or run the fake core's cold-start
simulation for the JavaScript half.

Cached snapshot before any network:

1. Load the app, accept all, wait for the revision to settle.
2. Kill the app by swiping it away. Reloading from the dev menu keeps the process and
   proves nothing.
3. Turn on airplane mode.
4. Relaunch. The first frame must already show the accepted permissions and a non-zero
   revision, with `ready: true` and `policyPending: false`.
5. Fail if the first frame is deny-all with `policyPending: true`, or if the permissions
   arrive only after a visible delay: `snapshot()` is a synchronous read of stored state
   and must not wait on the network.
6. In fake mode, press **Simulate cold start** instead. It rebuilds the client under a
   fresh React key, which is what a relaunch does to the JavaScript side. **Wipe storage
   (uninstall)** covers the reinstall step below.

Queued save replayed on relaunch:

1. Start from a clean state: clear the app's storage, or press **Wipe storage
   (uninstall)** in fake mode.
2. Turn on airplane mode.
3. Accept all, or save a custom set. The action must report as queued, not failed.
4. Kill the app.
5. Turn the network back on and relaunch.
6. Pass when the backend holds exactly one save record for that action, with the same
   category set that was chosen, and the snapshot's revision moves past the stored one.
7. Fail when the record is missing, when the queue sent twice, or when the replayed body
   was rebuilt from the current policy rather than the payload that was queued.
8. Queue two actions back to back and repeat. Both must arrive, in order, unchanged.

Reinstall:

1. Delete the app, reinstall, launch. The subject id must be new, permissions must be
   deny-all with `policyPending: true` until the first init resolves, and no prompt may
   be owed that the policy does not ask for.

Two things that change results on Android: force-stopping and swiping away are not the
same, so use force-stop for a real process death. And over-the-air updates are not a way
to change the native keys, since those are compiled into the binary.

## What the config plugin writes

`bun run config` prints the resolved config; `bun run prebuild` writes it into the
native projects. After a prebuild you should find:

```
ios/c15tExpoDev/Info.plist              com.c15t.backend.url, com.c15t.backend.mode
android/.../AndroidManifest.xml         <meta-data android:name="com.c15t.PORTAL_URL" ...>
android/.../AndroidManifest.xml         com.c15t.reactnative.C15tReactNativeInitializer
ios/Podfile                             pod 'C15tCore', :path => '.../native/core-swift'
```

Android has no mode key; it infers the transport from which keys are present. An absent
value stays absent rather than becoming an empty string, because the bridge treats a
missing key as "not configured".

App Tracking Transparency is off by default and nothing about a consent configuration
turns it on: consent to marketing cookies is not Apple tracking authorization. Enable it
with `enableAppTrackingTransparency` plus a `trackingUsageDescription` you wrote.

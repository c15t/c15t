# C15tReactNative (iOS)

The iOS half of `@c15t/react-native`: a Codegen TurboModule in Swift over the pure
Swift consent core at [`native/core-swift`](../../native/core-swift). New Architecture
only. No UI here; every surface lives in JavaScript.

## Layout

| Path | Module | Contents |
| --- | --- | --- |
| `C15tReactNative/Bridge/` | none of React | wire encoders, the change pump, `Info.plist` configuration, the module handler, the two lifecycle observers below, and the tracking gate. Compiles and tests with no Pods installed. |
| `C15tReactNative/ReactNative/` | React + `ReactCodegen` | the TurboModule: the Swift implementation, and the ObjC++ category carrying the Codegen conformance, the JavaScript name, and the `getTurboModule:` provider. Also the constructor that starts the core before React Native initializes. |
| `C15tReactNative/Resources/Privacy.xcprivacy` | resource | privacy manifest, shipped in the pod resource bundle and the SPM resource bundle. |
| `Tests/C15tReactNativeTests/` | test | 78 tests over the wire layer, the module handler, the lifecycle legs, and the tracking gate. |
| `C15tReactNative.xcodeproj` | generated | iOS-slice build of the wire layer against the core, for CI without an example app. |
| `support/gen-xcodeproj.rb` | tooling | regenerates that project. |

The bridge attaches to the already-bootstrapped core through `C15t.install(_:)`. It
never constructs a second one, so `getBootstrap()` and `getSnapshot()` stay synchronous
reads of the snapshot the core hydrated from storage.

## The Codegen seam

`codegenConfig.name` is `C15tSpec`, so Codegen writes the protocol into one umbrella
header, `ReactCodegen/C15tSpec/C15tSpec.h`, whose first directive refuses to compile as
plain Objective-C. No Swift file can name `NativeC15tSpec`, so two things a normal
TurboModule gets from a macro are written by hand in `C15tReactNativeModule.mm`:

- the `<NativeC15tSpec>` conformance, because `RCTTurboModuleManager` only builds and
  sets up a module whose class conforms to `RCTTurboModule`, and
- `getTurboModule:`, because the generated `RCTModuleProviders` requires it before it
  keeps the instance, and it returns a `std::shared_ptr`, which has no Swift spelling.

`RCT_EXTERN_REMAP_MODULE` supplies neither, and cannot be used here at all: it expands
to a fresh `@interface C15tReactNativeModule : RCTEventEmitter`, and the Swift generated
header already defines that class. The category answers `+moduleName` instead, which is
all the macro was needed for.

The Swift class stays the implementation, and states every Objective-C name explicitly
rather than trusting inference. Nothing at build time links those names to the generated
protocol -- the JSI glue looks each one up on the instance at call time -- so
`src/specs/__tests__/ios-spec-surface.test.ts` runs Codegen over
`src/specs/NativeC15t.ts` and fails on any selector or argument type that disagrees. The
module also compares itself against `@protocol(NativeC15tSpec)` once per process and
logs the difference, so drift is named in the console rather than arriving as an
unrecognized selector on the JavaScript thread.

Generation is not an app-side privilege. Both sides of that check come from one Node
script, `../android/codegen/generate-spec.mjs`, which is the same file the Android Gradle
build runs and the drift check spawns, so nothing here is graded against a second
implementation of generation:

```sh
# from packages/react-native/ios
node ../android/codegen/generate-spec.mjs --platform ios --output /tmp/c15t-spec
```

That writes the generated `C15tSpec/C15tSpec.h` protocol and the `RCTModuleProviders` glue
straight from `codegenConfig`, so the header the hand-written category is held to is
readable on any machine holding Node and this package's `react-native` devDependency, Linux
included. That is where CI runs it, in the `Mobile SDK (android-js)` job. The expectations
themselves live in `src/specs/__tests__/spec-contract.ts`, shared with the Android check, so
both platforms are graded against one reading of the TypeScript.

`ios/support/` holding only `gen-xcodeproj.rb` is deliberate. The generator belongs to the
package, not to one platform, and three consumers have to reach one file.

## Startup order

`C15tReactNativeRuntimeInitializer.mm` defines a class whose `+load` starts the core at
image load, which is before React Native initializes, so stored consent resolves from the
first JavaScript frame. It is a `+load` on a class rather than a bare
`__attribute__((constructor))` because the pod is a static archive: the linker drops an
archive member that neither is referenced nor defines an Objective-C class, and a file
holding only a constructor is neither. An app that owns its own setup sets
`com.c15t.reactnative.AutoBootstrap` to `false` and calls
`C15tReactNativeRuntime.install(core:)` (its own configured core) or
`startCore()` (the `Info.plist` values, later) itself.

## Platform lifecycle

`native/CONTRACT.md` names three moments when a stored answer can have gone stale with
nothing asking about it. The core sees only the first, inside `bootstrap`. The other two
need a hook on the process, which a consent kernel is not allowed to hold, so
`C15tReactNativeBootstrap` arms them as soon as a core is in place, whichever call put it
there.

| Leg | Trigger | What runs |
| --- | --- | --- |
| Launch | `bootstrap` | hydrate, then replay the pending queue |
| Foreground | `UIApplication.didBecomeActiveNotification` | replay, then `refresh()` |
| Reachability | a network this process did not already have | replay |

Both callbacks hand their work to the core's own scheduler rather than running it inline,
so coming back to the app costs no frame on the main thread.

`C15tReachabilityGate` decides which `NWPathMonitor` updates are gains: the path the
process started with seeds the gate and replays nothing, because that races the launch
replay, and a path that changes interface without dropping counts once. The gate holds no
`Network` types, which is what lets the rule be tested without a device and a link to
drop. Android's reachability leg can be refused by a missing host permission;
`NWPathMonitor` needs no entitlement or manifest key, so iOS has no declined branch.

Neither leg polls a clock. `C15tReactNativeBootstrap.shutdown()` takes both back down for
a host that would rather drive `flushPending()` and `refresh()` on its own schedule; the
core keeps its snapshot, queue, and event pump, and `start()` or `install(_:)` puts the
legs back.

## `Info.plist` keys

Read by `C15tBridgeConfiguration.from(infoPlist:)`. Expo apps set these through
`app.json`'s `ios.infoPlist`.

| Key | Meaning |
| --- | --- |
| `com.c15t.reactnative.AutoBootstrap` | `false` opts out of the pre-RN start. |
| `com.c15t.backend.url` | Hosted project URL, or a self-hosted base URL. |
| `com.c15t.backend.mode` | `hosted`, `self-hosted`, `offline`, `none`. Inferred from the URL when absent. |
| `com.c15t.backend.domain` | Domain sent with each request. |
| `com.c15t.backend.initUrl` | URL for `GET /init`, defaulting to `${com.c15t.backend.url}/init`. For a same-origin proxy route. |
| `com.c15t.storage` | `keychain` (default) or `file`. |
| `com.c15t.keychain.service` | Keychain service name, default `com.c15t.core`. |
| `com.c15t.country`, `com.c15t.region`, `com.c15t.language` | Override geo/locale detection. |
| `com.c15t.categories` | Category ids the app declares. |
| `com.c15t.gpc` | Report the Global Privacy Control signal. Detection only: it never becomes an override. |

`com.c15t.test` is retired. Publisher test mode is a client option rather than an
override, and never reaches a save body, so nothing reads the key. The launch hook
refuses to start a core from a plist that still declares it rather than ignoring the
key quietly: the console names it, and every read answers deny-all until it is removed
or the core is installed from code.

## Integrating

The pod carries the consent kernel. `C15tReactNative.podspec` compiles it from
`vendor/C15tCore`, a generated copy of `native/core-swift/Sources/C15tCore`, so an app
that installs `@c15t/react-native` from npm resolves everything it needs from the package
and names no second pod. It used to declare `s.dependency "C15tCore"`, which only resolved
inside this repository, because the example Podfiles point that pod at a directory next to
the app; a pod cannot point `s.dependency` at a path, and no `C15tCore` pod is published,
so an installed app had no kernel to build.

```ruby
# Podfile, for an app installed from npm. Nothing else to add.
# Autolinking finds the podspec through react-native.config.js.
platform :ios, '16.4' # above RN 0.87's own floor
```

Inside this repository an app resolves the same sources through a path, and the example
Podfiles still carry `pod 'C15tCore', :path => '../native/core-swift'`. That line is no
longer needed: the binding compiles its own copy, and the extra pod now only builds a second
copy of the kernel that the app links without asking for it.

SPM (`RCTUseSPM`, Expo's SPM mode) keeps the kernel as its own module. `Package.swift` is
unchanged by the vendoring, so a later Swift Package Manager release of the core is
unaffected; only the CocoaPods path compiles the copy, into the binding's module. The bridge
serves both through `#if canImport(C15tCore)` around the import.

```sh
# SPM: escape hatches for a published core instead of the repo path
C15T_CORE_VERSION=3.0.0 C15T_CORE_URL=https://github.com/c15t/c15t.git
# Also build the React-linked target (needs a host app vending React's headers)
C15T_SPM_INCLUDE_RN=1 swift build --package-path packages/react-native
```

## Verifying locally

Xcode 27 is installed but `xcode-select` may still point at Command Line Tools, whose
SwiftPM cannot build an iOS slice. Export the developer directory instead of switching
it with `sudo`:

```sh
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
swift build --package-path packages/react-native
swift test  --package-path packages/react-native
cd packages/react-native/ios \
  && xcodebuild -project C15tReactNative.xcodeproj -scheme C15tReactNative \
       -destination 'generic/platform=iOS Simulator' build
```

The xcodeproj builds the wire layer and the core only. `ReactNative/` needs the
`NativeC15tSpec` protocol Codegen generates into the host app's `ReactCodegen` pod, so
it compiles inside an app build and nowhere else. Regenerate the project with
`cd ios && GEM_HOME=/opt/homebrew/Cellar/cocoapods/1.17.0/libexec ruby support/gen-xcodeproj.rb`.

The protocol does not need an app to read, though. From this directory, `node
../android/codegen/generate-spec.mjs --platform ios --output /tmp/c15t-spec` writes what the
generator emits for `src/specs`, and
`src/specs/__tests__/ios-spec-surface.test.ts` fails when the hand-written selectors under
`ReactNative/` stop matching it. That check is the acceptance path for this half on a Linux
runner; the app build below is the one that proves the protocol compiles.

Those three cover the wire layer. The React-linked half compiles only inside an app, so
its acceptance path runs in `examples/react-native-bare/ios`:

```sh
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
cd examples/react-native-bare/ios
/opt/homebrew/bin/pod install
xcodebuild -workspace C15tBare.xcworkspace -scheme C15tBare -configuration Debug \
  -destination 'platform=iOS Simulator,id=<device-udid>' -derivedDataPath ./DerivedData build
xcrun simctl install booted ./DerivedData/Build/Products/Debug-iphonesimulator/C15tBare.app
xcrun simctl launch booted org.reactjs.native.example.C15tBare
```

The fixture draws the handshake it read through the module: which core is answering, the
protocol pair, the native SDK version, the snapshot revision. A TurboModule that failed
to register shows up on that screen rather than passing unnoticed, which is the point of
building the example app at all.

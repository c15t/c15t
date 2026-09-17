# C15tReactNative (iOS)

The iOS half of `@c15t/react-native`: a Codegen TurboModule in Swift over the pure
Swift consent core at [`native/core-swift`](../../native/core-swift). New Architecture
only. No UI here; every surface lives in JavaScript.

## Layout

| Path | Module | Contents |
| --- | --- | --- |
| `C15tReactNative/Bridge/` | none of React | wire encoders, the change pump, `Info.plist` configuration, the module handler. Compiles and tests with no Pods installed. |
| `C15tReactNative/ReactNative/` | React + `ReactCodegen` | the TurboModule, the ObjC export shim, and the constructor that starts the core before React Native initializes. |
| `C15tReactNative/Resources/Privacy.xcprivacy` | resource | privacy manifest, shipped in the pod resource bundle and the SPM resource bundle. |
| `Tests/C15tReactNativeTests/` | test | 38 tests over the wire layer and the module handler. |
| `C15tReactNative.xcodeproj` | generated | iOS-slice build of the wire layer against the core, for CI without an example app. |
| `support/gen-xcodeproj.rb` | tooling | regenerates that project. |

The bridge attaches to the already-bootstrapped core through `C15t.install(_:)`. It
never constructs a second one, so `getBootstrap()` and `getSnapshot()` stay synchronous
reads of the snapshot the core hydrated from storage.

## Startup order

`C15tReactNativeRuntimeInitializer.mm` runs a `__attribute__((constructor))` at image
load, which is before React Native initializes, so stored consent resolves from the
first JavaScript frame. An app that owns its own setup sets
`com.c15t.reactnative.AutoBootstrap` to `false` and calls
`C15tReactNativeRuntime.install(core:)` (its own configured core) or
`startCore()` (the `Info.plist` values, later) itself.

## `Info.plist` keys

Read by `C15tBridgeConfiguration.from(infoPlist:)`. Expo apps set these through
`app.json`'s `ios.infoPlist`.

| Key | Meaning |
| --- | --- |
| `com.c15t.reactnative.AutoBootstrap` | `false` opts out of the pre-RN start. |
| `com.c15t.backend.url` | Hosted project URL, or a self-hosted base URL. |
| `com.c15t.backend.mode` | `hosted`, `self-hosted`, `offline`, `none`. Inferred from the URL when absent. |
| `com.c15t.backend.domain` | Domain sent with each request. |
| `com.c15t.storage` | `keychain` (default) or `file`. |
| `com.c15t.keychain.service` | Keychain service name, default `com.c15t.core`. |
| `com.c15t.country`, `com.c15t.region`, `com.c15t.language` | Override geo/locale detection. |
| `com.c15t.test` | Test mode. |
| `com.c15t.categories` | Category ids the app declares. |
| `com.c15t.gpc` | Send the Global Privacy Control signal. |

## Integrating

CocoaPods (default) and SPM (`RCTUseSPM`, Expo's SPM mode) both resolve the core from
this repository, so the Swift, Kotlin, and JavaScript layers in one checkout cannot
disagree about which core is running.

```ruby
# Podfile
pod 'C15tReactNative', :path => '../packages/react-native'
pod 'C15tCore', :path => '../native/core-swift'
```

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

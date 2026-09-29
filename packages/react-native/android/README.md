# c15t React Native Android

The Android bridge for `@c15t/react-native`: a Codegen TurboModule plus a launch hook, on top
of the Kotlin consent core in [`native/core-android`](../../../native/core-android). It decides
nothing about consent. It reads state the core already holds, forwards the actions the user
took, and reports results as the JSON in `../src/protocol`.

## Modules

| Path | What it is |
| --- | --- |
| `c15t-react-native/` | The bridge library: module, package, event pump, payload codec, bootstrap |
| `c15t-spec/` | Where the bridge gets a `NativeC15tSpec` to compile against: the hand-written stand-in, or Codegen's own output when asked for it. Never shipped |
| `codegen/generate-spec.mjs` | The one script that runs `@react-native/codegen` over `../src/specs`, shared by both Gradle builds and the drift check |

The consent engine is not copied here. It is either the included build of
`native/core-android` or the published `com.c15t` artifacts, selected by a property.

## Autolinking

React Native's settings plugin autolinks a package by pointing a Gradle project at the
directory in `../../react-native.config.js`, and it discovers the library's Java package by
reading two files in that directory: a `package` attribute in `src/main/AndroidManifest.xml`,
then a namespace in `build.gradle[.kts]`. AGP dropped the manifest attribute, so the namespace
has to be readable in the build file at exactly that path. It is declared in
`c15t-react-native/build.gradle.kts`, and `sourceDir` is `./android/c15t-react-native`: the
library module, not this directory.

Both halves matter together. Pointed at this directory, the CLI matches a build file with no
namespace, `react-native config` exits non-zero, and a host app fails while its
`settings.gradle` is still being evaluated. A namespace declared only in `library.gradle` is
invisible to the same lookup. `scripts/react-native-autolink.ts` runs the real command from
`examples/react-native-bare` and fails CI on both mistakes.

`c15t-react-native/build.gradle.kts` is the only build script the library has, in a host app and
in this standalone build alike; the `build.gradle.kts` one level up configures nothing. What is left in
`library.gradle` is Groovy because a script pulled in with `apply(from:)` compiles without AGP
on its classpath, so a Kotlin one could not name `LibraryExtension`, and a host app cannot be
asked to add it. Groovy resolves the Android DSL at runtime against whichever AGP that build
uses. Its manifest, sources, and consumer rules take absolute paths: a manifest AGP cannot
find means the `androidx.startup` entry that bootstraps the core before the first JavaScript
frame quietly never gets merged.

## Commands

```sh
./gradlew build                                    # assemble + unit tests + lint
./gradlew :c15t-react-native:test                  # unit tests only
./gradlew :c15t-react-native:assembleRelease       # the AAR
./gradlew build -Pc15t.core.fromSource=false       # against the published core artifacts

# React Native's own generator, then compile the spec module against its output
./gradlew -Pc15t.spec.source=codegen :c15t-spec:assembleRelease
```

JDK 17 and an Android SDK are required. `local.properties` holds `sdk.dir` and is gitignored;
`ANDROID_HOME` works too. AGP 9 is required: the module compiles Kotlin through AGP's built-in
Kotlin support, which is the AGP React Native 0.87's own Gradle plugin is built against.
`codegen` mode needs `node` on `PATH` and a `react-native` install to resolve
`@react-native/codegen` from, which the package's own devDependency satisfies inside this
repository.

## Properties

| Property | Default | Effect |
| --- | --- | --- |
| `c15t.core.fromSource` | `true` | `false` resolves `com.c15t:c15t-core` and `c15t-android` from the repository instead of building `native/core-android` as an included build. This is what a CI or release build wants once the core ships |
| `c15t.core.version` | package version | The version of those published artifacts |
| `c15t.core.group` | `com.c15t` | Their Maven group |
| `c15t.spec.source` | `auto` | Where `NativeC15tSpec` comes from. `auto` and `stub` compile the hand-written stand-in in `:c15t-spec`. `codegen` runs `@react-native/codegen` over `../src/specs` into `:c15t-spec/build/generated/c15t-spec` and swaps that module's source set to the result, so the build compiles against React Native's real generator output instead of a description of it. In a host app there is no `:c15t-spec` project, so `codegen` generates into the bridge module instead, and `auto` generates there rather than failing. An unrecognised value fails the build |
| `c15t.reactNativeVersion` | unset | Only for the standalone build. A host app leaves it unset and React Native's root plugin supplies the version, having forced `com.facebook.react:react-android` onto every configuration |
| `c15t.reactNativeDir`, `c15t.codegenProjectRoot`, `c15t.nodeExecutable` | probed | Point Codegen at an install Gradle cannot infer |

### Generated, hand-written, and how the two stay honest

Codegen owns one file here: `NativeC15tSpec`. Everything else in this directory is
hand-written and compiles against that spec through a `compileOnly` edge, because the class is
generated per app build and a second copy in one APK is a duplicate-class failure. `codegen`
mode does not change that: generated output lands in `:c15t-spec/build/` and goes no further.
The published bridge AAR contains no `NativeC15tSpec` entry in either mode, and CI asserts it
by unzipping `classes.jar`.

Two checks hold the hand-written side to the generated one, and they grade different things:

- `C15tModuleSurfaceTest` reflects over the compiled Kotlin module and reads
  `../src/specs/NativeC15t.ts`, so the module implements the surface the TypeScript declares.
- `../src/specs/__tests__/android-spec-surface.test.ts` runs the same generator the Gradle
  command runs, then compares the emitted Java to the stand-in method by method: module name,
  argument types, return types, `@ReactMethod`, the synchronous flag, and the JSON-string
  payload convention. `removeListeners(Double)` and `removeListeners(double)` are two
  different overrides to a Kotlin subclass and both compile green, which is the drift that
  passes a build here and fails in someone's app.

Both run in CI's `Mobile SDK (android-js)` job on a plain Linux runner. The Node check is part
of the package test suite; the Gradle command is a step of its own that fails if generation
produces nothing, or if the spec reaches the AAR.

## Configuration

The core reads its backend from `AndroidManifest.xml` meta-data (see
[`native/core-android`](../../../native/core-android)): `com.c15t.PORTAL_URL`,
`com.c15t.INIT_URL`, `com.c15t.DOMAIN`, `com.c15t.FORCE_GPC`. Without a portal URL nothing
installs, and the module answers with the deny-all snapshot. Each is read whichever type
the manifest parser gave it, so a bare `true` and a quoted `"true"` mean the same thing;
`true`, `TRUE`, and `1` all count, and anything else reads as absent.

An app that calls `C15t.bootstrap` itself opts out of the launch hook:

```xml
<meta-data android:name="com.c15t.reactnative.AUTO_BOOTSTRAP" android:value="false" />
```

or removes the provider entry with `tools:node="remove"` on
`com.c15t.reactnative.C15tReactNativeInitializer`.

## Behaviour worth knowing

- `getBootstrap` and `getSnapshot` are synchronous and touch neither disk nor network. The core
  keeps one immutable snapshot in an atomic reference, so a read is a volatile load plus an
  encode, and it never posts to the core's dispatcher and waits.
- A `snapshot` event carries only `{"revision": N, "dirty": true}`. JavaScript pulls the full
  snapshot with `getSnapshot`, which is what keeps a burst of commits from shipping the whole
  document per change. `initialized` fires once, when a policy first stops being pending, and
  `error` carries `{code, message}`.
- A commit is durable before the promise resolves; delivery is the core's job, so a failed
  network call leaves the payload queued and replayed byte-for-byte.
- Everything fails closed: an unparseable policy leaves `policyPending` true and every optional
  category denied, and an unparseable intent is refused rather than guessed at.

## Not here

No IAB, TC string, or GVL handling; no Android UI; no old bridge. Prompts are JavaScript's
business, and `c15t-core` has no `android.*` import, which is what lets all of this be tested
without an emulator.

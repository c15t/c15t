# c15t React Native Android

The Android bridge for `@c15t/react-native`: a Codegen TurboModule plus a launch hook, on top
of the Kotlin consent core in [`native/core-android`](../../../native/core-android). It decides
nothing about consent. It reads state the core already holds, forwards the actions the user
took, and reports results as the JSON in `../src/protocol`.

## Modules

| Path | What it is |
| --- | --- |
| `c15t-react-native/` | The bridge library: module, package, event pump, payload codec, bootstrap |
| `c15t-spec/` | A `compileOnly` stand-in for Codegen's `NativeC15tSpec`. Never shipped |

The consent engine is not copied here. It is either the included build of
`native/core-android` or the published `com.c15t` artifacts, selected by a property.

## Two builds, one library script

React Native's settings plugin autolinks a package by pointing a Gradle project at its
`sourceDir` (`../../react-native.config.js`: `./android`), so `build.gradle.kts` is the
library's build script inside a host app even though the sources live in `c15t-react-native/`.
The configuration therefore sits in `c15t-react-native/library.gradle`, which both entry points
apply, with the manifest, sources, and consumer rules anchored to absolute paths. That
anchoring is load-bearing: a manifest AGP cannot find means the `androidx.startup` entry that
bootstraps the core before the first JavaScript frame quietly never gets merged.

`library.gradle` is Groovy because a script pulled in with `apply(from:)` compiles without AGP
on its classpath, so a Kotlin one could not name `LibraryExtension`, and a host app cannot be
asked to add it. Groovy resolves the Android DSL at runtime against whichever AGP that build
uses.

## Commands

```sh
./gradlew build                                    # assemble + unit tests + lint
./gradlew :c15t-react-native:test                  # unit tests only
./gradlew :c15t-react-native:assembleRelease       # the AAR
./gradlew build -Pc15t.core.fromSource=false       # against the published core artifacts
```

JDK 17 and an Android SDK are required. `local.properties` holds `sdk.dir` and is gitignored;
`ANDROID_HOME` works too. AGP 9 is required: the module compiles Kotlin through AGP's built-in
Kotlin support, which is the AGP React Native 0.87's own Gradle plugin is built against.

## Properties

| Property | Default | Effect |
| --- | --- | --- |
| `c15t.core.fromSource` | `true` | `false` resolves `com.c15t:c15t-core` and `c15t-android` from the repository instead of building `native/core-android` as an included build. This is what a CI or release build wants once the core ships |
| `c15t.core.version` | package version | The version of those published artifacts |
| `c15t.core.group` | `com.c15t` | Their Maven group |
| `c15t.spec.source` | `auto` | Where `NativeC15tSpec` comes from. `auto` uses the `:c15t-spec` stand-in when this build contains it and Codegen otherwise; `stub` forces the stand-in; `codegen` runs `generate-codegen-artifacts.js` |
| `c15t.reactNativeVersion` | unset | Only for the standalone build. A host app leaves it unset and React Native's root plugin supplies the version, having forced `com.facebook.react:react-android` onto every configuration |
| `c15t.reactNativeDir`, `c15t.codegenProjectRoot`, `c15t.nodeExecutable` | probed | Point Codegen at an install Gradle cannot infer |

Codegen output is a `compileOnly` input: `NativeC15tSpec` is generated per app build, and a
second copy of it in the APK is a duplicate-class failure. `C15tModuleSurfaceTest` reads
`../src/specs/NativeC15t.ts` directly and fails if the stand-in or the module no longer matches
it, so the stand-in cannot drift quietly.

## Configuration

The core reads its backend from `AndroidManifest.xml` meta-data (see
[`native/core-android`](../../../native/core-android)): `com.c15t.PORTAL_URL`,
`com.c15t.INIT_URL`, `com.c15t.DOMAIN`, `com.c15t.FORCE_GPC`. Without a portal URL nothing
installs, and the module answers with the deny-all snapshot.

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

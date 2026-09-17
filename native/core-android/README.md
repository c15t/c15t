# c15t native core (Android)

The Kotlin consent kernel behind `@c15t/react-native`. It owns consent state on the
device: policy evaluation, gating, persistence, the offline write queue, and subject
identity. See [`../CONTRACT.md`](../CONTRACT.md) for the shared model; this directory
implements it for Android.

IAB TCF is out of scope for this phase: no TC string, no GVL, no `IABTCF_*` keys. The
serialised snapshot keeps a null `iab` slot so adding it later stays additive.

## Modules

| Module | What it is |
| --- | --- |
| `c15t-core` | Pure Kotlin/JVM library. Zero `android.*` imports, enforced by `ModuleBoundaryTest`. Storage, clock, and HTTP arrive as interfaces. Java toolchain 17. |
| `c15t-android` | The Android wiring: AndroidKeyStore-backed encrypted storage with a `SharedPreferences` fallback, an `androidx.startup` Initializer, and a process-foreground observer. |

The split is the point. Every decision the SDK makes about consent lives in
`c15t-core` and is exercised on a plain JVM, so nothing about policy behaviour depends
on having a device.

`c15t-core` mirrors the Swift API names from the contract: `bootstrap`, `snapshot`,
`isAllowed`, `gate`, `onChange`, `save`, `dismissNotice`, `refresh`, `identify`,
`logout`, `setOverrides`, `flushPending`.

### Hot path

`snapshot()` and `isAllowed()` are a single volatile read of an immutable
`ConsentSnapshot`: no lock, no disk, no allocation, and the same instance until
something changes. Ad SDKs call them from the main thread while a save is in flight.

Anything unparseable fails closed: `policyPending` true and every optional category
false. That covers an unreadable policy resolution, an unknown category, a producer on
another policy contract, and a stored envelope this build cannot decode.

## Commands

```bash
./gradlew :c15t-core:test              # the consent behaviour, no emulator
./gradlew :c15t-core:bench             # measured numbers against the contract budgets
./gradlew :c15t-android:assembleDebug  # the library
./gradlew build                        # everything, including Android lint
```

`local.properties` holds `sdk.dir` for the Android module and is gitignored;
`ANDROID_HOME` works too. Gradle 9.4.1 and AGP 9.2.1 are pinned in
`gradle/libs.versions.toml`.

## Host integration

Either declare the backend and let the Initializer run:

```xml
<meta-data android:name="com.c15t.PORTAL_URL" android:value="https://your-portal.c15t.app" />
```

or call it yourself before the first read:

```kotlin
C15tAndroid.install(context, NativeConfig(portalUrl = "https://your-portal.c15t.app"))
```

`bootstrap` is idempotent, so both at once is fine. With no `PORTAL_URL` declared the
core stays inactive and reads answer deny-all, which is a safer outcome for a
misconfigured build than a crash in a launch hook. A host that wants to drive
`flushPending` and `refresh` itself can pass `observeForeground = false`, and can drop
the Initializer with `tools:node="remove"` on its manifest entry.

Persistence writes one AES/GCM blob per key under `noBackupFilesDir`, keyed
`com.c15t.snapshot`, `com.c15t.subject`, `com.c15t.pending`. The AES key is an
AndroidKeyStore alias and never enters the Java heap.

## Verification here

Unit tests cover the behaviour that would otherwise be checked by hand on a device:
cold start with an empty store, hydration without a network read, fail-closed on every
unparseable input, `isAllowed` deny-all while `policyPending`, the queue persisting a
payload before the request and replaying it unchanged after a failure, a later init not
rewriting a queued payload, the newest-20 cap, the protocol headers, and the storage
step-down when the platform key dies.

Instrumented tests are not part of this phase: no emulator is available in the
development environment, so `c15t-android` is verified by JVM unit tests plus
`assembleDebug`. That module keeps its Android code thin enough that the interesting
behaviour is elsewhere.

One known gap worth naming: the encrypted store's fallback protects against a key that
is unusable, but a key loss mid-session means the records written before it stay
unreadable and the subject id is regenerated. Consent state, not identity, is what the
fallback is for.

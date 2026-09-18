# c15t native core (Android)

The Kotlin consent kernel behind `@c15t/react-native`. It owns consent state on the
device: policy evaluation, gating, persistence, the offline write queue, and subject
identity. See [`../CONTRACT.md`](../CONTRACT.md) for the shared model; this directory
implements it for Android.

IAB TCF is on device here: TC Strings decode and encode byte-for-byte against the
shared fixtures in `../protocol`, and the vendor list `/init` served is kept by the
kernel and stored in the envelope alongside the policy. Unlike Swift, the Kotlin
snapshot does not yet fill `iab` with that list -- see `C15tKernel.vendorList`. The
device fetches no list of its own, and the `IABTCF_*` storage bus is not written.

## Modules

| Module | What it is |
| --- | --- |
| `c15t-core` | Pure Kotlin/JVM library. Zero `android.*` imports, enforced by `ModuleBoundaryTest`. Storage, clock, and HTTP arrive as interfaces. Java toolchain 17. |
| `c15t-android` | The Android wiring: AndroidKeyStore-backed encrypted storage with a `SharedPreferences` fallback, an `androidx.startup` Initializer, and a process-foreground observer. |

The split is the point. Every decision the SDK makes about consent lives in
`c15t-core` and is exercised on a plain JVM, so nothing about policy behaviour depends
on having a device.

`c15t-core` mirrors the API names from the contract: `bootstrap`, `snapshot`,
`isAllowed`, `decision`, `isReady`, `gate`, `onChange`, `save`, `dismissNotice`,
`refresh`, `identify`, `logout`, `setOverrides`, `flushPending`.

One name differs. The contract's decision-carrying `gate` is `gateDecision` here, because
Kotlin erases `(Boolean) -> Unit` and `(ConsentDecision) -> Unit` to the same `Function1`,
so the two are not two JVM methods and the overload cannot be declared. The boolean
`gate` keeps its name and its behaviour: it is what the React Native bridge forwards.
Swift keeps a single `gate`, where closure types are part of the signature.

### Hot path

`snapshot()`, `isAllowed()`, `decision()`, and `isReady()` are a single volatile read of
an immutable `ConsentSnapshot`: no lock, no disk, no allocation, and the same instance
until something changes. Ad SDKs call them from the main thread while a save is in
flight.

Anything unparseable fails closed: `policyPending` true and every optional category
false. That covers an unreadable policy resolution, an unknown category, a producer on
another policy contract, and a stored envelope this build cannot decode.

### Native SDK gating

The reason the core is native is that an analytics or advertising SDK initializes before
the bundle exists and asks whether it may start. `isAllowed` answers `false` both for a
subject who refused and for a policy that has not resolved, and those need opposite
handling, so `decision(category)` reports why:

| State | When |
| --- | --- |
| `GRANTED` | `necessary`, always. Or `isReady()` and the permission is true. |
| `DENIED` | `isReady()` and the permission is false. |
| `PENDING` | Not `isReady()` yet: not hydrated, or the first init has not resolved. |

`gateDecision(category) { decision -> }` is the same answer observed instead of read: it
fires at registration with the decision as it stands, including one reached long before
the call, fires again on every published change, and goes quiet when the handle closes.
`isReady()` means hydrated *and* the first policy resolution folded in.

`PENDING` is not a promise that an answer is coming. A first launch with no network stays
`PENDING` for the life of the process, which is the safe answer. A host that cannot wait
that long bounds the wait itself: the core grows no timeout, because whatever number it
picked would become an answer the policy never gave. Nothing outside the resolved policy
and the subject's c15t choice moves a category to `GRANTED`.

## Commands

```bash
./gradlew :c15t-core:test              # the consent behaviour, no emulator
./gradlew :c15t-core:bench             # measured numbers against the contract budgets
./gradlew :c15t-android:assembleDebug  # the library
./gradlew build                        # everything, including Android lint

# The device suite: ANDROID_HOME, a JDK 17 in JAVA_HOME, and one emulator attached.
sh gradlew :c15t-android:connectedDebugAndroidTest --no-build-cache
```

`local.properties` holds `sdk.dir` for the Android module and is gitignored;
`ANDROID_HOME` works too. Gradle 9.4.1 and AGP 9.2.1 are pinned in
`gradle/libs.versions.toml`.
`sh gradlew` rather than the wrapper path: a Gradle launcher is POSIX sh either way, and
the wrapper's executable bit does not survive every checkout.

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
`com.c15t.snapshot` and `com.c15t.pending`. The AES key is an AndroidKeyStore alias and
never enters the Java heap. The subject id is the one thing kept off that path: it is a
random `sub_` id c15t generates itself, so encrypting it protects nothing while tying it
to a key the platform can revoke. It lives in its own `c15t.subject` preference file, and
`SubjectPreservingStore` routes reads and writes so the rest of the core cannot tell the
difference.

The cipher chooses the GCM IV and the codec reads it back with `cipher.iv`, because an
AndroidKeyStore key created under the default randomized-encryption policy rejects a
caller-supplied IV on encrypt. Decryption always supplies the IV from the blob header,
which the platform permits. A write that fails for a reason that is not key loss is
logged once and dropped: the records stay in memory for the rest of the process, and
`SharedPreferences` is the answer to a key that cannot come back, not to a write that
merely failed.

## Verification here

Unit tests cover the behaviour that would otherwise be checked by hand on a device:
cold start with an empty store, hydration without a network read, fail-closed on every
unparseable input, `isAllowed` deny-all while `policyPending`, `decision` answering
`PENDING` rather than `DENIED` for every unresolved state including before `bootstrap`,
a gate registered after the answer landed still being told that answer, and a refusal
that does not degrade back to `PENDING` when the network drops. The queue has its own
coverage: a payload persisted before the request and replayed unchanged after a failure,
a later init that does not rewrite a queued payload, and the newest-20 cap, alongside the
protocol headers and the storage step-down when the platform key dies.

The parts of `c15t-android` that only exist on a device have a device suite of their
own, in `src/androidTest`, driven by `androidx.test.runner.AndroidJUnitRunner`. It covers
what a JVM cannot reach however carefully the doubles are written: the merged-manifest read
behind `configFrom`, the `androidx.startup` registration, `C15tAndroid.install` and the
reads it puts behind the process-wide facade with no JavaScript runtime in the process, a
second install leaving a running core alone, a host that declared no portal url still being
answered deny-all, an `AndroidKeyStore` entry destroyed for real, and the foreground and
reachability ports.

The device suite found the bug the JVM suite could not see: the foreground replay called
`C15t.flushPending()` on the thread the lifecycle callback arrived on, and the platform
refuses an HTTP connection there outright, so the queue stayed queued on every foreground
that looked like a retry. See `DeviceLifecycleTest`.

**What cannot gate.** Nothing in CI runs these tests today, and that is worth stating
rather than implying. CI's required mobile job runs `:c15t-core:test` and the Android
assemblies only; the device-build group that could host a connected run is advisory by
design and builds the example apps against a generic destination with no emulator booted
and no device attached, so it proves linking and compiling, not behaviour. Making the
connected suite gating needs a device no hosted runner gives today. Both Android legs of
`.github/workflows/ci.yml` are `ubuntu-latest`, which exposes no KVM, so neither a boot
step in the required `mobile` group nor a promoted `mobileBrowserOrDevice` job can start
an emulator there. The workable options are a runner with nested virtualization or a
device cloud, and the second also means dropping that group's advisory status and its
absence from `CI complete`. Until one of those lands,
`sh gradlew :c15t-android:connectedDebugAndroidTest` is a local and pre-release gate,
run before any change to storage, keystore, launch, or lifecycle.

A revoked key costs the records and not the identity. When the key stops working the
core deletes the blobs it can no longer open, warns once, and continues deny-all with
`policyPending` set; the stored subject id survives, so the next launch keeps writing
audit records against the same id instead of orphaning the ones already on the backend.
Installs that upgraded from the layout where the id sat in the encrypted blob have it
copied to plain storage on the first read, before anything is written encrypted, and the
recovery is idempotent.

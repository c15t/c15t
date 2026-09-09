# Policy conformance driver

`runConformanceSuite(driver, api)` registers the same 125 checks for React,
Next.js, Vue and Svelte. These include 42 runtime policy scenarios and 58 public
producer/codec vectors. Solid registers one explicitly named primitives-only
exclusion. Missing capabilities on a supported adapter fail the test.

Implement `TestDriver.createPolicySession` and `TestDriver.probePolicyContract`.
Their framework-neutral types are exported from `@c15t/conformance/driver` and
`@c15t/conformance/contract/policy-driver`. The shared suite imports no framework
runtime. Its meta-tests import the public core package to test assertions against
real kernel observations.

## Session lifecycle

Creation receives only `clock`, `policy`, raw `storage`, `gpc` and `probeGates`.
It must isolate storage, install event/callback/request spies, seed storage and
capture `baseline` before mounting the provider. A failed creation cleans up its
own resources. The suite always calls `dispose` on a returned session, including
when an operation, observation or assertion fails.

The first `execute` starts the public provider lifecycle. `hydrate` observes that
initial hydration once. `ssr-hydrate` instead renders on the server and hydrates
that HTML. Never pass a scenario, its steps, normalization expectations or expected
observations into the session. Never implement a policy evaluator or mutable
snapshot store in a driver.

Keep the exact supplied clock across construction, persistence, server rendering,
hydration, actions and expiry. The suite updates `clock.now()` before an
`advance-time` operation. The driver advances its timer mechanism and settles the
real lifecycle without substituting a different clock.

For legacy storage, seed the supplied bytes unchanged, URI-encoding a cookie once.
For `v3-choice-json`, wrap the parsed category receipts through the public envelope
codec. Preserve subject strings and receipt timestamps. Capture unescaped cookie
values and localStorage strings without decoding them in `observe`.

`reload` disposes the provider and mounts a new instance against the existing
storage. It retains cumulative evidence logs and does not reseed storage. The
suite checks the restored choice and subject against the preceding observation.

## Operations and evidence

Accept, reject, notice dismissal, preferences entry and save-current use rendered
public controls. Open the preferences UI when accept/reject is unavailable on a
notice or absent first layer. The explicit partial `save` operation uses the
public save command with exactly its own category keys, including the empty-patch
case. Policy changes and failure cases use real transport fakes and public init;
clear uses public persistence clear. No snapshot setters are allowed.

Matched init responses include real policy decision metadata and a snapshot token
so the null-resolution cases can prove both are discarded. The IAB null-resolution
case starts with enabled policy-derived IAB state. Failures retain the hidden first
layer and independently require safe opt-in permissions.

Record actual `onChoiceRecorded` and `onPermissionsChanged` callback invocations
through public provider configuration. Preserve event-shaped payloads. The shared
suite compares callbacks with the corresponding kernel events, including action
time, confirmed categories, snapshot and previous permissions. Consent, privacy
and init requests have distinct kinds. All logs are cumulative; observations must
copy them so later activity cannot change earlier evidence.

Probe actual registered scripts, network requests, iframes and Consent Mode
updates. Attempt a fresh network probe after each operation. Network assertions
use per-step deltas; script load history stays cumulative and `scriptAttached`
reports actual current DOM presence. Never infer gate outcomes from a permission
boolean. IAB probes use confirmed `snapshot.iab.authority`, not draft maps or the
presence of a TC string. Authority-preservation assertions compare every field,
including original confirmation and expiry times.

SSR evidence includes normalized server HTML and hydrated client DOM, prompt
requirements, clocks, captured hydration warnings and first-layer observations
starting at server paint and ending after hydration. Include at least those two
observations even when they match. Do not compare two separate client/server
mounts and label that hydration. Capture intermediate first-layer changes so a
prompt flash cannot disappear from the final comparison.

## Producer and codec vectors

`probePolicyContract` receives inputs only. Use the public schema producer,
normalizer, signal readers and storage codecs. Its baseline scope is marketing and
measurement in strict mode. Fingerprint mutations come from the fixture data and
compare policy, choice, notice and presentation domains. Return actual choice and
notice fingerprint input builder outputs in `fingerprintInputs`, including their
domain and version. The producer baseline uses one-day choice and notice validity.
The accepted `copyRevision` and GPC mapping enter both prompt domains; changing
choice validity affects only choice and policy hashes, and changing notice
validity affects only notice and policy hashes. Validate malformed GPC
mappings before hashing. Decode raw records through actual storage readers;
returning fixture normalization data is not a decoder implementation.

Keep opaque scenario fingerprint identities when preparing runtime resolutions.
Do not hash in construction, rendering or hydration. Producer vectors separately
exercise real fingerprint generation.

## Validation

Build core and its dependencies once with
`bun turbo run build --filter=@c15t/core`, then run
`bun run --cwd internals/conformance test`. The package retains Bun's existing test
runner. Its script fixes the tsconfig used by Bun so dependency build-time paths
to declaration files cannot become runtime imports.

The package tests verify fixture data, assertion sensitivity and suite wiring.
They do not establish adapter conformance. Run each supported adapter's browser
suite after integrating its driver and runtime changes. A successful shared
meta-test run must never be reported as a passing adapter matrix.

IAB policy probes use registered vendor `755` and purpose `1`. Return the actual
TC string and confirmed authority maps. The shared suite decodes that TC with
the canonical IAB codec and checks the target grants, disclosure, and original
confirmation clock independently of the reported gate result.

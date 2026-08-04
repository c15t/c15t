import type { Script } from 'c15t';

/**
 * Depth of a live vendor probe.
 *
 * - `full`: the vendor loader must respond successfully and the runtime check
 *   must pass after the remote script executes.
 * - `loader-only`: the loader request only has to complete with an HTTP
 *   response, rather than the 2xx JavaScript body the full tier demands. Use
 *   this for vendors whose loader rejects placeholder account ids (for example
 *   with a 404) so the probe still proves bootstrap and consent gating against
 *   the real endpoint. Runtime is still asserted whenever the vendor declares
 *   `runtimeCheck` or `runtimeReplacedGlobals` — some loaders serve a usable
 *   runtime even for unknown ids, and skipping those assertions would leave
 *   the vendor with no coverage of the SDK actually starting.
 * - `skip`: the vendor cannot be probed live (for example edge-injected
 *   scripts). Skipped vendors are reported with `skipReason` so coverage gaps
 *   stay visible instead of silently disappearing.
 */
export type LiveProbeTier = 'full' | 'loader-only' | 'skip';

/**
 * Ordered probe phases reported for every vendor.
 */
export type LiveProbePhase =
	| 'consent'
	| 'bootstrap'
	| 'load'
	| 'runtime'
	| 'network';

/**
 * Result of a single in-page or runner-side assertion.
 */
export interface LiveProbeCheckResult {
	/** Whether the assertion passed. */
	ok: boolean;
	/** Human-readable expected vs actual context for reports. */
	detail?: string;
}

/**
 * Live probe definition for one built-in `@c15t/scripts` integration.
 *
 * The same config object is imported by the Playwright runner (Node side) and
 * bundled into the browser harness, so `createScript` and the check callbacks
 * execute inside the probed page while the URL fields drive network routing
 * from the runner.
 */
export interface LiveVendorProbeConfig {
	/** Vendor id matching the registry `vendor` field and emitted `Script.id`. */
	vendor: string;
	/** Probe depth for this vendor. */
	tier: LiveProbeTier;
	/** Required when `tier` is `skip`; explains the coverage gap. */
	skipReason?: string;
	/**
	 * Builds the vendor script with safe placeholder configuration. Required
	 * unless `tier` is `skip`. Must not send real account identifiers.
	 */
	createScript?: () => Script;
	/** Substring identifying the vendor loader request URL. */
	loaderUrlSubstring?: string;
	/**
	 * Additional URL substrings the loader is allowed to fetch (chained vendor
	 * bundles). Every other third-party request is answered with an empty 204 so
	 * no real analytics data leaves the probe.
	 */
	allowUrlSubstrings?: string[];
	/**
	 * Runs in the page synchronously after `loadScripts`, before the remote
	 * loader executes. Assert queue stubs and globals seeded by bootstrap steps.
	 *
	 * This is the right home for a vendor's duplicate-install guard. Several
	 * loaders inspect the global the page already has and silently return if it
	 * does not look like their official snippet — a stub that fails such a guard
	 * leaves the vendor uninstalled with no error anywhere, because the loader
	 * still answers 200 and the page still looks healthy. Transcribe the
	 * predicate from their loader source and cite it in a comment.
	 *
	 * Bootstrap state is a pure function of our own manifest, so
	 * `stub-contract.test.ts` replays every one of these in jsdom on each PR.
	 * A stub that drifts out of contract fails there rather than a day later in
	 * the monitor.
	 */
	bootstrapCheck?: () => LiveProbeCheckResult;
	/**
	 * Runs in the page (polled) after the loader response arrives. Assert that
	 * the real vendor runtime replaced or initialized the bootstrap stub.
	 */
	runtimeCheck?: () => LiveProbeCheckResult;
	/**
	 * Reads the version the vendor runtime reports about itself, when it
	 * exposes one (for example `posthog.config` / `mixpanel.__SV`).
	 *
	 * Recorded in the report purely as provenance: it pins which upstream build
	 * a green run actually validated, so a later failure can be bisected by
	 * comparing two reports instead of diffing published CDN bundles. Never
	 * asserted — a vendor bumping their version is not a failure.
	 */
	runtimeVersion?: () => string | undefined;
	/**
	 * Globals whose pre-load stub identity must be replaced by the vendor
	 * runtime for the runtime phase to pass. Stronger than a `typeof` check in
	 * `runtimeCheck`, which a still-unreplaced stub can satisfy. The harness
	 * snapshots these references at load time and compares identities during
	 * the runtime phase, before any custom `runtimeCheck` runs.
	 */
	runtimeReplacedGlobals?: string[];
	/**
	 * Denied-consent egress assertion for `alwaysLoad` vendors.
	 *
	 * These vendors load for every visitor and manage consent internally, so
	 * the probe loads them with denied consent in an isolated browser context
	 * and asserts that no collection request leaves the page and no vendor
	 * storage is written. Config/CDN fetches stay allowed — only the explicit
	 * violation lists below fail the phase.
	 */
	deniedConsentProbe?: DeniedConsentProbeConfig;
	/** Free-form caveats surfaced in reports. */
	notes?: string;
}

/**
 * Violation lists for the denied-consent egress assertion.
 */
export interface DeniedConsentProbeConfig {
	/**
	 * URL substrings of the vendor's collection/beacon endpoints. Any request
	 * matching one of these under denied consent fails the consent phase —
	 * whether the runner blocked it or not, the attempt itself is the
	 * violation.
	 */
	collectUrlSubstrings: string[];
	/**
	 * Cookie-name / localStorage-key prefixes that must not appear under
	 * denied consent. Exclude vendor opt-out markers (for example Mixpanel's
	 * `__mp_opt_in_out_*`), which are legitimate consent-state storage.
	 */
	storagePrefixes?: string[];
	/** Extra context surfaced in reports. */
	notes?: string;
}

/**
 * Storage observed in the page during the denied-consent probe.
 */
export interface LiveStorageSnapshot {
	/** Cookie names visible via document.cookie. */
	cookieNames: string[];
	/** localStorage keys. */
	localStorageKeys: string[];
}

/**
 * Outcome returned by the in-page harness for one `loadScripts` invocation.
 */
export interface LiveProbeLoadOutcome {
	/** Whether the script loader actually injected/executed the script. */
	requested: boolean;
	/** Whether the script declares `alwaysLoad` (manages consent internally). */
	alwaysLoad: boolean;
	/** Bootstrap assertion captured immediately after `loadScripts`. */
	bootstrap: LiveProbeCheckResult;
	/** Serialized error when the harness itself failed. */
	error?: string;
}

/**
 * Browser-side API installed by the live probe harness bundle.
 */
export interface LiveVendorProbeHarness {
	/** Vendor ids available in this harness build. */
	vendors: string[];
	/** Loads one vendor with granted or denied consent and checks bootstrap. */
	load(vendor: string, granted: boolean): LiveProbeLoadOutcome;
	/** Runs the vendor's runtime check. */
	check(vendor: string): LiveProbeCheckResult;
	/** Reads the vendor runtime's self-reported version, if it exposes one. */
	version(vendor: string): string | undefined;
	/** Snapshots cookie names and localStorage keys in the probed page. */
	inspectStorage(): LiveStorageSnapshot;
}

/**
 * Loader response details captured by the runner.
 */
export interface LiveLoaderResponse {
	url: string;
	status: number;
	contentType?: string;
	/** Response body size in bytes, when the body was readable. */
	bytes?: number;
	/**
	 * Short SHA-256 of the loader response body.
	 *
	 * Vendors ship breaking changes to these bundles without notice, so the
	 * question after a failure is always "what changed, and when did it start".
	 * Comparing this digest between a passing and a failing report answers the
	 * second half directly, and a digest that moves while the probe still
	 * passes is advance warning that the contract is in motion.
	 */
	bodyHash?: string;
}

/**
 * Full probe outcome for one vendor.
 */
export interface LiveVendorResult {
	/** Vendor id matching the registry `vendor` field. */
	vendor: string;
	/** Public package subpath, e.g. `microsoft-clarity`. */
	packageSubpath: string;
	/** Human-readable integration label. */
	label: string;
	/** Probe depth used for this vendor. */
	tier: LiveProbeTier;
	/** Whether every asserted phase passed. */
	ok: boolean;
	/** True when the vendor was skipped instead of probed. */
	skipped?: boolean;
	/** Reason the vendor was skipped. */
	skipReason?: string;
	/** Number of probe attempts performed (failed probes retry once). */
	attempts: number;
	/** Per-phase assertion results. */
	phases: Partial<Record<LiveProbePhase, LiveProbeCheckResult>>;
	/** Loader response captured during the load phase, when one arrived. */
	loader?: LiveLoaderResponse;
	/** Version the vendor runtime reported, when `runtimeVersion` is declared. */
	sdkVersion?: string;
	/** Count of third-party requests answered with an empty 204. */
	blockedRequests: number;
	/** Console error messages emitted by the probed page. */
	consoleErrors: string[];
	/** Uncaught page errors emitted by the probed page. */
	pageErrors: string[];
	/** Config caveats copied from the probe definition. */
	notes?: string;
}

/**
 * JSON report produced by one live vendor monitor run.
 */
export interface LiveVendorReport {
	/** ISO timestamp when the report was generated. */
	generatedAt: string;
	/** Commit SHA the probes ran against, when available. */
	commitSha?: string;
	/** GitHub Actions run URL, when available. */
	runUrl?: string;
	/** Vendor filter used for a focused run, absent for full runs. */
	vendorFilter?: string[];
	/** Per-vendor probe outcomes. */
	results: LiveVendorResult[];
}

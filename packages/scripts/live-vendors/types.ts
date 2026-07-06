import type { Script } from 'c15t';

/**
 * Depth of a live vendor probe.
 *
 * - `full`: the vendor loader must respond successfully and the runtime check
 *   must pass after the remote script executes.
 * - `loader-only`: the loader request must complete with an HTTP response, but
 *   no runtime behavior is asserted. Use this for vendors whose loader rejects
 *   placeholder account ids (for example with a 404) so the probe still proves
 *   bootstrap and consent gating against the real endpoint.
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
	 */
	bootstrapCheck?: () => LiveProbeCheckResult;
	/**
	 * Runs in the page (polled) after the loader response arrives. Assert that
	 * the real vendor runtime replaced or initialized the bootstrap stub.
	 */
	runtimeCheck?: () => LiveProbeCheckResult;
	/** Free-form caveats surfaced in reports. */
	notes?: string;
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
}

/**
 * Loader response details captured by the runner.
 */
export interface LiveLoaderResponse {
	url: string;
	status: number;
	contentType?: string;
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

/**
 * Visit and cache-state definitions shared by the browser benches.
 *
 * A benchmark label has to say which visitor it measured and which caches
 * were cold. The earlier `repeat-visitor` arm opened a fresh browser context
 * without the stored choice, so it measured a second first-time visitor. The
 * definitions below make the stored-consent state explicit and give every
 * harness one vocabulary for cold browser cache, cold SDK manifest cache,
 * cold framework process, and the CDN edge, which no local run measures.
 */

/** Who is visiting: a first-time visitor or one with a stored choice. */
export type BenchVisitKind = 'fresh' | 'saved-accept' | 'saved-reject';

/** The explicit choice a saved-consent visit carries over. */
export type SavedConsentAction = 'accept' | 'reject';

export interface SavedConsentVisitDefinition {
	/** Result scenario name, used as the output file name. */
	name: `saved-consent-${SavedConsentAction}`;
	visit: Extract<BenchVisitKind, `saved-${string}`>;
	/** Banner action taken on the fresh visit whose storage is carried over. */
	action: SavedConsentAction;
	/** `data-testid` of the banner button that records the choice. */
	buttonTestId: `consent-banner-${SavedConsentAction}-button`;
}

/**
 * Saved-consent visits: a fresh visitor accepts or rejects, then a new
 * browser context receives that context's cookies and localStorage and loads
 * the page again. The banner must stay hidden on the second load.
 */
export const savedConsentVisits: readonly SavedConsentVisitDefinition[] = [
	{
		action: 'accept',
		buttonTestId: 'consent-banner-accept-button',
		name: 'saved-consent-accept',
		visit: 'saved-accept',
	},
	{
		action: 'reject',
		buttonTestId: 'consent-banner-reject-button',
		name: 'saved-consent-reject',
		visit: 'saved-reject',
	},
] as const;

/** Whether this visit should show the first-layer banner. */
export const expectsBanner = function expectsBanner(
	visit: BenchVisitKind
): boolean {
	return visit === 'fresh';
};

export interface VisitBannerObservation {
	visit: BenchVisitKind;
	/** Scenario label, quoted in the error. */
	scenario: string;
	/** `[data-testid="consent-banner-root"]` elements in the settled page. */
	bannerCount: number;
	/** Active UI reported by the page probe once policy settled. */
	activeUI: string | undefined;
	/** Banner markup in the server HTML, when the harness captured it. */
	bannerInServerHtml?: boolean;
	/** Whether the page restored an explicit choice, when the probe reports it. */
	hasStoredChoice?: boolean;
}

/**
 * Throw when a visit's banner state contradicts its label: a fresh visitor
 * must see the banner, and a saved-consent visitor must not see it in the
 * server HTML or after hydration.
 *
 * @param observation - What the harness saw on the settled page.
 * @throws {Error} When the observed banner state does not match the visit kind.
 */
export const assertVisitBannerState = function assertVisitBannerState(
	observation: VisitBannerObservation
): void {
	const {
		visit,
		scenario,
		bannerCount,
		activeUI,
		bannerInServerHtml,
		hasStoredChoice,
	} = observation;
	if (expectsBanner(visit)) {
		if (bannerCount === 0 && activeUI !== 'banner') {
			throw new Error(
				`${scenario}: a fresh visit must show the consent banner, but none rendered`
			);
		}
		return;
	}
	if (bannerCount > 0 || activeUI === 'banner' || bannerInServerHtml) {
		throw new Error(
			`${scenario}: a ${visit} visit carried a stored choice but still showed the consent banner (dom=${bannerCount}, activeUI=${String(activeUI)}, serverHtml=${String(bannerInServerHtml ?? 'n/a')}). The stored consent was not carried over.`
		);
	}
	if (hasStoredChoice === false) {
		throw new Error(
			`${scenario}: a ${visit} visit showed no banner but restored no stored choice.`
		);
	}
};

/** Cache states a local harness can set up. */
export type CacheTemperature = 'cold' | 'warm';

/**
 * Which caches were cold for a measured load. `cdnEdge` is always
 * `not-measured`: every harness talks to a local server without a CDN.
 */
export interface BenchColdState {
	/** Browser HTTP cache for the page's JS and CSS. */
	browserCache: CacheTemperature;
	/** SDK in-memory manifest cache on the server, when the arm uses one. */
	sdkManifestCache: CacheTemperature | 'not-applicable';
	/** Framework server process: module init, route compilation, JIT. */
	frameworkProcess: CacheTemperature;
	cdnEdge: 'not-measured';
	/** What the harness did to reach this state, in plain words. */
	setup: string;
}

export interface ColdStateInput {
	/** New browser context per sample, so no HTTP cache is shared. */
	freshBrowserContext: boolean;
	/** Whether the arm resolves consent from an SDK manifest cache. */
	usesManifestCache: boolean;
	/** First request for a manifest URL the process has never fetched. */
	manifestCacheKeyIsNew?: boolean;
	/** The server process was started for this sample. */
	processStartedForSample?: boolean;
	/** Extra wording for `setup`. */
	note?: string;
}

/**
 * Describe the cold state of a measured load from what the harness did.
 * Restarting a framework process also empties the SDK's in-memory manifest
 * cache, so a process restart is reported as cold for both.
 *
 * @param input - The harness actions for the sample.
 * @returns The cold-state descriptor recorded in result metadata.
 */
export const describeColdState = function describeColdState(
	input: ColdStateInput
): BenchColdState {
	const processCold = input.processStartedForSample === true;
	let sdkManifestCache: BenchColdState['sdkManifestCache'] = 'not-applicable';
	if (input.usesManifestCache) {
		sdkManifestCache =
			processCold || input.manifestCacheKeyIsNew === true ? 'cold' : 'warm';
	}
	const browserCache: CacheTemperature = input.freshBrowserContext
		? 'cold'
		: 'warm';
	const parts = [
		input.freshBrowserContext
			? 'new browser context (empty HTTP cache)'
			: 'reused browser context (HTTP cache kept)',
	];
	if (processCold) {
		parts.push(
			'server process started for this sample (resets module state and the SDK in-memory manifest cache; keeps the build output on disk)'
		);
	} else {
		parts.push('server process already warm');
	}
	if (input.usesManifestCache && !processCold) {
		parts.push(
			input.manifestCacheKeyIsNew
				? 'first request for a new manifest URL in this process'
				: 'manifest URL already fetched in this process'
		);
	}
	if (input.note) {
		parts.push(input.note);
	}
	parts.push('no CDN edge in the path');

	return {
		browserCache,
		cdnEdge: 'not-measured',
		frameworkProcess: processCold ? 'cold' : 'warm',
		sdkManifestCache,
		setup: parts.join('; '),
	};
};

/**
 * Short label for reports, for example
 * `browser:cold sdk-manifest:warm process:warm cdn:not-measured`.
 */
export const formatColdState = function formatColdState(
	state: BenchColdState
): string {
	return [
		`browser:${state.browserCache}`,
		`sdk-manifest:${state.sdkManifestCache}`,
		`process:${state.frameworkProcess}`,
		`cdn:${state.cdnEdge}`,
	].join(' ');
};

/**
 * Flatten a cold state into result metadata fields, since benchmark
 * metadata holds only scalar values.
 */
export const coldStateMetadata = function coldStateMetadata(
	state: BenchColdState
): Record<string, string> {
	return {
		cacheBrowser: state.browserCache,
		cacheCdnEdge: state.cdnEdge,
		cacheFrameworkProcess: state.frameworkProcess,
		cacheSdkManifest: state.sdkManifestCache,
		cacheSetup: state.setup,
		cacheState: formatColdState(state),
	};
};

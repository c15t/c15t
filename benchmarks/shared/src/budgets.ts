import type { PolicyBenchFixture } from './policy-fixtures';
import type { MetricBudget } from './schema';

/**
 * v3 budget constants for `c15t`, `@c15t/react`, and `@c15t/nextjs`.
 *
 * These use `percent-lte` with NEGATIVE thresholds, meaning the v3 measurement
 * must IMPROVE by at least |threshold|% against the base branch. The base
 * branch is expected to carry the v2-era benchmark numbers documented in
 * `benchmarks/BASELINE.md`, so the net effect is "v3 must be at least N%
 * faster/smaller than the v2 baseline."
 *
 * The core runtime entries carry `baseArm: 'v2'`: the comparison runner
 * evaluates them only against artifacts supplied for that arm through
 * `BENCHMARK_ARM_BASE_DIRS`, and an enforced run fails when the arm is
 * missing. A v3 base (every branch since the v3 promotion) is never treated
 * as the v2 arm, because a -50% improvement threshold against a v3 base
 * would either fail spuriously or, worse, pass against an implicit zero.
 *
 * These are attached to v3 benchmark output via the v3 runners' `budgetDefinitions`
 * field (see `benchmarks/core-benchmarks/src/run.ts` for the v2 equivalent).
 * Until the v3 runners exist (Track 2), these constants are exported but unused.
 *
 * Per `.context/plans/system-instruction-you-are-working-cryptic-pelican.md`:
 *   Bundle: −30% or better
 *   First-render / repeatVisitorInit: −50% or better
 *   Retained heap: −50% or better
 *   Zero unrelated React re-renders (enforced via separate profiler harness)
 */
export const coreRuntimeV3Budgets: MetricBudget[] = [
	{
		baseArm: 'v2',
		// The v2 runner named store construction `createConsentManagerStore`
		// (BASELINE.md, "createConsentKernel (was createConsentManagerStore)").
		baseArmMetric: 'createConsentManagerStore',
		comparator: 'percent-lte',
		description:
			'v3 kernel construction must not regress vs v2 baseline (target: sub-µs, pure).',
		metric: 'createConsentKernel',
		threshold: 0,
	},
	{
		baseArm: 'v2',
		baseArmMetric: 'initConsentManager',
		comparator: 'percent-lte',
		description: 'v3 full init must be at least 50% faster than v2 baseline.',
		metric: 'initConsentManager',
		threshold: -50,
	},
	{
		baseArm: 'v2',
		baseArmMetric: 'repeatVisitorInit',
		comparator: 'percent-lte',
		description:
			'v3 repeat-visitor init must be at least 50% faster than v2 baseline.',
		metric: 'repeatVisitorInit',
		threshold: -50,
	},
];

export const bundleV3Budgets: MetricBudget[] = [
	{
		comparator: 'percent-lte',
		description:
			'v3 /core-only route addition must be at least 30% smaller than v2 baseline.',
		metric: 'core-only',
		threshold: -30,
	},
	{
		comparator: 'percent-lte',
		description:
			'v3 /react-headless route addition must be at least 30% smaller than v2 baseline.',
		metric: 'react-headless',
		threshold: -30,
	},
	{
		comparator: 'percent-lte',
		description:
			'v3 /react-banner-only route addition must be at least 30% smaller than v2 baseline.',
		metric: 'react-banner-only',
		threshold: -30,
	},
	{
		comparator: 'percent-lte',
		description:
			'v3 /react-full route addition must be at least 30% smaller than v2 baseline.',
		metric: 'react-full',
		threshold: -30,
	},
	{
		comparator: 'percent-lte',
		description:
			'v3 /nextjs-basic route addition must be at least 30% smaller than v2 baseline.',
		metric: 'nextjs-basic',
		threshold: -30,
	},
];

export const artifactV3Budgets: MetricBudget[] = [
	{
		comparator: 'percent-lte',
		description:
			'v3 c15t package tarball must be at least 30% smaller than v2.',
		metric: 'c15t',
		threshold: -30,
	},
	{
		comparator: 'percent-lte',
		description:
			'v3 @c15t/react package tarball must be at least 30% smaller than v2.',
		metric: '@c15t/react',
		threshold: -30,
	},
	{
		comparator: 'percent-lte',
		description:
			'v3 @c15t/nextjs package tarball must be at least 30% smaller than v2.',
		metric: '@c15t/nextjs',
		threshold: -30,
	},
];

export const coreRuntimeBudgets: MetricBudget[] = [
	{
		comparator: 'percent-lte',
		description:
			'Tiny runtime operations may regress slightly, but should stay within 30%.',
		metric: 'createConsentKernel',
		threshold: 30,
	},
	{
		comparator: 'percent-lte',
		description: 'Snapshot reads should remain within 20% of the baseline.',
		metric: 'getSnapshot',
		threshold: 20,
	},
	{
		comparator: 'percent-lte',
		description: 'Full init cost should remain within 15% of the baseline.',
		metric: 'initConsentManager',
		threshold: 15,
	},
];

export const bundleBudgets: MetricBudget[] = [
	{
		comparator: 'delta-bytes-lte',
		description:
			'The core-only route should not gain more than 1.5kB over the base branch.',
		metric: 'core-only',
		threshold: 1536,
	},
	{
		comparator: 'delta-bytes-lte',
		description: 'Headless React bundle delta budget.',
		metric: 'react-headless',
		threshold: 2048,
	},
	{
		comparator: 'delta-bytes-lte',
		description: 'React banner bundle delta budget.',
		metric: 'react-banner-only',
		threshold: 3072,
	},
	{
		comparator: 'delta-bytes-lte',
		description: 'React full bundle delta budget.',
		metric: 'react-full',
		threshold: 4096,
	},
	{
		comparator: 'delta-bytes-lte',
		description: 'Next.js package bundle delta budget.',
		metric: 'nextjs-basic',
		threshold: 3072,
	},
];

export const artifactBudgets: MetricBudget[] = [
	{
		comparator: 'absolute-and-percent-lte',
		description: 'Core package tarball growth must stay below 15kB and 10%.',
		metric: 'c15t',
		secondaryThreshold: 10,
		threshold: 15360,
	},
	{
		comparator: 'absolute-and-percent-lte',
		description: 'React package tarball growth must stay below 15kB and 10%.',
		metric: '@c15t/react',
		secondaryThreshold: 10,
		threshold: 15360,
	},
	{
		comparator: 'absolute-and-percent-lte',
		description: 'Next.js package tarball growth must stay below 15kB and 10%.',
		metric: '@c15t/nextjs',
		secondaryThreshold: 10,
		threshold: 15360,
	},
];

export const browserBudgets: MetricBudget[] = [
	{
		comparator: 'absolute-and-percent-lte',
		description:
			'Banner readiness should not regress by more than 25ms and 15%.',
		metric: 'bannerReadyMs',
		secondaryThreshold: 15,
		threshold: 25,
	},
	{
		comparator: 'absolute-and-percent-lte',
		description: 'Final app-script response end budget.',
		metric: 'lastAppScriptEndMs',
		secondaryThreshold: 10,
		threshold: 15,
	},
	{
		comparator: 'absolute-and-percent-lte',
		description: 'Interaction latency budget.',
		metric: 'interactionLatencyMs',
		secondaryThreshold: 20,
		threshold: 20,
	},
	{
		comparator: 'percent-lte',
		description: 'Long-task total should not grow by more than 25%.',
		metric: 'longTaskTotalMs',
		threshold: 25,
	},
	{
		comparator: 'count-eq',
		description: 'Client/prefetch initial request count invariant.',
		metric: 'initRequestsAfterLoad',
		threshold: 1,
	},
	{
		comparator: 'count-eq',
		description: 'SSR routes should not show browser-observed init requests.',
		metric: 'ssrInitRequestsAfterLoad',
		threshold: 0,
	},
];

export const scriptLifecycleBudgets: MetricBudget[] = [
	{
		comparator: 'absolute-and-percent-lte',
		description: 'Grant-standard script lifecycle budget.',
		metric: 'grantStandardLifecycleMs',
		secondaryThreshold: 20,
		threshold: 20,
	},
	{
		comparator: 'absolute-and-percent-lte',
		description: 'Revoke-standard script lifecycle budget.',
		metric: 'revokeStandardLifecycleMs',
		secondaryThreshold: 20,
		threshold: 25,
	},
	{
		comparator: 'absolute-and-percent-lte',
		description: 'Single-script reload lifecycle budget.',
		metric: 'reloadSingleScriptMs',
		secondaryThreshold: 20,
		threshold: 15,
	},
	{
		comparator: 'absolute-and-percent-lte',
		description: 'Callback-only script lifecycle budget.',
		metric: 'callbackOnlyToggleMs',
		secondaryThreshold: 20,
		threshold: 10,
	},
	{
		comparator: 'absolute-and-percent-lte',
		description: 'alwaysLoad script retention lifecycle budget.',
		metric: 'alwaysLoadRetentionMs',
		secondaryThreshold: 20,
		threshold: 20,
	},
	{
		comparator: 'absolute-and-percent-lte',
		description: 'persistAfterConsentRevoked lifecycle budget.',
		metric: 'persistAfterRevokedMs',
		secondaryThreshold: 20,
		threshold: 20,
	},
	{
		comparator: 'count-eq',
		description: 'Script lifecycle benchmark should not emit errors.',
		metric: 'errorCount',
		threshold: 0,
	},
];

// ---------------------------------------------------------------------------
// Issue #1025 coverage: budgets for metrics that had no ceiling before the
// policy work. Thresholds marked "measured" were set from the repaired
// baseline capture of the pre-change checkout (bbfcc04bb); thresholds marked
// "allowance" are explicit absolute allowances for behavior the issue adds,
// declared before the head was measured. See benchmarks/README.md.
// ---------------------------------------------------------------------------

/**
 * Regression ceilings for the core runtime metrics that only had v2-arm
 * improvement budgets. Same-key comparison against the pre-change base.
 * Sub-microsecond medians are quantized by the timer, so each ceiling
 * combines an absolute floor with a percentage (measured).
 */
export const coreRuntimeCoverageBudgets: MetricBudget[] = [
	{
		comparator: 'absolute-and-percent-lte',
		description:
			'Save-all commit path may grow by at most 3µs and 100% (measured base medians 2.9-3.9µs across fixtures, timer-quantized).',
		metric: 'saveAll',
		secondaryThreshold: 100,
		threshold: 3,
	},
	{
		comparator: 'absolute-and-percent-lte',
		description:
			'Repeat-visitor save+init path may grow by at most 3µs and 100% (measured base medians 3.0-3.6µs across fixtures, timer-quantized).',
		metric: 'repeatVisitorInit',
		secondaryThreshold: 100,
		threshold: 3,
	},
	{
		comparator: 'absolute-and-percent-lte',
		description:
			'Sync consent mutation may grow by at most 1µs and 100% (measured base medians 0.33-0.67µs across fixtures, timer-quantized).',
		metric: 'setConsent',
		secondaryThreshold: 100,
		threshold: 1,
	},
];

/**
 * Policy wire payload and synchronous resolution budgets per fixed fixture.
 *
 * Byte allowances are declared per policy pack entry: the versioned
 * resolution contract adds a normalized rule, three 64-character SHA-256
 * fingerprints, and status fields to every pack entry and to the init
 * response. 1.5kB raw / 640B gzip per entry is the allowance; the init
 * response carries one entry.
 *
 * Timing allowances cover work the issue requires at resolution time:
 * fingerprints are computed synchronously once per resolution (three
 * pure-JS SHA-256 hashes of canonical JSON), and kernel init now evaluates
 * stored records and derives the prompt requirement.
 */
/** Compound policy operations have the existing 150µs hydration-work allowance.
 * Each sample asserts its actual choice, prompt and privacy result.
 * These APIs have no historical empty-kernel equivalent; no v2 speedup is claimed.
 */
export const realPolicyOperationBudgets: MetricBudget[] = [
	'realPolicyAcceptUs',
	'realPolicyRejectUs',
	'realPolicyPartialUs',
	'realPolicyRepeatHydrationUs',
	'realPolicyNoticeUs',
	'realPolicyStandingGpcUs',
].map((metric) => ({
	comparator: 'absolute-lte',
	description:
		'Local policy operation without a save transport, including setup and behavioral assertions, stays within the existing 150µs hydration-work allowance; deferred transport completion is reported separately.',
	metric,
	threshold: 150,
}));

export const policyRuntimeBudgetsForFixture =
	function policyRuntimeBudgetsForFixture(
		fixture: Pick<PolicyBenchFixture, 'presets'>
	): MetricBudget[] {
		const packs = fixture.presets.length;
		return [
			...realPolicyOperationBudgets,
			{
				comparator: 'delta-bytes-lte',
				description: `Manifest JSON may grow by at most 1536 bytes per pack entry (${packs} entries, allowance).`,
				metric: 'manifestJsonBytes',
				threshold: 1536 * packs,
			},
			{
				comparator: 'delta-bytes-lte',
				description: `Manifest gzip may grow by at most 640 bytes per pack entry (${packs} entries, allowance).`,
				metric: 'manifestGzipBytes',
				threshold: 640 * packs,
			},
			{
				comparator: 'delta-bytes-lte',
				description:
					'Init JSON may grow by at most 1536 bytes for the versioned resolution contract (allowance).',
				metric: 'initJsonBytes',
				threshold: 1536,
			},
			{
				comparator: 'delta-bytes-lte',
				description:
					'Init gzip may grow by at most 640 bytes for the versioned resolution contract (allowance).',
				metric: 'initGzipBytes',
				threshold: 640,
			},
			{
				comparator: 'absolute-and-percent-lte',
				description:
					'Synchronous policy resolution may grow by at most 100µs: three sync SHA-256 fingerprints per resolution (allowance).',
				metric: 'resolvePolicyUs',
				threshold: 100,
			},
			{
				comparator: 'absolute-and-percent-lte',
				description:
					'Init resolution from a manifest may grow by at most 100µs: fingerprints are precomputed once at resolution (allowance).',
				metric: 'resolveInitUs',
				threshold: 100,
			},
			{
				comparator: 'absolute-and-percent-lte',
				description:
					'Kernel construction plus init apply may grow by at most 50µs: record evaluation and prompt derivation (allowance).',
				metric: 'kernelInitUs',
				threshold: 50,
			},
		];
	};

/**
 * Browser policy scenarios (`@c15t/react-browser-bench` `policy-*`).
 * Prompt readiness and render/request invariants for a fresh visitor
 * resolving a real, source-emitted init payload.
 */
export const policyBrowserBudgets: MetricBudget[] = [
	{
		comparator: 'absolute-and-percent-lte',
		description:
			'Prompt readiness (banner visible or prompt resolved) should not regress by more than 25ms and 15%.',
		metric: 'promptReadyMs',
		secondaryThreshold: 15,
		threshold: 25,
	},
	{
		comparator: 'count-eq',
		description: 'Fresh hosted load makes exactly one init request.',
		metric: 'initRequestsAfterLoad',
		threshold: 1,
	},
	{
		comparator: 'count-eq',
		description:
			'No console errors or hydration warnings while the prompt settles.',
		metric: 'consoleErrorCount',
		threshold: 0,
	},
	{
		comparator: 'absolute-lte',
		description:
			'Probe commits until the prompt settles: measured base is 2 on every policy fixture (mount + init apply); no unrelated re-renders (measured).',
		metric: 'renderCount',
		threshold: 2,
	},
	{
		comparator: 'count-eq',
		description: 'Provider mounts exactly once.',
		metric: 'mountCount',
		threshold: 1,
	},
];

/**
 * Cookie and local-storage projection bytes after an explicit choice.
 *
 * v3 records every category receipt with its own confirmation time and
 * policy basis, and carries the subject once. The storage boundary
 * measured a full-scope accept-all at 186 compact-cookie bytes versus 127
 * for v2 and reject-all at 186 versus 64. The allowances below are
 * absolute ceilings on the bytes the browser actually holds, declared
 * from those measurements plus headroom for an identified subject: 320
 * bytes for the consent cookie value, 1024 bytes for its localStorage
 * JSON mirror. Notice and privacy projections are measured separately below.
 */
export const cookieProjectionBudgets: MetricBudget[] = [
	{
		comparator: 'absolute-lte',
		description:
			'Consent cookie value after a full explicit choice stays within 320 bytes (allowance; measured base 131 accept-all, 68 reject-all).',
		metric: 'choiceCookieBytes',
		threshold: 320,
	},
	{
		comparator: 'absolute-lte',
		description:
			'Consent localStorage record after a full explicit choice stays within 1024 bytes (allowance; measured base 188-192).',
		metric: 'choiceLocalStorageBytes',
		threshold: 1024,
	},
	{
		comparator: 'absolute-lte',
		description:
			'Total c15t cookie bytes on the page after a choice stay within 320 bytes (allowance).',
		metric: 'c15tCookieBytes',
		threshold: 320,
	},
	{
		comparator: 'count-eq',
		description: 'The choice cookie must actually be written.',
		metric: 'choiceCookiePresent',
		threshold: 1,
	},
];

export const noticeProjectionBudgets: MetricBudget[] = [
	{
		comparator: 'absolute-lte',
		description:
			'Two-category privacy projection measured 29 bytes; 64 bytes allows all four categories.',
		metric: 'privacyCookieBytes',
		threshold: 64,
	},
	{
		comparator: 'absolute-lte',
		description:
			'Full request cookie header for partial choice, notice and standing privacy directive measured 276 bytes including names and separators; keep the 320-byte aggregate ceiling.',
		metric: 'c15tCookieBytes',
		threshold: 320,
	},
	{
		comparator: 'absolute-lte',
		description:
			'Notice projection measured 86 bytes; 128-byte ceiling allows timestamp and encoding growth.',
		metric: 'noticeCookieBytes',
		threshold: 128,
	},
	{
		comparator: 'absolute-lte',
		description:
			'Notice dismissal localStorage record stays within 256 bytes (measured 122, allowance).',
		metric: 'noticeLocalStorageBytes',
		threshold: 256,
	},
];

/**
 * Persisted repeat visitor: hydration must resolve the prompt from the
 * stored record without a request, a re-render storm, or a warning, and
 * the synchronous hydration itself must stay cheap.
 */
export const hydrationBudgets: MetricBudget[] = [
	{
		comparator: 'absolute-and-percent-lte',
		description:
			'Prompt resolution for a persisted repeat visitor should not regress by more than 25ms and 15%.',
		metric: 'promptReadyMs',
		secondaryThreshold: 15,
		threshold: 25,
	},
	{
		comparator: 'absolute-and-percent-lte',
		description:
			'Synchronous persistence hydration (real cookie + localStorage read into a kernel) may grow by at most 150µs: v3 decodes, validates and evaluates receipts (allowance).',
		metric: 'hydrateUs',
		threshold: 150,
	},
	{
		comparator: 'count-eq',
		description: 'Hydration applies the stored record.',
		metric: 'hydratedFromStorage',
		threshold: 1,
	},
	{
		comparator: 'count-eq',
		description: 'Hydration must not write back to storage.',
		metric: 'hydrationWriteCount',
		threshold: 0,
	},
	{
		comparator: 'count-eq',
		description:
			'A persisted repeat visitor with a valid choice sees no first-layer prompt.',
		metric: 'promptShownCount',
		threshold: 0,
	},
	{
		comparator: 'count-eq',
		description:
			'No console errors or hydration warnings for a persisted repeat visitor.',
		metric: 'consoleErrorCount',
		threshold: 0,
	},
	{
		comparator: 'absolute-lte',
		description:
			'Probe commits until the prompt settles for a persisted repeat visitor: measured base is 3 (mount, hydrated render, init apply) (measured).',
		metric: 'renderCount',
		threshold: 3,
	},
	{
		comparator: 'count-eq',
		description: 'Repeat hosted load still makes exactly one init request.',
		metric: 'initRequestsAfterLoad',
		threshold: 1,
	},
];

/**
 * SSR consistency: matching server and client inputs must produce the
 * same initial prompt without a flash or hydration warning.
 */
export const ssrConsistencyBudgets: MetricBudget[] = [
	{
		comparator: 'count-eq',
		description:
			'No hydration warnings or console errors during SSR hydration.',
		metric: 'consoleErrorCount',
		threshold: 0,
	},
	{
		comparator: 'count-eq',
		description:
			'The active UI must not change between first client render and settle (no prompt flash).',
		metric: 'promptTransitionCount',
		threshold: 0,
	},
];

/**
 * Import boundary for the ordinary (non-IAB) React path, measured on the
 * esbuild metafile of a synthetic entry: no IAB, devtools, or all-locale
 * translation modules may be pulled in.
 */
export const importBoundaryBudgets: MetricBudget[] = [
	...['iab', 'devtools', 'allLocales'].map((family): MetricBudget => ({
		comparator: 'count-eq',
		description: `Ordinary React imports no ${family} modules, including zero-byte eliminated inputs.`,
		metric: `${family}InputModuleCount`,
		threshold: 0,
	})),
	{
		comparator: 'count-eq',
		description: 'Ordinary route bundles no @c15t/iab module bytes.',
		metric: 'iabInputBytes',
		threshold: 0,
	},
	{
		comparator: 'count-eq',
		description: 'Ordinary route bundles no @c15t/dev-tools module bytes.',
		metric: 'devtoolsInputBytes',
		threshold: 0,
	},
	{
		comparator: 'count-eq',
		description:
			'Ordinary route bundles no all-locale translation module bytes (only the default locale).',
		metric: 'allLocalesInputBytes',
		threshold: 0,
	},
];

const sharedBrowserBudgetMetrics = [
	'bannerReadyMs',
	'lastAppScriptEndMs',
	'interactionLatencyMs',
	'longTaskTotalMs',
];

/** Shared browser budgets attached to every browser-runtime scenario. */
export const sharedBrowserBudgets: MetricBudget[] = browserBudgets.filter(
	(budget) => sharedBrowserBudgetMetrics.includes(budget.metric)
);

const SSR_SCENARIOS = new Set(['ssr', 'manifest-ssr', 'rsc-ssr', 'ssr-repeat']);

const nextjsInitRequestBudget = function nextjsInitRequestBudget(
	scenario: string
): MetricBudget | undefined {
	if (SSR_SCENARIOS.has(scenario)) {
		return {
			comparator: 'count-eq',
			description:
				'SSR routes should not trigger browser-observed init requests.',
			metric: 'initRequestsAfterLoad',
			threshold: 0,
		};
	}
	if (scenario === 'repeat-visitor' || scenario === 'baseline') {
		// The fresh-context repeat arm has no fixed count; the baseline arm
		// renders no consent provider, so it never issues an init request.
		return undefined;
	}
	if (scenario === 'manifest-client') {
		return {
			comparator: 'count-eq',
			description:
				'Client manifest flow should resolve init from /manifest without a browser /init request.',
			metric: 'initRequestsAfterLoad',
			threshold: 0,
		};
	}
	return {
		comparator: 'count-eq',
		description: 'Client flow should make one init request on cold load.',
		metric: 'initRequestsAfterLoad',
		threshold: 1,
	};
};

/**
 * Budgets for one `@c15t/nextjs-browser-bench` scenario. `-cold` / `-steady`
 * manifest suffixes share the base scenario's budgets.
 */
export const nextjsBrowserBudgetsForScenario =
	function nextjsBrowserBudgetsForScenario(scenario: string): MetricBudget[] {
		const baseScenario = scenario.replace(/-(?:cold|steady)$/u, '');
		const budgets = [...sharedBrowserBudgets];
		const initRequest = nextjsInitRequestBudget(baseScenario);
		if (initRequest) {
			budgets.push(initRequest);
		}
		if (baseScenario !== 'baseline') {
			budgets.push(
				...ssrConsistencyBudgets.filter(
					(budget) => budget.metric === 'consoleErrorCount'
				)
			);
		}
		if (SSR_SCENARIOS.has(baseScenario)) {
			// Only server-rendered arms can flash: the client-init arms go from
			// no prompt to the banner once init resolves, which is one legitimate
			// transition rather than a server/client disagreement.
			budgets.push(
				...ssrConsistencyBudgets.filter(
					(budget) => budget.metric === 'promptTransitionCount'
				)
			);
		}
		if (baseScenario === 'ssr-repeat') {
			budgets.push({
				comparator: 'count-eq',
				description:
					'SSR repeat visitor applies the real stored choice before the settled client observation.',
				metric: 'hydratedChoicePresent',
				threshold: 1,
			});
			budgets.push(
				{
					comparator: 'count-eq',
					description:
						'A persisted repeat visitor over SSR gets no banner in the first HTML.',
					metric: 'bannerInFirstHtml',
					threshold: 0,
				},
				{
					comparator: 'count-eq',
					description:
						'A persisted repeat visitor over SSR sees no first-layer prompt after hydration.',
					metric: 'promptShownCount',
					threshold: 0,
				}
			);
		}
		return budgets;
	};

/**
 * Budgets for one `@c15t/vue` Nuxt browser scenario. The baseline arm
 * renders no consent provider and so carries no init-request invariant.
 */
export const nuxtBrowserBudgetsForScenario =
	function nuxtBrowserBudgetsForScenario(scenario: string): MetricBudget[] {
		const baseScenario = scenario.replace(/-(?:cold|steady)$/u, '');
		if (baseScenario === 'baseline') {
			return [...sharedBrowserBudgets];
		}
		if (
			baseScenario === 'ssr' ||
			baseScenario === 'ssr-manifest' ||
			baseScenario === 'repeat-visitor'
		) {
			return [
				...sharedBrowserBudgets,
				{
					comparator: 'count-eq',
					description:
						'SSR and repeat-visitor routes should not trigger browser-observed init requests.',
					metric: 'initRequestsAfterLoad',
					threshold: 0,
				},
			];
		}
		if (baseScenario === 'client-manifest') {
			return [
				...sharedBrowserBudgets,
				{
					comparator: 'count-eq',
					description:
						'Nuxt client manifest mode resolves from the browser manifest transport without any init request.',
					metric: 'initRequestsAfterLoad',
					threshold: 0,
				},
				{
					comparator: 'count-eq',
					description:
						'Nuxt client manifest mode must not call a same-origin init endpoint.',
					metric: 'sameOriginInitRequestsAfterLoad',
					threshold: 0,
				},
			];
		}
		return [
			...sharedBrowserBudgets,
			{
				comparator: 'count-eq',
				description:
					'Client SPA flow should make exactly one init request on cold load.',
				metric: 'initRequestsAfterLoad',
				threshold: 1,
			},
		];
	};

/** Budgets for one `@c15t/react-browser-bench` scenario. */
export const reactBrowserBudgetsForScenario =
	function reactBrowserBudgetsForScenario(scenario: string): MetricBudget[] {
		switch (scenario) {
			case 'policy-fresh':
			case 'policy-reject':
				return [...policyBrowserBudgets, ...cookieProjectionBudgets];
			case 'policy-notice':
				return [
					...policyBrowserBudgets.filter(
						(budget) => budget.metric !== 'renderCount'
					),
					...noticeProjectionBudgets,
				];
			case 'policy-none':
				return policyBrowserBudgets;
			case 'policy-repeat':
				return hydrationBudgets;
			default:
				return sharedBrowserBudgets;
		}
	};

/** Budgets for one `@c15t/script-lifecycle-bench` scenario by primary metric. */
export const scriptLifecycleBudgetsForMetric =
	function scriptLifecycleBudgetsForMetric(metric: string): MetricBudget[] {
		return scriptLifecycleBudgets.filter((budget) =>
			[metric, 'errorCount'].includes(budget.metric)
		);
	};

/**
 * Policy scenarios for the React browser bench (issue #1025).
 *
 * Each scenario loads `/policy/<fixture>?scenario=<name>`, whose init route
 * serves the payload the installed schema package resolves for a fixed
 * preset deployment. The runner records prompt readiness, render and
 * request invariants, console errors, the bytes the browser actually
 * stores after an explicit choice, and, for the persisted repeat visitor,
 * the synchronous hydration cost measured against the real cookie and
 * localStorage the previous load wrote.
 */
import {
	applyBenchThrottleProfile,
	benchNavigationTimingExpression,
	installBenchPerformanceObservers,
} from '@c15t/benchmarking/browser';
import type {
	BenchThrottleProfileName,
	readBenchNavigationTiming,
} from '@c15t/benchmarking/browser';
import { reactBrowserBudgetsForScenario } from '@c15t/benchmarking/budgets';
import type { PolicyBenchFixtureName } from '@c15t/benchmarking/policy-fixtures';
import { BENCHMARK_SCHEMA_VERSION } from '@c15t/benchmarking/schema';
import type {
	BenchmarkResult,
	MetricSampleSet,
} from '@c15t/benchmarking/schema';
import {
	getEnvironment,
	median,
	safeBaseSha,
	safeCommitSha,
	safeGitDirty,
	summarizeMetric,
	summarizeNullableMetric,
	writeJson,
} from '@c15t/benchmarking/utils';
import type * as PlaywrightTypes from 'playwright';

import type {
	PolicyBenchScenario,
	PolicyBenchState,
	PolicyHydrationMeasurement,
} from '../app/_bench/policy-state';

export type PolicyLoadScenario = Exclude<PolicyBenchScenario, 'policy-repeat'>;

export interface PolicyScenarioDefinition {
	name: PolicyLoadScenario;
	fixture: PolicyBenchFixtureName;
	/** Explicit action taken once the prompt is ready. */
	action: 'accept' | 'reject' | 'dismiss' | 'none';
	/** Whether a persisted repeat load follows the action. */
	repeat: boolean;
}

export const policyScenarios: PolicyScenarioDefinition[] = [
	{
		action: 'accept',
		fixture: 'optin-choice-eu',
		name: 'policy-fresh',
		repeat: true,
	},
	{
		action: 'reject',
		fixture: 'optin-choice-eu',
		name: 'policy-reject',
		repeat: false,
	},
	{
		action: 'dismiss',
		fixture: 'optout-california',
		name: 'policy-notice',
		repeat: false,
	},
	{
		action: 'none',
		fixture: 'optout-default-world',
		name: 'policy-none',
		repeat: false,
	},
];

const bannerRootTestId = 'consent-banner-root';
const bannerElementTimingName = 'c15t-consent-banner';
const HYDRATION_WARNING_PATTERN =
	/hydrat|#418|#423|#425|did not match|Text content does not match/iu;
const HYDRATION_ITERATIONS = Number(
	process.env.C15T_BENCH_HYDRATION_ITERATIONS ?? '30'
);
const DISMISS_SELECTORS = [
	'[data-testid="consent-banner-dismiss-button"]',
	'[data-testid="consent-notice-dismiss-button"]',
	'[data-testid="consent-banner-dismiss"]',
];

interface StorageBytes {
	choiceCookieBytes: number;
	choiceCookiePresent: number;
	c15tCookieBytes: number;
	noticeCookieBytes: number;
	privacyCookieBytes: number;
	choiceLocalStorageBytes: number;
	noticeLocalStorageBytes: number;
	privacyLocalStorageBytes: number;
	localStorageKeys: string[];
	cookieNames: string[];
}

/**
 * Serialized page function: bytes held by the browser under the c15t
 * storage keys. Kept as a string so transpiler wrappers cannot leak into
 * the page.
 */
const storageBytesExpression = `(() => {
	const utf8 = (value) => new TextEncoder().encode(value).length;
	const cookies = document.cookie
		.split(';')
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0)
		.map((entry) => {
			const index = entry.indexOf('=');
			return index < 0
				? { name: entry, value: '' }
				: { name: entry.slice(0, index), value: entry.slice(index + 1) };
		});
	const c15tCookies = cookies.filter((cookie) => cookie.name.startsWith('c15t'));
	const choiceCookie = cookies.find((cookie) => cookie.name === 'c15t');
	const noticeCookie = cookies.find((cookie) => cookie.name === 'c15t-notice');
    const privacyCookie = cookies.find((cookie) => cookie.name === 'c15t-privacy');
	const readLocal = (key) => {
		const value = window.localStorage.getItem(key);
		return value === null ? 0 : utf8(value);
	};
	const localStorageKeys = [];
	for (let index = 0; index < window.localStorage.length; index += 1) {
		const key = window.localStorage.key(index);
		if (key && key.startsWith('c15t')) {
			localStorageKeys.push(key);
		}
	}
	return {
		c15tCookieBytes: utf8(c15tCookies.map(cookie => cookie.name + '=' + cookie.value).join('; ')),
		choiceCookieBytes: choiceCookie ? utf8(choiceCookie.value) : 0,
		choiceCookiePresent: choiceCookie ? 1 : 0,
		choiceLocalStorageBytes: readLocal('c15t'),
		cookieNames: c15tCookies.map((cookie) => cookie.name),
		localStorageKeys,
		noticeCookieBytes: noticeCookie ? utf8(noticeCookie.value) : 0,
        privacyCookieBytes: privacyCookie ? utf8(privacyCookie.value) : 0,
		noticeLocalStorageBytes: readLocal('c15t-notice'),
		privacyLocalStorageBytes: readLocal('c15t-privacy'),
	};
})()`;

interface PolicyPageSample {
	scenario: PolicyBenchScenario;
	fixture: PolicyBenchFixtureName;
	promptReadyMs: number;
	promptShownCount: number;
	promptTransitionCount: number;
	promptKind: string | null;
	promptReason: string | null;
	hasStoredChoice: number | null;
	renderCount: number;
	mountCount: number;
	initRequestsAfterLoad: number;
	subjectRequestsAfterLoad: number;
	consoleErrorCount: number;
	consoleWarningCount: number;
	hydrationWarningCount: number;
	consoleErrors: string[];
	activeUiHistory: string[];
	onChoiceRecordedCount: number;
	onErrorCount: number;
	lastAppScriptEndMs: number;
	longTaskTotalMs: number;
	ttfbMs: number | null;
	domContentLoadedMs: number | null;
	interactionLatencyMs: number | null;
	storage: StorageBytes | null;
	hydration: PolicyHydrationMeasurement | null;
	actionTaken: string;
}

interface PolicyRunOptions {
	baseUrl: string;
	iterations: number;
	warmupIterations: number;
	throttleProfile: BenchThrottleProfileName;
	initLatencyMs: number;
	outputDir: string;
	resultScenarioName: (scenario: string) => string;
	resultFileName: (scenario: string) => string;
}

const applyPageProfile = async function applyPageProfile(
	context: PlaywrightTypes.BrowserContext,
	page: PlaywrightTypes.Page,
	profile: BenchThrottleProfileName
) {
	const session = await context.newCDPSession(page);
	await applyBenchThrottleProfile(session, profile);
	await installBenchPerformanceObservers(page, {
		bannerElementTimingName,
		bannerRootTestId,
	});
};

interface PageObservation {
	initRequests: number;
	subjectRequests: number;
	consoleErrorCount: number;
	consoleWarningCount: number;
	hydrationWarningCount: number;
	consoleErrors: string[];
	stop: () => void;
}

const observePage = function observePage(
	page: PlaywrightTypes.Page
): PageObservation {
	const observation: PageObservation = {
		consoleErrorCount: 0,
		consoleErrors: [],
		consoleWarningCount: 0,
		hydrationWarningCount: 0,
		initRequests: 0,
		stop: () => undefined,
		subjectRequests: 0,
	};
	const record = (text: string) => {
		observation.consoleErrorCount += 1;
		observation.consoleErrors.push(text);
		if (HYDRATION_WARNING_PATTERN.test(text)) {
			observation.hydrationWarningCount += 1;
		}
	};
	const onRequest = (request: PlaywrightTypes.Request) => {
		const { pathname } = new URL(request.url());
		if (pathname.endsWith('/init')) {
			observation.initRequests += 1;
		}
		if (pathname.endsWith('/subjects')) {
			observation.subjectRequests += 1;
		}
	};
	const onConsole = (message: PlaywrightTypes.ConsoleMessage) => {
		// React reports hydration mismatches through console.error, so errors
		// gate; warnings (including the benchmark's own PerformanceObserver
		// deprecation notice) are counted separately for the report.
		if (message.type() === 'error') {
			record(message.text());
		} else if (message.type() === 'warning') {
			observation.consoleWarningCount += 1;
			if (HYDRATION_WARNING_PATTERN.test(message.text())) {
				observation.hydrationWarningCount += 1;
			}
		}
	};
	const onPageError = (error: Error) => record(error.message);
	page.on('request', onRequest);
	page.on('console', onConsole);
	page.on('pageerror', onPageError);
	observation.stop = () => {
		page.off('request', onRequest);
		page.off('console', onConsole);
		page.off('pageerror', onPageError);
	};
	return observation;
};

const waitForPromptReady = async function waitForPromptReady(
	page: PlaywrightTypes.Page,
	scenario: PolicyBenchScenario,
	fixture: PolicyBenchFixtureName
) {
	await page.waitForFunction(
		({ targetScenario, targetFixture }) => {
			const state = window.__c15tPolicyBench;
			return (
				!!state &&
				state.scenario === targetScenario &&
				state.fixture === targetFixture &&
				typeof state.promptReadyMs === 'number'
			);
		},
		{ targetFixture: fixture, targetScenario: scenario },
		{ timeout: 30_000 }
	);
	await page.waitForLoadState('load');
	await page.waitForTimeout(250);
};

const readPageTiming = async function readPageTiming(
	page: PlaywrightTypes.Page
) {
	const navEntry = (await page.evaluate(
		benchNavigationTimingExpression
	)) as Awaited<ReturnType<typeof readBenchNavigationTiming>>;
	const scriptEntry = await page.evaluate(() => {
		const entries = performance
			.getEntriesByType('resource')
			.filter(
				(entry): entry is PerformanceResourceTiming =>
					entry instanceof PerformanceResourceTiming &&
					entry.initiatorType === 'script'
			);
		const ordered = [...entries].sort((a, b) => a.startTime - b.startTime);
		return {
			lastAppScriptEndMs: ordered[ordered.length - 1]?.responseEnd ?? 0,
		};
	});
	const longTasks = await page.evaluate(() => {
		const metrics = (
			window as typeof window & {
				__c15tBenchPerfMetrics?: { longTaskTotalMs: number };
			}
		).__c15tBenchPerfMetrics;
		return { longTaskTotalMs: metrics?.longTaskTotalMs ?? 0 };
	});
	return { ...navEntry, ...scriptEntry, ...longTasks };
};

const takeAction = async function takeAction(
	page: PlaywrightTypes.Page,
	action: PolicyScenarioDefinition['action'],
	state: PolicyBenchState
): Promise<{ actionTaken: string; interactionLatencyMs: number | null }> {
	if (action === 'none') {
		return { actionTaken: 'none', interactionLatencyMs: null };
	}
	if (action === 'accept' || action === 'reject') {
		const selector = `[data-testid="consent-banner-${action}-button"]`;
		const before = state.onChoiceRecordedCount;
		const startedAt = performance.now();
		await page.click(selector);
		await page.waitForFunction(
			(expected) => {
				const current = window.__c15tPolicyBench;
				return (
					!!current &&
					current.onChoiceRecordedCount > expected &&
					current.activeUI === 'none'
				);
			},
			before,
			{ timeout: 30_000 }
		);
		// Persistence writes are debounced behind the save; wait until the
		// consent cookie is actually present before reading storage bytes.
		await page.waitForFunction(
			() =>
				document.cookie
					.split(';')
					.some((entry) => entry.trim().startsWith('c15t=')),
			undefined,
			{ timeout: 10_000 }
		);
		return {
			actionTaken: action,
			interactionLatencyMs: performance.now() - startedAt,
		};
	}
	// dismiss: only when the installed source renders a dismiss control.
	if (!state.promptShown) {
		if (state.promptKind === null) {
			return {
				actionTaken: 'unsupported-legacy-notice',
				interactionLatencyMs: null,
			};
		}
		throw new Error('Notice fixture did not render its required prompt');
	}
	// Save a partial choice while notice remains due, alongside detected GPC.
	await page.click('#policy-save-partial');
	await page.waitForFunction(
		() => window.__c15tPolicyBench?.hasStoredChoice === true
	);
	const afterSave = await page.evaluate(
		() => window.__c15tPolicyBench?.promptKind
	);
	if (afterSave !== 'notice') {
		throw new Error('Preference save dismissed the notice');
	}
	for (const selector of DISMISS_SELECTORS) {
		// oxlint-disable-next-line no-await-in-loop -- ordered probe
		const count = await page.locator(selector).count();
		if (count > 0) {
			const startedAt = performance.now();
			// oxlint-disable-next-line no-await-in-loop -- ordered probe
			await page.click(selector);
			// oxlint-disable-next-line no-await-in-loop -- ordered probe
			await page.waitForFunction(
				() => window.__c15tPolicyBench?.activeUI === 'none',
				undefined,
				{ timeout: 30_000 }
			);
			// Wait for all projections before counting the request cookie header.
			// oxlint-disable-next-line no-await-in-loop -- ordered probe
			await page.waitForFunction(
				() =>
					document.cookie.includes('c15t-notice=') &&
					document.cookie.includes('c15t-privacy=')
			);
			return {
				actionTaken: 'dismiss',
				interactionLatencyMs: performance.now() - startedAt,
			};
		}
	}
	throw new Error('Notice fixture did not render a dismissal control');
};

const collectPolicySample = async function collectPolicySample(
	page: PlaywrightTypes.Page,
	scenario: PolicyBenchScenario,
	definition: PolicyScenarioDefinition,
	options: { action: PolicyScenarioDefinition['action']; hydrate: boolean }
): Promise<PolicyPageSample> {
	const observation = observePage(page);
	if (definition.action === 'dismiss') {
		await page.addInitScript(() => {
			Object.defineProperty(navigator, 'globalPrivacyControl', {
				configurable: true,
				value: true,
			});
		});
	}
	await page.goto(`/policy/${definition.fixture}?scenario=${scenario}`);
	await waitForPromptReady(page, scenario, definition.fixture);
	const state = (await page.evaluate(() => {
		const current = window.__c15tPolicyBench;
		if (!current) {
			return null;
		}
		const { measureHydration: _measureHydration, ...serializable } = current;
		return serializable;
	})) as PolicyBenchState | null;
	if (!state || typeof state.promptReadyMs !== 'number') {
		throw new Error(`${scenario}: missing policy bench state`);
	}
	const timing = await readPageTiming(page);
	observation.stop();

	const { actionTaken, interactionLatencyMs } = await takeAction(
		page,
		options.action,
		state
	);
	const storage = (await page.evaluate(storageBytesExpression)) as StorageBytes;
	let hydration: PolicyHydrationMeasurement | null = null;
	if (options.hydrate) {
		hydration = (await page.evaluate(async (iterations) => {
			const current = window.__c15tPolicyBench;
			if (!current?.measureHydration) {
				throw new Error('measureHydration is not installed on the page');
			}
			return await current.measureHydration(iterations);
		}, HYDRATION_ITERATIONS)) as PolicyHydrationMeasurement;
	}

	let hasStoredChoice: number | null = null;
	if (state.hasStoredChoice !== null) {
		hasStoredChoice = state.hasStoredChoice ? 1 : 0;
	}

	return {
		actionTaken,
		activeUiHistory: state.activeUiHistory,
		consoleErrorCount: observation.consoleErrorCount,
		consoleErrors: observation.consoleErrors,
		consoleWarningCount: observation.consoleWarningCount,
		domContentLoadedMs: timing.domContentLoadedMs ?? null,
		fixture: definition.fixture,
		hasStoredChoice,
		hydration,
		hydrationWarningCount: observation.hydrationWarningCount,
		initRequestsAfterLoad: observation.initRequests,
		interactionLatencyMs,
		lastAppScriptEndMs: timing.lastAppScriptEndMs,
		longTaskTotalMs: timing.longTaskTotalMs,
		mountCount: state.mountCount,
		onChoiceRecordedCount: state.onChoiceRecordedCount,
		onErrorCount: state.onErrorCount,
		promptKind: state.promptKind,
		promptReadyMs: state.promptReadyMs,
		promptReason: state.promptReason,
		promptShownCount: state.promptShown ? 1 : 0,
		promptTransitionCount: Math.max(0, state.activeUiHistory.length - 1),
		renderCount: state.renderCountAtReady ?? state.renderCount,
		scenario,
		storage,
		subjectRequestsAfterLoad: observation.subjectRequests,
		ttfbMs: timing.ttfbMs ?? null,
	};
};

const mostCommon = function mostCommon(
	values: (string | null)[]
): string | null {
	const counts = new Map<string | null, number>();
	for (const value of values) {
		counts.set(value, (counts.get(value) ?? 0) + 1);
	}
	let best: string | null = null;
	let bestCount = -1;
	for (const [value, count] of counts) {
		if (count > bestCount) {
			best = value;
			bestCount = count;
		}
	}
	return best;
};

const buildMetrics = function buildMetrics(
	samples: PolicyPageSample[]
): MetricSampleSet[] {
	const metrics: MetricSampleSet[] = [
		summarizeMetric(
			'promptReadyMs',
			'ms',
			samples.map((sample) => sample.promptReadyMs)
		),
		summarizeMetric(
			'promptShownCount',
			'count',
			samples.map((sample) => sample.promptShownCount)
		),
		summarizeMetric(
			'promptTransitionCount',
			'count',
			samples.map((sample) => sample.promptTransitionCount)
		),
		summarizeMetric(
			'renderCount',
			'count',
			samples.map((sample) => sample.renderCount)
		),
		summarizeMetric(
			'mountCount',
			'count',
			samples.map((sample) => sample.mountCount)
		),
		summarizeMetric(
			'initRequestsAfterLoad',
			'count',
			samples.map((sample) => sample.initRequestsAfterLoad)
		),
		summarizeMetric(
			'subjectRequestsAfterLoad',
			'count',
			samples.map((sample) => sample.subjectRequestsAfterLoad)
		),
		summarizeMetric(
			'consoleErrorCount',
			'count',
			samples.map((sample) => sample.consoleErrorCount)
		),
		summarizeMetric(
			'consoleWarningCount',
			'count',
			samples.map((sample) => sample.consoleWarningCount)
		),
		summarizeMetric(
			'hydrationWarningCount',
			'count',
			samples.map((sample) => sample.hydrationWarningCount)
		),
		summarizeMetric(
			'onChoiceRecordedCount',
			'count',
			samples.map((sample) => sample.onChoiceRecordedCount)
		),
		summarizeMetric(
			'onErrorCount',
			'count',
			samples.map((sample) => sample.onErrorCount)
		),
		summarizeNullableMetric(
			'hasStoredChoice',
			'count',
			samples.map((sample) => sample.hasStoredChoice)
		),
		summarizeMetric(
			'lastAppScriptEndMs',
			'ms',
			samples.map((sample) => sample.lastAppScriptEndMs)
		),
		summarizeMetric(
			'longTaskTotalMs',
			'ms',
			samples.map((sample) => sample.longTaskTotalMs)
		),
		summarizeNullableMetric(
			'ttfbMs',
			'ms',
			samples.map((sample) => sample.ttfbMs)
		),
		summarizeNullableMetric(
			'interactionLatencyMs',
			'ms',
			samples.map((sample) => sample.interactionLatencyMs)
		),
	];

	const storageSamples = samples
		.map((sample) => sample.storage)
		.filter((storage): storage is StorageBytes => storage !== null);
	if (storageSamples.length > 0) {
		for (const key of [
			'choiceCookieBytes',
			'choiceCookiePresent',
			'c15tCookieBytes',
			'noticeCookieBytes',
			'privacyCookieBytes',
			'choiceLocalStorageBytes',
			'noticeLocalStorageBytes',
			'privacyLocalStorageBytes',
		] as const) {
			metrics.push(
				summarizeMetric(
					key,
					key.endsWith('Present') ? 'count' : 'bytes',
					storageSamples.map((storage) => storage[key])
				)
			);
		}
	}

	const hydrationSamples = samples
		.map((sample) => sample.hydration)
		.filter(
			(hydration): hydration is PolicyHydrationMeasurement => hydration !== null
		);
	if (hydrationSamples.length > 0) {
		for (const key of ['hydrateCallCount', 'hydrateSuccessCount'] as const) {
			metrics.push(
				summarizeMetric(
					key,
					'count',
					hydrationSamples.map((sample) => sample[key])
				)
			);
		}
		metrics.push(
			summarizeMetric(
				'hydrateUs',
				'us',
				hydrationSamples.map((hydration) => median(hydration.hydrateUs))
			),
			summarizeMetric(
				'hydratedFromStorage',
				'count',
				hydrationSamples.map((hydration) =>
					hydration.hydratedFromStorage ? 1 : 0
				)
			),
			summarizeMetric(
				'hydrationWriteCount',
				'count',
				hydrationSamples.map((hydration) => hydration.writeCount)
			)
		);
	}
	return metrics;
};

const writePolicyResult = function writePolicyResult(
	scenario: PolicyBenchScenario,
	definition: PolicyScenarioDefinition,
	samples: PolicyPageSample[],
	browserVersion: string,
	options: PolicyRunOptions
) {
	const outputScenario = options.resultScenarioName(scenario);
	const hydrationSamples = samples
		.map((sample) => sample.hydration)
		.filter(
			(hydration): hydration is PolicyHydrationMeasurement => hydration !== null
		);
	const result: BenchmarkResult = {
		baseSha: safeBaseSha(),
		budgetDefinitions: reactBrowserBudgetsForScenario(scenario),
		budgets: [],
		commitSha: safeCommitSha(),
		environment: getEnvironment(browserVersion),
		fixture: {
			consentCount: 5,
			localeCount: 1,
			name: outputScenario,
			notes: [
				`Policy fixture ${definition.fixture}; action ${definition.action}.`,
			],
			scriptCount: 0,
			themeComplexity: 'minimal',
		},
		framework: 'react',
		metadata: {
			actionTaken: mostCommon(samples.map((sample) => sample.actionTaken)),
			activeUiHistory: mostCommon(
				samples.map((sample) => sample.activeUiHistory.join('>'))
			),
			consoleErrors: samples.flatMap((sample) => sample.consoleErrors),
			cookieNames: mostCommon(
				samples.map((sample) => sample.storage?.cookieNames.join(',') ?? null)
			),
			gitDirty: safeGitDirty(),
			hydrationActiveUI: mostCommon(
				hydrationSamples.map((hydration) => hydration.activeUI)
			),
			hydrationIterations: HYDRATION_ITERATIONS,
			hydrationPromptKind: mostCommon(
				hydrationSamples.map((hydration) => hydration.promptKind)
			),
			initLatencyMs: options.initLatencyMs,
			localStorageKeys: mostCommon(
				samples.map(
					(sample) => sample.storage?.localStorageKeys.join(',') ?? null
				)
			),
			policyFixture: definition.fixture,
			profile: options.throttleProfile,
			promptKind: mostCommon(samples.map((sample) => sample.promptKind)),
			promptReason: mostCommon(samples.map((sample) => sample.promptReason)),
		},
		metrics: buildMetrics(samples),
		notes: [
			'Init payload is resolved by the installed schema package from a fixed preset deployment; nothing is hand-written.',
			'promptReadyMs is the first moment policy resolution settled and, when a first-layer surface is required, that surface was visible.',
			'renderCount counts probe commits up to prompt readiness.',
			'Storage bytes are the UTF-8 lengths of the values the browser holds after the action.',
			'hydrateUs is the mean per-call cost of synchronous persistence hydrate() into fresh kernels carrying the fixture policy, against the real stored record; each sample is one timed batch because Chromium clamps performance.now() to 100µs.',
		],
		package: '@c15t/react-browser-bench',
		runtime: 'playwright',
		scenario: outputScenario,
		schemaVersion: BENCHMARK_SCHEMA_VERSION,
		suite: 'browser-runtime',
		timestamp: new Date().toISOString(),
	};
	writeJson(`${options.outputDir}/${options.resultFileName(scenario)}`, result);
};

export const runPolicyScenarios = async function runPolicyScenarios(
	browser: PlaywrightTypes.Browser,
	definitions: PolicyScenarioDefinition[],
	options: PolicyRunOptions
): Promise<void> {
	await definitions.reduce<Promise<void>>(async (previous, definition) => {
		await previous;
		const samples: PolicyPageSample[] = [];
		const repeatSamples: PolicyPageSample[] = [];
		const iterationIndexes = Array.from(
			{ length: options.warmupIterations + options.iterations },
			(_, index) => index
		);
		await iterationIndexes.reduce<Promise<void>>(async (prior, index) => {
			await prior;
			const context = await browser.newContext({ baseURL: options.baseUrl });
			const page = await context.newPage();
			await applyPageProfile(context, page, options.throttleProfile);
			const sample = await collectPolicySample(
				page,
				definition.name,
				definition,
				{ action: definition.action, hydrate: false }
			);
			if (index >= options.warmupIterations) {
				samples.push(sample);
			}
			if (definition.repeat) {
				// Same context: the cookie and localStorage written by the action
				// above are what this load hydrates from.
				const repeat = await collectPolicySample(
					page,
					'policy-repeat',
					definition,
					{ action: 'none', hydrate: true }
				);
				if (index >= options.warmupIterations) {
					repeatSamples.push(repeat);
				}
			}
			await context.close();
		}, Promise.resolve());

		writePolicyResult(
			definition.name,
			definition,
			samples,
			browser.version(),
			options
		);
		if (definition.repeat && repeatSamples.length > 0) {
			writePolicyResult(
				'policy-repeat',
				definition,
				repeatSamples,
				browser.version(),
				options
			);
		}
	}, Promise.resolve());
};

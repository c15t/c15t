/**
 * Live vendor monitor runner.
 *
 * Builds the browser harness with `Bun.build`, serves it locally, and drives
 * real Chromium (Playwright) probes against every configured vendor:
 *
 * 1. `consent`   — the script must not load while consent is denied.
 * 2. `bootstrap` — queue stubs must exist after `loadScripts`, before the
 *                  remote loader executes.
 * 3. `load`      — the real vendor loader URL must respond.
 * 4. `runtime`   — the vendor runtime must initialize (full tier only).
 * 5. `network`   — every non-allowlisted third-party request is answered with
 *                  an empty 204 so no real analytics data is sent.
 *
 * Usage:
 *   bun run --filter @c15t/scripts test:live-vendors
 *   bun run --filter @c15t/scripts test:live-vendors -- --vendor microsoft-clarity
 *   bun run --filter @c15t/scripts test:live-vendors -- --report ./report.json
 */
import { type Browser, chromium, type Response } from 'playwright';
import { getBuiltInScriptIntegrationByVendor } from '../src/registry';
import { evaluateDeniedConsentProbe } from './denied-consent';
import { failedPhases } from './report';
import type {
	LiveProbeCheckResult,
	LiveProbeLoadOutcome,
	LiveStorageSnapshot,
	LiveVendorProbeConfig,
	LiveVendorProbeHarness,
	LiveVendorReport,
	LiveVendorResult,
} from './types';
import { liveVendorProbeConfigs } from './vendors';

const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 2_000;
const LOADER_TIMEOUT_MS = 20_000;
const RUNTIME_TIMEOUT_MS = 10_000;
const RUNTIME_POLL_MS = 250;
const CONSENT_QUIET_MS = 750;

/**
 * Builds the loader allowlist for a probe config. Everything outside this
 * list (and the local harness origin) is answered with an empty 204.
 */
function buildAllowList(config: LiveVendorProbeConfig): string[] {
	return [
		config.loaderUrlSubstring,
		...(config.allowUrlSubstrings ?? []),
	].filter((value): value is string => Boolean(value));
}

const PAGE_HTML = `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>c15t live vendor probe</title>
		<script type="module" src="/harness.js"></script>
	</head>
	<body></body>
</html>`;

type ProbeWindow = {
	__c15tLiveVendorProbe?: LiveVendorProbeHarness;
};

interface CliOptions {
	vendors?: string[];
	reportPath: string;
}

/**
 * Parses runner CLI arguments.
 *
 * @param argv - Arguments after the script path (`--vendor id`, `--report path`).
 * @returns The parsed vendor filter and report path.
 * @throws `Error` when `--vendor`/`--report` is missing its value or an
 * unknown argument is passed.
 */
function parseArgs(argv: string[]): CliOptions {
	const options: CliOptions = { reportPath: 'live-vendors-report.json' };

	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index];

		if (arg === '--vendor') {
			const value = argv[++index];
			if (!value) {
				throw new Error('--vendor requires a vendor id');
			}
			options.vendors = [
				...(options.vendors ?? []),
				...value.split(',').map((vendor) => vendor.trim()),
			];
		} else if (arg === '--report') {
			const value = argv[++index];
			if (!value) {
				throw new Error('--report requires a file path');
			}
			options.reportPath = value;
		} else {
			throw new Error(`Unknown argument: ${arg}`);
		}
	}

	return options;
}

/**
 * Bundles the browser-side harness with `Bun.build`.
 *
 * @returns The bundled harness JavaScript served to the probe page.
 * @throws `Error` with the collected build logs when bundling fails.
 */
async function buildHarnessBundle(): Promise<string> {
	const entrypoint = new URL('./harness/entry.ts', import.meta.url).pathname;
	const result = await Bun.build({
		entrypoints: [entrypoint],
		target: 'browser',
		format: 'esm',
	});

	if (!result.success || !result.outputs[0]) {
		const details = result.logs.map((log) => String(log)).join('\n');
		throw new Error(`Failed to build live probe harness:\n${details}`);
	}

	return result.outputs[0].text();
}

interface ProbeAttemptOutcome {
	phases: LiveVendorResult['phases'];
	loader?: LiveVendorResult['loader'];
	blockedRequests: number;
	consoleErrors: string[];
	pageErrors: string[];
}

async function loaderResponseDetails(
	response: Response
): Promise<NonNullable<LiveVendorResult['loader']>> {
	const headers: Record<string, string> = await response
		.allHeaders()
		.catch(() => ({}));

	return {
		url: response.url(),
		status: response.status(),
		contentType: headers['content-type'],
	};
}

/**
 * Fetches loader details from Node when the browser never surfaced a
 * response (for example when Chromium ORB-filters a non-script error page).
 */
async function fetchLoaderDetails(
	url: string
): Promise<LiveVendorResult['loader']> {
	try {
		const response = await fetch(url, {
			signal: AbortSignal.timeout(LOADER_TIMEOUT_MS),
		});
		await response.body?.cancel();

		return {
			url,
			status: response.status,
			contentType: response.headers.get('content-type') ?? undefined,
		};
	} catch {
		return undefined;
	}
}

const DENIED_EGRESS_QUIET_MS = 4_000;

/**
 * Loads an `alwaysLoad` vendor with denied consent in an isolated context and
 * evaluates its egress and storage against the vendor's violation lists.
 *
 * Uses its own browser context so the warmed cache and any vendor state never
 * leak into the granted-consent probe that follows.
 */
async function probeDeniedConsentEgress(
	browser: Browser,
	baseUrl: string,
	config: LiveVendorProbeConfig
): Promise<LiveProbeCheckResult> {
	const deniedProbe = config.deniedConsentProbe;
	if (!deniedProbe) {
		return {
			ok: true,
			detail:
				'script declares alwaysLoad and manages consent internally; denied-consent gating not asserted',
		};
	}

	const observedRequests: string[] = [];
	const allow = buildAllowList(config);

	const context = await browser.newContext();

	try {
		await context.route('**/*', (route) => {
			const url = route.request().url();

			if (url.startsWith(baseUrl)) {
				return route.continue();
			}

			observedRequests.push(url);

			if (allow.some((substring) => url.includes(substring))) {
				return route.continue();
			}

			return route.fulfill({ status: 204, body: '' });
		});

		// Refuse WebSockets here too — HTTP routing does not cover them.
		await context.routeWebSocket('**', (ws) => {
			ws.close();
		});

		const page = await context.newPage();
		await page.goto(baseUrl, { waitUntil: 'load' });

		const outcome = await page.evaluate<LiveProbeLoadOutcome, string>(
			(vendor) => {
				const harness = (globalThis as unknown as ProbeWindow)
					.__c15tLiveVendorProbe;
				if (!harness) {
					throw new Error('harness missing');
				}
				return harness.load(vendor, false);
			},
			config.vendor
		);

		if (outcome.error) {
			return { ok: false, detail: `harness error: ${outcome.error}` };
		}

		// A zero-violation result is only meaningful if the vendor actually
		// loaded — otherwise a loader regression would read as a pass.
		if (!outcome.requested) {
			return {
				ok: false,
				detail:
					'alwaysLoad script was not injected under denied consent; egress assertion could not run',
			};
		}

		// Give the vendor runtime time to initialize and attempt collection.
		await page.waitForTimeout(DENIED_EGRESS_QUIET_MS);

		const storage = await page.evaluate<LiveStorageSnapshot>(() => {
			const harness = (globalThis as unknown as ProbeWindow)
				.__c15tLiveVendorProbe;
			if (!harness) {
				throw new Error('harness missing');
			}
			return harness.inspectStorage();
		});

		return evaluateDeniedConsentProbe(deniedProbe, observedRequests, storage);
	} finally {
		await context.close();
	}
}

async function probeVendorAttempt(
	browser: Browser,
	baseUrl: string,
	config: LiveVendorProbeConfig,
	alwaysLoad: boolean
): Promise<ProbeAttemptOutcome> {
	const blocked: string[] = [];
	const consoleErrors: string[] = [];
	const pageErrors: string[] = [];
	const allow = buildAllowList(config);

	const context = await browser.newContext();

	try {
		await context.route('**/*', (route) => {
			const url = route.request().url();

			if (url.startsWith(baseUrl)) {
				return route.continue();
			}

			if (allow.some((substring) => url.includes(substring))) {
				return route.continue();
			}

			blocked.push(url);
			return route.fulfill({ status: 204, body: '' });
		});

		// HTTP routing does not cover WebSockets; refuse every WS connection so
		// realtime vendor channels cannot bypass the network guard. Closing the
		// routed socket refuses it outright — an empty handler would mock an
		// open socket instead.
		await context.routeWebSocket('**', (ws) => {
			ws.close();
		});

		const page = await context.newPage();
		page.on('console', (message) => {
			if (message.type() === 'error') {
				consoleErrors.push(message.text());
			}
		});
		page.on('pageerror', (error) => {
			pageErrors.push(String(error));
		});

		let sawLoaderRequest = false;
		let loaderRequestUrl: string | undefined;
		let loaderFailure: string | undefined;
		if (config.loaderUrlSubstring) {
			const loaderUrlSubstring = config.loaderUrlSubstring;
			page.on('request', (request) => {
				if (request.url().includes(loaderUrlSubstring)) {
					sawLoaderRequest = true;
					loaderRequestUrl = request.url();
				}
			});
			page.on('requestfailed', (request) => {
				if (request.url().includes(loaderUrlSubstring)) {
					loaderFailure = request.failure()?.errorText;
				}
			});
		}

		await page.goto(baseUrl, { waitUntil: 'load' });

		const hasHarness = await page.evaluate(() =>
			Boolean((globalThis as unknown as ProbeWindow).__c15tLiveVendorProbe)
		);
		if (!hasHarness) {
			throw new Error('probe harness did not initialize in the page');
		}

		const phases: LiveVendorResult['phases'] = {};

		// Phase: consent — load with denied consent; nothing should hit the wire.
		// alwaysLoad scripts manage consent internally and load regardless, so
		// they get the denied-consent egress assertion in an isolated context
		// instead of the gating check (which would also warm this context's
		// cache and swallow the network events the load phase waits for).
		if (alwaysLoad) {
			phases.consent = await probeDeniedConsentEgress(browser, baseUrl, config);
		} else {
			const deniedOutcome = await page.evaluate<LiveProbeLoadOutcome, string>(
				(vendor) => {
					const harness = (globalThis as unknown as ProbeWindow)
						.__c15tLiveVendorProbe;
					if (!harness) {
						throw new Error('harness missing');
					}
					return harness.load(vendor, false);
				},
				config.vendor
			);

			await page.waitForTimeout(CONSENT_QUIET_MS);

			if (deniedOutcome.error) {
				phases.consent = {
					ok: false,
					detail: `harness error: ${deniedOutcome.error}`,
				};
			} else {
				const leaked = deniedOutcome.requested || sawLoaderRequest;
				phases.consent = {
					ok: !leaked,
					detail: leaked
						? 'script loaded despite denied consent'
						: 'script did not load while consent was denied',
				};
			}

			// Reset to a fresh document before the granted-consent probe, and
			// clear every loader observation so denied-phase network events can
			// never feed the granted-phase load assertions.
			await page.reload({ waitUntil: 'load' });
			sawLoaderRequest = false;
			loaderRequestUrl = undefined;
			loaderFailure = undefined;
		}

		const loaderResponsePromise = config.loaderUrlSubstring
			? page
					.waitForResponse(
						(response) =>
							response.url().includes(config.loaderUrlSubstring as string),
						{ timeout: LOADER_TIMEOUT_MS }
					)
					.catch(() => undefined)
			: Promise.resolve(undefined);

		// Phase: bootstrap — granted consent; stub checks run synchronously
		// inside the harness before the remote loader can respond.
		const grantedOutcome = await page.evaluate<LiveProbeLoadOutcome, string>(
			(vendor) => {
				const harness = (globalThis as unknown as ProbeWindow)
					.__c15tLiveVendorProbe;
				if (!harness) {
					throw new Error('harness missing');
				}
				return harness.load(vendor, true);
			},
			config.vendor
		);

		if (grantedOutcome.error) {
			phases.bootstrap = {
				ok: false,
				detail: `harness error: ${grantedOutcome.error}`,
			};
		} else if (!grantedOutcome.requested) {
			phases.bootstrap = {
				ok: false,
				detail: 'script did not load with granted consent',
			};
		} else {
			phases.bootstrap = grantedOutcome.bootstrap;
		}

		// Phase: load — the real vendor loader must answer.
		let loader: LiveVendorResult['loader'];
		if (config.loaderUrlSubstring) {
			const loaderResponse = await loaderResponsePromise;

			if (loaderResponse) {
				loader = await loaderResponseDetails(loaderResponse);
				const detail = `loader responded with HTTP ${loader.status}${
					loader.contentType ? ` (${loader.contentType})` : ''
				}`;

				if (config.tier === 'loader-only') {
					// Any HTTP response proves the endpoint is reachable; placeholder
					// ids often return 404/204 instead of real container JS.
					phases.load = { ok: true, detail };
				} else {
					// Full tier requires actual JavaScript, not an empty 2xx. Clarity
					// answers unknown project ids with an empty 204 that would
					// otherwise pass as "loaded".
					const servedScript =
						loaderResponse.ok() &&
						loader.status !== 204 &&
						(loader.contentType?.includes('javascript') ?? false);
					phases.load = {
						ok: servedScript,
						detail: servedScript
							? detail
							: `${detail} — expected a 2xx JavaScript response`,
					};
				}
			} else if (
				config.tier === 'loader-only' &&
				loaderFailure?.toUpperCase().includes('ERR_BLOCKED_BY_ORB') &&
				loaderRequestUrl
			) {
				// Chromium ORB-filters cross-origin error pages before the renderer
				// sees them, so no response event fires — but an ORB block proves
				// the endpoint answered. Fetch from Node to record the real status.
				loader = await fetchLoaderDetails(loaderRequestUrl);
				phases.load = {
					ok: true,
					detail: `loader answered but Chromium ORB-filtered the non-script response${
						loader ? ` (HTTP ${loader.status})` : ''
					} — expected for placeholder ids`,
				};
			} else {
				let detail = 'loader request was never sent';
				if (loaderFailure) {
					detail = `loader request failed: ${loaderFailure}`;
				} else if (sawLoaderRequest) {
					detail = `loader request sent but no response within ${LOADER_TIMEOUT_MS}ms`;
				}

				phases.load = { ok: false, detail };
			}
		} else {
			phases.load = {
				ok: true,
				detail: 'no external loader for this vendor',
			};
		}

		// Phase: runtime — full tier only; poll until the vendor runtime is up.
		if (config.tier === 'full' && phases.load.ok) {
			const deadline = Date.now() + RUNTIME_TIMEOUT_MS;
			let runtime: LiveProbeCheckResult = {
				ok: false,
				detail: 'runtime check never ran',
			};

			for (;;) {
				runtime = await page.evaluate<LiveProbeCheckResult, string>(
					(vendor) => {
						const harness = (globalThis as unknown as ProbeWindow)
							.__c15tLiveVendorProbe;
						if (!harness) {
							throw new Error('harness missing');
						}
						return harness.check(vendor);
					},
					config.vendor
				);

				if (runtime.ok || Date.now() >= deadline) {
					break;
				}

				await page.waitForTimeout(RUNTIME_POLL_MS);
			}

			phases.runtime = runtime;
		}

		// Phase: network — informational; the route handler guarantees blocking.
		phases.network = {
			ok: true,
			detail: `${blocked.length} third-party request(s) answered with an empty 204`,
		};

		return {
			phases,
			loader,
			blockedRequests: blocked.length,
			consoleErrors,
			pageErrors,
		};
	} finally {
		await context.close();
	}
}

function buildSkippedResult(config: LiveVendorProbeConfig): LiveVendorResult {
	const integration = getBuiltInScriptIntegrationByVendor(config.vendor);

	return {
		vendor: config.vendor,
		packageSubpath: integration?.packageSubpath ?? config.vendor,
		label: integration?.label ?? config.vendor,
		tier: config.tier,
		ok: true,
		skipped: true,
		skipReason: config.skipReason ?? 'skipped without a reason',
		attempts: 0,
		phases: {},
		blockedRequests: 0,
		consoleErrors: [],
		pageErrors: [],
		notes: config.notes,
	};
}

async function probeVendor(
	browser: Browser,
	baseUrl: string,
	config: LiveVendorProbeConfig
): Promise<LiveVendorResult> {
	const integration = getBuiltInScriptIntegrationByVendor(config.vendor);
	const base = {
		vendor: config.vendor,
		packageSubpath: integration?.packageSubpath ?? config.vendor,
		label: integration?.label ?? config.vendor,
		tier: config.tier,
		notes: config.notes,
	};

	// Inspect the script node-side so the probe knows about alwaysLoad before
	// touching the page. Factories only build config objects, so this is safe
	// outside a browser.
	const alwaysLoad = config.createScript?.().alwaysLoad === true;

	let lastOutcome: ProbeAttemptOutcome | undefined;
	let lastError: string | undefined;

	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		if (attempt > 1) {
			// Retries exist to absorb transient third-party failures; give the
			// vendor endpoint a moment before hitting it again.
			await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
		}

		try {
			lastOutcome = await probeVendorAttempt(
				browser,
				baseUrl,
				config,
				alwaysLoad
			);
			lastError = undefined;
		} catch (error) {
			lastOutcome = undefined;
			lastError = String(error);
		}

		const phaseValues = lastOutcome ? Object.values(lastOutcome.phases) : [];
		const ok =
			lastOutcome !== undefined && phaseValues.every((phase) => phase.ok);

		if (ok) {
			return {
				...base,
				ok: true,
				attempts: attempt,
				phases: lastOutcome?.phases ?? {},
				loader: lastOutcome?.loader,
				blockedRequests: lastOutcome?.blockedRequests ?? 0,
				consoleErrors: lastOutcome?.consoleErrors ?? [],
				pageErrors: lastOutcome?.pageErrors ?? [],
			};
		}
	}

	return {
		...base,
		ok: false,
		attempts: MAX_ATTEMPTS,
		phases: lastOutcome?.phases ?? {
			load: {
				ok: false,
				detail: lastError ?? 'probe failed before any phase completed',
			},
		},
		loader: lastOutcome?.loader,
		blockedRequests: lastOutcome?.blockedRequests ?? 0,
		consoleErrors: lastOutcome?.consoleErrors ?? [],
		pageErrors: lastError
			? [...(lastOutcome?.pageErrors ?? []), lastError]
			: (lastOutcome?.pageErrors ?? []),
	};
}

/**
 * Resolves the probe configs for a `--vendor` filter.
 *
 * @param vendors - Vendor ids from the CLI, or `undefined` for all vendors.
 * @returns The matching probe configs, in filter order.
 * @throws `Error` listing the known vendors when an id has no probe config.
 */
function resolveConfigs(
	vendors: string[] | undefined
): LiveVendorProbeConfig[] {
	if (!vendors || vendors.length === 0) {
		return liveVendorProbeConfigs;
	}

	return vendors.map((vendor) => {
		const config = liveVendorProbeConfigs.find(
			(candidate) => candidate.vendor === vendor
		);

		if (!config) {
			const known = liveVendorProbeConfigs
				.map((candidate) => candidate.vendor)
				.join(', ');
			throw new Error(`Unknown vendor "${vendor}". Known vendors: ${known}`);
		}

		return config;
	});
}

function summarizeResult(result: LiveVendorResult): string {
	if (result.skipped) {
		return `⏭️  ${result.vendor} skipped — ${result.skipReason}`;
	}

	if (result.ok) {
		return `✅ ${result.vendor} (${result.tier}, ${result.attempts} attempt(s))`;
	}

	return `❌ ${result.vendor} failed phase(s): ${failedPhases(result).join(', ')}`;
}

async function main(): Promise<void> {
	const options = parseArgs(Bun.argv.slice(2));
	const configs = resolveConfigs(options.vendors);

	console.log(
		`Probing ${configs.length} vendor(s) with live browser contracts...`
	);

	const harnessJs = await buildHarnessBundle();
	const server = Bun.serve({
		port: 0,
		fetch(request) {
			const { pathname } = new URL(request.url);

			if (pathname === '/harness.js') {
				return new Response(harnessJs, {
					headers: { 'content-type': 'text/javascript; charset=utf-8' },
				});
			}

			return new Response(PAGE_HTML, {
				headers: { 'content-type': 'text/html; charset=utf-8' },
			});
		},
	});
	const baseUrl = `http://localhost:${server.port}`;

	const browser = await chromium.launch();
	const results: LiveVendorResult[] = [];

	try {
		for (const config of configs) {
			if (config.tier === 'skip') {
				const result = buildSkippedResult(config);
				results.push(result);
				console.log(summarizeResult(result));
				continue;
			}

			const result = await probeVendor(browser, baseUrl, config);
			results.push(result);
			console.log(summarizeResult(result));
		}
	} finally {
		await browser.close();
		server.stop(true);
	}

	const report: LiveVendorReport = {
		generatedAt: new Date().toISOString(),
		commitSha: Bun.env.GITHUB_SHA,
		runUrl:
			Bun.env.GITHUB_SERVER_URL &&
			Bun.env.GITHUB_REPOSITORY &&
			Bun.env.GITHUB_RUN_ID
				? `${Bun.env.GITHUB_SERVER_URL}/${Bun.env.GITHUB_REPOSITORY}/actions/runs/${Bun.env.GITHUB_RUN_ID}`
				: undefined,
		vendorFilter: options.vendors,
		results,
	};

	await Bun.write(
		options.reportPath,
		`${JSON.stringify(report, null, '\t')}\n`
	);

	const failed = results.filter((result) => !result.ok);
	const skipped = results.filter((result) => result.skipped);

	console.log(
		`\nReport written to ${options.reportPath}: ${
			results.length - failed.length - skipped.length
		} passed, ${failed.length} failed, ${skipped.length} skipped.`
	);

	if (failed.length > 0) {
		process.exitCode = 1;
	}
}

await main();

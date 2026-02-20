import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import {
	createServer,
	type IncomingMessage,
	type ServerResponse,
} from 'node:http';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';
import { createEmbedRoute } from '../packages/backend/src/routes/embed';

type RequestMetric = {
	url: string;
	type: string;
	encodedDataLength: number;
};

type ScenarioResult = {
	id: string;
	label: string;
	status: 'ok' | 'failed';
	matchedSelector?: string;
	requestCount: number;
	totalTransferBytes: number;
	scriptTransferBytes: number;
	timeToBannerMs: number;
	topRequests: RequestMetric[];
	error?: string;
};

type BrowserBenchSummary = {
	generatedAt: string;
	competitorProfile: string;
	oneTrustStubUrl: string;
	iubendaCoreUrl: string;
	iubendaTcfStubUrl: string;
	iubendaSiteId: number;
	iubendaCookiePolicyId: number;
	runsPerScenario: number;
	results: ScenarioResult[];
	warnings: string[];
	budgetViolations: string[];
};

type Scenario = {
	id: string;
	label: string;
	path: string;
	selectors: string[];
	timeoutMs: number;
	strict: boolean;
};

const outDir =
	process.env.EMBED_BROWSER_BENCH_OUT_DIR ?? 'artifacts/embed-browser-bench';
const reportPath = join(outDir, 'report.md');
const jsonPath = join(outDir, 'results.json');
const enforceBudgets = process.argv.includes('--enforce-budgets');
const runsPerScenario = Number.parseInt(
	process.env.EMBED_BROWSER_BENCH_RUNS ?? '2',
	10
);

type CompetitorProfileId = 'cnn-codepen' | 'cdn-default';

const requestedCompetitorProfile =
	process.env.EMBED_COMPETITOR_PROFILE ?? 'cnn-codepen';

const competitorProfile: CompetitorProfileId =
	requestedCompetitorProfile === 'cdn-default' ? 'cdn-default' : 'cnn-codepen';

const competitorProfileDefaults: Record<
	CompetitorProfileId,
	{
		oneTrustDomainScriptId: string;
		oneTrustStubUrl: string;
		iubendaCoreUrl: string;
		iubendaTcfStubUrl: string;
		iubendaSiteId: number;
		iubendaCookiePolicyId: number;
	}
> = {
	'cnn-codepen': {
		oneTrustDomainScriptId: '3d9a6f21-8e47-43f8-8d58-d86150f3e92b',
		oneTrustStubUrl:
			'https://edition.cnn.com/wbdotp/scripttemplates/otSDKStub.js',
		iubendaCoreUrl: 'https://cdn.iubenda.com/cs/beta/iubenda_cs.js',
		iubendaTcfStubUrl: 'https://cdn.iubenda.com/cs/tcf/beta/stub-v2.js',
		iubendaSiteId: 3156898,
		iubendaCookiePolicyId: 36614288,
	},
	'cdn-default': {
		oneTrustDomainScriptId: 'fff8df06-1dd2-491b-88f6-01cae248cd17',
		oneTrustStubUrl: 'https://cdn.cookielaw.org/scripttemplates/otSDKStub.js',
		iubendaCoreUrl: 'https://cdn.iubenda.com/cs/iubenda_cs.js',
		iubendaTcfStubUrl: 'https://cdn.iubenda.com/cs/tcf/stub-v2.js',
		iubendaSiteId: 1,
		iubendaCookiePolicyId: 252372,
	},
};

const profileDefaults = competitorProfileDefaults[competitorProfile];

function getNumericEnv(name: string, fallback: number): number {
	const value = process.env[name];
	if (!value) {
		return fallback;
	}
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : fallback;
}

const oneTrustDomainScriptId =
	process.env.ONETRUST_DOMAIN_SCRIPT_ID ??
	profileDefaults.oneTrustDomainScriptId;

const oneTrustStubUrl =
	process.env.ONETRUST_STUB_URL ?? profileDefaults.oneTrustStubUrl;

const iubendaCoreUrl =
	process.env.IUBENDA_CORE_URL ?? profileDefaults.iubendaCoreUrl;

const iubendaTcfStubUrl =
	process.env.IUBENDA_TCF_STUB_URL ?? profileDefaults.iubendaTcfStubUrl;

const iubendaSiteId = getNumericEnv(
	'IUBENDA_SITE_ID',
	profileDefaults.iubendaSiteId
);

const iubendaCookiePolicyId = getNumericEnv(
	'IUBENDA_COOKIE_POLICY_ID',
	profileDefaults.iubendaCookiePolicyId
);

const scenarios: Scenario[] = [
	{
		id: 'c15t-base',
		label: 'c15t embed (base runtime)',
		path: '/scenario/c15t-base',
		selectors: [
			'[data-testid="consent-banner-root"]',
			'[class*="c15t-ui-banner-root"]',
		],
		timeoutMs: 20000,
		strict: true,
	},
	{
		id: 'c15t-full',
		label: 'c15t embed (full runtime)',
		path: '/scenario/c15t-full',
		selectors: [
			'[data-testid="consent-banner-root"]',
			'[class*="c15t-ui-banner-root"]',
		],
		timeoutMs: 20000,
		strict: true,
	},
	{
		id: 'onetrust',
		label: 'OneTrust banner',
		path: '/scenario/onetrust',
		selectors: ['#onetrust-banner-sdk', '.ot-sdk-container'],
		timeoutMs: 30000,
		strict: false,
	},
	{
		id: 'iubenda',
		label: 'iubenda banner',
		path: '/scenario/iubenda',
		selectors: ['.iubenda-cs-container', '#iubenda-cs-banner'],
		timeoutMs: 30000,
		strict: false,
	},
];

const transferBudgets: Record<string, number> = {
	'c15t-base': 115 * 1024,
	'c15t-full': 145 * 1024,
};

const timeBudgetsMs: Record<string, number> = {
	'c15t-base': 5000,
	'c15t-full': 5500,
};

function formatBytes(bytes: number): string {
	return `${(bytes / 1024).toFixed(1)} KiB`;
}

function formatPercent(value: number): string {
	const sign = value >= 0 ? '+' : '';
	return `${sign}${value.toFixed(1)}%`;
}

function percentSmaller(baseline: number, candidate: number): number {
	if (baseline === 0) {
		return 0;
	}
	return ((baseline - candidate) / baseline) * 100;
}

function average(values: number[]): number {
	if (values.length === 0) {
		return 0;
	}
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getMedianResult(results: ScenarioResult[]): ScenarioResult {
	const sorted = [...results].sort(
		(a, b) => a.totalTransferBytes - b.totalTransferBytes
	);
	return sorted[Math.floor(sorted.length / 2)] ?? results[0];
}

function maybeGzip(
	req: IncomingMessage,
	res: ServerResponse,
	text: string
): Buffer {
	const acceptEncoding = req.headers['accept-encoding'] ?? '';
	const asString = Array.isArray(acceptEncoding)
		? acceptEncoding.join(',')
		: acceptEncoding;

	if (asString.includes('gzip')) {
		res.setHeader('Content-Encoding', 'gzip');
		return gzipSync(Buffer.from(text, 'utf8'));
	}

	return Buffer.from(text, 'utf8');
}

function sendNoCache(res: ServerResponse): void {
	res.setHeader(
		'Cache-Control',
		'no-store, no-cache, must-revalidate, max-age=0'
	);
	res.setHeader('Pragma', 'no-cache');
	res.setHeader('Expires', '0');
}

function sendText(
	req: IncomingMessage,
	res: ServerResponse,
	contentType: string,
	text: string,
	status = 200,
	extraHeaders?: Record<string, string>
): void {
	sendNoCache(res);
	res.statusCode = status;
	res.setHeader('Content-Type', contentType);
	if (extraHeaders) {
		for (const [name, value] of Object.entries(extraHeaders)) {
			res.setHeader(name, value);
		}
	}
	const payload = maybeGzip(req, res, text);
	res.end(payload);
}

function scenarioHtml(pathname: string): string {
	if (pathname === '/scenario/c15t-base') {
		return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>c15t base benchmark</title>
  </head>
  <body>
    <div id="c15t-embed-root"></div>
    <script src="/embed-base.js"></script>
  </body>
</html>`;
	}

	if (pathname === '/scenario/c15t-full') {
		return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>c15t full benchmark</title>
  </head>
  <body>
    <div id="c15t-embed-root"></div>
    <script src="/embed-full.js"></script>
  </body>
</html>`;
	}

	if (pathname === '/scenario/onetrust') {
		return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OneTrust benchmark</title>
  </head>
  <body>
    <script src="${oneTrustStubUrl}" data-document-language="true" type="text/javascript" charset="UTF-8" data-domain-script="${oneTrustDomainScriptId}"></script>
    <script>
      function OptanonWrapper() {}
    </script>
  </body>
</html>`;
	}

	if (pathname === '/scenario/iubenda') {
		return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>iubenda benchmark</title>
  </head>
  <body>
    <script>
      window._iub = window._iub || {};
      window._iub.csConfiguration = {
        askConsentAtCookiePolicyUpdate: true,
        enableTcf: true,
        floatingPreferencesButtonDisplay: 'bottom-right',
        googleAdditionalConsentMode: true,
        lang: 'en',
        perPurposeConsent: true,
        siteId: ${iubendaSiteId},
        cookiePolicyId: ${iubendaCookiePolicyId},
        banner: {
          position: 'float-top-center',
          acceptButtonDisplay: true,
          customizeButtonDisplay: true,
          rejectButtonDisplay: true,
          closeButtonDisplay: false,
          explicitWithdrawal: true,
          listPurposes: true
        }
      };
    </script>
    <script src="${iubendaTcfStubUrl}" defer></script>
    <script src="${iubendaCoreUrl}" charset="UTF-8" async></script>
  </body>
</html>`;
	}

	return '<!doctype html><html><body>not found</body></html>';
}

const baseEmbedApp = createEmbedRoute({
	trustedOrigins: [],
	adapter: {} as never,
	advanced: {
		disableGeoLocation: true,
		embed: {
			enabled: true,
			options: {
				store: {
					namespace: 'c15tStore',
					storageKey: 'c15t-bench',
				},
			},
		},
	},
} as never);

const fullEmbedApp = createEmbedRoute({
	trustedOrigins: [],
	adapter: {} as never,
	advanced: {
		disableGeoLocation: true,
		embed: {
			enabled: true,
			options: {
				store: {
					namespace: 'c15tStore',
					storageKey: 'c15t-bench',
				},
			},
		},
		iab: {
			enabled: true,
			bundled: {
				en: {} as never,
			},
		},
	},
} as never);

function requestHeadersToRecord(
	request: IncomingMessage
): Record<string, string> {
	const output: Record<string, string> = {};
	for (const [name, value] of Object.entries(request.headers)) {
		if (!value) {
			continue;
		}
		output[name] = Array.isArray(value) ? value.join(', ') : value;
	}
	return output;
}

async function buildEmbedResponse(
	baseUrl: string,
	mode: 'base' | 'full',
	request: IncomingMessage
): Promise<Response> {
	const query = mode === 'base' ? '?country=DE' : '?country=GB';
	const app = mode === 'base' ? baseEmbedApp : fullEmbedApp;
	const response = await app.request(`${baseUrl}/${query}`, {
		headers: requestHeadersToRecord(request),
	});
	if (!response.ok && response.status !== 304) {
		throw new Error(`Failed to build ${mode} embed script: ${response.status}`);
	}
	return response;
}

async function waitForAnySelector(
	page: import('playwright').Page,
	selectors: string[],
	timeoutMs: number
): Promise<string> {
	return Promise.any(
		selectors.map((selector) =>
			page
				.waitForSelector(selector, { timeout: timeoutMs })
				.then(() => selector)
		)
	);
}

async function runSingleScenario(
	browser: import('playwright').Browser,
	baseUrl: string,
	scenario: Scenario
): Promise<ScenarioResult> {
	const context = await browser.newContext({
		ignoreHTTPSErrors: true,
		locale: 'en-US',
	});
	const page = await context.newPage();
	const session = await context.newCDPSession(page);

	const requestUrlById = new Map<string, string>();
	const requestTypeById = new Map<string, string>();
	const requestMetrics: RequestMetric[] = [];

	await session.send('Network.enable');
	await session.send('Network.setCacheDisabled', { cacheDisabled: true });

	session.on('Network.requestWillBeSent', (event) => {
		requestUrlById.set(event.requestId, event.request.url);
	});

	session.on('Network.responseReceived', (event) => {
		requestTypeById.set(event.requestId, event.type);
	});

	session.on('Network.loadingFinished', (event) => {
		requestMetrics.push({
			url: requestUrlById.get(event.requestId) ?? 'unknown',
			type: requestTypeById.get(event.requestId) ?? 'Unknown',
			encodedDataLength: event.encodedDataLength ?? 0,
		});
	});

	const start = Date.now();
	try {
		await page.goto(`${baseUrl}${scenario.path}`, {
			waitUntil: 'domcontentloaded',
			timeout: 30000,
		});

		const matchedSelector = await waitForAnySelector(
			page,
			scenario.selectors,
			scenario.timeoutMs
		);
		const bannerVisibleAtMs = Date.now() - start;

		await page.waitForTimeout(2000);

		const totalTransferBytes = requestMetrics.reduce(
			(sum, request) => sum + request.encodedDataLength,
			0
		);
		const scriptTransferBytes = requestMetrics
			.filter(
				(request) => request.type === 'Script' || request.url.endsWith('.js')
			)
			.reduce((sum, request) => sum + request.encodedDataLength, 0);

		const topRequests = [...requestMetrics]
			.sort((a, b) => b.encodedDataLength - a.encodedDataLength)
			.slice(0, 10);

		await page.close();
		await context.close();

		return {
			id: scenario.id,
			label: scenario.label,
			status: 'ok',
			matchedSelector,
			requestCount: requestMetrics.length,
			totalTransferBytes,
			scriptTransferBytes,
			timeToBannerMs: bannerVisibleAtMs,
			topRequests,
		};
	} catch (error) {
		await page.close();
		await context.close();

		return {
			id: scenario.id,
			label: scenario.label,
			status: 'failed',
			requestCount: requestMetrics.length,
			totalTransferBytes: requestMetrics.reduce(
				(sum, request) => sum + request.encodedDataLength,
				0
			),
			scriptTransferBytes: requestMetrics
				.filter(
					(request) => request.type === 'Script' || request.url.endsWith('.js')
				)
				.reduce((sum, request) => sum + request.encodedDataLength, 0),
			timeToBannerMs: Date.now() - start,
			topRequests: [...requestMetrics]
				.sort((a, b) => b.encodedDataLength - a.encodedDataLength)
				.slice(0, 10),
			error: (error as Error).message,
		};
	}
}

async function runScenarioWithRetries(
	browser: import('playwright').Browser,
	baseUrl: string,
	scenario: Scenario,
	warnings: string[]
): Promise<ScenarioResult> {
	const attempts: ScenarioResult[] = [];
	for (let attempt = 1; attempt <= runsPerScenario; attempt += 1) {
		const result = await runSingleScenario(browser, baseUrl, scenario);
		attempts.push(result);
		if (result.status === 'ok') {
			continue;
		}

		warnings.push(
			`${scenario.label} attempt ${attempt}/${runsPerScenario} failed: ${result.error ?? 'unknown error'}`
		);
	}

	const successful = attempts.filter((attempt) => attempt.status === 'ok');
	if (successful.length === 0) {
		return (
			attempts[attempts.length - 1] ?? {
				id: scenario.id,
				label: scenario.label,
				status: 'failed',
				requestCount: 0,
				totalTransferBytes: 0,
				scriptTransferBytes: 0,
				timeToBannerMs: 0,
				topRequests: [],
				error: 'All attempts failed',
			}
		);
	}

	if (successful.length === 1) {
		return successful[0];
	}

	const median = getMedianResult(successful);
	const avgTime = average(successful.map((entry) => entry.timeToBannerMs));
	return {
		...median,
		timeToBannerMs: Math.round(avgTime),
	};
}

(async () => {
	mkdirSync(outDir, { recursive: true });

	const warnings: string[] = [];
	const budgetViolations: string[] = [];

	if (requestedCompetitorProfile !== competitorProfile) {
		warnings.push(
			`Unknown EMBED_COMPETITOR_PROFILE "${requestedCompetitorProfile}", using "${competitorProfile}".`
		);
	}

	let baseUrl = '';

	const server = createServer((req, res) => {
		void (async () => {
			const url = new URL(req.url ?? '/', 'http://127.0.0.1');
			if (url.pathname.startsWith('/scenario/')) {
				sendText(
					req,
					res,
					'text/html; charset=utf-8',
					scenarioHtml(url.pathname)
				);
				return;
			}

			if (url.pathname === '/embed-base.js') {
				const embedResponse = await buildEmbedResponse(baseUrl, 'base', req);
				const body = await embedResponse.text();
				sendText(
					req,
					res,
					'application/javascript; charset=utf-8',
					body,
					embedResponse.status,
					{
						'x-c15t-embed-cache-status':
							embedResponse.headers.get('x-c15t-embed-cache-status') ??
							'unknown',
						'x-c15t-embed-runtime-variant':
							embedResponse.headers.get('x-c15t-embed-runtime-variant') ??
							'unknown',
					}
				);
				return;
			}

			if (url.pathname === '/embed-full.js') {
				const embedResponse = await buildEmbedResponse(baseUrl, 'full', req);
				const body = await embedResponse.text();
				sendText(
					req,
					res,
					'application/javascript; charset=utf-8',
					body,
					embedResponse.status,
					{
						'x-c15t-embed-cache-status':
							embedResponse.headers.get('x-c15t-embed-cache-status') ??
							'unknown',
						'x-c15t-embed-runtime-variant':
							embedResponse.headers.get('x-c15t-embed-runtime-variant') ??
							'unknown',
					}
				);
				return;
			}

			if (url.pathname === '/c15t-embed.runtime.iife.js') {
				sendText(
					req,
					res,
					'application/javascript; charset=utf-8',
					readFileSync(
						'examples/demo/public/c15t-embed.runtime.iife.js',
						'utf8'
					)
				);
				return;
			}

			if (url.pathname === '/c15t-embed.runtime-full.iife.js') {
				sendText(
					req,
					res,
					'application/javascript; charset=utf-8',
					readFileSync(
						'examples/demo/public/c15t-embed.runtime-full.iife.js',
						'utf8'
					)
				);
				return;
			}

			if (url.pathname === '/favicon.ico') {
				res.writeHead(204);
				res.end();
				return;
			}

			sendText(req, res, 'text/plain; charset=utf-8', 'not found', 404);
		})().catch((error) => {
			if (res.writableEnded) {
				return;
			}
			sendText(req, res, 'text/plain; charset=utf-8', String(error), 500);
		});
	});

	await new Promise<void>((resolve) => {
		server.listen(0, '127.0.0.1', () => resolve());
	});

	const address = server.address();
	if (!address || typeof address === 'string') {
		throw new Error('Unable to resolve benchmark server address');
	}

	baseUrl = `http://127.0.0.1:${address.port}`;

	const browser = await chromium.launch({ headless: true });
	const results: ScenarioResult[] = [];

	for (const scenario of scenarios) {
		const result = await runScenarioWithRetries(
			browser,
			baseUrl,
			scenario,
			warnings
		);
		results.push(result);
	}

	await browser.close();
	await new Promise<void>((resolve, reject) => {
		server.close((error) => {
			if (error) {
				reject(error);
				return;
			}
			resolve();
		});
	});

	for (const result of results) {
		if (result.status !== 'ok') {
			continue;
		}

		const transferBudget = transferBudgets[result.id];
		if (
			transferBudget !== undefined &&
			result.totalTransferBytes > transferBudget
		) {
			budgetViolations.push(
				`${result.label} transfer budget exceeded: ${formatBytes(result.totalTransferBytes)} > ${formatBytes(transferBudget)}`
			);
		}

		const timeBudget = timeBudgetsMs[result.id];
		if (timeBudget !== undefined && result.timeToBannerMs > timeBudget) {
			budgetViolations.push(
				`${result.label} time-to-banner budget exceeded: ${result.timeToBannerMs}ms > ${timeBudget}ms`
			);
		}
	}

	for (const scenario of scenarios) {
		if (!scenario.strict) {
			continue;
		}
		const result = results.find((entry) => entry.id === scenario.id);
		if (!result || result.status !== 'ok') {
			budgetViolations.push(
				`${scenario.label} failed to render in benchmark run`
			);
		}
	}

	const c15tBase = results.find((entry) => entry.id === 'c15t-base');
	const c15tFull = results.find((entry) => entry.id === 'c15t-full');
	const oneTrust = results.find((entry) => entry.id === 'onetrust');
	const iubenda = results.find((entry) => entry.id === 'iubenda');

	const comparisonRows: string[] = [];
	if (c15tBase?.status === 'ok' && oneTrust?.status === 'ok') {
		comparisonRows.push(
			`| c15t base vs OneTrust | ${formatPercent(percentSmaller(oneTrust.totalTransferBytes, c15tBase.totalTransferBytes))} | ${formatPercent(percentSmaller(oneTrust.timeToBannerMs, c15tBase.timeToBannerMs))} |`
		);
	}
	if (c15tFull?.status === 'ok' && oneTrust?.status === 'ok') {
		comparisonRows.push(
			`| c15t full vs OneTrust | ${formatPercent(percentSmaller(oneTrust.totalTransferBytes, c15tFull.totalTransferBytes))} | ${formatPercent(percentSmaller(oneTrust.timeToBannerMs, c15tFull.timeToBannerMs))} |`
		);
	}
	if (c15tBase?.status === 'ok' && iubenda?.status === 'ok') {
		comparisonRows.push(
			`| c15t base vs iubenda | ${formatPercent(percentSmaller(iubenda.totalTransferBytes, c15tBase.totalTransferBytes))} | ${formatPercent(percentSmaller(iubenda.timeToBannerMs, c15tBase.timeToBannerMs))} |`
		);
	}
	if (c15tFull?.status === 'ok' && iubenda?.status === 'ok') {
		comparisonRows.push(
			`| c15t full vs iubenda | ${formatPercent(percentSmaller(iubenda.totalTransferBytes, c15tFull.totalTransferBytes))} | ${formatPercent(percentSmaller(iubenda.timeToBannerMs, c15tFull.timeToBannerMs))} |`
		);
	}

	const reportLines = [
		'# Embed Browser Benchmark',
		'',
		`Generated at: ${new Date().toISOString()}`,
		`Competitor profile: ${competitorProfile}`,
		`Runs per scenario: ${runsPerScenario}`,
		`OneTrust domain script id: ${oneTrustDomainScriptId}`,
		`OneTrust stub URL: ${oneTrustStubUrl}`,
		`Iubenda core URL: ${iubendaCoreUrl}`,
		`Iubenda TCF stub URL: ${iubendaTcfStubUrl}`,
		`Iubenda siteId: ${iubendaSiteId}`,
		`Iubenda cookiePolicyId: ${iubendaCookiePolicyId}`,
		'',
		'## Scenario Results',
		'',
		'| Scenario | Status | Matched selector | Requests | Transfer | Script transfer | Time to banner |',
		'|---|---|---|---:|---:|---:|---:|',
		...results.map(
			(result) =>
				`| ${result.label} | ${result.status} | ${result.matchedSelector ?? 'n/a'} | ${result.requestCount} | ${formatBytes(result.totalTransferBytes)} | ${formatBytes(result.scriptTransferBytes)} | ${result.timeToBannerMs} ms |`
		),
		'',
		'## c15t vs Competitors',
		'',
		'| Comparison | Transfer delta | Time-to-banner delta |',
		'|---|---:|---:|',
		...(comparisonRows.length > 0 ? comparisonRows : ['| n/a | n/a | n/a |']),
		'',
		'## c15t Budgets',
		'',
		'| Budget | Limit | Actual | Status |',
		'|---|---:|---:|---|',
		...Object.entries(transferBudgets).map(([scenarioId, limit]) => {
			const result = results.find((entry) => entry.id === scenarioId);
			const actual =
				result?.status === 'ok'
					? formatBytes(result.totalTransferBytes)
					: 'n/a';
			const ok =
				!!result &&
				result.status === 'ok' &&
				result.totalTransferBytes <= limit;
			return `| ${scenarioId} transfer | ${formatBytes(limit)} | ${actual} | ${ok ? 'pass' : 'fail'} |`;
		}),
		...Object.entries(timeBudgetsMs).map(([scenarioId, limit]) => {
			const result = results.find((entry) => entry.id === scenarioId);
			const actual =
				result?.status === 'ok' ? `${result.timeToBannerMs} ms` : 'n/a';
			const ok =
				!!result && result.status === 'ok' && result.timeToBannerMs <= limit;
			return `| ${scenarioId} time-to-banner | ${limit} ms | ${actual} | ${ok ? 'pass' : 'fail'} |`;
		}),
		'',
	];

	for (const result of results) {
		if (result.topRequests.length === 0) {
			continue;
		}
		reportLines.push(`## Top Requests: ${result.label}`, '');
		reportLines.push('| URL | Type | Encoded transfer |', '|---|---|---:|');
		reportLines.push(
			...result.topRequests.map(
				(request) =>
					`| ${request.url} | ${request.type} | ${formatBytes(request.encodedDataLength)} |`
			)
		);
		reportLines.push('');
	}

	if (warnings.length > 0) {
		reportLines.push(
			'## Warnings',
			'',
			...warnings.map((warning) => `- ${warning}`),
			''
		);
	}

	if (budgetViolations.length > 0) {
		reportLines.push(
			'## Budget Violations',
			'',
			...budgetViolations.map((violation) => `- ${violation}`),
			''
		);
	}

	const summary: BrowserBenchSummary = {
		generatedAt: new Date().toISOString(),
		competitorProfile,
		oneTrustStubUrl,
		iubendaCoreUrl,
		iubendaTcfStubUrl,
		iubendaSiteId,
		iubendaCookiePolicyId,
		runsPerScenario,
		results,
		warnings,
		budgetViolations,
	};

	const report = reportLines.join('\n');
	writeFileSync(reportPath, report, 'utf8');
	writeFileSync(jsonPath, JSON.stringify(summary, null, 2), 'utf8');

	console.log(report);
	console.log(`\n[embed-browser-bench] Wrote ${reportPath}`);
	console.log(`[embed-browser-bench] Wrote ${jsonPath}`);

	if (enforceBudgets && budgetViolations.length > 0) {
		console.error('\n[embed-browser-bench] Budget check failed.');
		process.exit(1);
	}
})();

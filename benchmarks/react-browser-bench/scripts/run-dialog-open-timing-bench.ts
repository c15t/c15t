/* oxlint-disable no-await-in-loop -- Sequential samples avoid CPU and network contention. */
/**
 * Times the first preferences-dialog open at fixed points after page load,
 * against production builds of the Vite React app and the Nuxt `ssr: false`
 * page. Both pages render a hero photo that starts after `load`, so a
 * preload that waits for the page to go quiet has a real image to wait for.
 *
 * Each arm is a repository checkout with the packages and both apps already
 * built. The script serves each arm on localhost for the run, interleaves the
 * arms sample by sample, and writes one JSON file per arm.
 *
 * ```sh
 * BENCH_ARMS=before=/path/to/v3,after=/path/to/pr \
 * BENCH_OUTPUT_DIR=/tmp/dialog-open-timing \
 * bun run --cwd benchmarks/react-browser-bench bench:dialog-open-timing
 * ```
 */
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { basename, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import { median, percentile } from '@c15t/benchmarking/utils';
import { chromium } from 'playwright';
import type { Page } from 'playwright';

import { parseIterations } from '../../shared/src/loader-audit';

const BANNER_SELECTOR = '[data-testid="consent-banner-root"]';
const CUSTOMIZE_SELECTOR = '[data-testid="consent-banner-customize-button"]';
const DIALOG_SELECTOR = '[data-testid="consent-dialog-root"]';
const HERO_SELECTOR = '[data-testid="bench-hero"]';
/** Matches the stock dialog's test id, not the IAB dialog's. */
const DIALOG_MARKER = /[`'"]consent-dialog-root[`'"]/u;
// oxlint-disable-next-line prefer-named-capture-group -- This package's tsconfig targets ES2017, which rejects named groups.
const STATIC_IMPORT = /(?:from|import)\s*[`'"]\.\/([\w.-]+\.js)[`'"]/gu;

/**
 * Network and CPU throttling sent through CDP. `slow-4g` copies Chrome
 * DevTools' "Slow 4G" preset; `mobile` is the shared browser benches' profile,
 * close to DevTools' "Fast 4G".
 */
const throttleProfiles = {
	mobile: {
		cpuThrottlingRate: 4,
		downloadThroughput: 1_125_000,
		latency: 170,
		uploadThroughput: 187_500,
	},
	none: {
		cpuThrottlingRate: 1,
		downloadThroughput: -1,
		latency: 0,
		uploadThroughput: -1,
	},
	'slow-4g': {
		cpuThrottlingRate: 4,
		downloadThroughput: 180_000,
		latency: 562.5,
		uploadThroughput: 84_375,
	},
} as const;

type ThrottleName = keyof typeof throttleProfiles;
type AppName = 'react' | 'nuxt';

interface Cell {
	id: string;
	/** Milliseconds after `loadEventEnd`; `null` clicks once the banner shows. */
	afterLoadMs: number | null;
	hover: boolean;
	late: boolean;
}

const cells: Cell[] = [
	{ afterLoadMs: null, hover: false, id: 'banner', late: false },
	{ afterLoadMs: 500, hover: false, id: 'load+500', late: false },
	{ afterLoadMs: 1000, hover: false, id: 'load+1000', late: false },
	{ afterLoadMs: 2000, hover: false, id: 'load+2000', late: false },
	{ afterLoadMs: 5000, hover: false, id: 'load+5000', late: false },
	{ afterLoadMs: 12_000, hover: false, id: 'load+12000', late: true },
	{ afterLoadMs: null, hover: true, id: 'hover@banner', late: false },
	{ afterLoadMs: 1000, hover: true, id: 'hover@load+1000', late: false },
];

const parseThrottle = (value: string | undefined): ThrottleName => {
	const name = value ?? 'slow-4g';
	if (name in throttleProfiles) {
		return name as ThrottleName;
	}
	throw new Error(`Unknown BENCH_PROFILE "${name}"`);
};

const parseArms = (value: string | undefined) => {
	if (!value) {
		throw new Error('Set BENCH_ARMS, such as before=/repo-a,after=/repo-b');
	}
	return value.split(',').map((pair) => {
		const [name, root] = pair.split('=');
		if (!(name && root)) {
			throw new Error(`Bad BENCH_ARMS entry "${pair}"`);
		}
		return { name, root: resolve(root) };
	});
};

const apps = (process.env.BENCH_APPS ?? 'react,nuxt').split(',').map((app) => {
	if (app !== 'react' && app !== 'nuxt') {
		throw new Error(`Unknown app "${app}"`);
	}
	return app as AppName;
});
const arms = parseArms(process.env.BENCH_ARMS);
const throttleName = parseThrottle(process.env.BENCH_PROFILE);
const throttle = throttleProfiles[throttleName];
const iterations = parseIterations(process.env.BENCH_ITERATIONS, 15);
const lateIterations = parseIterations(
	process.env.BENCH_LATE_ITERATIONS,
	Math.min(iterations, 10)
);
const cellFilter = process.env.BENCH_CELLS?.split(',');
const activeCells = cellFilter
	? cells.filter((cell) => cellFilter.includes(cell.id))
	: cells;
const outputDir = resolve(
	process.env.BENCH_OUTPUT_DIR ??
		fileURLToPath(
			new URL(
				'../../../.benchmarks/current/dialog-open-timing',
				import.meta.url
			)
		)
);
const viewport = { height: 915, width: 412 };

/** Describes the dialog chunk's state at the click for progress logs. */
const chunkState = (dialog: {
	completeAtClick: boolean;
	requestedAtClick: boolean;
}) => {
	if (dialog.completeAtClick) {
		return 'ready';
	}
	return dialog.requestedAtClick ? 'in flight' : 'cold';
};

const git = (root: string, args: string[]) =>
	new Promise<string>((_resolve) => {
		const child = spawn('git', ['-C', root, ...args]);
		let out = '';
		child.stdout.on('data', (chunk) => {
			out += chunk;
		});
		child.on('close', () => _resolve(out.trim()));
	});

const pickFreePort = () =>
	new Promise<number>((_resolve, reject) => {
		const server = createServer();
		server.listen(0, '127.0.0.1', () => {
			const address = server.address();
			server.close(() => {
				if (address && typeof address === 'object') {
					_resolve(address.port);
				} else {
					reject(new Error('No port'));
				}
			});
		});
	});

const waitForServer = async (url: string, timeoutMs = 60_000) => {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			const response = await fetch(url);
			if (response.ok) {
				return;
			}
		} catch {
			// Not listening yet.
		}
		await sleep(250);
	}
	throw new Error(`Server at ${url} did not start`);
};

/** Stops a server and its children, which run in their own process group. */
const stopServer = async (child: ChildProcess) => {
	const signal = (name: NodeJS.Signals) => {
		try {
			process.kill(-(child.pid as number), name);
		} catch {
			// Already gone.
		}
	};
	signal('SIGTERM');
	await sleep(500);
	signal('SIGKILL');
};

interface AppTarget {
	app: AppName;
	arm: string;
	root: string;
	url: string;
	server: ChildProcess;
	/** Built files the first dialog open needs that the page has not loaded. */
	dialogFiles: string[];
	markerFile: string;
	fileSizes: Record<string, number>;
}

const startServer = async (app: AppName, root: string) => {
	const port = await pickFreePort();
	const origin = `http://127.0.0.1:${port}`;
	if (app === 'react') {
		const cwd = join(root, 'benchmarks/vite-react-repro');
		const server = spawn(
			'bunx',
			['vite', 'preview', '--host', '127.0.0.1', '--port', `${port}`],
			{ cwd, detached: true, stdio: 'ignore' }
		);
		await waitForServer(`${origin}/`);
		return {
			assetsDir: join(cwd, 'dist/assets'),
			server,
			url: `${origin}/?hero`,
		};
	}
	const cwd = join(root, 'benchmarks/nuxt-browser-bench');
	const server = spawn('node', ['.output/server/index.mjs'], {
		cwd,
		detached: true,
		env: {
			...process.env,
			C15T_BENCH_BACKEND_LATENCY_MS: '0',
			NITRO_HOST: '127.0.0.1',
			NITRO_PORT: `${port}`,
		},
		stdio: 'ignore',
	});
	await waitForServer(`${origin}/client-hero`);
	return {
		assetsDir: join(cwd, '.output/public/_nuxt'),
		server,
		url: `${origin}/client-hero`,
	};
};

/**
 * Finds the stock dialog chunk, the files its dynamic import pulls in, and
 * subtracts everything the page's HTML loads up front.
 */
const resolveDialogFiles = async (assetsDir: string, url: string) => {
	const files = readdirSync(assetsDir).filter(
		(file) => file.endsWith('.js') || file.endsWith('.css')
	);
	const source = (file: string) => readFileSync(join(assetsDir, file), 'utf8');
	const markerFile = files.find(
		(file) => file.endsWith('.js') && DIALOG_MARKER.test(source(file))
	);
	if (!markerFile) {
		throw new Error(`No dialog chunk in ${assetsDir}`);
	}
	const closure = (start: Iterable<string>) => {
		const seen = new Set<string>();
		const queue = [...start];
		while (queue.length > 0) {
			const file = queue.pop() as string;
			if (seen.has(file) || !files.includes(file)) {
				continue;
			}
			seen.add(file);
			if (file.endsWith('.js')) {
				for (const match of source(file).matchAll(STATIC_IMPORT)) {
					queue.push(match[1] ?? '');
				}
			}
		}
		return seen;
	};
	// Vite lists a dynamic import's preloads in `__vite__mapDeps`.
	const preloads = new Set<string>([markerFile]);
	const escaped = markerFile.replaceAll('.', '\\.');
	const importer = new RegExp(
		`import\\([\`'"]\\./${escaped}[\`'"]\\),__vite__mapDeps\\(\\[(?<indices>[\\d,]*)\\]\\)`,
		'u'
	);
	for (const file of files) {
		const text = source(file);
		const match = text.match(importer);
		// oxlint-disable-next-line prefer-named-capture-group -- This package's tsconfig targets ES2017, which rejects named groups.
		const table = text.match(/m\.f=\[([^\]]*)\]/u);
		if (!(match && table)) {
			continue;
		}
		const names = [
			// oxlint-disable-next-line prefer-named-capture-group -- This package's tsconfig targets ES2017, which rejects named groups.
			...(table[1] ?? '').matchAll(/"([^"]+)"/gu),
		].map((entry) => basename(entry[1] ?? ''));
		for (const index of (match.groups?.indices ?? '').split(',')) {
			const name = names[Number(index)];
			if (name) {
				preloads.add(name);
			}
		}
	}
	const html = await (await fetch(url)).text();
	const initial = closure(
		[
			// oxlint-disable-next-line prefer-named-capture-group -- This package's tsconfig targets ES2017, which rejects named groups.
			...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/gu),
		].map((match) => basename(match[1] ?? ''))
	);
	const dialogFiles = [...closure(preloads)].filter(
		(file) => !initial.has(file)
	);
	const fileSizes = Object.fromEntries(
		dialogFiles.map((file) => [file, source(file).length])
	);
	return { dialogFiles: dialogFiles.sort(), fileSizes, markerFile };
};

/**
 * Page-side recorder, as a string because tsx's helper wrappers do not
 * survive Playwright's function serialization.
 */
const initScript = `(() => {
	const state = { bannerVisible: null, customizeOver: null, lcp: [] };
	window.__dialogOpenBench = state;
	try {
		new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				const element = entry.element;
				state.lcp.push({
					inDialog: Boolean(element && element.closest && element.closest(${JSON.stringify(DIALOG_SELECTOR)})),
					size: entry.size,
					tag: element ? element.tagName.toLowerCase() : null,
					testId: element && element.getAttribute ? element.getAttribute('data-testid') : null,
					time: entry.startTime,
					url: entry.url || null,
				});
			}
		}).observe({ buffered: true, type: 'largest-contentful-paint' });
	} catch {}
	const shown = (element) => {
		if (!element || element.getBoundingClientRect().height === 0) return false;
		for (let node = element; node; node = node.parentElement) {
			const style = getComputedStyle(node);
			if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
		}
		return true;
	};
	const watchBanner = () => {
		if (shown(document.querySelector(${JSON.stringify(CUSTOMIZE_SELECTOR)})) && shown(document.querySelector(${JSON.stringify(BANNER_SELECTOR)}))) {
			state.bannerVisible = performance.now();
			return;
		}
		requestAnimationFrame(watchBanner);
	};
	requestAnimationFrame(watchBanner);
	document.addEventListener('pointerover', (event) => {
		if (state.customizeOver === null && event.target instanceof Element && event.target.closest(${JSON.stringify(CUSTOMIZE_SELECTOR)})) {
			state.customizeOver = performance.now();
		}
	}, true);
})()`;

/**
 * Page-side steps run as expression strings: tsx wraps named functions in a
 * `__name` helper that does not exist in the page.
 */
const pageState = 'window.__dialogOpenBench';

/** Resolves once the banner shows and, if asked, `afterLoadMs` past load. */
const waitForClickPoint = (page: Page, afterLoadMs: number | null) =>
	page.evaluate(`new Promise((done, fail) => {
		const delay = ${JSON.stringify(afterLoadMs)};
		const state = ${pageState};
		const giveUp = performance.now() + 120000;
		const poll = () => {
			if (performance.now() > giveUp) {
				fail(new Error('Banner did not show, or load did not fire'));
				return;
			}
			if (state.bannerVisible === null) {
				requestAnimationFrame(poll);
				return;
			}
			if (delay === null) {
				done();
				return;
			}
			const nav = performance.getEntriesByType('navigation')[0];
			if (!nav || nav.loadEventEnd === 0) {
				setTimeout(poll, 10);
				return;
			}
			const remaining = nav.loadEventEnd + delay - performance.now();
			if (remaining <= 0) {
				done();
				return;
			}
			setTimeout(poll, Math.min(remaining, 50));
		};
		poll();
	})`);

/** Waits until the pointer has rested on Customize for 150 ms. */
const dwellOnCustomize = (page: Page) =>
	page.evaluate(`new Promise((done) => {
		const over = ${pageState}.customizeOver ?? performance.now();
		const finish = () => done(performance.now() - over);
		const wait = 150 - (performance.now() - over);
		if (wait > 0) {
			setTimeout(finish, wait);
		} else {
			finish();
		}
	})`) as Promise<number>;

interface OpenTiming {
	clickAt: number;
	mounted: number;
	visible: number;
	fullyVisible: number;
}

/** Clicks Customize with DOM `click()` and times the dialog appearing. */
const measureOpen = (page: Page) =>
	page.evaluate(`new Promise((done, fail) => {
		const button = document.querySelector(${JSON.stringify(CUSTOMIZE_SELECTOR)});
		if (!(button instanceof HTMLElement)) {
			fail(new Error('Missing Customize button'));
			return;
		}
		const findDialog = () => document.querySelector(${JSON.stringify(DIALOG_SELECTOR)});
		const started = performance.now();
		let mounted;
		let visible;
		const observer = new MutationObserver(() => {
			if (mounted === undefined && findDialog()) {
				mounted = performance.now() - started;
			}
		});
		observer.observe(document.body, { childList: true, subtree: true });
		// The real handler, without pointer or focus warming.
		button.click();
		const check = () => {
			const elapsed = performance.now() - started;
			const element = findDialog();
			let opacity = 1;
			for (let node = element; node; node = node.parentElement) {
				const style = getComputedStyle(node);
				opacity *= Number(style.opacity);
				if (style.visibility === 'hidden' || style.display === 'none') {
					opacity = 0;
				}
			}
			if (element && element.getBoundingClientRect().height > 0) {
				mounted ??= elapsed;
				if (opacity > 0) {
					visible ??= elapsed;
					if (opacity >= 0.999) {
						observer.disconnect();
						done({ clickAt: started, fullyVisible: elapsed, mounted, visible });
						return;
					}
				}
			}
			if (elapsed > 30000) {
				observer.disconnect();
				fail(new Error('Dialog did not become visible'));
				return;
			}
			requestAnimationFrame(check);
		};
		requestAnimationFrame(check);
	})`) as Promise<OpenTiming>;

interface PageRecord {
	bannerVisible: number;
	customizeOver: number | null;
	lcp: {
		inDialog: boolean;
		size: number;
		tag: string | null;
		testId: string | null;
		time: number;
		url: string | null;
	}[];
	loadEventEnd: number;
	domContentLoaded: number;
	resources: {
		name: string;
		initiatorType: string;
		startTime: number;
		responseEnd: number;
		transferSize: number;
		encodedBodySize: number;
	}[];
}

const readPage = (page: Page) =>
	page.evaluate(`(() => {
		const nav = performance.getEntriesByType('navigation')[0];
		return {
			...${pageState},
			domContentLoaded: nav.domContentLoadedEventEnd,
			loadEventEnd: nav.loadEventEnd,
			resources: performance.getEntriesByType('resource').map((entry) => ({
				encodedBodySize: entry.encodedBodySize,
				initiatorType: entry.initiatorType,
				name: entry.name,
				responseEnd: entry.responseEnd,
				startTime: entry.startTime,
				transferSize: entry.transferSize,
			})),
		};
	})()`) as Promise<PageRecord>;

const round = (value: number | null | undefined) =>
	value === null || value === undefined ? null : Math.round(value * 10) / 10;

/**
 * Runs one sample in its own browser, so no sample shares a cache, a
 * connection pool, or a crash with another.
 */
const runSample = async (target: AppTarget, cell: Cell) => {
	const browser = await chromium.launch();
	const context = await browser.newContext({ hasTouch: false, viewport });
	try {
		const page = await context.newPage();
		await page.addInitScript(initScript);
		const cdp = await context.newCDPSession(page);
		await cdp.send('Network.enable');
		await cdp.send('Network.emulateNetworkConditions', {
			downloadThroughput: throttle.downloadThroughput,
			latency: throttle.latency,
			offline: false,
			uploadThroughput: throttle.uploadThroughput,
		});
		await cdp.send('Emulation.setCPUThrottlingRate', {
			rate: throttle.cpuThrottlingRate,
		});
		await page.goto(target.url, { timeout: 120_000, waitUntil: 'commit' });
		await waitForClickPoint(page, cell.afterLoadMs);
		let hoverDwell: number | null = null;
		if (cell.hover) {
			// A real pointer move, so the banner's intent warming runs.
			await page.hover(CUSTOMIZE_SELECTOR, { timeout: 30_000 });
			hoverDwell = await dwellOnCustomize(page);
		}
		const open = await measureOpen(page);
		await page.waitForFunction(
			`(() => {
				const hero = document.querySelector(${JSON.stringify(HERO_SELECTOR)});
				return hero instanceof HTMLImageElement && hero.complete;
			})()`,
			undefined,
			{ timeout: 120_000 }
		);
		// Let the hero's LCP entry and any trailing chunks land.
		await page.waitForTimeout(500);
		const record = await readPage(page);
		const fileOf = (name: string) => basename(new URL(name).pathname);
		const firstEntry = (file: string) =>
			record.resources.find((entry) => fileOf(entry.name) === file);
		const marker = firstEntry(target.markerFile);
		// Files fetched alongside the dialog chunk, not by earlier page code.
		const dialogEntries = target.dialogFiles
			.map(firstEntry)
			.filter(
				(entry): entry is PageRecord['resources'][number] =>
					entry !== undefined &&
					marker !== undefined &&
					entry.startTime >= marker.startTime - 50
			);
		const requestedAt = marker?.startTime ?? null;
		const readyAt =
			dialogEntries.length > 0
				? Math.max(...dialogEntries.map((entry) => entry.responseEnd))
				: null;
		const hero = record.resources.find(
			(entry) =>
				fileOf(entry.name).startsWith('hero') && entry.name.endsWith('.jpg')
		);
		const pageLcp = record.lcp.findLast((entry) => !entry.inDialog);
		const sinceLoad = (value: number | null) =>
			value === null ? null : round(value - record.loadEventEnd);
		return {
			bannerVisibleMs: round(record.bannerVisible),
			cell: cell.id,
			click: {
				afterLoadMs: sinceLoad(open.clickAt),
				atMs: round(open.clickAt),
				hoverDwellMs: round(hoverDwell),
			},
			dialog: {
				completeAtClick: readyAt !== null && readyAt <= open.clickAt,
				files: dialogEntries.map((entry) => ({
					file: fileOf(entry.name),
					responseEndMs: round(entry.responseEnd),
					startMs: round(entry.startTime),
					transferSize: entry.transferSize,
				})),
				readyAfterLoadMs: sinceLoad(readyAt),
				readyMs: round(readyAt),
				requestedAfterLcpMs:
					requestedAt === null || pageLcp === undefined
						? null
						: round(requestedAt - pageLcp.time),
				requestedAfterLoadMs: sinceLoad(requestedAt),
				requestedAtClick: requestedAt !== null && requestedAt < open.clickAt,
				requestedMs: round(requestedAt),
			},
			domContentLoadedMs: round(record.domContentLoaded),
			hero: hero
				? {
						responseEndMs: round(hero.responseEnd),
						startMs: round(hero.startTime),
					}
				: null,
			lcp: pageLcp
				? {
						isHero: pageLcp.testId === 'bench-hero',
						size: pageLcp.size,
						tag: pageLcp.tag,
						timeMs: round(pageLcp.time),
					}
				: null,
			loadEventEndMs: round(record.loadEventEnd),
			open: {
				fullyVisibleMs: round(open.fullyVisible),
				mountedMs: round(open.mounted),
				visibleMs: round(open.visible),
			},
		};
	} finally {
		// Closing the browser closes the context, and works after a crash.
		await browser.close();
	}
};

type Sample = Awaited<ReturnType<typeof runSample>>;

const stats = (values: (number | null)[]) => {
	const present = values.filter((value): value is number => value !== null);
	return present.length === 0
		? null
		: {
				median: round(median(present)),
				n: present.length,
				p75: round(percentile(present, 75)),
			};
};

const summarize = (samples: Sample[]) =>
	Object.fromEntries(
		activeCells.map((cell) => {
			const group = samples.filter((sample) => sample.cell === cell.id);
			const share = (pick: (sample: Sample) => boolean) =>
				`${group.filter(pick).length}/${group.length}`;
			return [
				cell.id,
				{
					clickAfterLoadMs: stats(group.map((s) => s.click.afterLoadMs)),
					completeAtClick: share((s) => s.dialog.completeAtClick),
					fullyVisibleMs: stats(group.map((s) => s.open.fullyVisibleMs)),
					lcpMs: stats(group.map((s) => s.lcp?.timeMs ?? null)),
					loadEventEndMs: stats(group.map((s) => s.loadEventEndMs)),
					mountedMs: stats(group.map((s) => s.open.mountedMs)),
					requestedAfterLcpMs: stats(
						group.map((s) => s.dialog.requestedAfterLcpMs)
					),
					requestedAfterLoadMs: stats(
						group.map((s) => s.dialog.requestedAfterLoadMs)
					),
					requestedAtClick: share((s) => s.dialog.requestedAtClick),
					visibleMs: stats(group.map((s) => s.open.visibleMs)),
				},
			];
		})
	);

/** Retries a sample once if it throws, such as when the browser crashes. */
const runSampleWithRetry = async (target: AppTarget, cell: Cell) => {
	try {
		return await runSample(target, cell);
	} catch (error) {
		console.error(`${target.arm}/${target.app} ${cell.id} failed once:`, error);
		return await runSample(target, cell);
	}
};

const browserVersion = await (async () => {
	const browser = await chromium.launch();
	const version = browser.version();
	await browser.close();
	return version;
})();
const targets: AppTarget[] = [];
try {
	for (const arm of arms) {
		for (const app of apps) {
			const { assetsDir, server, url } = await startServer(app, arm.root);
			targets.push({
				app,
				arm: arm.name,
				root: arm.root,
				server,
				url,
				...(await resolveDialogFiles(assetsDir, url)),
			});
		}
	}
	for (const target of targets) {
		console.log(
			`${target.arm}/${target.app}: ${target.url} dialog ${target.dialogFiles.join(' ')}`
		);
	}
	const samples = new Map<string, Sample[]>(
		targets.map((target) => [`${target.arm}/${target.app}`, []])
	);
	for (let index = 0; index < iterations; index += 1) {
		for (const cell of activeCells) {
			if (cell.late && index >= lateIterations) {
				continue;
			}
			for (const app of apps) {
				const order = targets.filter((target) => target.app === app);
				// Alternate which arm goes first so drift hits both equally.
				if (index % 2 === 1) {
					order.reverse();
				}
				for (const target of order) {
					try {
						const sample = await runSampleWithRetry(target, cell);
						samples.get(`${target.arm}/${target.app}`)?.push(sample);
						console.log(
							`[${index + 1}/${iterations}] ${target.arm}/${app} ${cell.id}: click +${sample.click.afterLoadMs} ms after load, visible ${sample.open.visibleMs} ms, chunk ${chunkState(sample.dialog)}`
						);
					} catch (error) {
						console.error(
							`[${index + 1}/${iterations}] ${target.arm}/${app} ${cell.id} failed:`,
							error
						);
					}
				}
			}
		}
	}
	mkdirSync(outputDir, { recursive: true });
	for (const arm of arms) {
		const armTargets = targets.filter((target) => target.arm === arm.name);
		const commitSha = await git(arm.root, ['rev-parse', 'HEAD']);
		const dirty = await git(arm.root, [
			'status',
			'--porcelain',
			'--untracked-files=no',
		]);
		const result = {
			apps: Object.fromEntries(
				armTargets.map((target) => {
					const appSamples = samples.get(`${arm.name}/${target.app}`) ?? [];
					return [
						target.app,
						{
							dialogFiles: target.fileSizes,
							markerFile: target.markerFile,
							samples: appSamples,
							summary: summarize(appSamples),
							url: new URL(target.url).pathname + new URL(target.url).search,
						},
					];
				})
			),
			browser: browserVersion,
			cells: activeCells,
			commitSha,
			gitDirty: dirty.length > 0,
			iterations,
			lateIterations,
			throttle: { name: throttleName, ...throttle },
			viewport,
		};
		const file = join(outputDir, `${arm.name}.json`);
		writeFileSync(file, `${JSON.stringify(result, null, '\t')}\n`);
		console.log(`Wrote ${file}`);
	}
} finally {
	for (const target of targets) {
		await stopServer(target.server);
	}
}

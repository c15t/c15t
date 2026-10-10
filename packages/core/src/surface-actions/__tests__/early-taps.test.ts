/** @vitest-environment jsdom */
/**
 * A tap on a server-rendered banner before the page hydrated: the inline
 * script holds it, and the runtime records it once it can.
 */
import { writePolicyResolutionWire } from '@c15t/schema/types';
import { translations } from '@c15t/translations/en';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	matchedResolution,
	noticeRule,
	optInRule,
	optOutRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { clearStoredConsentRecords } from '../../modules/persistence/__tests__/record-writes';
import { createConsentRuntime } from '../../runtime/index';
import type { ConsentRuntime } from '../../runtime/types';
import { hosted } from '../../transports/mode';
import { c15tProtocolHeaders } from '../../transports/version-header';
import {
	EARLY_CONSENT_TAP_SCRIPT,
	EARLY_TAP_OPT_OUT,
	EARLY_TAP_STYLE_ID,
	EARLY_TAPS_WINDOW_KEY,
} from '../early-tap-script';
import type { EarlyConsentTapQueue } from '../early-tap-script';
import { replayEarlyConsentTaps } from '../early-taps';

let policy = matchedResolution(optInRule());
let unavailable = false;
const runtimes: ConsentRuntime[] = [];
const saves: string[] = [];

const queue = () =>
	(window as unknown as Record<string, EarlyConsentTapQueue>)[
		EARLY_TAPS_WINDOW_KEY
	];

beforeEach(() => {
	policy = matchedResolution(optInRule());
	unavailable = false;
	saves.length = 0;
	localStorage.clear();
	clearStoredConsentRecords();
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	for (const runtime of runtimes.splice(0)) {
		runtime.dispose();
	}
	document.body.innerHTML = '';
	document.getElementById(EARLY_TAP_STYLE_ID)?.remove();
	// A script no replay claimed still listens on the shared document.
	queue()?.stop?.();
	Reflect.deleteProperty(window, EARLY_TAPS_WINDOW_KEY);
	vi.restoreAllMocks();
	clearStoredConsentRecords();
});

/** Run the inline script as the server HTML would. */
const runScript = () => {
	// oxlint-disable-next-line no-new-func -- The script is shipped as text.
	new Function(EARLY_CONSENT_TAP_SCRIPT)();
};

/** The stock banner's markup, as a server would render it. */
const renderBanner = (model = 'opt-in', prompt = 'choice') => {
	document.body.innerHTML = `<div data-testid="consent-banner-root" data-model="${model}" data-prompt="${prompt}"><button data-action="reject">Reject all</button><button data-action="accept"><span>Accept all</span></button><button data-action="customize">Customize</button></div>`;
};

const tap = (action: string) => {
	const button = document.querySelector<HTMLButtonElement>(
		`[data-action="${action}"]`
	);
	// A click on the label inside the button, as a finger would land.
	(button?.firstElementChild ?? button)?.dispatchEvent(
		new MouseEvent('click', { bubbles: true })
	);
};

const hidden = () => document.getElementById(EARLY_TAP_STYLE_ID) !== null;

const nextFrame = () =>
	new Promise((resolve) => {
		requestAnimationFrame(resolve);
	});

const createRuntime = () => {
	const runtime = createConsentRuntime({
		consentCategories: ['necessary', 'measurement', 'marketing'],
		mode: hosted({
			fetch: (input, init) => {
				const path = String(input).split('?')[0] ?? '';
				if (unavailable) {
					return Promise.resolve(new Response(null, { status: 503 }));
				}
				if (path.endsWith('/subjects')) {
					saves.push(String(init?.body));
				}
				return Promise.resolve(
					Response.json(
						path.endsWith('/init')
							? {
									branding: 'c15t',
									location: { countryCode: 'DE', regionCode: null },
									policyResolution: writePolicyResolutionWire(policy),
									translations: { language: 'en', translations },
								}
							: {},
						{ headers: c15tProtocolHeaders }
					)
				);
			},
			url: '/api/c15t',
		}),
		prefetch: { initRetry: false },
	});
	runtimes.push(runtime);
	return runtime;
};

const startAndInit = async (runtime: ConsentRuntime) => {
	const completed = Promise.withResolvers<undefined>();
	const stop = runtime.kernel.events.on('command:init:completed', () => {
		stop();
		completed.resolve(undefined);
	});
	runtime.start();
	await completed.promise;
	// The replay runs outside the commit that resolved the policy.
	await Promise.resolve();
};

describe('the inline script', () => {
	test('holds a tap on the stock banner and hides it', () => {
		runScript();
		renderBanner();
		const handler = vi.fn();
		document
			.querySelector('[data-action="accept"]')
			?.addEventListener('click', handler);
		const before = Date.now();
		tap('accept');
		// A framework that hydrates later never sees the same click.
		expect(handler).not.toHaveBeenCalled();
		expect(queue()?.taps).toEqual([
			{
				action: 'accept',
				at: expect.any(Number),
				model: 'opt-in',
				prompt: 'choice',
			},
		]);
		expect(queue()?.taps?.[0]?.at).toBeGreaterThanOrEqual(before);
		expect(hidden()).toBe(true);
	});

	test('keeps the banner up for customize, which opens a dialog later', () => {
		runScript();
		renderBanner();
		tap('customize');
		expect(queue()?.taps?.map((entry) => entry.action)).toEqual(['customize']);
		expect(hidden()).toBe(false);
	});

	test('gives the hiding style the nonce of its own script', () => {
		vi.spyOn(document, 'currentScript', 'get').mockReturnValue(
			Object.assign(document.createElement('script'), { nonce: 'page-nonce' })
		);
		runScript();
		renderBanner();
		tap('accept');
		expect(document.getElementById(EARLY_TAP_STYLE_ID)?.nonce).toBe(
			'page-nonce'
		);
	});

	test('leaves a button that opted out to its own handler', () => {
		runScript();
		renderBanner();
		document
			.querySelector('[data-action="accept"]')
			?.setAttribute(EARLY_TAP_OPT_OUT, 'off');
		const handler = vi.fn();
		document.addEventListener('click', handler);
		tap('accept');
		expect(handler).toHaveBeenCalledOnce();
		expect(queue()?.taps).toEqual([]);
		expect(hidden()).toBe(false);
	});

	test('leaves taps alone while the page has more than one banner', () => {
		// Two banners can belong to two runtimes, and the first to hydrate
		// would claim the shared queue.
		runScript();
		renderBanner();
		document.body.insertAdjacentHTML('beforeend', document.body.innerHTML);
		const handler = vi.fn();
		document.addEventListener('click', handler);
		tap('accept');
		expect(handler).toHaveBeenCalledOnce();
		expect(queue()?.taps).toEqual([]);
		expect(hidden()).toBe(false);
	});

	test('leaves the IAB banner and other buttons alone', () => {
		runScript();
		renderBanner('iab');
		document.body.insertAdjacentHTML(
			'beforeend',
			'<button data-action="accept" id="outside">Elsewhere</button>'
		);
		const handler = vi.fn();
		document.addEventListener('click', handler);
		tap('accept');
		document.getElementById('outside')?.click();
		expect(handler).toHaveBeenCalledTimes(2);
		expect(queue()?.taps).toEqual([]);
		expect(hidden()).toBe(false);
	});
});

describe('replayEarlyConsentTaps', () => {
	test.each([
		['accept', true],
		['reject', false],
	] as const)(
		'records %s at the time of the tap once the runtime has its policy',
		async (action, granted) => {
			runScript();
			renderBanner();
			tap(action);
			const tapAt = queue()?.taps?.[0]?.at;
			const runtime = createRuntime();
			// The banner hydrates before the runtime starts.
			const stop = replayEarlyConsentTaps(runtime.kernel, {
				categories: () => runtime.consentCategories,
				started: () => runtime.started,
			});
			// From here the hydrated banner's own handlers take clicks.
			const handler = vi.fn();
			document.addEventListener('click', handler);
			tap('accept');
			expect(handler).toHaveBeenCalledOnce();
			expect(runtime.kernel.getSnapshot().explicitChoice).toBeNull();

			await startAndInit(runtime);
			const snapshot = runtime.kernel.getSnapshot();
			expect(snapshot.explicitChoice?.categories.marketing).toMatchObject({
				confirmedAt: tapAt,
				value: granted,
			});
			expect(snapshot.effectivePermissions.measurement).toBe(granted);
			expect(snapshot.activeUI).toBe('none');
			// Persistence writes after the commit.
			await vi.waitFor(() =>
				expect(JSON.parse(localStorage.getItem('c15t') ?? '{}')).toMatchObject({
					categories: { marketing: { value: granted } },
				})
			);
			await vi.waitFor(() => expect(saves).toHaveLength(1));
			expect(JSON.parse(saves[0] ?? '{}')).toMatchObject({
				uiSource: 'banner',
			});

			// Hidden until the framework removes the banner it tapped.
			expect(hidden()).toBe(true);
			document.body.innerHTML = '';
			await nextFrame();
			expect(hidden()).toBe(false);

			// A later init with the same policy keeps the choice.
			await runtime.reinit();
			expect(
				runtime.kernel.getSnapshot().explicitChoice?.categories.marketing
			).toMatchObject({ confirmedAt: tapAt, value: granted });
			stop();
		}
	);

	test('records the UI source the banner gives', async () => {
		runScript();
		renderBanner();
		tap('accept');
		const runtime = createRuntime();
		replayEarlyConsentTaps(runtime.kernel, {
			started: () => runtime.started,
			uiSource: 'widget',
		});
		await startAndInit(runtime);
		await vi.waitFor(() => expect(saves).toHaveLength(1));
		expect(JSON.parse(saves[0] ?? '{}')).toMatchObject({
			uiSource: 'widget',
		});
	});

	test('records a notice dismissal at the time of the tap', async () => {
		policy = matchedResolution(noticeRule());
		runScript();
		document.body.innerHTML =
			'<div data-testid="consent-banner-root" data-model="opt-out" data-prompt="notice"><button data-action="dismiss">OK</button></div>';
		tap('dismiss');
		const tapAt = queue()?.taps?.[0]?.at ?? 0;
		// Hydration ends well after the tap.
		const { now } = Date;
		vi.spyOn(Date, 'now').mockImplementation(() => now() + 5000);
		const runtime = createRuntime();
		replayEarlyConsentTaps(runtime.kernel, {
			started: () => runtime.started,
		});
		await startAndInit(runtime);
		expect(runtime.kernel.getSnapshot().noticeDismissal?.dismissedAt).toBe(
			tapAt
		);
	});

	test('drops a tap made on a banner for another model', async () => {
		runScript();
		renderBanner('opt-in');
		tap('accept');
		policy = matchedResolution(optOutRule());
		const runtime = createRuntime();
		replayEarlyConsentTaps(runtime.kernel, {
			started: () => runtime.started,
		});
		await startAndInit(runtime);
		expect(runtime.kernel.getSnapshot().explicitChoice).toBeNull();
		expect(runtime.kernel.getSnapshot().activeUI).toBe('banner');
		expect(hidden()).toBe(false);
		expect(saves).toEqual([]);
	});

	test('shows the banner again when the policy fails', async () => {
		runScript();
		renderBanner();
		tap('accept');
		unavailable = true;
		const runtime = createRuntime();
		replayEarlyConsentTaps(runtime.kernel, {
			started: () => runtime.started,
		});
		await startAndInit(runtime);
		expect(runtime.kernel.getSnapshot().resolution.status).toBe('failed');
		expect(runtime.kernel.getSnapshot().explicitChoice).toBeNull();
		expect(hidden()).toBe(false);
	});

	test('opens the dialog for a customize tap', async () => {
		runScript();
		renderBanner();
		tap('customize');
		const runtime = createRuntime();
		replayEarlyConsentTaps(runtime.kernel, {
			started: () => runtime.started,
		});
		await startAndInit(runtime);
		expect(runtime.kernel.getSnapshot().activeUI).toBe('dialog');
		expect(runtime.kernel.getSnapshot().explicitChoice).toBeNull();
	});

	test('a banner that unmounts while waiting hands the tap to the next', async () => {
		runScript();
		renderBanner();
		tap('reject');
		const runtime = createRuntime();
		const stop = replayEarlyConsentTaps(runtime.kernel, {
			started: () => runtime.started,
		});
		stop();
		expect(hidden()).toBe(true);
		replayEarlyConsentTaps(runtime.kernel, {
			started: () => runtime.started,
		});
		await startAndInit(runtime);
		expect(
			runtime.kernel.getSnapshot().explicitChoice?.categories.marketing?.value
		).toBe(false);
	});

	test('does nothing without the script, and shows nothing hidden', () => {
		const runtime = createRuntime();
		const stop = replayEarlyConsentTaps(runtime.kernel, {
			started: () => true,
		});
		stop();
		expect(runtime.kernel.getSnapshot().explicitChoice).toBeNull();
		expect(hidden()).toBe(false);
	});
});

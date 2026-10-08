/**
 * @vitest-environment jsdom
 *
 * The consent journey a browser runtime sends: which id its `/init` and
 * saves carry, and where (if anywhere) the id is kept between pages.
 */
import {
	readJourneyParams,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import type { ConsentJourneyParams } from '@c15t/schema/types';
import { translations } from '@c15t/translations/en';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	matchedResolution,
	optInRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { buildPrefetchScript } from '../../libs/prefetch/prefetch';
import { JOURNEY_STORAGE_KEY } from '../../libs/storage-keys';
import { clearStoredConsentRecords } from '../../modules/persistence/__tests__/record-writes';
import { custom, hosted } from '../../transports/mode';
import { c15tProtocolHeaders } from '../../transports/version-header';
import type { KernelTransport } from '../../types';
import {
	createConsentProviderRuntime,
	createConsentRuntime,
	defaultRuntimeModules,
	streamPrefetch,
} from '../index';
import { createJourneyController } from '../journey';
import type { JourneyStorage } from '../journey';
import type { ConsentRuntime, ConsentRuntimeOptions } from '../types';

const SERVER_ID = '3b241101-e2bb-4255-8caf-4136c566a962';

interface SentRequest {
	method: string;
	path: string;
	journey: ConsentJourneyParams | null;
}

let requests: SentRequest[] = [];
let saveStatus = 200;
const runtimes: ConsentRuntime[] = [];

const fakeFetch: typeof globalThis.fetch = (input, init) => {
	const url = new URL(String(input), 'https://shop.example.com');
	requests.push({
		journey: readJourneyParams(url),
		method: init?.method ?? 'GET',
		path: url.pathname,
	});
	if (url.pathname.endsWith('/subjects') && saveStatus !== 200) {
		return Promise.resolve(new Response(null, { status: saveStatus }));
	}
	return Promise.resolve(
		Response.json(
			url.pathname.endsWith('/init')
				? {
						branding: 'c15t',
						location: { countryCode: 'DE', regionCode: null },
						policyResolution: writePolicyResolutionWire(
							matchedResolution(optInRule())
						),
						translations: { language: 'en', translations },
					}
				: { subjectId: 'sub_1' },
			{ headers: c15tProtocolHeaders }
		)
	);
};

const backend = () =>
	hosted({ fetch: fakeFetch, url: 'https://consent.example.com' });

const init = () => requests.filter((request) => request.path === '/init');
const saves = () => requests.filter((request) => request.path === '/subjects');

/** Start a runtime, as a page load does, and wait for its `/init`. */
const load = async (options: Partial<ConsentRuntimeOptions> = {}) => {
	const runtime = createConsentRuntime({
		consentCategories: ['necessary', 'measurement'],
		mode: backend(),
		prefetch: { initRetry: false },
		...options,
	});
	runtimes.push(runtime);
	const completed = Promise.withResolvers<undefined>();
	runtime.kernel.events.on('command:init:completed', () =>
		completed.resolve(undefined)
	);
	runtime.start();
	await completed.promise;
	return runtime;
};

/** Leave the page: the runtime goes, storage stays. */
const leave = (runtime: ConsentRuntime) => {
	runtime.dispose();
	runtime.kernel.dispose();
};

const everythingStored = (): string =>
	[
		document.cookie,
		...Object.entries(localStorage),
		...Object.entries(sessionStorage),
	].join('|');

beforeEach(() => {
	requests = [];
	saveStatus = 200;
	localStorage.clear();
	sessionStorage.clear();
	clearStoredConsentRecords();
	// Each test is a fresh page load.
	delete (window as Window & { __c15tJourney?: unknown }).__c15tJourney;
	delete (window as Window & { __c15tInitialDataPromises?: unknown })
		.__c15tInitialDataPromises;
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	for (const runtime of runtimes.splice(0)) {
		leave(runtime);
	}
	vi.restoreAllMocks();
	localStorage.clear();
	sessionStorage.clear();
	clearStoredConsentRecords();
});

describe("journey: 'page' (the default)", () => {
	test('the /init and the save carry one journey id', async () => {
		const runtime = await load();
		const [first] = init();
		expect(first?.journey).toEqual({
			id: expect.stringMatching(/^[\da-f-]{36}$/u),
			scope: 'page',
			storedChoice: false,
		});

		await runtime.kernel.commands.save('all');
		expect(saves()[0]?.journey).toEqual({
			id: first?.journey?.id,
			scope: 'page',
		});
	});

	test('writes the id to no storage, even when a failed save is queued', async () => {
		saveStatus = 503;
		const runtime = await load();
		const id = init()[0]?.journey?.id ?? '';
		await runtime.kernel.commands.save('all');
		// The save was queued for replay in localStorage, without the journey.
		expect(localStorage.length).toBeGreaterThan(0);
		expect(sessionStorage.length).toBe(0);
		expect(everythingStored()).not.toContain(id);
	});

	test('a save queued on one page is replayed by the next without a journey', async () => {
		saveStatus = 503;
		const first = await load();
		await first.kernel.commands.save('all');
		expect(saves()[0]?.journey).not.toBeNull();
		leave(first);

		saveStatus = 200;
		requests = [];
		const second = await load();
		// The next page replays the queued save once its init applied.
		await vi.waitFor(() => expect(saves()).toHaveLength(1));
		expect(saves()[0]?.journey).toBeNull();

		// A save this page makes itself still carries its own journey.
		await second.kernel.commands.save('none');
		expect(saves()[1]?.journey).toEqual({
			id: init()[0]?.journey?.id,
			scope: 'page',
		});
	});

	test('a reload starts a new journey and says a choice was stored', async () => {
		const first = await load();
		await first.kernel.commands.save('all');
		leave(first);

		await load();
		const [before, after] = init();
		expect(after?.journey?.id).not.toBe(before?.journey?.id);
		expect(after?.journey?.storedChoice).toBe(true);
	});
});

describe('journey: false', () => {
	test('sends no journey parameters', async () => {
		const runtime = await load({ journey: false });
		await runtime.kernel.commands.save('all');
		expect(requests.map((request) => request.journey)).toEqual([null, null]);
	});
});

describe("journey: 'tab'", () => {
	test('keeps the id while the prompt is due and drops it after a choice', async () => {
		const first = await load({ journey: 'tab' });
		const id = init()[0]?.journey?.id;
		expect(init()[0]?.journey?.scope).toBe('tab');
		// The banner is showing and nothing is stored: the prompt is due.
		expect(first.kernel.getSnapshot().activeUI).toBe('banner');
		expect(sessionStorage.getItem(JOURNEY_STORAGE_KEY)).toBe(id);
		leave(first);

		// The visitor navigated without choosing; the next page continues.
		const second = await load({ journey: 'tab' });
		expect(init()[1]?.journey?.id).toBe(id);
		await second.kernel.commands.save('none');
		expect(saves()[0]?.journey).toEqual({ id, scope: 'tab' });
		expect(sessionStorage.getItem(JOURNEY_STORAGE_KEY)).toBeNull();
		leave(second);

		// With the choice made, the next page is a new journey.
		const third = await load({ journey: 'tab' });
		expect(init()[2]?.journey?.id).not.toBe(id);
		expect(init()[2]?.journey?.storedChoice).toBe(true);
		expect(third.kernel.getSnapshot().activeUI).toBe('none');
		expect(sessionStorage.getItem(JOURNEY_STORAGE_KEY)).toBeNull();
	});

	test('blocked sessionStorage makes it a page journey', async () => {
		vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
			throw new DOMException('Storage access blocked', 'SecurityError');
		});
		const runtime = await load({ journey: 'tab' });
		expect(init()[0]?.journey?.scope).toBe('page');
		await runtime.kernel.commands.save('all');
		expect(saves()[0]?.journey?.scope).toBe('page');
	});
});

describe('a journey a server render started', () => {
	test('a resolved prefetch hands over its id and the save carries it', async () => {
		const runtime = createConsentRuntime({
			consentCategories: ['necessary', 'measurement'],
			mode: backend(),
			prefetch: {
				initialPolicyResolution: matchedResolution(optInRule()),
				journey: { id: SERVER_ID },
			},
		});
		runtimes.push(runtime);
		runtime.start();
		// The server already resolved init; the browser sends none.
		expect(init()).toEqual([]);
		await runtime.kernel.commands.save('all');
		expect(saves()[0]?.journey).toEqual({ id: SERVER_ID, scope: 'page' });
	});

	test('a streamed prefetch hands over its id before the first save', async () => {
		const save = vi.fn<NonNullable<KernelTransport['save']>>(() =>
			Promise.resolve({ ok: true })
		);
		const stream = Promise.withResolvers<{
			initialPolicyResolution: ReturnType<typeof matchedResolution>;
			journey: { id: string };
		}>();
		const runtime = createConsentProviderRuntime(
			{
				consentCategories: ['necessary', 'measurement'],
				mode: custom({ init: () => Promise.resolve({}), save }),
				prefetch: stream.promise,
			},
			{ ...defaultRuntimeModules, streamPrefetch }
		);
		runtimes.push(runtime);
		runtime.start();
		stream.resolve({
			initialPolicyResolution: matchedResolution(optInRule()),
			journey: { id: SERVER_ID },
		});
		await vi.waitFor(() =>
			expect(runtime.kernel.getSnapshot().activeUI).toBe('banner')
		);
		await runtime.kernel.commands.save('all');
		expect(save.mock.calls[0]?.[0].journey).toEqual({
			id: SERVER_ID,
			scope: 'page',
		});
	});
});

describe('a journey a request before the runtime started', () => {
	test('the inline prefetch script sends it and the save carries it', async () => {
		vi.stubGlobal('fetch', fakeFetch);
		try {
			window.eval(
				buildPrefetchScript({ backendURL: 'https://consent.example.com' })
			);
			const runtime = await load();
			// The runtime took the script's response: one /init in all.
			expect(init()).toHaveLength(1);
			const early = init()[0]?.journey;
			expect(early).toEqual({
				id: expect.stringMatching(/^[\da-f-]{36}$/u),
				scope: 'page',
				storedChoice: false,
			});
			await runtime.kernel.commands.save('all');
			expect(saves()[0]?.journey).toEqual({ id: early?.id, scope: 'page' });
		} finally {
			vi.unstubAllGlobals();
		}
	});

	test('a server render id outranks an early request id', async () => {
		(window as Window & { __c15tJourney?: unknown }).__c15tJourney = {
			id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
			scope: 'page',
			storedChoice: false,
		};
		const runtime = createConsentRuntime({
			consentCategories: ['necessary', 'measurement'],
			mode: backend(),
			prefetch: {
				initialPolicyResolution: matchedResolution(optInRule()),
				journey: { id: SERVER_ID },
			},
		});
		runtimes.push(runtime);
		runtime.start();
		await runtime.kernel.commands.save('all');
		expect(saves()[0]?.journey?.id).toBe(SERVER_ID);
	});
});

describe('createJourneyController storage failures', () => {
	const kernelWith = (activeUI: 'banner' | 'none') => {
		const listeners = new Set<() => void>();
		return {
			events: { on: () => () => undefined },
			getSnapshot: () => ({ activeUI, explicitChoice: null }),
			subscribe: (listener: () => void) => {
				listeners.add(listener);
				return () => listeners.delete(listener);
			},
		} as never;
	};

	test('a write that throws turns a tab journey into a page one', () => {
		const storage: JourneyStorage = {
			getItem: () => null,
			removeItem: vi.fn(),
			setItem: () => {
				throw new DOMException('Quota exceeded', 'QuotaExceededError');
			},
		};
		const journey = createJourneyController({
			option: 'tab',
			storage: () => storage,
		});
		journey.start(kernelWith('banner'));
		expect(journey.forInit()?.scope).toBe('page');
		expect(journey.forSave()?.scope).toBe('page');
	});

	test('a stored id that is not a UUID is not reused', () => {
		const journey = createJourneyController({
			option: 'tab',
			storage: () => ({
				getItem: () => 'visitor-42',
				removeItem: vi.fn(),
				setItem: vi.fn(),
			}),
		});
		journey.start(kernelWith('none'));
		expect(journey.forInit()?.id).not.toBe('visitor-42');
		expect(journey.forInit()?.id).toMatch(/^[\da-f-]{36}$/u);
	});

	test('a page journey never touches storage', () => {
		const storage = () => {
			throw new Error('a page journey must not read storage');
		};
		const journey = createJourneyController({ option: 'page', storage });
		journey.start(kernelWith('banner'));
		expect(journey.forInit()?.scope).toBe('page');
	});
});

/**
 * @vitest-environment jsdom
 *
 * The early script loader decision runs during a framework provider's
 * render, before `start()`. It must leave no trace: no storage write (a
 * reconcile, a legacy-key migration, a cookie mirror), no request for
 * persistence's write code, and no listener or timer left behind, whatever
 * the browser has stored.
 *
 * The test setup loads persistence's write code up front, the way an
 * earlier runtime on the page can have. Each case runs both with it loaded
 * and with the page's loader reset to "not loaded yet".
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	choiceRecords,
	explicitChoice,
	matchedResolution,
	NOW,
	optInRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { STORAGE_KEY, STORAGE_KEY_V2 } from '../../libs/storage-keys';
import { pageWriterLoader } from '../../modules/persistence/writer-loader';
import {
	encodeStoredConsentEnvelopeJson,
	encodeVendorChoice,
} from '../../modules/persistence/writer/encode';
import type { ScriptLoaderHandle } from '../../modules/script-loader/types';
import { custom } from '../../transports/mode';
import {
	createConsentProviderRuntime,
	defaultRuntimeModules,
	lazyRuntimeModule,
	streamPrefetch,
} from '../index';
import { preloadScriptLoaderWith } from '../script-loader-preload';
import type { RuntimePrefetch } from '../types';

const resolution = matchedResolution(optInRule());
const fingerprint = resolution.fingerprints.choice;
const SUBJECT_ID = 'sub_2VZxR7YmNpKq3WfLs8TgHd';

/** The server read a marketing choice from the cookie at `confirmedAt`. */
const seeded = (marketing: boolean, confirmedAt: number): RuntimePrefetch => ({
	initialPolicyResolution: resolution,
	initialRecords: choiceRecords({ marketing }, { confirmedAt, fingerprint }),
	now: NOW,
});

/** The server read a marketing grant from the cookie at `confirmedAt`. */
const seededGrant = (confirmedAt: number): RuntimePrefetch =>
	seeded(true, confirmedAt);

/** The server read no records. */
const unseeded: RuntimePrefetch = {
	initialPolicyResolution: resolution,
	now: NOW,
};

const storeEnvelope = (
	marketing: boolean | undefined,
	confirmedAt: number,
	subject?: { subjectId: string }
): void => {
	localStorage.setItem(
		STORAGE_KEY_V2,
		encodeStoredConsentEnvelopeJson({
			categories:
				marketing === undefined
					? {}
					: explicitChoice({ marketing }, { confirmedAt, fingerprint })
							.categories,
			subject,
			version: 3,
		})
	);
};

/**
 * What the browser has stored, what the server read, and whether the
 * loader loads: from a resolved state, then from a streamed one when that
 * differs.
 */
const cases: [string, () => RuntimePrefetch, boolean, boolean?][] = [
	[
		'a stored denial newer than the server read',
		() => {
			storeEnvelope(false, NOW - 1000);
			return seededGrant(NOW - 60_000);
		},
		false,
	],
	[
		'a stored denial older than the server read',
		() => {
			storeEnvelope(false, NOW - 60_000);
			return seededGrant(NOW - 1000);
		},
		true,
	],
	[
		'a legacy-key record that a write would migrate',
		() => {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					consentInfo: {
						materialPolicyFingerprint: 'fp-old',
						subjectId: SUBJECT_ID,
						time: NOW - 1000,
					},
					consents: { marketing: true, necessary: true },
				})
			);
			return unseeded;
		},
		true,
	],
	[
		'a subject-only record',
		() => {
			storeEnvelope(undefined, NOW - 1000, { subjectId: SUBJECT_ID });
			return unseeded;
		},
		false,
	],
	[
		'a stored denial the server never read',
		() => {
			storeEnvelope(false, NOW - 1000);
			return unseeded;
		},
		false,
	],
	[
		'a stored grant the server never read',
		() => {
			storeEnvelope(true, NOW - 1000);
			return unseeded;
		},
		true,
	],
	[
		// A streamed state hydrates storage in full and folds the server's
		// records in newest-wins; a resolved one keeps the seed's denial.
		'a stored grant newer than the server read denial',
		() => {
			storeEnvelope(true, NOW - 1000);
			return seeded(false, NOW - 60_000);
		},
		false,
		true,
	],
	[
		'a newer stored vendor denial',
		() => {
			localStorage.setItem(
				`${STORAGE_KEY_V2}-vendors`,
				encodeVendorChoice({
					confirmedAt: NOW - 1000,
					denied: ['pixel-co'],
					version: 1,
				})
			);
			return seededGrant(NOW - 60_000);
		},
		false,
	],
];

/** Records every storage write and listener change while it is installed. */
const watchSideEffects = function watchSideEffects() {
	const writes: string[] = [];
	const listeners = new Map<string, number>();
	const cookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
	if (!cookie?.set || !cookie.get) {
		throw new Error('jsdom defines document.cookie on Document.prototype.');
	}
	const { get, set } = cookie;
	Object.defineProperty(document, 'cookie', {
		configurable: true,
		get() {
			return get.call(this);
		},
		set(value: string) {
			writes.push(`cookie ${value}`);
			set.call(this, value);
		},
	});
	const stores = new Set<Storage>(
		[
			globalThis.localStorage,
			window.localStorage,
			window.sessionStorage,
		].filter(Boolean)
	);
	for (const store of stores) {
		vi.spyOn(store, 'setItem').mockImplementation((key) => {
			writes.push(`setItem ${key}`);
		});
		vi.spyOn(store, 'removeItem').mockImplementation((key) => {
			writes.push(`removeItem ${key}`);
		});
		vi.spyOn(store, 'clear').mockImplementation(() => {
			writes.push('clear');
		});
	}
	// Anything that asks for persistence's write code.
	const writerLoads = vi.spyOn(pageWriterLoader, 'load');
	for (const target of [window, document]) {
		const add = target.addEventListener.bind(target);
		const remove = target.removeEventListener.bind(target);
		vi.spyOn(target, 'addEventListener').mockImplementation(
			(type, listener, options) => {
				listeners.set(type, (listeners.get(type) ?? 0) + 1);
				add(type, listener, options);
			}
		);
		vi.spyOn(target, 'removeEventListener').mockImplementation(
			(type, listener, options) => {
				listeners.set(type, (listeners.get(type) ?? 0) - 1);
				remove(type, listener, options);
			}
		);
	}
	return {
		/** Listeners added and not removed, by event type. */
		leftListeners: () =>
			[...listeners].filter(([, count]) => count !== 0).map(([type]) => type),
		/** Calls for persistence's write code. */
		writerLoads,
		writes,
	};
};

/** Let a streamed prefetch and the load it starts settle, without timers. */
const settle = async (): Promise<void> => {
	for (let turn = 0; turn < 10; turn += 1) {
		// oxlint-disable-next-line no-await-in-loop -- Sequential turns are the point.
		await Promise.resolve();
	}
};

/**
 * Build a provider runtime the way `ConsentRoot` does: persistence on, a
 * lazy script loader and the early decision. It is never started.
 */
const construct = function construct(
	prefetch: RuntimePrefetch | Promise<RuntimePrefetch>
) {
	const handle = { dispose: vi.fn() } as unknown as ScriptLoaderHandle;
	const load = vi.fn(() => Promise.resolve(() => handle));
	const runtime = createConsentProviderRuntime(
		{
			iframeBlocker: false,
			mode: custom({
				init: vi.fn().mockResolvedValue({}),
				save: vi.fn().mockResolvedValue({ ok: true }),
			}),
			persistence: true,
			prefetch,
			scripts: [
				{
					category: 'marketing',
					id: 'pixel',
					src: 'https://example.com/pixel.js',
					vendor: 'pixel-co',
				},
			],
			windowDebug: false,
		},
		{
			...defaultRuntimeModules,
			createScriptLoader: lazyRuntimeModule(load),
			preloadScriptLoader: preloadScriptLoaderWith(load),
			streamPrefetch,
		}
	);
	return { load, runtime };
};

const clearStorage = function clearStorage(): void {
	localStorage.clear();
	for (const name of document.cookie.split(';')) {
		const key = name.split('=')[0]?.trim();
		if (key) {
			document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
};

beforeEach(() => {
	vi.useFakeTimers({ now: NOW });
	clearStorage();
});

afterEach(() => {
	vi.restoreAllMocks();
	Reflect.deleteProperty(document, 'cookie');
	vi.useRealTimers();
	clearStorage();
});

const runCase = async (
	arrange: () => RuntimePrefetch,
	stream: boolean,
	loads: boolean
) => {
	const prefetch = arrange();
	const watch = watchSideEffects();
	const { load, runtime } = construct(
		stream ? Promise.resolve(prefetch) : prefetch
	);
	await settle();
	// The decision ran, and judged what start() would apply.
	expect(load).toHaveBeenCalledTimes(loads ? 1 : 0);
	expect(watch.writes).toEqual([]);
	expect(watch.writerLoads).not.toHaveBeenCalled();
	expect(watch.leftListeners()).toEqual([]);
	expect(vi.getTimerCount()).toBe(0);
	runtime.dispose();
	await settle();
	// Nothing was scheduled to fire later either.
	await vi.runAllTimersAsync();
	expect(watch.writes).toEqual([]);
	expect(watch.writerLoads).not.toHaveBeenCalled();
	expect(watch.leftListeners()).toEqual([]);
};

describe('the early script loader decision leaves no trace', () => {
	test('the watcher sees a storage write, a cookie write and a writer load', async () => {
		const watch = watchSideEffects();
		localStorage.setItem('probe', '1');
		document.cookie = 'probe=1';
		await pageWriterLoader.load();
		expect(watch.writes).toEqual(['setItem probe', 'cookie probe=1']);
		expect(watch.writerLoads).toHaveBeenCalledTimes(1);
	});

	describe('with the write code loaded', () => {
		test.each(cases)('%s, from a resolved state', async (_, arrange, loads) => {
			await expect(runCase(arrange, false, loads)).resolves.toBeUndefined();
		});

		test.each(cases)(
			'%s, from a streamed state',
			async (_, arrange, loads, streamed = loads) => {
				await expect(runCase(arrange, true, streamed)).resolves.toBeUndefined();
			}
		);
	});

	describe('before the write code has loaded', () => {
		let loaded: typeof pageWriterLoader.module;
		beforeEach(() => {
			loaded = pageWriterLoader.module;
			pageWriterLoader.module = undefined;
		});
		afterEach(() => {
			pageWriterLoader.module = loaded;
		});

		test.each(cases)('%s, from a resolved state', async (_, arrange, loads) => {
			await expect(runCase(arrange, false, loads)).resolves.toBeUndefined();
		});

		test.each(cases)(
			'%s, from a streamed state',
			async (_, arrange, loads, streamed = loads) => {
				await expect(runCase(arrange, true, streamed)).resolves.toBeUndefined();
			}
		);
	});
});

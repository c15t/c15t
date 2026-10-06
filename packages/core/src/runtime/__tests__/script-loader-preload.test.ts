import type { PolicyRule } from '@c15t/schema/types';
/**
 * @vitest-environment jsdom
 *
 * A provider runtime given `preloadScriptLoader` starts loading a lazy
 * script loader before `start()` when the visitor's consent already lets a
 * script run, judged on its own kernel with what `start()` would add: a
 * streamed prefetch, stored denials and the browser's Global Privacy
 * Control signal. Without that module it leaves the load to `start()`.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	choiceRecords,
	explicitChoice,
	matchedResolution,
	NOW,
	optInRule,
	optOutRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import type { Script } from '../../libs/script-loader/types';
import { encodeStoredConsentEnvelopeJson } from '../../modules/persistence/writer/encode';
import type { ScriptLoaderHandle } from '../../modules/script-loader/types';
import { custom } from '../../transports/mode';
import type { ConsentKernel } from '../../types';
import {
	createConsentProviderRuntime,
	defaultRuntimeModules,
	lazyRuntimeModule,
	streamPrefetch,
} from '../index';
import { preloadScriptLoaderWith } from '../script-loader-preload';
import type {
	ConsentProviderRuntime,
	ConsentProviderRuntimeOptions,
	RuntimePrefetch,
} from '../types';

const pixel: Script = {
	category: 'marketing',
	id: 'pixel',
	src: 'https://example.com/pixel.js',
};

const consentSource = {
	getPermissions: () => null,
	openPreferences: () => undefined,
	subscribe: () => () => undefined,
};

/** A prefetch under an opt-in policy, with the visitor's stored choice. */
const prefetchFor = function prefetchFor(
	values?: Parameters<typeof choiceRecords>[0],
	rule: Partial<PolicyRule> = {},
	extra: Partial<RuntimePrefetch> = {}
): RuntimePrefetch {
	const resolution = matchedResolution(optInRule(rule));
	return {
		initialPolicyResolution: resolution,
		initialRecords: values
			? choiceRecords(values, { fingerprint: resolution.fingerprints.choice })
			: undefined,
		now: NOW,
		...extra,
	};
};

const runtimes: ConsentProviderRuntime[] = [];

/**
 * A provider runtime whose script loader loads on demand. `load` counts
 * the requests for its module. `preload: false` leaves out the module that
 * loads it early.
 */
const create = function create(
	options: Partial<ConsentProviderRuntimeOptions> = {},
	{ preload = true }: { preload?: boolean } = {}
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
			persistence: false,
			scripts: [pixel],
			windowDebug: false,
			...options,
		},
		{
			...defaultRuntimeModules,
			createScriptLoader: lazyRuntimeModule(load),
			preloadScriptLoader: preload ? preloadScriptLoaderWith(load) : undefined,
			streamPrefetch,
		}
	);
	runtimes.push(runtime);
	return { load, runtime };
};

/** Let a streamed prefetch and the load it starts settle. */
const settle = async (): Promise<void> => {
	for (let turn = 0; turn < 5; turn += 1) {
		// oxlint-disable-next-line no-await-in-loop -- Sequential turns are the point.
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
	}
};

/** A marketing choice stored in localStorage only. */
const storeChoice = function storeChoice(
	marketing: boolean,
	confirmedAt: number
): void {
	const resolution = matchedResolution(optInRule());
	localStorage.setItem(
		'c15t',
		encodeStoredConsentEnvelopeJson({
			categories: explicitChoice(
				{ marketing },
				{ confirmedAt, fingerprint: resolution.fingerprints.choice }
			).categories,
			version: 3,
		})
	);
};

/** A denial stored in localStorage only, as a dropped cookie write leaves. */
const storeDenial = function storeDenial(confirmedAt: number): void {
	storeChoice(false, confirmedAt);
};

beforeEach(() => {
	vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
	localStorage.clear();
});

afterEach(() => {
	for (const runtime of runtimes.splice(0)) {
		runtime.dispose();
	}
	vi.useRealTimers();
	vi.restoreAllMocks();
	localStorage.clear();
	Reflect.deleteProperty(navigator, 'globalPrivacyControl');
});

describe('a provider runtime loads its script loader before start()', () => {
	test('when a resolved prefetch grants a script, during construction', () => {
		const { load } = create({ prefetch: prefetchFor({ marketing: true }) });
		expect(load).toHaveBeenCalledTimes(1);
	});

	test('when a streamed prefetch grants a script, once it arrives', async () => {
		let resolveStream: (value: RuntimePrefetch) => void = () => undefined;
		const { load } = create({
			prefetch: new Promise<RuntimePrefetch>((resolve) => {
				resolveStream = resolve;
			}),
		});
		await settle();
		expect(load).not.toHaveBeenCalled();
		resolveStream(prefetchFor({ marketing: true }));
		await settle();
		expect(load).toHaveBeenCalledTimes(1);
	});

	test('for an alwaysLoad script whose category the visitor denied', () => {
		const { load } = create({
			prefetch: prefetchFor({ marketing: false }),
			scripts: [{ ...pixel, alwaysLoad: true }],
		});
		expect(load).toHaveBeenCalledTimes(1);
	});

	test('for an alwaysLoad script while a consent source decides', () => {
		const { load } = create({
			consentSource,
			prefetch: prefetchFor({ marketing: true }),
			scripts: [pixel, { ...pixel, alwaysLoad: true, id: 'tag' }],
		});
		expect(load).toHaveBeenCalledTimes(1);
	});

	test('while disabled, despite a stored refusal and a consent source', async () => {
		const { load } = create({
			consentSource,
			enabled: false,
			persistence: true,
			prefetch: Promise.resolve(prefetchFor({ marketing: false })),
		});
		storeDenial(NOW - 1000);
		await settle();
		expect(load).toHaveBeenCalledTimes(1);
	});

	test('under an opt-out policy, for a visitor who has not chosen', () => {
		const resolution = matchedResolution(optOutRule());
		const { load } = create({
			prefetch: { initialPolicyResolution: resolution, now: NOW },
		});
		expect(load).toHaveBeenCalledTimes(1);
	});

	// No cookie reached the server, so the prefetch holds no records and
	// persistence hydrates the stored grant in `start()`.
	test('when localStorage holds a grant the prefetch did not read', () => {
		storeChoice(true, NOW - 1000);
		const { load } = create({ persistence: true, prefetch: prefetchFor() });
		expect(load).toHaveBeenCalledTimes(1);
	});

	test('start() then mounts the loader whose load is already under way', async () => {
		const { load, runtime } = create({
			prefetch: prefetchFor({ marketing: true }),
		});
		runtime.start();
		await settle();
		// The early load and the mount's own: one `import()` specifier.
		expect(load).toHaveBeenCalledTimes(2);
	});
});

describe('a provider runtime leaves its script loader to start()', () => {
	test.each([
		['resolved', (prefetch: RuntimePrefetch) => prefetch],
		['streamed', (prefetch: RuntimePrefetch) => Promise.resolve(prefetch)],
	] as const)(
		'without preloadScriptLoader, even when a %s prefetch grants a script',
		async (_, deliver) => {
			const { load } = create(
				{ prefetch: deliver(prefetchFor({ marketing: true })) },
				{ preload: false }
			);
			await settle();
			expect(load).not.toHaveBeenCalled();
		}
	);

	test('on a first visit', () => {
		const { load } = create({ prefetch: prefetchFor() });
		expect(load).not.toHaveBeenCalled();
	});

	test('when the stored choice denies every script', async () => {
		const { load } = create({
			prefetch: Promise.resolve(
				prefetchFor({ marketing: false, measurement: true })
			),
		});
		await settle();
		expect(load).not.toHaveBeenCalled();
	});

	// A permissive policy allows a category nothing on the page asks about.
	// The script asks about marketing, so the stored denial decides.
	test('when a permissive policy keeps a stored denial for a script category', () => {
		const { load } = create({
			prefetch: prefetchFor({ marketing: false }, { scopeMode: 'permissive' }),
		});
		expect(load).not.toHaveBeenCalled();
	});

	test.each([
		[
			'declared in code',
			{
				vendors: [
					{
						category: 'marketing',
						id: 'pixel-co',
						name: 'Pixel Co',
						privacyPolicyUrl: 'https://example.com/privacy',
					},
				],
			},
		],
		['named only by the script', {}],
	] as const)('when the visitor turned off a vendor %s', (_, options) => {
		const prefetch = prefetchFor({ marketing: true });
		const { load } = create({
			prefetch: {
				...prefetch,
				initialRecords: {
					...prefetch.initialRecords,
					vendorChoice: {
						confirmedAt: NOW - 1000,
						denied: ['pixel-co'],
						version: 1,
					},
				},
			},
			scripts: [{ ...pixel, vendor: 'pixel-co' }],
			vendors: 'vendors' in options ? [...options.vendors] : undefined,
		});
		expect(load).not.toHaveBeenCalled();
	});

	test('when the GPC signal the server read denies the grant', () => {
		const { load } = create({
			prefetch: prefetchFor(
				{ marketing: true },
				{ privacySignals: { gpc: { denyCategories: ['marketing'] } } },
				{ initialPrivacySignals: { gpc: true } }
			),
		});
		expect(load).not.toHaveBeenCalled();
	});

	test("when the browser's GPC signal denies the grant", () => {
		Object.defineProperty(navigator, 'globalPrivacyControl', {
			configurable: true,
			value: true,
		});
		const { load } = create({
			prefetch: prefetchFor(
				{ marketing: true },
				{ privacySignals: { gpc: { denyCategories: ['marketing'] } } }
			),
		});
		expect(load).not.toHaveBeenCalled();
	});

	// The cookie the server read holds a grant, but a later denial reached
	// only localStorage. Persistence applies it in `start()`.
	test.each([
		['resolved', (prefetch: RuntimePrefetch) => prefetch],
		['streamed', (prefetch: RuntimePrefetch) => Promise.resolve(prefetch)],
	] as const)(
		'when localStorage holds a denial newer than a %s grant',
		async (_, deliver) => {
			const resolution = matchedResolution(optInRule());
			storeDenial(NOW - 1000);
			const { load } = create({
				persistence: true,
				prefetch: deliver({
					initialPolicyResolution: resolution,
					initialRecords: choiceRecords(
						{ marketing: true },
						{
							confirmedAt: NOW - 60_000,
							fingerprint: resolution.fingerprints.choice,
						}
					),
					now: NOW,
				}),
			});
			await settle();
			expect(load).not.toHaveBeenCalled();
		}
	);

	test.each([
		['resolved', (prefetch: RuntimePrefetch) => prefetch],
		['streamed', (prefetch: RuntimePrefetch) => Promise.resolve(prefetch)],
	] as const)(
		'when a consent source decides over a %s grant',
		async (_, deliver) => {
			const { load } = create({
				consentSource,
				prefetch: deliver(prefetchFor({ marketing: true })),
			});
			await settle();
			expect(load).not.toHaveBeenCalled();
		}
	);

	test('when a streamed prefetch carries no policy', async () => {
		const { load } = create({
			prefetch: Promise.resolve({
				initialRecords: prefetchFor({ marketing: true }).initialRecords,
				now: NOW,
			}),
		});
		await settle();
		expect(load).not.toHaveBeenCalled();
	});

	test('when start() ran before a streamed prefetch arrived', async () => {
		let resolveStream: (value: RuntimePrefetch) => void = () => undefined;
		const { load, runtime } = create({
			prefetch: new Promise<RuntimePrefetch>((resolve) => {
				resolveStream = resolve;
			}),
		});
		runtime.start();
		resolveStream(prefetchFor({ marketing: true }));
		await settle();
		// Only the mount's own load.
		expect(load).toHaveBeenCalledTimes(1);
	});

	test('outside the browser', () => {
		vi.stubGlobal('document', undefined);
		try {
			const { load } = create({ prefetch: prefetchFor({ marketing: true }) });
			expect(load).not.toHaveBeenCalled();
		} finally {
			vi.unstubAllGlobals();
		}
	});
});

/** A GPC getter that throws, as some privacy extensions install. */
const throwingGpc = function throwingGpc(): void {
	Object.defineProperty(navigator, 'globalPrivacyControl', {
		configurable: true,
		get(): never {
			throw new Error('blocked');
		},
	});
};

describe('a throwing GPC getter', () => {
	test('reads as no signal, so a returning visitor still preloads', () => {
		throwingGpc();
		const { load } = create({ prefetch: prefetchFor({ marketing: true }) });
		expect(load).toHaveBeenCalledTimes(1);
	});
});

describe('the kernel the decision builds', () => {
	/**
	 * A provider runtime whose decision builds its kernels through a spy,
	 * so the test sees each one and whether it was disposed.
	 */
	const createWatched = function createWatched(
		options: Partial<ConsentProviderRuntimeOptions>,
		failPersistence = false
	) {
		const built: ConsentKernel[] = [];
		const disposals: ConsentKernel[] = [];
		const handle = { dispose: vi.fn() } as unknown as ScriptLoaderHandle;
		const load = vi.fn(() => Promise.resolve(() => handle));
		const preload = preloadScriptLoaderWith(load);
		runtimes.push(
			createConsentProviderRuntime(
				{
					iframeBlocker: false,
					mode: custom({
						init: vi.fn().mockResolvedValue({}),
						save: vi.fn().mockResolvedValue({ ok: true }),
					}),
					persistence: false,
					scripts: [pixel],
					windowDebug: false,
					...options,
				},
				{
					...defaultRuntimeModules,
					createScriptLoader: lazyRuntimeModule(load),
					preloadScriptLoader: (read, prefetch, createKernel, persistence) =>
						preload(
							read,
							prefetch,
							(kernelOptions) => {
								const kernel = createKernel(kernelOptions);
								const dispose = kernel.dispose.bind(kernel);
								kernel.dispose = () => {
									disposals.push(kernel);
									dispose();
								};
								built.push(kernel);
								return kernel;
							},
							failPersistence
								? () => {
										throw new Error('persistence failed');
									}
								: persistence
						),
					streamPrefetch,
				}
			)
		);
		return { built, disposals, load };
	};

	const cases: [string, () => void, boolean, boolean][] = [
		['when the decision completes', () => undefined, false, false],
		['when the GPC getter throws', throwingGpc, false, false],
		['when persistence throws', () => undefined, true, true],
	];
	test.each(cases)(
		'is disposed %s',
		(_, arrange, failPersistence, persistence) => {
			arrange();
			const { built, disposals } = createWatched(
				{ persistence, prefetch: prefetchFor({ marketing: true }) },
				failPersistence
			);
			expect(built).toHaveLength(1);
			expect(disposals).toEqual(built);
		}
	);
});

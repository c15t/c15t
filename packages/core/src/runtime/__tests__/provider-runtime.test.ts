/**
 * @vitest-environment jsdom
 *
 * `createConsentProviderRuntime`: what a framework provider needs on top of
 * the runtime. Live option updates, the `enabled` toggle and a streamed
 * prefetch, with the semantics React's provider has today.
 */
import { policyRulePresets, resolvePolicyRules } from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { choiceRecords, NOW } from '../../__tests__/fixtures/kernel-fixtures';
import { createNetworkBlocker } from '../../modules/network-blocker';
import type { NetworkHold } from '../../modules/network-blocker/hold';
import { custom } from '../../transports/mode';
import type { KernelTransport } from '../../types';
import {
	createConsentProviderRuntime,
	defaultRuntimeModules,
	lazyRuntimeModule,
	streamPrefetch,
} from '../index';
import type {
	ConsentProviderRuntime,
	ConsentProviderRuntimeOptions,
	ConsentRuntimeModules,
	RuntimePrefetch,
} from '../types';

const RESOLVED_PREFETCH: RuntimePrefetch = {
	initialPolicyResolution: resolvePolicyRules({
		countryCode: null,
		regionCode: null,
		rules: [
			{
				...policyRulePresets.europeOptIn(),
				categories: ['marketing', 'measurement'],
				id: 'policy_1',
				match: { fallback: true },
				scopeMode: 'strict',
			},
		],
	}),
};

const createTransport = function createTransport(
	overrides: Partial<KernelTransport> = {}
): KernelTransport & Required<Pick<KernelTransport, 'init' | 'save'>> {
	return {
		init: vi.fn().mockResolvedValue({}),
		save: vi.fn().mockResolvedValue({ ok: true }),
		...overrides,
	};
};

/** Module fakes that record what the runtime asks of them. */
const createFakeModules = function createFakeModules() {
	const calls: string[] = [];
	const loaders: { scripts: unknown[]; updates: unknown[][] }[] = [];
	const blockers: {
		disposed: boolean;
		enabled: unknown[];
		rules: unknown[];
	}[] = [];
	const iframes: { disableAutomaticBlocking?: boolean; disposed: boolean }[] =
		[];
	const modules: ConsentRuntimeModules = {
		...defaultRuntimeModules,
		createIframeBlocker(options) {
			const entry = {
				disableAutomaticBlocking: options.disableAutomaticBlocking,
				disposed: false,
			};
			iframes.push(entry);
			return {
				dispose: () => {
					entry.disposed = true;
				},
				processAllIframes: vi.fn(),
			};
		},
		createNetworkBlocker(options) {
			calls.push('network');
			const entry = { disposed: false, enabled: [], rules: [options.rules] };
			blockers.push(entry as never);
			return {
				dispose: () => {
					entry.disposed = true;
				},
				setEnabled: (value: boolean) => {
					(entry.enabled as unknown[]).push(value);
				},
				updateRules: (rules: unknown, hold?: NetworkHold) => {
					(entry.rules as unknown[]).push(rules);
					// As the real blocker does once it has the rules.
					hold?.release()();
				},
			};
		},
		createScriptLoader(options) {
			calls.push('scripts');
			const entry = { scripts: options.scripts, updates: [] as unknown[][] };
			loaders.push(entry);
			return {
				dispose: vi.fn(),
				getLoadedScriptIds: () => [],
				updateScripts: (next: unknown[]) => {
					entry.updates.push(next);
				},
			} as never;
		},
	};
	return { blockers, calls, iframes, loaders, modules };
};

const runtimes: ConsentProviderRuntime[] = [];
const create = function create(
	options: Partial<ConsentProviderRuntimeOptions> = {},
	modules: ConsentRuntimeModules = defaultRuntimeModules
) {
	const runtime = createConsentProviderRuntime(
		{ mode: custom(createTransport()), ...options },
		modules
	);
	runtimes.push(runtime);
	return runtime;
};

/** A spy in place of the network, under whatever the runtime patches. */
const stubNetwork = function stubNetwork() {
	const nativeFetch = window.fetch;
	const network = vi.fn(() => Promise.resolve(new Response('ok')));
	window.fetch = network as unknown as typeof window.fetch;
	return {
		network,
		restore: () => {
			window.fetch = nativeFetch;
		},
	};
};

beforeEach(() => {
	localStorage.clear();
	for (const pair of document.cookie.split(';')) {
		const name = pair.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; Max-Age=0; Path=/`;
		}
	}
});

afterEach(() => {
	for (const runtime of runtimes.splice(0)) {
		runtime.dispose();
	}
	vi.restoreAllMocks();
	delete (window as { c15t?: unknown }).c15t;
});

describe('update()', () => {
	test('requests new network rules match are held until the update has applied them', async () => {
		const nativeFetch = window.fetch;
		const network = vi.fn(() => Promise.resolve(new Response('ok')));
		window.fetch = network as unknown as typeof window.fetch;
		try {
			const fakes = createFakeModules();
			const first = [{ category: 'marketing', domain: 'first.example' }];
			const next = [{ category: 'marketing', domain: 'next.example' }];
			const options: ConsentProviderRuntimeOptions = {
				mode: custom(createTransport()),
				networkBlocker: { rules: first as never },
			};
			const runtime = create(options, fakes.modules);
			runtime.start();

			const applied = runtime.update({
				...options,
				networkBlocker: { rules: next as never },
			});
			const request = window.fetch('https://next.example/pixel');
			await Promise.resolve();
			// Sent before the blocker had the rule, it would have gone out.
			expect(network).not.toHaveBeenCalled();

			await applied;
			expect(fakes.blockers[0]?.rules).toEqual([first, next]);
			// Released through the updated blocker (a fake that sends it).
			await request;
			expect(network).toHaveBeenCalledWith(
				'https://next.example/pixel',
				undefined
			);
		} finally {
			window.fetch = nativeFetch;
		}
	});

	test('a blocker an update adds, whose chunk fails to load, answers matching requests as blocked', async () => {
		const nativeFetch = window.fetch;
		const network = vi.fn(() => Promise.resolve(new Response('ok')));
		window.fetch = network as unknown as typeof window.fetch;
		try {
			const options: ConsentProviderRuntimeOptions = {
				mode: custom(createTransport()),
				persistence: false,
				prefetch: RESOLVED_PREFETCH,
			};
			const runtime = create(options, {
				...defaultRuntimeModules,
				createNetworkBlocker: lazyRuntimeModule(() =>
					Promise.reject(new Error('chunk failed to load'))
				),
			});
			runtime.start();

			await runtime.update({
				...options,
				networkBlocker: {
					rules: [{ category: 'measurement', domain: 'tracker.example' }],
				},
			});
			const request = window.fetch('https://tracker.example/collect');
			let settled = false;
			void request.finally(() => {
				settled = true;
			});
			await vi.waitFor(() => {
				expect(settled).toBe(true);
			});

			expect((await request).status).toBe(451);
			expect(network).not.toHaveBeenCalled();
		} finally {
			window.fetch = nativeFetch;
		}
	});

	test('new rules for a blocker whose chunk failed to load answer matching requests as blocked', async () => {
		const { network, restore } = stubNetwork();
		const options: ConsentProviderRuntimeOptions = {
			mode: custom(createTransport()),
			networkBlocker: {
				rules: [{ category: 'measurement', domain: 'first.example' }],
			},
			persistence: false,
			prefetch: RESOLVED_PREFETCH,
		};
		const runtime = create(options, {
			...defaultRuntimeModules,
			createNetworkBlocker: lazyRuntimeModule(() =>
				Promise.reject(new Error('chunk failed to load'))
			),
		});
		try {
			runtime.start();

			await runtime.update({
				...options,
				networkBlocker: {
					rules: [{ category: 'measurement', domain: 'next.example' }],
				},
			});
			const request = window.fetch('https://next.example/collect');
			let settled = false;
			void request.finally(() => {
				settled = true;
			});
			// Nothing will take the hold over: it must not wait for one.
			await vi.waitFor(() => {
				expect(settled).toBe(true);
			});

			expect((await request).status).toBe(451);
			expect(network).not.toHaveBeenCalled();
		} finally {
			runtime.dispose();
			restore();
		}
	});

	test('`enabled` and overrides apply at once; the rest once the returned promise settles', async () => {
		const options: ConsentProviderRuntimeOptions = {
			consentCategories: ['marketing'],
			mode: custom(createTransport()),
		};
		const runtime = create(options);

		const applied = runtime.update({
			...options,
			consentCategories: ['measurement'],
			enabled: false,
			overrides: { country: 'FR' },
		});
		expect(runtime.enabled).toBe(false);
		// Configured categories decide what is granted: they apply now.
		expect(runtime.kernel.getSnapshot().consentCategories).toEqual([
			'measurement',
		]);
		await applied;
		await runtime.update({ ...options, overrides: { country: 'FR' } });

		expect(runtime.enabled).toBe(true);
		expect(runtime.kernel.getSnapshot().overrides.country).toBe('FR');
		expect(runtime.kernel.getSnapshot().consentCategories).toEqual([
			'marketing',
		]);
	});

	test('the options it was created with change nothing', async () => {
		const transport = createTransport();
		const options: ConsentProviderRuntimeOptions = {
			mode: custom(transport),
			overrides: { country: 'DE' },
			prefetch: RESOLVED_PREFETCH,
			user: { externalId: 'user_1' },
		};
		const runtime = create(options);
		runtime.start();

		// A component re-renders with new objects holding the same values.
		await runtime.update({
			...options,
			overrides: { country: 'DE' },
			user: { externalId: 'user_1' },
		});

		await Promise.resolve();
		expect(transport.init).not.toHaveBeenCalled();
		// Svelte identified the initial user again on mount; the kernel
		// already sends it with init.
		expect(transport.identify).toBeUndefined();
	});

	test('a new user is identified once', async () => {
		const identify = vi.fn().mockResolvedValue(undefined);
		const options: ConsentProviderRuntimeOptions = {
			mode: custom(createTransport({ identify })),
			prefetch: RESOLVED_PREFETCH,
		};
		const runtime = create(options);
		runtime.start();

		await runtime.update({ ...options, user: { id: 'user_2' } });
		await runtime.update({ ...options, user: { id: 'user_2' } });

		await vi.waitFor(() => expect(identify).toHaveBeenCalledOnce());
		expect(identify.mock.calls[0]?.[0]).toMatchObject({ externalId: 'user_2' });
	});

	test('new overrides are applied and init runs again, whatever the key order', async () => {
		const transport = createTransport();
		const options: ConsentProviderRuntimeOptions = {
			mode: custom(transport),
			overrides: { country: 'DE', region: 'BY' },
			prefetch: RESOLVED_PREFETCH,
		};
		const runtime = create(options);
		runtime.start();

		// oxlint-disable-next-line sort-keys -- The order is what this checks.
		const reordered = { region: 'BY', country: 'DE' };
		await runtime.update({ ...options, overrides: reordered });
		await Promise.resolve();
		expect(transport.init).not.toHaveBeenCalled();

		await runtime.update({ ...options, overrides: { country: 'FR' } });
		expect(runtime.kernel.getSnapshot().overrides.country).toBe('FR');
		await vi.waitFor(() => expect(transport.init).toHaveBeenCalledOnce());
	});

	test('overrides changed before start make start ask the backend instead of adopting the prefetch', async () => {
		// Vue's `ConsentRoot` props can change the overrides before mount.
		const transport = createTransport();
		const options: ConsentProviderRuntimeOptions = {
			mode: custom(transport),
			prefetch: RESOLVED_PREFETCH,
		};
		const runtime = create(options);

		await runtime.update({ ...options, overrides: { language: 'fr' } });
		expect(transport.init).not.toHaveBeenCalled();
		runtime.start();

		await vi.waitFor(() => expect(transport.init).toHaveBeenCalledOnce());
		expect(vi.mocked(transport.init).mock.calls[0]?.[0]).toMatchObject({
			overrides: { language: 'fr' },
		});
	});

	test('removing `consentCategories` drops the configured list', async () => {
		const options: ConsentProviderRuntimeOptions = {
			consentCategories: ['necessary', 'marketing'],
			mode: custom(createTransport()),
		};
		const runtime = create(options);
		expect(runtime.consentCategories).toEqual(['necessary', 'marketing']);

		await runtime.update({ ...options, consentCategories: undefined });

		// Svelte restored the snapshot's list from mount instead, which kept
		// the removed configuration.
		expect(runtime.consentCategories).toEqual(
			create({ mode: custom(createTransport()) }).consentCategories
		);
	});

	test('a vendor list replaced after mount replaces the declared vendors', async () => {
		const options: ConsentProviderRuntimeOptions = {
			mode: custom(createTransport()),
			vendors: [{ category: 'marketing', id: 'ads', name: 'Ads' }] as never,
		};
		const runtime = create(options);
		runtime.start();
		const ids = () =>
			(runtime.kernel.getSnapshot().vendors?.declared ?? []).map(
				(vendor) => vendor.id
			);
		expect(ids()).toEqual(['ads']);

		await runtime.update({
			...options,
			vendors: [
				{ category: 'measurement', id: 'stats', name: 'Stats' },
			] as never,
		});

		expect(ids()).toEqual(['stats']);
		expect(runtime.kernel.getSnapshot().consentCategories).toContain(
			'measurement'
		);
	});

	test('new scripts go to the mounted loader; scripts that appear after start mount one', async () => {
		const fakes = createFakeModules();
		const first = [{ callbackOnly: true, category: 'measurement', id: 'a' }];
		const options: ConsentProviderRuntimeOptions = {
			mode: custom(createTransport()),
			scripts: first as never,
		};
		const runtime = create(options, fakes.modules);
		runtime.start();
		const next = [{ callbackOnly: true, category: 'marketing', id: 'b' }];

		await runtime.update({ ...options, scripts: next as never });
		expect(fakes.loaders).toHaveLength(1);
		expect(fakes.loaders[0]?.updates).toEqual([next]);

		const late = create({ mode: custom(createTransport()) }, fakes.modules);
		late.start();
		expect(fakes.loaders).toHaveLength(1);
		await late.update({
			mode: custom(createTransport()),
			scripts: next as never,
		});
		expect(fakes.loaders).toHaveLength(2);
		expect(fakes.loaders[1]?.scripts).toEqual(next);
	});

	test('network blocker rules and `enabled` follow the options; removing it unmounts it, adding it mounts one', async () => {
		const fakes = createFakeModules();
		const rules = [{ category: 'marketing', domain: 'ads.example' }];
		const options: ConsentProviderRuntimeOptions = {
			mode: custom(createTransport()),
			networkBlocker: { rules } as never,
		};
		const runtime = create(options, fakes.modules);
		runtime.start();
		const nextRules = [{ category: 'measurement', domain: 'stats.example' }];

		await runtime.update({
			...options,
			networkBlocker: { rules: nextRules } as never,
		});
		await runtime.update({
			...options,
			networkBlocker: { enabled: false, rules: nextRules } as never,
		});
		expect(fakes.blockers[0]?.rules).toEqual([rules, nextRules]);
		expect(fakes.blockers[0]?.enabled).toEqual([false]);

		await runtime.update({ ...options, networkBlocker: false });
		expect(fakes.blockers[0]?.disposed).toBe(true);

		await runtime.update({ ...options, networkBlocker: { rules } as never });
		expect(fakes.blockers).toHaveLength(2);
		runtime.dispose();
		expect(fakes.blockers[1]?.disposed).toBe(true);
	});

	test('a network blocker whose `enabled: false` is dropped turns on', async () => {
		const { network, restore } = stubNetwork();
		const rules = [{ category: 'marketing', domain: 'ads.example' }];
		const options: ConsentProviderRuntimeOptions = {
			mode: custom(createTransport()),
			networkBlocker: { enabled: false, rules } as never,
			prefetch: RESOLVED_PREFETCH,
		};
		const runtime = create(options, {
			...defaultRuntimeModules,
			createNetworkBlocker,
		});
		try {
			runtime.start();

			// `{ rules }` alone means on: `enabled` defaults to true.
			await runtime.update({ ...options, networkBlocker: { rules } as never });

			const response = await window.fetch('https://ads.example/pixel');
			expect(response.status).toBe(451);
			expect(network).not.toHaveBeenCalled();
		} finally {
			runtime.dispose();
			restore();
		}
	});

	test('requests new rules match wait for a lazy blocker that has not landed', async () => {
		const { network, restore } = stubNetwork();
		const blockerChunk = Promise.withResolvers<typeof createNetworkBlocker>();
		const options: ConsentProviderRuntimeOptions = {
			mode: custom(createTransport()),
			networkBlocker: {
				rules: [{ category: 'marketing', domain: 'first.example' }],
			},
			prefetch: RESOLVED_PREFETCH,
		};
		const runtime = create(options, {
			...defaultRuntimeModules,
			createNetworkBlocker: lazyRuntimeModule(() => blockerChunk.promise),
		});
		try {
			runtime.start();

			await runtime.update({
				...options,
				networkBlocker: {
					rules: [{ category: 'marketing', domain: 'next.example' }],
				},
			});
			const request = window.fetch('https://next.example/pixel');
			await new Promise((resolve) => {
				setTimeout(resolve, 0);
			});
			// The blocker gets the rule when its chunk lands; until then the
			// request waits rather than leave unchecked.
			expect(network).not.toHaveBeenCalled();

			blockerChunk.resolve(createNetworkBlocker);
			expect((await request).status).toBe(451);
			expect(network).not.toHaveBeenCalled();
		} finally {
			runtime.dispose();
			restore();
		}
	});

	test('the iframe blocker is rebuilt when `disableAutomaticBlocking` changes and removed by `false`', async () => {
		const fakes = createFakeModules();
		const options: ConsentProviderRuntimeOptions = {
			mode: custom(createTransport()),
		};
		const runtime = create(options, fakes.modules);
		runtime.start();

		await runtime.update({
			...options,
			iframeBlocker: { disableAutomaticBlocking: true },
		});
		expect(fakes.iframes.map((entry) => entry.disposed)).toEqual([true, false]);
		expect(fakes.iframes[1]?.disableAutomaticBlocking).toBe(true);

		await runtime.update({ ...options, iframeBlocker: false });
		expect(fakes.iframes[1]?.disposed).toBe(true);
	});

	test('callbacks come from the latest options', async () => {
		const first = vi.fn();
		const second = vi.fn();
		const options: ConsentProviderRuntimeOptions = {
			callbacks: { onChoiceRecorded: first },
			mode: custom(createTransport()),
			persistence: false,
			prefetch: RESOLVED_PREFETCH,
		};
		const runtime = create(options);
		runtime.start();

		await runtime.update({
			...options,
			callbacks: { onChoiceRecorded: second },
		});
		await runtime.kernel.commands.save('all');

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledOnce();
	});

	test('a changed `mode`, `i18n` or `experiment` warns outside production', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
			// Asserted below.
		});
		const options: ConsentProviderRuntimeOptions = {
			mode: custom(createTransport()),
		};
		const runtime = create(options);

		await runtime.update({ ...options, i18n: { locale: 'de' } });

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('read once'));
	});

	test('storage is read once: a new storage key warns and records stay under the first', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
			// Asserted below.
		});
		const transport = createTransport();
		const options: ConsentProviderRuntimeOptions = {
			mode: custom(transport),
			prefetch: RESOLVED_PREFETCH,
			storageConfig: { storageKey: 'first-key' },
		};
		const runtime = create(options);
		runtime.start();

		// An equal storage config in a new object is not a change.
		await runtime.update({
			...options,
			storageConfig: { storageKey: 'first-key' },
		});
		expect(warn).not.toHaveBeenCalled();

		await runtime.update({
			...options,
			storageConfig: { storageKey: 'next-key' },
		});
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('read once'));

		await runtime.kernel.commands.save('all');
		await vi.waitFor(() =>
			expect(localStorage.getItem('first-key')).not.toBeNull()
		);
		expect(localStorage.getItem('next-key')).toBeNull();
	});
});

describe('the enabled toggle', () => {
	test('off swaps in a permissive kernel and keeps the records; on brings them back', async () => {
		const options: ConsentProviderRuntimeOptions = {
			mode: custom(createTransport()),
			persistence: false,
			prefetch: RESOLVED_PREFETCH,
		};
		const runtime = create(options);
		runtime.start();
		await runtime.kernel.commands.save('none');
		const enabledKernel = runtime.kernel;
		const changed = vi.fn();
		runtime.subscribe(changed);

		await runtime.update({ ...options, enabled: false });

		expect(runtime.enabled).toBe(false);
		expect(runtime.kernel).not.toBe(enabledKernel);
		expect(runtime.kernel.getSnapshot().effectivePermissions.marketing).toBe(
			true
		);
		expect(runtime.kernel.getSnapshot().activeUI).toBe('none');
		expect(changed).toHaveBeenCalledOnce();

		runtime.setEnabled(true);

		expect(runtime.kernel).toBe(enabledKernel);
		expect(runtime.kernel.getSnapshot().explicitChoice).not.toBeNull();
		expect(runtime.kernel.getSnapshot().effectivePermissions.marketing).toBe(
			false
		);
		expect(changed).toHaveBeenCalledTimes(2);
	});

	test('while off only the script loader runs, on the permissive kernel', () => {
		const fakes = createFakeModules();
		const runtime = create(
			{
				mode: custom(createTransport()),
				networkBlocker: { rules: [] },
				prefetch: RESOLVED_PREFETCH,
				scripts: [
					{ callbackOnly: true, category: 'marketing', id: 'a' },
				] as never,
			},
			fakes.modules
		);
		runtime.start();
		expect(fakes.calls).toEqual(['scripts', 'network']);

		runtime.setEnabled(false);

		expect(fakes.blockers[0]?.disposed).toBe(true);
		expect(fakes.iframes[0]?.disposed).toBe(true);
		expect(fakes.calls).toEqual(['scripts', 'network', 'scripts']);

		runtime.setEnabled(true);
		expect(fakes.calls).toEqual([
			'scripts',
			'network',
			'scripts',
			'scripts',
			'network',
		]);
	});

	test('turning it back on adopts the prefetch again without asking the backend', async () => {
		const transport = createTransport();
		const runtime = create({
			mode: custom(transport),
			prefetch: RESOLVED_PREFETCH,
		});
		runtime.start();
		runtime.setEnabled(false);
		runtime.setEnabled(true);

		await Promise.resolve();
		expect(transport.init).not.toHaveBeenCalled();
		expect(runtime.kernel.getSnapshot().policyRule.id).toBe('policy_1');
	});

	test('a runtime created disabled asks the backend when it is enabled', async () => {
		const transport = createTransport();
		const runtime = create({ enabled: false, mode: custom(transport) });
		runtime.start();
		expect(runtime.kernel.getSnapshot().effectivePermissions.marketing).toBe(
			true
		);
		expect(transport.init).not.toHaveBeenCalled();

		runtime.setEnabled(true);

		await vi.waitFor(() => expect(transport.init).toHaveBeenCalledOnce());
	});

	test('`setLanguage()` while off asks the backend for that language once it is on', async () => {
		const transport = createTransport();
		const runtime = create({
			mode: custom(transport),
			prefetch: RESOLVED_PREFETCH,
		});
		runtime.start();
		runtime.setEnabled(false);

		runtime.setLanguage('de');

		await Promise.resolve();
		expect(transport.init).not.toHaveBeenCalled();
		runtime.setEnabled(true);
		expect(runtime.kernel.getSnapshot().overrides.language).toBe('de');
		// The prefetch holds copy for the old language.
		await vi.waitFor(() => expect(transport.init).toHaveBeenCalledOnce());
		expect(vi.mocked(transport.init).mock.calls[0]?.[0]).toMatchObject({
			overrides: { language: 'de' },
		});
	});

	test('overrides changed while off are asked for once it is on', async () => {
		const transport = createTransport();
		const options: ConsentProviderRuntimeOptions = {
			mode: custom(transport),
			prefetch: RESOLVED_PREFETCH,
		};
		const runtime = create(options);
		runtime.start();
		runtime.setEnabled(false);

		runtime.update({
			...options,
			enabled: false,
			overrides: { country: 'FR' },
		});
		await Promise.resolve();
		expect(transport.init).not.toHaveBeenCalled();

		runtime.setEnabled(true);
		// The prefetch answered for the old country.
		await vi.waitFor(() => expect(transport.init).toHaveBeenCalledOnce());
		expect(vi.mocked(transport.init).mock.calls[0]?.[0]).toMatchObject({
			overrides: { country: 'FR' },
		});
	});

	test('a provider created off sends what its network rules match, and holds it again once on until the blocker lands', async () => {
		const { network, restore } = stubNetwork();
		const blockerChunk = Promise.withResolvers<typeof createNetworkBlocker>();
		const runtime = create(
			{
				enabled: false,
				mode: custom(createTransport()),
				networkBlocker: {
					rules: [{ category: 'marketing', domain: 'ads.example' }],
				},
				prefetch: RESOLVED_PREFETCH,
			},
			{
				...defaultRuntimeModules,
				createNetworkBlocker: lazyRuntimeModule(() => blockerChunk.promise),
			}
		);
		try {
			runtime.start();

			// Off grants every category: nothing waits for a blocker.
			const sent = window.fetch('https://ads.example/pixel');
			await vi.waitFor(() => expect(network).toHaveBeenCalledOnce());
			await sent;

			runtime.setEnabled(true);
			const held = window.fetch('https://ads.example/pixel');
			await Promise.resolve();
			expect(network).toHaveBeenCalledOnce();

			blockerChunk.resolve(createNetworkBlocker);
			expect((await held).status).toBe(451);
			expect(network).toHaveBeenCalledOnce();
		} finally {
			runtime.dispose();
			restore();
		}
	});
});

describe('a streamed prefetch', () => {
	const streaming = { ...defaultRuntimeModules, streamPrefetch };

	test('answers the first init in place of the network request', async () => {
		const transport = createTransport();
		const stream = Promise.withResolvers<RuntimePrefetch>();
		const runtime = create(
			{
				mode: custom(transport),
				prefetch: stream.promise,
			},
			streaming
		);
		runtime.start();
		// Until it arrives no consent surface shows.
		expect(runtime.kernel.getSnapshot().policyPending).toBe(true);
		expect(runtime.kernel.getSnapshot().activeUI).toBe('none');

		stream.resolve(RESOLVED_PREFETCH);

		await vi.waitFor(() =>
			expect(runtime.kernel.getSnapshot().activeUI).toBe('banner')
		);
		expect(runtime.kernel.getSnapshot().policyRule.id).toBe('policy_1');
		expect(transport.init).not.toHaveBeenCalled();
	});

	test('a config with a policy keeps its records, and runtime overrides win over its overrides', async () => {
		const transport = createTransport();
		const runtime = create(
			{
				mode: custom(transport),
				overrides: { country: 'US' },
				persistence: false,
				prefetch: Promise.resolve({
					...RESOLVED_PREFETCH,
					initialOverrides: { country: 'DE' },
					initialRecords: { subject: { subjectId: 'sub_server' } },
				}),
			},
			streaming
		);
		runtime.start();

		await vi.waitFor(() =>
			expect(runtime.kernel.getSnapshot().policyPending).toBe(false)
		);
		expect(runtime.kernel.getSnapshot().subject?.subjectId).toBe('sub_server');
		expect(runtime.kernel.getSnapshot().overrides.country).toBe('US');
		expect(transport.init).not.toHaveBeenCalled();
	});

	test('a config without a policy is a baseline: its records apply and the transport init runs with its overrides', async () => {
		const transport = createTransport();
		const runtime = create(
			{
				mode: custom(transport),
				prefetch: Promise.resolve({
					initialOverrides: { country: 'DE' },
					initialRecords: choiceRecords({ marketing: true }),
					now: NOW,
				}),
			},
			streaming
		);
		runtime.start();

		await vi.waitFor(() => expect(transport.init).toHaveBeenCalledOnce());
		expect(vi.mocked(transport.init).mock.calls[0]?.[0]).toMatchObject({
			overrides: { country: 'DE' },
		});
		expect(runtime.kernel.getSnapshot().explicitChoice).not.toBeNull();
	});

	test('a rejected prefetch falls through to the transport init', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {
			// Logged outside production.
		});
		const transport = createTransport();
		const runtime = create(
			{
				mode: custom(transport),
				prefetch: Promise.reject(new Error('stream failed')),
			},
			streaming
		);
		runtime.start();

		await vi.waitFor(() => expect(transport.init).toHaveBeenCalledOnce());
	});

	test('records cleared while it streams are not brought back', async () => {
		const transport = createTransport();
		const stream = Promise.withResolvers<RuntimePrefetch>();
		const runtime = create(
			{
				mode: custom(transport),
				persistence: false,
				prefetch: stream.promise,
			},
			streaming
		);
		runtime.start();
		runtime.clearRecords();

		stream.resolve({
			initialRecords: choiceRecords({ marketing: true }),
			now: NOW,
		});

		await vi.waitFor(() => expect(transport.init).toHaveBeenCalledOnce());
		expect(runtime.kernel.getSnapshot().explicitChoice).toBeNull();
	});

	test('without `streamPrefetch` a pending prefetch is ignored and the runtime asks itself', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {
			// Warned outside production.
		});
		const transport = createTransport();
		const runtime = create({
			mode: custom(transport),
			prefetch: Promise.resolve(RESOLVED_PREFETCH),
		});
		runtime.start();

		await vi.waitFor(() => expect(transport.init).toHaveBeenCalledOnce());
	});
});

describe('a streamed prefetch a host renders from', () => {
	const streaming = { ...defaultRuntimeModules, streamPrefetch };
	/** A stream still pending when the test ends. */
	const never = () =>
		new Promise<RuntimePrefetch>(() => {
			// Never settles.
		});

	/** Counts `init:applied` from construction on. */
	const countApplied = (runtime: ConsentProviderRuntime) => {
		const count = { applied: 0 };
		runtime.kernel.events.on('init:applied', () => {
			count.applied += 1;
		});
		return count;
	};

	test('renders a policy that shows the banner, and the kernel snapshot for anything else', () => {
		const runtime = create({ prefetch: never() }, streaming);
		const { streamed } = runtime;
		if (!streamed) {
			throw new Error('expected a streamed prefetch');
		}

		const snapshot = streamed.snapshotFor(RESOLVED_PREFETCH);
		expect(snapshot.activeUI).toBe('banner');
		expect(snapshot.policyRule.id).toBe('policy_1');
		expect(streamed.snapshotFor(RESOLVED_PREFETCH)).toBe(snapshot);

		const provisional = runtime.kernel.getServerSnapshot();
		expect(streamed.snapshotFor(undefined)).toBe(provisional);
		expect(streamed.snapshotFor({ now: NOW })).toBe(provisional);
		expect(
			streamed.snapshotFor({
				...RESOLVED_PREFETCH,
				experiment: { arm: 'bar', id: 'banner-shape' },
			})
		).toBe(provisional);
	});

	test('is offered only for a promise the runtime streams', () => {
		const pending = never();
		expect(create({ prefetch: RESOLVED_PREFETCH }, streaming).streamed).toBe(
			undefined
		);
		expect(create({ prefetch: pending }).streamed).toBe(undefined);
		expect(
			create({ enabled: false, prefetch: pending }, streaming).streamed
		).toBe(undefined);
		expect(create({ prefetch: pending }, streaming).streamed).toBeDefined();
	});

	test('settles with undefined when the promise rejects, and records its result', async () => {
		const rejected = Promise.reject(new Error('stream failed'));
		rejected.catch(() => undefined);
		const runtime = create({ prefetch: rejected }, streaming);
		await expect(runtime.streamed?.settled).resolves.toBeUndefined();

		const resolved = create(
			{ prefetch: Promise.resolve(RESOLVED_PREFETCH) },
			streaming
		);
		await resolved.streamed?.settled;
		expect(resolved.streamed?.settled).toMatchObject({
			status: 'fulfilled',
			value: RESOLVED_PREFETCH,
		});
	});

	test('adopted before start, the kernel holds the policy at once and start asks no one', async () => {
		const transport = createTransport();
		const runtime = create(
			{
				mode: custom(transport),
				persistence: false,
				prefetch: never(),
			},
			streaming
		);
		const count = countApplied(runtime);

		runtime.streamed?.adopt(RESOLVED_PREFETCH);
		expect(runtime.kernel.getSnapshot().activeUI).toBe('banner');
		expect(runtime.kernel.getSnapshot().policyRule.id).toBe('policy_1');

		runtime.start();
		await Promise.resolve();
		expect(transport.init).not.toHaveBeenCalled();
		// `start()` replays the event the applied answer would have raised.
		expect(count.applied).toBe(1);
	});

	test('adopted after start, the streamed init still in flight applies nothing', async () => {
		const transport = createTransport();
		const stream = Promise.withResolvers<RuntimePrefetch>();
		const runtime = create(
			{
				mode: custom(transport),
				persistence: false,
				prefetch: stream.promise,
			},
			streaming
		);
		const count = countApplied(runtime);
		const errors = vi.fn();
		runtime.kernel.events.on('command:error', errors);
		runtime.start();

		runtime.streamed?.adopt(RESOLVED_PREFETCH);
		expect(runtime.kernel.getSnapshot().activeUI).toBe('banner');
		expect(count.applied).toBe(1);

		stream.resolve(RESOLVED_PREFETCH);
		await runtime.streamed?.settled;
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
		expect(count.applied).toBe(1);
		expect(errors).not.toHaveBeenCalled();
		expect(transport.init).not.toHaveBeenCalled();
	});

	test('adopts once, and never over an init that already applied', async () => {
		const transport = createTransport();
		const runtime = create(
			{
				mode: custom(transport),
				persistence: false,
				prefetch: Promise.resolve(RESOLVED_PREFETCH),
			},
			streaming
		);
		const count = countApplied(runtime);
		runtime.start();
		await vi.waitFor(() => expect(count.applied).toBe(1));

		runtime.streamed?.adopt(RESOLVED_PREFETCH);
		runtime.streamed?.adopt(RESOLVED_PREFETCH);
		expect(count.applied).toBe(1);
	});

	test('does not adopt a config it would not render from', () => {
		const runtime = create(
			{
				persistence: false,
				prefetch: never(),
			},
			streaming
		);
		runtime.streamed?.adopt({ now: NOW });
		runtime.streamed?.adopt(undefined);
		expect(runtime.kernel.getSnapshot().policyPending).toBe(true);
	});

	test('records cleared after start are not brought back by an adopted config', () => {
		const runtime = create(
			{
				persistence: false,
				prefetch: never(),
			},
			streaming
		);
		runtime.start();
		runtime.clearRecords();

		runtime.streamed?.adopt({
			...RESOLVED_PREFETCH,
			initialRecords: { subject: { subjectId: 'sub_server' } },
		});
		expect(runtime.kernel.getSnapshot().policyPending).toBe(false);
		expect(runtime.kernel.getSnapshot().subject?.subjectId).not.toBe(
			'sub_server'
		);
	});

	test('an adopted config brings its records when nothing cleared them', () => {
		const runtime = create(
			{
				persistence: false,
				prefetch: never(),
			},
			streaming
		);
		runtime.streamed?.adopt({
			...RESOLVED_PREFETCH,
			initialRecords: { subject: { subjectId: 'sub_server' } },
		});
		expect(runtime.kernel.getSnapshot().subject?.subjectId).toBe('sub_server');
	});

	test("runtime overrides win over the adopted config's", () => {
		const runtime = create(
			{
				overrides: { country: 'US' },
				persistence: false,
				prefetch: never(),
			},
			streaming
		);
		runtime.streamed?.adopt({
			...RESOLVED_PREFETCH,
			initialOverrides: { country: 'DE' },
		});
		expect(runtime.kernel.getSnapshot().overrides.country).toBe('US');
	});
});

describe('lazyRuntimeModule', () => {
	test('data clearing waits for a lazy script loader, so revocation callbacks run before data is removed', async () => {
		const loaderGate = Promise.withResolvers<undefined>();
		const runtime = create(
			{
				clearOnRevocation: { measurement: { localStorage: ['visitor'] } },
				persistence: false,
				prefetch: RESOLVED_PREFETCH,
				scripts: [
					{
						callbackOnly: true,
						category: 'measurement',
						id: 'analytics',
						onConsentChange: ({ hasConsent }) => {
							if (!hasConsent) {
								localStorage.setItem('visitor', 'written during shutdown');
							}
						},
					},
				],
			},
			{
				...defaultRuntimeModules,
				createClearOnRevocation: lazyRuntimeModule(async () => {
					const module = await import('../../modules/clear-on-revocation');
					return module.createClearOnRevocation;
				}),
				// The loader's chunk lands after data clearing's.
				createScriptLoader: lazyRuntimeModule(async () => {
					await loaderGate.promise;
					const module = await import('../../modules/script-loader');
					return module.createScriptLoader;
				}),
			}
		);
		runtime.start();
		await vi.dynamicImportSettled();
		loaderGate.resolve(undefined);
		await loaderGate.promise;
		// The loader's chunk, then data clearing's, which waits for it.
		await vi.dynamicImportSettled();
		await vi.dynamicImportSettled();

		await runtime.kernel.commands.save('all');
		await runtime.kernel.commands.save('none');

		expect(localStorage.getItem('visitor')).toBeNull();
	});

	test('queues calls until the module lands, then replays them in order', async () => {
		const calls: string[] = [];
		const loaded = Promise.withResolvers<
			(options: { id: string }) => {
				dispose: () => void;
				update: (value: number) => void;
			}
		>();
		const createHandle = lazyRuntimeModule(() => loaded.promise);
		const handle = createHandle({ id: 'a' });

		handle.update(1);
		handle.update(2);
		expect(calls).toEqual([]);

		loaded.resolve((options) => {
			calls.push(`create:${options.id}`);
			return {
				dispose: () => calls.push('dispose'),
				update: (value) => calls.push(`update:${value}`),
			};
		});
		await vi.waitFor(() => expect(calls).toHaveLength(3));
		expect(calls).toEqual(['create:a', 'update:1', 'update:2']);

		handle.update(3);
		handle.dispose();
		expect(calls).toEqual([
			'create:a',
			'update:1',
			'update:2',
			'update:3',
			'dispose',
		]);
	});

	test('disposing before the module lands never creates it', async () => {
		const factory = vi.fn();
		const loaded = Promise.withResolvers<typeof factory>();
		const handle = lazyRuntimeModule(() => loaded.promise)({});
		handle.dispose();

		loaded.resolve(factory);
		await loaded.promise;
		await Promise.resolve();
		expect(factory).not.toHaveBeenCalled();
	});

	test('a module that fails to load leaves the handle inert', async () => {
		const handle = lazyRuntimeModule<
			object,
			{ dispose: () => void; update: () => void }
		>(() => Promise.reject(new Error('chunk failed')))({});

		await Promise.resolve();
		expect(() => {
			handle.update();
			handle.dispose();
		}).not.toThrow();
	});

	test('a module that fails to load says why outside production', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const error = new Error('chunk failed');
		lazyRuntimeModule<object, { dispose: () => void }>(() =>
			Promise.reject(error)
		)({});

		await vi.waitFor(() =>
			expect(warn).toHaveBeenCalledWith(
				'c15t: a runtime module failed to load and stays inactive.',
				error
			)
		);
	});

	test('a provider runtime can load its modules on demand', async () => {
		const loader = vi.fn(defaultRuntimeModules.createScriptLoader);
		const runtime = create(
			{
				mode: custom(createTransport()),
				prefetch: RESOLVED_PREFETCH,
				scripts: [
					{ callbackOnly: true, category: 'necessary', id: 'a' },
				] as never,
			},
			{
				...defaultRuntimeModules,
				createScriptLoader: lazyRuntimeModule(() => Promise.resolve(loader)),
			}
		);
		runtime.start();
		expect(loader).not.toHaveBeenCalled();

		await vi.waitFor(() => expect(loader).toHaveBeenCalledOnce());
	});
});

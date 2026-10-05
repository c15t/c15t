/**
 * @vitest-environment jsdom
 *
 * `onDemandRuntimeModules`: the script loader, network blocker, data
 * clearing and `consentSource` connection a provider loads only when the
 * page configures them, in chunks that import nothing from the first-load
 * graph. The loader and the blocker share one chunk.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolvePolicyRules } from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createIframeBlocker } from '../../modules/iframe-blocker';
import { createPersistence } from '../../modules/persistence';
import { watchRevocationReload } from '../../modules/revocation-reload';
import { createWindowDebug } from '../../modules/window-debug';
import { custom } from '../../transports/mode';
import { onDemandRuntimeModules } from '../on-demand';
import { createConsentProviderRuntime } from '../provider-runtime';
import { createConsentRuntimeWith } from '../runtime-with-modules';
import type {
	ConsentProviderRuntime,
	ConsentProviderRuntimeOptions,
} from '../types';

const RESOLVED_PREFETCH = {
	initialPolicyResolution: resolvePolicyRules({
		countryCode: null,
		regionCode: null,
		rules: [
			{
				id: 'policy_1',
				match: { fallback: true },
				model: 'opt-in',
				prompt: 'choice',
			},
		],
	}),
};

const runtimes: { dispose: () => void }[] = [];

const create = function create(
	options: Partial<ConsentProviderRuntimeOptions>
): ConsentProviderRuntime {
	const runtime = createConsentProviderRuntime(
		{
			mode: custom({
				init: vi.fn().mockResolvedValue({}),
				save: vi.fn().mockResolvedValue({ ok: true }),
			}),
			persistence: false,
			prefetch: RESOLVED_PREFETCH,
			...options,
		},
		{
			...onDemandRuntimeModules,
			createIframeBlocker,
			createPersistence,
			createWindowDebug,
			watchRevocationReload,
		}
	);
	runtimes.push(runtime);
	return runtime;
};

beforeEach(() => {
	localStorage.clear();
});

afterEach(() => {
	for (const runtime of runtimes.splice(0)) {
		runtime.dispose();
	}
	vi.restoreAllMocks();
	delete (window as { c15t?: unknown }).c15t;
});

describe('onDemandRuntimeModules', () => {
	test('a consented script mounts once the loader has landed, and unmounts on revocation', async () => {
		const onBeforeLoad = vi.fn();
		const onConsentChange = vi.fn();
		const runtime = create({
			scripts: [
				{
					callbackOnly: true,
					category: 'measurement',
					id: 'analytics',
					onBeforeLoad,
					onConsentChange,
				},
			],
		});
		runtime.start();
		await vi.dynamicImportSettled();
		expect(onBeforeLoad).not.toHaveBeenCalled();

		await runtime.kernel.commands.save('all');
		expect(onBeforeLoad).toHaveBeenCalledOnce();
		await runtime.kernel.commands.save('none');
		expect(onConsentChange).toHaveBeenLastCalledWith(
			expect.objectContaining({ hasConsent: false, id: 'analytics' })
		);
	});

	test('the network blocker decides requests held before it landed', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const nativeFetch = window.fetch;
		const original = vi.fn().mockResolvedValue(new Response('ok'));
		window.fetch = original as unknown as typeof window.fetch;
		try {
			const runtime = create({
				networkBlocker: {
					rules: [{ category: 'measurement', domain: 'tracker.example' }],
				},
			});
			const early = window.fetch('https://tracker.example/collect');
			runtime.start();
			await vi.dynamicImportSettled();

			expect((await early).status).toBe(451);
			expect(original).not.toHaveBeenCalled();
		} finally {
			window.fetch = nativeFetch;
		}
	});

	test('data clearing removes a denied category’s storage once it has landed', async () => {
		localStorage.setItem('analytics:visitor', 'visitor');
		const runtime = create({
			clearOnRevocation: { measurement: { localStorage: ['analytics:*'] } },
		});
		runtime.start();
		await vi.dynamicImportSettled();
		await runtime.kernel.commands.save('none');

		expect(localStorage.getItem('analytics:visitor')).toBeNull();
	});

	test('a consentSource connects once its module has landed', async () => {
		const runtime = create({
			consentSource: {
				getPermissions: () => ({ measurement: true }),
				openPreferences: () => undefined,
				subscribe: () => () => undefined,
			},
		});
		runtime.start();
		await vi.dynamicImportSettled();

		expect(runtime.kernel.getSnapshot().effectivePermissions.measurement).toBe(
			true
		);
	});
});

test('each on-demand factory is exported on its own, outside the provider entry', async () => {
	const factories = await import('../on-demand-factories');
	const provider = await import('../provider');
	expect(onDemandRuntimeModules.connectConsentSource).toBe(
		factories.connectConsentSourceOnDemand
	);
	expect(onDemandRuntimeModules.createClearOnRevocation).toBe(
		factories.clearOnRevocationOnDemand
	);
	expect(Object.keys(factories).sort()).toEqual([
		'clearOnRevocationOnDemand',
		'connectConsentSourceOnDemand',
		'networkBlockerOnDemand',
		'scriptLoaderOnDemand',
	]);
	expect(provider).not.toHaveProperty('scriptLoaderOnDemand');
	expect(provider).not.toHaveProperty('networkBlockerOnDemand');
});

describe('createConsentRuntimeWith', () => {
	test('the single-module loader and blocker factories mount their module', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const nativeFetch = window.fetch;
		const original = vi.fn().mockResolvedValue(new Response('ok'));
		window.fetch = original as unknown as typeof window.fetch;
		try {
			const onBeforeLoad = vi.fn();
			const factories = await import('../on-demand-factories');
			const runtime = createConsentRuntimeWith(
				{
					mode: custom({
						init: vi.fn().mockResolvedValue({}),
						save: vi.fn().mockResolvedValue({ ok: true }),
					}),
					networkBlocker: {
						rules: [{ category: 'measurement', domain: 'tracker.example' }],
					},
					persistence: false,
					prefetch: RESOLVED_PREFETCH,
					scripts: [
						{
							callbackOnly: true,
							category: 'measurement',
							id: 'analytics',
							onBeforeLoad,
						},
					],
				},
				{
					...onDemandRuntimeModules,
					createIframeBlocker,
					createNetworkBlocker: factories.networkBlockerOnDemand,
					createPersistence,
					createScriptLoader: factories.scriptLoaderOnDemand,
					createWindowDebug,
					watchRevocationReload,
				}
			);
			runtimes.push(runtime);
			const early = window.fetch('https://tracker.example/collect');
			runtime.start();
			await vi.dynamicImportSettled();

			expect((await early).status).toBe(451);
			await runtime.kernel.commands.save('all');
			expect(onBeforeLoad).toHaveBeenCalledOnce();
		} finally {
			window.fetch = nativeFetch;
		}
	});

	test('a configure-once runtime mounts the modules it is given', async () => {
		const onBeforeLoad = vi.fn();
		const runtime = createConsentRuntimeWith(
			{
				mode: custom({
					init: vi.fn().mockResolvedValue({}),
					save: vi.fn().mockResolvedValue({ ok: true }),
				}),
				persistence: false,
				prefetch: RESOLVED_PREFETCH,
				scripts: [
					{
						callbackOnly: true,
						category: 'measurement',
						id: 'analytics',
						onBeforeLoad,
					},
				],
			},
			{
				...onDemandRuntimeModules,
				createIframeBlocker,
				createPersistence,
				createWindowDebug,
				watchRevocationReload,
			}
		);
		runtimes.push(runtime);
		runtime.start();
		await vi.dynamicImportSettled();
		expect(onBeforeLoad).not.toHaveBeenCalled();

		await runtime.kernel.commands.save('all');
		expect(onBeforeLoad).toHaveBeenCalledOnce();
	});
});

/**
 * A module loaded on demand must import nothing the first-load graph has.
 * Otherwise bundlers that split shared code (Rolldown, esbuild) move each
 * shared module into a chunk of its own, and first load fetches those as
 * extra files. Its first-load dependencies arrive through its tools.
 */
describe('on-demand chunks', () => {
	const source = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
	const valueImports = function valueImports(file: string): string[] {
		const text = readFileSync(file, 'utf8');
		return [
			...text.matchAll(
				/^(?:import|export)\s+(?!type\b)[^;]*?from\s+'(?<from>[^']+)'|import\(\s*'(?<dynamic>[^']+)'\s*\)/gmu
			),
		].map((match) => match.groups?.from ?? match.groups?.dynamic ?? '');
	};
	const reach = function reach(entry: string): string[] {
		const seen = new Set<string>();
		const visit = (file: string) => {
			if (seen.has(file)) {
				return;
			}
			seen.add(file);
			for (const specifier of valueImports(file)) {
				if (specifier.startsWith('.')) {
					const target = join(dirname(file), specifier);
					visit(
						existsSync(`${target}.ts`)
							? `${target}.ts`
							: join(target, 'index.ts')
					);
				}
			}
		};
		visit(entry);
		return [...seen];
	};

	test.each([
		['modules/clear-on-revocation/clear.ts', ['modules/clear-on-revocation/']],
		[
			'modules/loader-and-blocker.ts',
			[
				'modules/loader-and-blocker.ts',
				'modules/network-blocker/',
				'modules/script-loader/',
			],
		],
		['modules/network-blocker/blocker.ts', ['modules/network-blocker/']],
		['modules/persistence/writer/writer.ts', ['modules/persistence/writer/']],
		['modules/script-loader/loader.ts', ['modules/script-loader/']],
		['runtime/controls.ts', ['runtime/controls.ts']],
		['runtime/provider-update.ts', ['runtime/provider-update.ts']],
	])('%s imports values only from %j', (entry, allowed) => {
		const files = reach(join(source, entry)).map((file) =>
			relative(source, file)
		);
		const outside = files.filter(
			(file) =>
				!allowed.some(
					(prefix) =>
						file.startsWith(prefix) && !file.slice(prefix.length).includes('/')
				)
		);
		expect(outside).toEqual([]);
		// The module's tools and its public entry import first-load code, and
		// the network hold keeps page-wide state: all reach the module only
		// through the tools it is passed.
		expect(
			files.filter((file) => /\/(?:index|tools|hold)\.ts$/u.test(file))
		).toEqual([]);
	});

	// esbuild emits a chunk for every `import()` in a file it reaches, used
	// or not. A single-module chunk next to the shared one would split both
	// modules out of it, and a page would fetch the shared chunk and then
	// each module in a second round.
	test('the provider entry imports the loader and the blocker only through their shared chunk', () => {
		const dynamic = reach(join(source, 'runtime/provider.ts')).flatMap((file) =>
			[
				...readFileSync(file, 'utf8').matchAll(
					/import\(\s*'(?<specifier>\.[^']*)'\s*\)/gu
				),
			].map((match) =>
				relative(source, join(dirname(file), match.groups?.specifier ?? ''))
			)
		);
		expect(dynamic).toContain('modules/loader-and-blocker');
		expect(dynamic).not.toContain('modules/script-loader/loader');
		expect(dynamic).not.toContain('modules/network-blocker/blocker');
	});

	// A host that imports one factory and the others' modules statically
	// (an Astro site with `scripts`) must not reach the others' `import()`:
	// a bundler keeps a module that is also dynamically imported in a chunk
	// of its own.
	test.each([
		[
			'runtime/on-demand-clear-on-revocation.ts',
			'../modules/clear-on-revocation/clear',
		],
		['runtime/on-demand-consent-source.ts', './controls'],
		[
			'runtime/on-demand-loader-and-blocker.ts',
			'../modules/loader-and-blocker',
		],
		[
			'runtime/on-demand-network-blocker.ts',
			'../modules/network-blocker/blocker',
		],
		['runtime/on-demand-script-loader.ts', '../modules/script-loader/loader'],
	])('%s loads only %s on demand', (entry, chunk) => {
		// Relative only: TSDoc examples name the public entries.
		const dynamic = reach(join(source, entry)).flatMap((file) =>
			[
				...readFileSync(file, 'utf8').matchAll(
					/import\(\s*'(?<specifier>\.[^']*)'\s*\)/gu
				),
			].map((match) => match.groups?.specifier)
		);
		expect(dynamic).toEqual([chunk]);
	});
});

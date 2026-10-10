/**
 * The Nuxt module's options, as they reach the app through the public
 * runtime config.
 */
import { createConsentManifestPolicyPack } from '@c15t/schema/types';
import { logger, runWithNuxtContext } from '@nuxt/kit';
import { beforeAll, describe, expect, test, vi } from 'vitest';

// `useLogger` creates its loggers from Nuxt Kit's, which hands them these
// mocked types.
const warn = vi.fn();
logger.mockTypes((type) =>
	type === 'warn' ? warn : logger[type].bind(logger)
);

type Nuxt = Parameters<typeof runWithNuxtContext>[0];
type NuxtModule = (
	inlineOptions: Record<string, unknown>,
	nuxt: Nuxt
) => Promise<unknown>;

// Loaded by path: the module's `@nuxt/schema` types only resolve in the
// Nuxt type check, not in the Vue one that covers these tests.
let module: NuxtModule;
beforeAll(async () => {
	({ default: module } = await vi.importActual<{ default: NuxtModule }>(
		'../module'
	));
}, 30_000);

/** The parts of a Nuxt instance the module's setup touches. */
const createNuxt = function createNuxt(
	c15t: Record<string, unknown>,
	ssr = true,
	lifecycle: { _generate?: boolean; _prepare?: boolean; dev?: boolean } = {}
): Nuxt {
	return {
		hook: () => () => undefined,
		hooks: { addHooks: () => undefined, hook: () => () => undefined },
		options: {
			...lifecycle,
			_requiredModules: {},
			alias: {},
			app: { baseURL: '/' },
			build: { templates: [], transpile: [] },
			buildDir: '/virtual/.nuxt',
			c15t,
			experimental: {},
			imports: {},
			nitro: {},
			plugins: [],
			rootDir: '/virtual',
			runtimeConfig: { public: {} },
			serverHandlers: [],
			srcDir: '/virtual',
			ssr,
			vite: {},
		},
	} as unknown as Nuxt;
};

const publicConfig = async function publicConfig(
	c15t: Record<string, unknown>
): Promise<Record<string, unknown>> {
	const nuxt = createNuxt(c15t);
	await runWithNuxtContext(nuxt, () => module({}, nuxt));
	return nuxt.options.runtimeConfig.public.c15t as Record<string, unknown>;
};

describe('colorScheme from the c15t config key', () => {
	test('keeps null, which leaves c15t-dark to the site', async () => {
		const config = await publicConfig({
			backendURL: '/api/c15t',
			colorScheme: null,
		});
		expect(config).toHaveProperty('colorScheme', null);
	});

	test('passes a scheme through', async () => {
		const config = await publicConfig({
			backendURL: '/api/c15t',
			colorScheme: 'system',
		});
		expect(config).toHaveProperty('colorScheme', 'system');
	});

	test('leaves it unset when the config does not set it', async () => {
		const config = await publicConfig({ backendURL: '/api/c15t' });
		expect(config.colorScheme).toBeUndefined();
	});
});

/** A manifest whose policy pack carries `copyRevision: null`. */
const createSnapshot = function createSnapshot() {
	return {
		branding: 'c15t',
		policyPacks: [
			createConsentManifestPolicyPack({
				categories: [],
				id: 'world-opt-in',
				match: { fallback: true },
				model: 'opt-in',
				prompt: 'choice',
				scopeMode: 'strict',
				validity: { choiceDays: 365 },
			}),
		],
		revision: 'build-snapshot',
		schemaVersion: 2,
	};
};

const evaluateModule = async function evaluateModule(
	source: string | undefined
): Promise<unknown> {
	const { default: snapshot } = (await import(
		`data:text/javascript,${encodeURIComponent(source ?? '')}`
	)) as { default: unknown };
	return snapshot;
};

/** The module's Nitro virtual for the consent route's snapshot, evaluated. */
const importManifestSnapshot = function importManifestSnapshot(
	nuxt: Nuxt
): Promise<unknown> {
	const { virtual } = nuxt.options.nitro as {
		virtual: Record<string, () => string>;
	};
	return evaluateModule(virtual['#c15t/manifest-snapshot']?.());
};

/** A snapshot template the module registered, evaluated. */
const importTemplate = function importTemplate(
	nuxt: Nuxt,
	id: string
): Promise<unknown> {
	const { alias, build } = nuxt.options as unknown as {
		alias: Record<string, string>;
		build: { templates: { dst: string; getContents: () => string }[] };
	};
	const template = build.templates.find(({ dst }) => dst === alias[id]);
	return evaluateModule(template?.getContents());
};

/** The module's template for the server render's snapshot, evaluated. */
const importServerManifestSnapshot = function importServerManifestSnapshot(
	nuxt: Nuxt
): Promise<unknown> {
	return importTemplate(nuxt, '#c15t/server-manifest-snapshot');
};

/** The module's template for the browser's snapshot, evaluated. */
const importClientManifestSnapshot = function importClientManifestSnapshot(
	nuxt: Nuxt
): Promise<unknown> {
	return importTemplate(nuxt, '#c15t/client-manifest-snapshot');
};

const setUpModule = async function setUpModule(
	c15t: Record<string, unknown>,
	fetch: typeof globalThis.fetch = vi.fn<typeof globalThis.fetch>(),
	ssr = true,
	lifecycle: { _generate?: boolean; _prepare?: boolean; dev?: boolean } = {}
) {
	warn.mockClear();
	vi.stubGlobal('fetch', fetch);
	try {
		const nuxt = createNuxt(c15t, ssr, lifecycle);
		await runWithNuxtContext(nuxt, () => module({}, nuxt));
		return nuxt;
	} finally {
		vi.unstubAllGlobals();
	}
};

const snapshotResponse = (snapshot: unknown) =>
	vi.fn<typeof globalThis.fetch>().mockResolvedValue(Response.json(snapshot));

const unreachable = () =>
	vi
		.fn<typeof globalThis.fetch>()
		.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));

describe('the build snapshot in manifest() mode', () => {
	test.each([false, true])(
		'embeds the manifest in the server bundle with dev: %s',
		async (dev) => {
			const snapshot = createSnapshot();
			const fetch = snapshotResponse(snapshot);
			const nuxt = await setUpModule(
				{ backendURL: 'https://consent.example.com' },
				fetch,
				true,
				{ dev }
			);
			expect(fetch).toHaveBeenCalledWith(
				'https://consent.example.com/manifest',
				expect.anything()
			);
			expect(await importManifestSnapshot(nuxt)).toEqual(snapshot);
			expect(await importServerManifestSnapshot(nuxt)).toEqual(snapshot);
			// Server resolution ships no snapshot to the browser.
			expect(await importClientManifestSnapshot(nuxt)).toBeUndefined();
			// Nitro replaces every `null` in runtime config with `''` during the
			// build, so the snapshot must not travel through it.
			expect(nuxt.options.runtimeConfig.public.c15t).toMatchObject({
				mode: { type: 'manifest' },
				routePrefix: '/api/c15t',
			});
			expect(JSON.stringify(nuxt.options.runtimeConfig)).not.toContain(
				'build-snapshot'
			);
			expect(warn).not.toHaveBeenCalled();
		}
	);

	test('nuxt prepare fetches nothing', async () => {
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockRejectedValue(
				new Error('backend unavailable during dependency installation')
			);
		const nuxt = await setUpModule(
			{ backendURL: 'https://consent.example.com' },
			fetch,
			true,
			{ _prepare: true }
		);
		expect(fetch).not.toHaveBeenCalled();
		expect(await importManifestSnapshot(nuxt)).toBeUndefined();
	});

	test.each([
		{ error: '503', response: () => new Response(null, { status: 503 }) },
		{
			error: 'invalid consent manifest',
			response: () => Response.json({ error: 'not a manifest' }),
		},
	])('stops the build on $error', async ({ response, error }) => {
		await expect(
			setUpModule(
				{ backendURL: 'https://consent.example.com' },
				vi
					.fn<typeof globalThis.fetch>()
					.mockImplementation(() => Promise.resolve(response()))
			)
		).rejects.toThrow(error);
	});

	test('nuxt dev warns and reads the manifest at runtime when the fetch fails', async () => {
		const nuxt = await setUpModule(
			{ backendURL: 'https://consent.example.com' },
			unreachable(),
			true,
			{ dev: true }
		);
		expect(await importManifestSnapshot(nuxt)).toBeUndefined();
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('during dev (getaddrinfo ENOTFOUND)')
		);
	});

	test('nuxt build stops when the fetch fails', async () => {
		await expect(
			setUpModule({ backendURL: 'https://consent.example.com' }, unreachable())
		).rejects.toThrow(
			"@c15t/vue: could not fetch the consent manifest from https://consent.example.com/manifest during the build (getaddrinfo ENOTFOUND). Set `C15T_ON_BUILD_ERROR=runtime` (or `onBuildError: 'runtime'`) to deploy with runtime fetching."
		);
	});

	test('nuxt build stops without a backend URL', async () => {
		await expect(setUpModule({})).rejects.toThrow(
			'NUXT_PUBLIC_C15T_BACKEND_URL'
		);
	});

	test.each([
		['the default mode', {}],
		['a snapshot', { mode: { snapshot: createSnapshot(), type: 'manifest' } }],
		[
			'a snapshot and no consent route',
			{
				mode: { snapshot: createSnapshot(), type: 'manifest' },
				routePrefix: false,
			},
		],
		[
			"onBuildError: 'runtime'",
			{ mode: { type: 'manifest' }, onBuildError: 'runtime' },
		],
	] as const)(
		'stops nuxt dev without a backend URL to save consent to, with %s',
		async (_name, c15t) => {
			// The consent route answers `GET` only, so a save posted to it
			// would 404 after the visitor chose.
			await expect(
				setUpModule(c15t, vi.fn<typeof globalThis.fetch>(), true, {
					dev: true,
				})
			).rejects.toThrow(
				/needs a backend URL.*Set NUXT_PUBLIC_C15T_BACKEND_URL \(or NUXT_PUBLIC_INTH_PROJECT_URL\)/u
			);
		}
	);

	test('nuxt prepare does not need a backend URL', async () => {
		await expect(
			setUpModule(
				{ mode: { snapshot: createSnapshot(), type: 'manifest' } },
				vi.fn<typeof globalThis.fetch>(),
				true,
				{ _prepare: true }
			)
		).resolves.toBeDefined();
	});

	test.each([
		['onBuildError', { onBuildError: 'runtime' }, undefined],
		['C15T_ON_BUILD_ERROR', {}, 'runtime'],
	])(
		'%s runtime lets nuxt build continue',
		async (_name, settings, fromEnv) => {
			if (fromEnv) {
				vi.stubEnv('C15T_ON_BUILD_ERROR', fromEnv);
			}
			try {
				const nuxt = await setUpModule(
					{ backendURL: 'https://consent.example.com', ...settings },
					unreachable()
				);
				expect(await importManifestSnapshot(nuxt)).toBeUndefined();
				expect(warn).toHaveBeenCalledTimes(1);
			} finally {
				vi.unstubAllEnvs();
			}
		}
	);

	test("onBuildError: 'fail' stops nuxt dev", async () => {
		await expect(
			setUpModule(
				{ backendURL: 'https://consent.example.com', onBuildError: 'fail' },
				unreachable(),
				true,
				{ dev: true }
			)
		).rejects.toThrow('during dev (getaddrinfo ENOTFOUND)');
	});

	test('reads NUXT_PUBLIC_C15T_BACKEND_URL when backendURL is left out', async () => {
		vi.stubEnv('NUXT_PUBLIC_C15T_BACKEND_URL', 'https://env.example.com');
		try {
			const snapshot = createSnapshot();
			const fetch = snapshotResponse(snapshot);
			const nuxt = await setUpModule({}, fetch);
			expect(fetch).toHaveBeenCalledWith(
				'https://env.example.com/manifest',
				expect.anything()
			);
			expect(await importManifestSnapshot(nuxt)).toEqual(snapshot);
			expect(nuxt.options.runtimeConfig.public.c15t).toHaveProperty(
				'backendURL',
				'https://env.example.com'
			);
		} finally {
			vi.unstubAllEnvs();
		}
	});

	describe('NUXT_PUBLIC_INTH_PROJECT_URL', () => {
		const INTH = 'https://inth.example.com';
		const C15T = 'https://c15t.example.com';
		const inthPlugins = (nuxt: Nuxt) =>
			((nuxt.options.nitro as { plugins?: string[] }).plugins ?? []).filter(
				(plugin) => plugin.includes('inth-project-url')
			);
		const setUp = async (
			c15t: Record<string, unknown>,
			env: Record<string, string | undefined>
		) => {
			vi.stubEnv('NUXT_PUBLIC_C15T_BACKEND_URL', undefined);
			vi.stubEnv('NUXT_PUBLIC_INTH_PROJECT_URL', undefined);
			for (const [key, value] of Object.entries(env)) {
				vi.stubEnv(key, value);
			}
			const fetch = snapshotResponse(createSnapshot());
			try {
				const nuxt = await setUpModule(c15t, fetch);
				return {
					backendURL: (
						nuxt.options.runtimeConfig.public.c15t as Record<string, unknown>
					).backendURL,
					fetch,
					nuxt,
				};
			} finally {
				vi.unstubAllEnvs();
			}
		};

		test('alone gives the build its URL and applies on a running server', async () => {
			const { backendURL, fetch, nuxt } = await setUp(
				{},
				{ NUXT_PUBLIC_INTH_PROJECT_URL: INTH }
			);
			expect(fetch).toHaveBeenCalledWith(`${INTH}/manifest`, expect.anything());
			expect(backendURL).toBe(INTH);
			expect(inthPlugins(nuxt)).toHaveLength(1);
		});

		test('loses to NUXT_PUBLIC_C15T_BACKEND_URL when both are set', async () => {
			const { backendURL, fetch, nuxt } = await setUp(
				{},
				{
					NUXT_PUBLIC_C15T_BACKEND_URL: C15T,
					NUXT_PUBLIC_INTH_PROJECT_URL: INTH,
				}
			);
			expect(fetch).toHaveBeenCalledWith(`${C15T}/manifest`, expect.anything());
			expect(backendURL).toBe(C15T);
			expect(inthPlugins(nuxt)).toHaveLength(0);
		});

		test('an explicit backendURL beats both variables', async () => {
			const { backendURL, fetch, nuxt } = await setUp(
				{ backendURL: 'https://option.example.com' },
				{
					NUXT_PUBLIC_C15T_BACKEND_URL: C15T,
					NUXT_PUBLIC_INTH_PROJECT_URL: INTH,
				}
			);
			expect(fetch).toHaveBeenCalledWith(
				'https://option.example.com/manifest',
				expect.anything()
			);
			expect(backendURL).toBe('https://option.example.com');
			expect(inthPlugins(nuxt)).toHaveLength(0);
		});
	});

	test.each([
		['a relative backendURL', { backendURL: '/api/c15t' }],
		[
			'hosted()',
			{ backendURL: 'https://consent.example.com', mode: { type: 'hosted' } },
		],
		[
			'offline()',
			{ backendURL: 'https://consent.example.com', mode: { type: 'offline' } },
		],
		[
			"source: 'runtime'",
			{
				backendURL: 'https://consent.example.com',
				mode: { source: 'runtime', type: 'manifest' },
			},
		],
	] as const)('fetches nothing with %s', async (_name, c15t) => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		const nuxt = await setUpModule(c15t, fetch);
		expect(fetch).not.toHaveBeenCalled();
		expect(await importManifestSnapshot(nuxt)).toBeUndefined();
		expect(warn).not.toHaveBeenCalled();
	});
});

describe('where the snapshot goes', () => {
	test('a snapshot the mode names stays out of runtime config', async () => {
		const snapshot = createSnapshot();
		const fetch = vi.fn<typeof globalThis.fetch>();
		const nuxt = await setUpModule(
			{
				backendURL: 'https://consent.example.com',
				mode: { snapshot, type: 'manifest' },
			},
			fetch
		);
		expect(fetch).not.toHaveBeenCalled();
		expect(nuxt.options.runtimeConfig.public.c15t).toMatchObject({
			mode: { type: 'manifest' },
		});
		expect(JSON.stringify(nuxt.options.runtimeConfig)).not.toContain(
			'build-snapshot'
		);
		expect(await importManifestSnapshot(nuxt)).toEqual(snapshot);
		expect(await importClientManifestSnapshot(nuxt)).toBeUndefined();
	});

	test("resolve: 'browser' bundles the build snapshot for the browser", async () => {
		const snapshot = createSnapshot();
		const nuxt = await setUpModule(
			{
				backendURL: 'https://consent.example.com',
				mode: { resolve: 'browser', type: 'manifest' },
				routePrefix: false,
			},
			snapshotResponse(snapshot),
			false,
			{ _generate: true }
		);
		expect(await importClientManifestSnapshot(nuxt)).toEqual(snapshot);
		expect(nuxt.options.runtimeConfig.public.c15t).toMatchObject({
			mode: { resolve: 'browser', type: 'manifest' },
			routePrefix: false,
		});
		expect(warn).not.toHaveBeenCalled();
	});
});

describe('mode and routePrefix', () => {
	// Nuxt Kit also mounts a `/**` route at its base for older Nitro routers.
	const handlerRoutes = (nuxt: Nuxt) =>
		(
			nuxt.options as unknown as { serverHandlers: { route: string }[] }
		).serverHandlers
			.map(({ route }) => route)
			.filter((route) => route.endsWith('/**'));

	test('manifest() adds one catch-all consent route', async () => {
		const nuxt = await setUpModule({ backendURL: '/api/self-host' });
		expect(handlerRoutes(nuxt)).toEqual(['/api/c15t/**']);
	});

	test('routePrefix moves the route, and false removes it', async () => {
		const moved = await setUpModule({
			backendURL: '/api/self-host',
			routePrefix: '/consent/',
		});
		expect(handlerRoutes(moved)).toEqual(['/consent/**']);
		const removed = await setUpModule({
			backendURL: '/api/self-host',
			routePrefix: false,
		});
		expect(handlerRoutes(removed)).toEqual([]);
	});

	test('rejects a routePrefix of / at setup', async () => {
		await expect(
			setUpModule({ backendURL: '/api/self-host', routePrefix: '/' })
		).rejects.toThrow(
			"@c15t/vue: `routePrefix` can't be '/': a consent route at the site root would catch every page. Use a path such as '/api/c15t'."
		);
	});

	test('publishes the checked routePrefix over one already in runtimeConfig', async () => {
		warn.mockClear();
		const nuxt = createNuxt({ backendURL: '/api/self-host' });
		nuxt.options.runtimeConfig.public.c15t = { routePrefix: '/' };
		await runWithNuxtContext(nuxt, () => module({}, nuxt));
		// The route and the browser read the same prefix.
		expect(handlerRoutes(nuxt)).toEqual(['/api/c15t/**']);
		expect(nuxt.options.runtimeConfig.public.c15t).toMatchObject({
			routePrefix: '/api/c15t',
		});
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('runtimeConfig.public.c15t.routePrefix')
		);
	});

	test('hosted() needs no consent route', async () => {
		const nuxt = await setUpModule({
			backendURL: 'https://consent.example.com',
			mode: { type: 'hosted' },
		});
		expect(handlerRoutes(nuxt)).toEqual([]);
	});

	test('rejects a transport in place of mode data', async () => {
		const transport = Object.assign(() => ({}), { kind: 'hosted' });
		await expect(
			setUpModule({ backendURL: '/api/self-host', mode: transport })
		).rejects.toThrow(
			"Import `manifest`, `hosted` or `offline` from 'c15t/vue'"
		);
	});

	test('nuxt generate warns that the server cannot resolve the policy', async () => {
		await setUpModule(
			{ backendURL: '/api/self-host' },
			vi.fn<typeof globalThis.fetch>(),
			true,
			{ _generate: true }
		);
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining("manifest({ resolve: 'browser' })")
		);
	});
});

describe('the early /init script for ssr: false pages', () => {
	const setUp = async function setUp(
		c15t: Record<string, unknown>,
		ssr?: boolean
	) {
		const nuxt = createNuxt(c15t, ssr);
		await runWithNuxtContext(nuxt, () => module({}, nuxt));
		const { nitro, runtimeConfig } = nuxt.options as unknown as {
			nitro: { plugins?: string[] };
			runtimeConfig: { c15t: { ssr: boolean } };
		};
		return {
			plugins: nitro.plugins ?? [],
			ssr: runtimeConfig.c15t.ssr,
		};
	};

	test('is on by default', async () => {
		const { plugins } = await setUp({ backendURL: '/api/c15t' });
		expect(plugins.some((path) => path.includes('init-prefetch.nuxt'))).toBe(
			true
		);
	});

	test('initPrefetch: false registers nothing on the server', async () => {
		const { plugins } = await setUp({
			backendURL: '/api/c15t',
			initPrefetch: false,
		});
		expect(plugins.some((path) => path.includes('init-prefetch'))).toBe(false);
	});

	test("tells the server plugin about the app's ssr option", async () => {
		expect((await setUp({ backendURL: '/api/c15t' }, false)).ssr).toBe(false);
		expect((await setUp({ backendURL: '/api/c15t' })).ssr).toBe(true);
	});

	test('stays out of the runtime config the browser receives', async () => {
		const config = await publicConfig({
			backendURL: '/api/c15t',
			initPrefetch: false,
		});
		expect(config).not.toHaveProperty('initPrefetch');
	});

	describe('the app config the server plugin reads', () => {
		/** The `#c15t/server-app-config` source for a Nitro config. */
		const serverAppConfig = async function serverAppConfig(
			virtual: Record<string, unknown>,
			imports: false | Record<string, unknown> = {}
		) {
			const nuxt = createNuxt({ backendURL: '/api/c15t' });
			const nitroConfigHooks: ((config: unknown) => void)[] = [];
			Object.assign(nuxt, {
				hook: (name: string, extendConfig: (config: unknown) => void) => {
					if (name === 'nitro:config') {
						nitroConfigHooks.push(extendConfig);
					}
					return () => undefined;
				},
			});
			await runWithNuxtContext(nuxt, () => module({}, nuxt));
			const nitroConfig = { imports, virtual };
			for (const extendConfig of nitroConfigHooks) {
				extendConfig(nitroConfig);
			}
			return nitroConfig.virtual['#c15t/server-app-config'];
		};

		// Nuxt 5 turns off Nitro auto-imports, so the plugin cannot use
		// `#imports`.
		test("reads Nuxt 4's merged app config", async () => {
			expect(
				await serverAppConfig({ '#internal/nuxt/app-config': () => '' })
			).toContain("from '#internal/nuxt/app-config'");
		});

		test('has no config when Nitro auto-imports are off', async () => {
			expect(
				await serverAppConfig({ '#internal/nuxt/app-config': () => '' }, false)
			).toBe('export const useServerAppConfig = () => undefined;');
		});

		test("falls back to Nitro's useAppConfig on Nuxt 3", async () => {
			expect(await serverAppConfig({})).toContain(
				"export { useAppConfig as useServerAppConfig } from 'nitropack/runtime'"
			);
		});
	});
});

describe('gpp from the c15t config key', () => {
	test('reaches the client as JSON', async () => {
		const gpp = { optOutCategories: ['marketing'], usApproach: 'national' };
		const config = await publicConfig({ backendURL: '/api/c15t', gpp });
		expect(config.gpp).toEqual(gpp);
		expect(JSON.parse(JSON.stringify(config)).gpp).toEqual(gpp);
	});

	test('passes true through', async () => {
		const config = await publicConfig({ backendURL: '/api/c15t', gpp: true });
		expect(config).toHaveProperty('gpp', true);
	});
});

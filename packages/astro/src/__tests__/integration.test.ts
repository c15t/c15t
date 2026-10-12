import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { parse } from '@babel/parser';
import {
	buildConsentManifestFromConfig,
	policyRulePresets,
} from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildInlineCodeHashes } from '../csp';
import {
	buildLocalsTypes,
	c15t,
	createOwnEntryResolver,
	inferUIAdapter,
	resolveClientEntrypoint,
	resolveOptions,
} from '../integration';
import {
	hosted as hostedMode,
	manifest as manifestMode,
	offline as offlineMode,
} from '../mode';
import type { C15tAstroOptions } from '../types';

interface SetupCalls {
	addMiddleware: ReturnType<typeof vi.fn>;
	injectRoute: ReturnType<typeof vi.fn>;
	injectScript: ReturnType<typeof vi.fn>;
	logger: { info: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn> };
	updateConfig: ReturnType<typeof vi.fn>;
}

// `manifest()` mode fetches a build snapshot by default. Keep tests that
// don't stub `fetch` themselves off the network, and let their builds fall
// back to runtime fetching. Tests of the failure policy clear the variable.
beforeEach(() => {
	vi.stubGlobal(
		'fetch',
		vi.fn(() => Promise.reject(new Error('offline in tests')))
	);
	vi.stubEnv('C15T_ON_BUILD_ERROR', 'runtime');
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

const resolveOwnEntry = await createOwnEntryResolver();

const INLINE_MANIFEST = await buildConsentManifestFromConfig({
	branding: 'c15t',
	policyRules: [policyRulePresets.europeOptIn()],
});

/** How an injected module reads in the page script. */
const specifier = (entry: string): string =>
	JSON.stringify(resolveOwnEntry(entry));

const runSetup = async function runSetup(
	options: C15tAstroOptions,
	config: Record<string, unknown> = {},
	command: 'build' | 'dev' | 'preview' | 'sync' = 'build'
) {
	const integration = c15t(options);
	const calls: SetupCalls = {
		addMiddleware: vi.fn(),
		injectRoute: vi.fn(),
		injectScript: vi.fn(),
		logger: { info: vi.fn(), warn: vi.fn() },
		updateConfig: vi.fn(),
	};
	await integration.hooks['astro:config:setup']?.({
		...calls,
		command,
		config,
	} as unknown as Parameters<
		NonNullable<(typeof integration)['hooks']['astro:config:setup']>
	>[0]);
	return { calls, integration };
};

/** Run setup, then return `astro:config:done` to call, the way Astro does. */
const runDone = async function runDone(
	options: C15tAstroOptions,
	integrationNames: string[],
	adapter?: { name: string },
	command = 'build'
) {
	const integrations = integrationNames.map((name) => ({ name }));
	const { integration } = await runSetup(
		options,
		{ adapter, integrations },
		command as 'build'
	);
	const logger = { error: vi.fn(), warn: vi.fn() };
	const injectTypes = vi.fn();
	const run = () =>
		integration.hooks['astro:config:done']?.({
			config: { adapter, integrations },
			injectTypes,
			logger,
		} as unknown as Parameters<
			NonNullable<(typeof integration)['hooks']['astro:config:done']>
		>[0]);
	return Object.assign(run, { injectTypes, logger });
};

describe('createOwnEntryResolver', () => {
	it('resolves an entry point to a file, for sites that cannot see @c15t/astro', () => {
		// Under pnpm, a site that installed `c15t` has no `@c15t/astro` at its
		// root, so Astro could not resolve the bare specifier from there.
		const path = resolveOwnEntry('@c15t/astro/middleware');
		expect(isAbsolute(path)).toBe(true);
		expect(existsSync(path)).toBe(true);
	});

	it('keeps a specifier it cannot resolve', () => {
		expect(resolveOwnEntry('@c15t/astro/not-an-entry')).toBe(
			'@c15t/astro/not-an-entry'
		);
	});
});

describe('resolveOptions', () => {
	it.each(['build', 'dev'] as const)(
		'keeps the %s snapshot in server options only',
		async (command) => {
			const fetch = vi.fn<typeof globalThis.fetch>(() =>
				Promise.resolve(Response.json(INLINE_MANIFEST))
			);
			vi.stubGlobal('fetch', fetch);
			try {
				const { calls } = await runSetup(
					{
						backendURL: 'https://consent.example.com',
						mode: manifestMode(),
						onBuildError: 'fail',
					},
					{},
					command
				);
				const update = calls.updateConfig.mock.calls[0]?.[0];
				const [plugin] = update.vite.plugins;
				const source = plugin.load('\0virtual:c15t/options', { ssr: true });
				expect(source).toContain(JSON.stringify(INLINE_MANIFEST.revision));
				expect(source).toContain('"schemaVersion":2');
				for (const loadOptions of [undefined, { ssr: false }]) {
					const clientSource = plugin.load(
						'\0virtual:c15t/options',
						loadOptions
					);
					const clientOptions = JSON.parse(
						clientSource.replace(/^export default /u, '').replace(/;$/u, '')
					);
					expect(clientOptions.mode).toEqual({ type: 'manifest' });
					expect(clientOptions.backendURL).toBe('https://consent.example.com');
					expect(clientOptions.routePrefix).toBe('/api/c15t');
					expect(clientSource).not.toContain(INLINE_MANIFEST.revision);
				}
				expect(fetch).toHaveBeenCalledTimes(1);
			} finally {
				vi.unstubAllGlobals();
			}
		}
	);

	it.each([
		{ error: '503', response: () => new Response(null, { status: 503 }) },
		{
			error: 'invalid consent manifest',
			response: () => Response.json({ error: 'not a manifest' }),
		},
	])(
		"onBuildError: 'fail' stops the build on $error",
		async ({ response, error }) => {
			vi.stubEnv('C15T_ON_BUILD_ERROR', '');
			vi.stubGlobal(
				'fetch',
				vi.fn(() => Promise.resolve(response()))
			);
			try {
				await expect(
					runSetup({
						backendURL: 'https://consent.example.com',
						mode: manifestMode(),
						onBuildError: 'fail',
					})
				).rejects.toThrow(error);
			} finally {
				vi.unstubAllGlobals();
			}
		}
	);

	it('preview never fetches a new build snapshot', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		vi.stubGlobal('fetch', fetch);
		try {
			await runSetup(
				{
					backendURL: 'https://consent.example.com',
					mode: manifestMode(),
					onBuildError: 'fail',
				},
				{},
				'preview'
			);
			expect(fetch).not.toHaveBeenCalled();
		} finally {
			vi.unstubAllGlobals();
		}
	});

	/** The server options `virtual:c15t/options` exports after setup. */
	const serverOptionsSource = (calls: SetupCalls): string => {
		const [update] = calls.updateConfig.mock.calls[0] ?? [];
		const [plugin] = update.vite.plugins;
		return plugin.load('\0virtual:c15t/options', { ssr: true });
	};

	it('manifest() bundles a build snapshot by default', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>(() =>
			Promise.resolve(Response.json(INLINE_MANIFEST))
		);
		vi.stubGlobal('fetch', fetch);
		const { calls } = await runSetup({
			backendURL: 'https://consent.example.com',
			mode: manifestMode(),
		});
		expect(fetch).toHaveBeenCalledWith(
			'https://consent.example.com/manifest',
			expect.anything()
		);
		expect(serverOptionsSource(calls)).toContain(
			JSON.stringify(INLINE_MANIFEST.revision)
		);
		expect(calls.logger.warn).not.toHaveBeenCalled();
	});

	it('astro dev warns and keeps going when the default fetch fails', async () => {
		vi.stubEnv('C15T_ON_BUILD_ERROR', '');
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(new Response(null, { status: 503 })))
		);
		const { calls } = await runSetup(
			{ backendURL: 'https://consent.example.com', mode: manifestMode() },
			{},
			'dev'
		);
		expect(calls.logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('during dev (/manifest responded 503')
		);
		expect(calls.logger.warn.mock.calls[0]?.[0]).not.toContain('@c15t/astro');
		expect(serverOptionsSource(calls)).not.toContain('"schemaVersion"');
	});

	it('astro build stops when the default fetch fails', async () => {
		vi.stubEnv('C15T_ON_BUILD_ERROR', '');
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(new Response(null, { status: 503 })))
		);
		await expect(
			runSetup({
				backendURL: 'https://consent.example.com',
				mode: manifestMode(),
			})
		).rejects.toThrow(
			"@c15t/astro: could not fetch the consent manifest from https://consent.example.com/manifest during the build (/manifest responded 503 ). Set `C15T_ON_BUILD_ERROR=runtime` (or `onBuildError: 'runtime'`) to deploy with runtime fetching."
		);
	});

	it.each([
		['onBuildError', { onBuildError: 'runtime' }, ''],
		['C15T_ON_BUILD_ERROR', { onBuildError: 'fail' }, 'runtime'],
	] as const)(
		'%s runtime lets astro build continue',
		async (_name, settings, fromEnv) => {
			vi.stubEnv('C15T_ON_BUILD_ERROR', fromEnv);
			const { calls } = await runSetup({
				...settings,
				backendURL: 'https://consent.example.com',
				mode: manifestMode(),
			});
			expect(calls.logger.warn).toHaveBeenCalledTimes(1);
		}
	);

	it("onBuildError: 'fail' stops astro dev", async () => {
		vi.stubEnv('C15T_ON_BUILD_ERROR', '');
		await expect(
			runSetup(
				{
					backendURL: 'https://consent.example.com',
					mode: manifestMode(),
					onBuildError: 'fail',
				},
				{},
				'dev'
			)
		).rejects.toThrow('during dev (offline in tests)');
	});

	it('reads PUBLIC_C15T_BACKEND_URL when no backendURL is set', async () => {
		vi.stubEnv('PUBLIC_C15T_BACKEND_URL', 'https://env.example.com');
		const fetch = vi.fn<typeof globalThis.fetch>(() =>
			Promise.resolve(Response.json(INLINE_MANIFEST))
		);
		vi.stubGlobal('fetch', fetch);
		// `c15t()` with no options is `manifest()` mode.
		const { calls } = await runSetup({});
		expect(fetch).toHaveBeenCalledWith(
			'https://env.example.com/manifest',
			expect.anything()
		);
		const hosted = await runSetup({ mode: hostedMode() });
		expect(serverOptionsSource(hosted.calls)).toContain(
			'"backendURL":"https://env.example.com"'
		);
		expect(serverOptionsSource(calls)).toContain('"type":"manifest"');
	});

	it('reads PUBLIC_C15T_BACKEND_URL from .env in the project root', async () => {
		const root = mkdtempSync(join(tmpdir(), 'c15t-astro-env-'));
		writeFileSync(
			join(root, '.env'),
			'PUBLIC_C15T_BACKEND_URL=https://dotenv.example.com\n'
		);
		const { calls } = await runSetup(
			{ mode: hostedMode() },
			{ root: pathToFileURL(`${root}/`) }
		);
		expect(serverOptionsSource(calls)).toContain(
			'"backendURL":"https://dotenv.example.com"'
		);
	});

	it('reads PUBLIC_INTH_PROJECT_URL when the c15t variable is unset', async () => {
		vi.stubEnv('PUBLIC_C15T_BACKEND_URL', undefined);
		vi.stubEnv('PUBLIC_INTH_PROJECT_URL', 'https://inth.example.com');
		const { calls } = await runSetup({ mode: hostedMode() });
		expect(serverOptionsSource(calls)).toContain(
			'"backendURL":"https://inth.example.com"'
		);
	});

	it('prefers PUBLIC_C15T_BACKEND_URL in .env over PUBLIC_INTH_PROJECT_URL', async () => {
		vi.stubEnv('PUBLIC_C15T_BACKEND_URL', undefined);
		vi.stubEnv('PUBLIC_INTH_PROJECT_URL', 'https://inth.example.com');
		const root = mkdtempSync(join(tmpdir(), 'c15t-astro-env-'));
		writeFileSync(
			join(root, '.env'),
			'PUBLIC_C15T_BACKEND_URL=https://c15t.example.com\n'
		);
		const { calls } = await runSetup(
			{ mode: hostedMode() },
			{ root: pathToFileURL(`${root}/`) }
		);
		expect(serverOptionsSource(calls)).toContain(
			'"backendURL":"https://c15t.example.com"'
		);
	});

	it('an explicit backendURL beats both variables', async () => {
		vi.stubEnv('PUBLIC_C15T_BACKEND_URL', 'https://c15t.example.com');
		vi.stubEnv('PUBLIC_INTH_PROJECT_URL', 'https://inth.example.com');
		const { calls } = await runSetup({
			backendURL: 'https://option.example.com',
			mode: hostedMode(),
		});
		expect(serverOptionsSource(calls)).toContain(
			'"backendURL":"https://option.example.com"'
		);
	});

	it.each([
		[
			'hosted()',
			{ mode: hostedMode({ backendURL: 'https://consent.example.com' }) },
		],
		['offline()', { mode: offlineMode() }],
		[
			'a relative manifest URL',
			{ backendURL: '', mode: manifestMode({ manifestURL: '/m.json' }) },
		],
		[
			"manifest({ source: 'runtime' })",
			{
				backendURL: 'https://consent.example.com',
				mode: manifestMode({ source: 'runtime' }),
			},
		],
		[
			'a snapshot of its own',
			{
				backendURL: 'https://consent.example.com',
				mode: manifestMode({ snapshot: INLINE_MANIFEST }),
			},
		],
	] satisfies [string, C15tAstroOptions][])(
		'fetches no build snapshot with %s',
		async (_name, options) => {
			const fetch = vi.fn<typeof globalThis.fetch>();
			vi.stubGlobal('fetch', fetch);
			const { calls } = await runSetup(options);
			expect(fetch).not.toHaveBeenCalled();
			expect(calls.logger.warn).not.toHaveBeenCalled();
		}
	);

	it("onBuildError: 'fail' still needs an absolute upstream URL", async () => {
		vi.stubEnv('C15T_ON_BUILD_ERROR', '');
		await expect(
			runSetup({
				backendURL: '',
				mode: manifestMode({ manifestURL: '/m.json' }),
				onBuildError: 'fail',
			})
		).rejects.toThrow('absolute upstream URL');
	});

	it('defaults the ui adapter to svelte', () => {
		expect(resolveOptions({ mode: offlineMode() }).ui).toBe('svelte');
	});

	it('defaults to manifest() and the /api/c15t route prefix', () => {
		const resolved = resolveOptions({
			backendURL: 'https://consent.example.com',
		});
		expect(resolved.mode).toEqual({ type: 'manifest' });
		expect(resolved.routePrefix).toBe('/api/c15t');
	});

	it('trims a routePrefix and drops it for false', () => {
		expect(
			resolveOptions({ mode: offlineMode(), routePrefix: '/consent/' })
				.routePrefix
		).toBe('/consent');
		expect(
			resolveOptions({ mode: offlineMode(), routePrefix: false })
		).not.toHaveProperty('routePrefix');
		expect(() =>
			resolveOptions({ mode: offlineMode(), routePrefix: 'api/c15t' })
		).toThrowError(/must be a path that starts with "\/"/u);
	});

	it.each(['/', '//'])('rejects a routePrefix of %s', (routePrefix) => {
		expect(() => resolveOptions({ mode: offlineMode(), routePrefix })).toThrow(
			"@c15t/astro: `routePrefix` can't be '/': a consent route at the site root would catch every page. Use a path such as '/api/c15t'."
		);
	});

	it.each([
		['the default route', {}],
		['routePrefix: false', { routePrefix: false }],
		['a route of its own', { routePrefix: '/consent' }],
	] satisfies [string, C15tAstroOptions][])(
		'rejects a snapshot with no backend to save consent to, with %s',
		(_name, options) => {
			// The injected route answers `GET` only, so a save posted to it
			// would get a 404 after the visitor chose.
			expect(() =>
				resolveOptions({
					...options,
					mode: manifestMode({ snapshot: INLINE_MANIFEST }),
				})
			).toThrowError(
				/manifest\(\{ snapshot \}\) still needs a backend URL.*PUBLIC_C15T_BACKEND_URL/u
			);
			expect(
				resolveOptions({
					...options,
					backendURL: 'https://consent.example.com',
					mode: manifestMode({ snapshot: INLINE_MANIFEST }),
				}).mode.type
			).toBe('manifest');
		}
	);

	it('rejects a function in the serialized options', () => {
		// `JSON.stringify` would drop it, so a `posthog()` helper here used to
		// lose its callbacks without a word.
		expect(() =>
			resolveOptions({
				mode: offlineMode(),
				scripts: [
					{ category: 'measurement', id: 'a', onLoad: () => undefined },
				],
			})
		).toThrowError(
			/c15t\(\)\.scripts\[0\]\.onLoad is a function.*src\/c15t\.client\.ts/u
		);
		expect(() =>
			c15t({
				mode: offlineMode(),
				networkBlocker: {
					onRequestBlocked: () => undefined,
				} as unknown as C15tAstroOptions['networkBlocker'],
			})
		).toThrowError(/networkBlocker\.onRequestBlocked is a function/u);
	});

	it('rejects a transport function as the mode', () => {
		const transport = Object.assign(() => ({}), { kind: 'custom' });
		expect(() =>
			resolveOptions({ mode: transport as unknown as C15tAstroOptions['mode'] })
		).toThrowError(/`mode` must be manifest\(\), hosted\(\) or offline\(\)/u);
	});

	it.each(['solid', 'constructor', '__proto__'])(
		'rejects unsupported adapter %s',
		(ui) => {
			// A JavaScript astro.config.mjs has no type checking, so this used to
			// surface as a TypeError on an undefined adapter entry.
			const options = { mode: offlineMode() };
			Reflect.set(options, 'ui', ui);
			expect(() => resolveOptions(options)).toThrowError(
				/unknown `ui`.*Supported adapters: /u
			);
			expect(resolveOptions({ mode: offlineMode(), ui: 'vue' }).ui).toBe('vue');
		}
	);

	it('rejects a bare manifest() with nowhere to save consent', () => {
		// The browser would post saves to the init route's own prefix,
		// `/api/c15t/subjects`, where nothing answers.
		expect(() => resolveOptions({ mode: manifestMode() })).toThrowError(
			/manifest\(\) needs a backend URL.*PUBLIC_C15T_BACKEND_URL \(or PUBLIC_INTH_PROJECT_URL\)/u
		);
		expect(() => resolveOptions({ mode: hostedMode() })).toThrowError(
			/hosted\(\) needs a backend URL/u
		);
	});

	it('leaves reading the environment to the setup hook', () => {
		vi.stubEnv('PUBLIC_C15T_BACKEND_URL', 'https://consent.example.com');
		try {
			expect(() => resolveOptions({ mode: manifestMode() })).toThrowError(
				/manifest\(\) needs a backend URL/u
			);
		} finally {
			vi.unstubAllEnvs();
		}
	});

	it('keeps an empty backendURL, which means this origin', () => {
		vi.stubEnv('C15T_BACKEND_URL', 'https://consent.example.com');
		try {
			expect(
				resolveOptions({
					backendURL: '',
					mode: manifestMode({ manifestURL: '/m.json' }),
				})
			).toHaveProperty('backendURL', '');
		} finally {
			vi.unstubAllEnvs();
		}
	});

	it('rejects an empty backendURL with no manifest to fetch', () => {
		// `''` saves on this origin, but `${backendURL}/manifest` needs a real
		// URL, and the environment's backend URL does not replace it.
		vi.stubEnv('C15T_BACKEND_URL', 'https://consent.example.com');
		vi.stubEnv('C15T_MANIFEST_URL', '');
		try {
			expect(() =>
				resolveOptions({ backendURL: '', mode: manifestMode() })
			).toThrowError(/gives the server no manifest to fetch/u);
		} finally {
			vi.unstubAllEnvs();
		}
	});

	it('accepts an empty backendURL with an inline manifest', () => {
		expect(
			resolveOptions({
				backendURL: '',
				mode: manifestMode({ snapshot: INLINE_MANIFEST }),
			})
		).toHaveProperty('backendURL', '');
	});

	it('does not take the manifest for an empty backendURL from the environment', () => {
		vi.stubEnv('C15T_MANIFEST_URL', 'https://consent.example.com/manifest');
		try {
			expect(() =>
				resolveOptions({ backendURL: '', mode: manifestMode() })
			).toThrowError(/gives the server no manifest to fetch/u);
		} finally {
			vi.unstubAllEnvs();
		}
	});

	it('rejects a manifestURL with nowhere to save consent', () => {
		// The injected routes serve init and manifest; `POST /subjects` is
		// the backend's, so a `manifestURL` without one would 404 on save.
		expect(() =>
			resolveOptions({ mode: manifestMode({ manifestURL: '/m.json' }) })
		).toThrowError(/manifest\(\) needs a backend URL/u);
		expect(
			resolveOptions({
				backendURL: 'https://consent.example.com',
				mode: manifestMode({ manifestURL: '/m.json' }),
			})
		).toMatchObject({ backendURL: 'https://consent.example.com' });
	});

	it('rejects an experiment with no way to resolve its arm on the server', () => {
		// The banner is server HTML the browser only shows or hides, so an
		// arm assigned in the browser would be recorded for a banner the
		// visitor never saw.
		const variants = {
			bar: { prompt: { variant: 'bar' as const } },
		};
		expect(() =>
			resolveOptions({
				experiment: { arms: variants, id: 'banner-shape' },
				mode: offlineMode(),
			})
		).toThrowError(/consentMiddleware\(\{ experimentArm \}\)/u);
		// A site that composes the middleware resolves the arm per request.
		expect(
			resolveOptions({
				experiment: { arms: variants, id: 'banner-shape' },
				middleware: false,
				mode: offlineMode(),
			}).experiment
		).toMatchObject({ id: 'banner-shape' });
		expect(
			resolveOptions({
				experiment: { arm: 'bar', arms: variants, id: 'banner-shape' },
				mode: offlineMode(),
			}).experiment
		).toMatchObject({ arm: 'bar' });
	});

	it('drops build-only options from the serialized shape', () => {
		const resolved = resolveOptions({
			middleware: false,
			mode: offlineMode(),
			requireUIIntegration: false,
		});
		expect(resolved).not.toHaveProperty('requireUIIntegration');
	});

	it('normalizes the middleware option', () => {
		expect(resolveOptions({ mode: offlineMode() }).middleware).toEqual({
			enabled: true,
			skip: [],
		});
		expect(
			resolveOptions({ middleware: false, mode: offlineMode() }).middleware
		).toEqual({ enabled: false, skip: [] });
		expect(
			resolveOptions({
				middleware: { skip: ['/healthz'] },
				mode: offlineMode(),
			}).middleware
		).toEqual({ enabled: true, skip: ['/healthz'] });
	});

	it('keeps an explicit ui adapter', () => {
		expect(resolveOptions({ mode: offlineMode(), ui: 'react' }).ui).toBe(
			'react'
		);
		expect(resolveOptions({ mode: offlineMode(), ui: 'vue' }).ui).toBe('vue');
	});
});

describe('astro:config:setup', () => {
	it("hands c15t's inline hashes to Astro's CSP when the site turned it on", async () => {
		const options: C15tAstroOptions = { mode: offlineMode() };
		const { calls } = await runSetup(options, { security: { csp: true } });
		const hashes = await buildInlineCodeHashes(resolveOptions(options));
		expect(calls.updateConfig).toHaveBeenCalledWith({
			security: {
				csp: {
					algorithm: 'SHA-256',
					scriptDirective: { hashes: hashes.scripts },
					// The first-paint stylesheet the components inline.
					styleDirective: { hashes: hashes.styles },
				},
			},
		});

		const without = await runSetup(options);
		expect(
			without.calls.updateConfig.mock.calls.some(([update]) =>
				Object.hasOwn(update as object, 'security')
			)
		).toBe(false);
	});

	it('hands the browser the policy hashes when a clientEntrypoint can add inline scripts', async () => {
		const options: C15tAstroOptions = {
			clientEntrypoint: 'site/c15t.client',
			mode: offlineMode(),
		};
		const { calls } = await runSetup(options, {
			security: { csp: { scriptDirective: { hashes: ['sha256-site'] } } },
		});
		const update = calls.updateConfig.mock.calls.find(([value]) =>
			Object.hasOwn(value as object, 'vite')
		)?.[0] as {
			vite: {
				plugins: { load: (id: string) => string }[];
			};
		};
		const loaded = update.vite.plugins[0]?.load('\0virtual:c15t/options');
		const parsed = JSON.parse(
			(loaded ?? '').replace(/^export default /u, '').replace(/;$/u, '')
		);

		expect(parsed.csp).toEqual({
			algorithm: 'SHA-256',
			scriptHashes: [
				...(await buildInlineCodeHashes(resolveOptions(options))).scripts,
				'sha256-site',
			],
		});
	});

	it('registers the middleware before user middleware', async () => {
		const { calls } = await runSetup({
			mode: hostedMode({ backendURL: '/api/c15t' }),
		});
		expect(calls.addMiddleware).toHaveBeenCalledWith({
			entrypoint: resolveOwnEntry('@c15t/astro/middleware'),
			order: 'pre',
		});
	});

	it('skips the middleware when disabled', async () => {
		const { calls } = await runSetup({
			middleware: false,
			mode: offlineMode(),
		});
		expect(calls.addMiddleware).not.toHaveBeenCalled();
	});

	it('injects a stylesheet that declares the Tailwind 4 layer order first', () => {
		// It lands ahead of a site's Tailwind stylesheet, and layers rank by
		// first mention. Declaring `components` alone would rank it below
		// `base`, where preflight strips the banner's padding and borders.
		const css = readFileSync(resolveOwnEntry('@c15t/astro/styles.css'), 'utf8');
		const firstStatement = css.replace(/\/\*[\s\S]*?\*\//gu, '').trim();

		expect(firstStatement.split('\n')[0]).toBe(
			'@layer properties, theme, base, components, utilities;'
		);
	});

	it('defers the IAB panel stylesheet and links no CSS on IAB pages', async () => {
		const { calls } = await runSetup({
			iab: { cmpId: 160 },
			mode: offlineMode(),
		});
		expect(
			calls.injectScript.mock.calls.some(([stage]) => stage === 'page-ssr')
		).toBe(false);
		const [, boot] = calls.injectScript.mock.calls[0] as [string, string];
		expect(boot).toContain(
			`import iabDialogStyle from ${JSON.stringify(`${resolveOwnEntry('@c15t/ui/styles/sheets/iab-dialog.css')}?url`)};`
		);
		expect(boot).toContain("registerDialogStyles([iabDialogStyle], 'iab');");
	});

	it.each(['react', 'svelte', 'vue'] as const)(
		'links no stylesheet from %s pages without IAB',
		async (ui) => {
			// The components inline the first-paint rules, and the client
			// links the dialog's when it opens: a stylesheet in `<head>`
			// would hold back the first paint.
			const { calls } = await runSetup({ mode: offlineMode(), ui });
			expect(
				calls.injectScript.mock.calls.some(([stage]) => stage === 'page-ssr')
			).toBe(false);
		}
	);

	it.each([
		['react', ['@c15t/ui/styles/sheets/dialog.css']],
		['vue', ['@c15t/ui/styles/sheets/dialog.css']],
		[
			'svelte',
			['@c15t/ui/styles/sheets/dialog.css', '@c15t/ui/styles/primitives.css'],
		],
	] as const)(
		'registers the %s dialog stylesheets for the client to link',
		async (ui, stylesheets) => {
			const { calls } = await runSetup({ mode: offlineMode(), ui });
			const [, code] = calls.injectScript.mock.calls[0] as [string, string];

			stylesheets.forEach((stylesheet, index) => {
				expect(code).toContain(
					`import dialogStyle${index} from ${JSON.stringify(`${resolveOwnEntry(stylesheet)}?url`)};`
				);
			});
			const names = stylesheets.map((_, index) => `dialogStyle${index}`);
			expect(code).toContain(`registerDialogStyles([${names.join(', ')}]);`);
		}
	);

	describe('on a Tailwind CSS 3 site', () => {
		/** A project root whose `tailwindcss` resolves at `version`. */
		const projectWithTailwind = function projectWithTailwind(
			version: string
		): URL {
			const root = mkdtempSync(join(tmpdir(), 'c15t-astro-tw-'));
			const tailwind = join(root, 'node_modules', 'tailwindcss');
			mkdirSync(tailwind, { recursive: true });
			writeFileSync(join(root, 'package.json'), '{"name":"site"}');
			writeFileSync(
				join(tailwind, 'package.json'),
				JSON.stringify({ name: 'tailwindcss', version })
			);
			return pathToFileURL(`${root}/`);
		};

		it('links styles.css instead of inlining, so Tailwind builds it', async () => {
			// Tailwind 3 unwraps c15t's layer in the stylesheets it builds;
			// inlined rules would stay layered and lose to its preflight.
			const { calls } = await runSetup(
				{ mode: offlineMode(), ui: 'svelte' },
				{ root: projectWithTailwind('3.4.17') }
			);
			const [, boot] = calls.injectScript.mock.calls[0] as [string, string];

			expect(calls.injectScript).toHaveBeenCalledWith(
				'page-ssr',
				`import ${specifier('@c15t/astro/styles.css')};`
			);
			expect(boot).not.toContain('sheets/dialog.css');
			expect(boot).toContain('primitives.css');
		});

		it('inlines on Tailwind CSS 4', async () => {
			const { calls } = await runSetup(
				{ mode: offlineMode() },
				{ root: projectWithTailwind('4.1.0') }
			);
			expect(
				calls.injectScript.mock.calls.some(([stage]) => stage === 'page-ssr')
			).toBe(false);
		});

		it('links both full stylesheets for Tailwind 3 with IAB enabled', async () => {
			const { calls } = await runSetup(
				{ iab: { cmpId: 160 }, mode: offlineMode() },
				{ root: projectWithTailwind('3.4.17') }
			);
			expect(calls.injectScript).toHaveBeenCalledWith(
				'page-ssr',
				[
					`import ${specifier('@c15t/astro/styles.css')};`,
					`import ${specifier('@c15t/astro/iab/styles.css')};`,
				].join('\n')
			);
			const [, boot] = calls.injectScript.mock.calls[0] as [string, string];
			expect(boot).not.toContain('sheets/iab-dialog.css');
		});
	});

	it('registers no dialog stylesheets with `styles: false`', async () => {
		const { calls } = await runSetup({
			iab: { cmpId: 160 },
			mode: offlineMode(),
			styles: false,
		});
		const [, code] = calls.injectScript.mock.calls[0] as [string, string];
		expect(code).not.toContain('?url');
		expect(code).not.toContain('registerDialogStyles(');
	});

	it('leaves styles to the site with `styles: false`', async () => {
		const { calls } = await runSetup({ mode: offlineMode(), styles: false });
		expect(
			calls.injectScript.mock.calls.some(([stage]) => stage === 'page-ssr')
		).toBe(false);
	});

	it('injects a page-level boot script', async () => {
		const { calls } = await runSetup({ mode: offlineMode() });
		const [stage, code] = calls.injectScript.mock.calls[0] as [string, string];
		expect(stage).toBe('page');
		expect(code).toContain("import options from 'virtual:c15t/options'");
		expect(code).toContain(`from ${specifier('@c15t/astro/client')}`);
		expect(code).toContain('boot(options);');
	});

	it.each([
		['svelte', '@c15t/astro/ui/svelte', 'panel-surface.svelte'],
		['react', '@c15t/astro/ui/react', 'panel-surface.tsx'],
		['vue', '@c15t/astro/ui/vue', 'panel-surface.vue'],
	] as const)(
		'registers only the %s adapter and island',
		async (ui, adapterModule, surfaceFile) => {
			const { calls } = await runSetup({ mode: offlineMode(), ui });
			const [, code] = calls.injectScript.mock.calls[0] as [string, string];

			expect(code).toContain(`registerDialogAdapter(${JSON.stringify(ui)}`);
			expect(code).toContain(`import(${specifier(adapterModule)})`);
			expect(code).toContain(
				`import(${specifier(`@c15t/astro/islands/${surfaceFile}`)})`
			);

			// The point of injecting these: a build must never see a specifier
			// for a framework the site did not ask for.
			for (const other of ['svelte', 'react', 'vue'].filter(
				(name) => name !== ui
			)) {
				expect(code).not.toContain(resolveOwnEntry(`@c15t/astro/ui/${other}`));
			}
		}
	);

	it.each([
		['offline()', { mode: offlineMode() }, {}, 'offlineTransport'],
		[
			'hosted() with no adapter',
			{ mode: hostedMode({ backendURL: 'https://consent.example.com' }) },
			{},
			'hostedTransport',
		],
		[
			'hosted() with an adapter',
			{ mode: hostedMode({ backendURL: 'https://consent.example.com' }) },
			{ adapter: { name: '@astrojs/node' } },
			'lazyTransport',
		],
		[
			'manifest()',
			{
				backendURL: 'https://consent.example.com',
				mode: manifestMode({ source: 'runtime' }),
			},
			{ adapter: { name: '@astrojs/node' } },
			'lazyTransport',
		],
	] satisfies [string, C15tAstroOptions, Record<string, unknown>, string][])(
		'registers the one transport %s needs',
		async (_name, options, config, transport) => {
			const { calls } = await runSetup(options, config);
			const [, code] = calls.injectScript.mock.calls[0] as [string, string];
			expect(code).toContain(
				`registerTransport, ${transport} } from ${specifier('@c15t/astro/client')};`
			);
			expect(code).toContain(`registerTransport(${transport});`);
			expect(code.indexOf('registerTransport(')).toBeLessThan(
				code.indexOf('boot(options')
			);
		}
	);

	it('keeps both island specifiers behind import()', async () => {
		const { calls } = await runSetup({ mode: offlineMode(), ui: 'react' });
		const [, code] = calls.injectScript.mock.calls[0] as [string, string];
		expect(code).not.toMatch(/^import\s[^;]*@c15t\/astro\/(?:ui|islands)\//mu);
	});

	it('loads the script loader on demand for a site without scripts', async () => {
		const { calls } = await runSetup({ mode: offlineMode() });
		const [, code] = calls.injectScript.mock.calls[0] as [string, string];
		expect(code).not.toContain('@c15t/core/modules/script-loader');
		expect(code).not.toContain('@c15t/core/modules/network-blocker');
		expect(code).not.toContain('registerRuntimeModules({');
	});

	it('ships the script loader and blocker with the page when configured', async () => {
		const { calls } = await runSetup({
			mode: offlineMode(),
			networkBlocker: {
				rules: [{ category: 'measurement', domain: 'example.com', id: 'ga' }],
			},
			scripts: [
				{ category: 'measurement', id: 'ga', src: 'https://example.com/ga.js' },
			],
		});
		const [, code] = calls.injectScript.mock.calls[0] as [string, string];
		expect(code).toContain(
			`import { createScriptLoader } from ${specifier('@c15t/core/modules/script-loader')};`
		);
		expect(code).toContain(
			`import { createNetworkBlocker } from ${specifier('@c15t/core/modules/network-blocker')};`
		);
		expect(code).toContain(
			'registerRuntimeModules({ createScriptLoader, createNetworkBlocker });'
		);
		// Registered before the runtime starts.
		expect(code.indexOf('registerRuntimeModules({')).toBeLessThan(
			code.indexOf('boot(options')
		);
	});

	it.each([
		['no `iab` option', {}],
		['`iab: false`', { iab: false }],
		['`iab.enabled: false`', { iab: { cmpId: 160, enabled: false } }],
	] as const)('ships no IAB wiring with %s', async (_label, iabOptions) => {
		// The Nuxt module once mounted the CMP for a site that never set `iab`.
		// Here a site without it must not even reach the mount or the
		// `import()` that fetches `@c15t/iab`.
		const { calls } = await runSetup({ mode: offlineMode(), ...iabOptions });
		const [, code] = calls.injectScript.mock.calls[0] as [string, string];
		expect(code).not.toContain('registerIAB(');
		expect(code).not.toContain(resolveOwnEntry('@c15t/iab'));
		expect(code).not.toContain('mountRuntimeIAB');
	});

	it('registers the IAB wiring before boot when `iab` is set', async () => {
		const { calls } = await runSetup({
			iab: { cmpId: 160 },
			mode: offlineMode(),
		});
		const [, code] = calls.injectScript.mock.calls[0] as [string, string];
		expect(code).toContain(
			`import { mountRuntimeIAB } from ${specifier('@c15t/core/runtime/on-demand')};`
		);
		expect(code).toContain(
			`registerIAB({ ...createLazyIABFactory(() => import(${specifier('@c15t/iab')})), mount: mountRuntimeIAB });`
		);
		// `@c15t/iab` stays behind `import()`.
		const staticImports = code
			.split('\n')
			.filter((line) => line.startsWith('import '));
		expect(
			staticImports.some((line) => line.includes(resolveOwnEntry('@c15t/iab')))
		).toBe(false);
		expect(code.indexOf('registerIAB(')).toBeLessThan(
			code.indexOf('boot(options')
		);
	});

	it('keeps what a client entrypoint may configure static', async () => {
		const { calls } = await runSetup({
			clientEntrypoint: 'site/c15t.client',
			mode: offlineMode(),
		});
		const [, code] = calls.injectScript.mock.calls[0] as [string, string];
		expect(code).toContain(
			'registerRuntimeModules({ createScriptLoader, createNetworkBlocker, connectConsentSource });'
		);
		// Its blocker rules are not known at build time: on demand, imported
		// on its own so the boot chunk names no other module's chunk.
		expect(code).toContain(
			`import { networkBlockerOnDemand as createNetworkBlocker } from ${specifier('@c15t/core/runtime/on-demand-factories')};`
		);
		expect(code).not.toContain('@c15t/core/modules/network-blocker');
	});

	it('threads a client entrypoint into the boot script', async () => {
		const { calls } = await runSetup({
			clientEntrypoint: 'site/c15t.client',
			mode: offlineMode(),
		});
		const [, code] = calls.injectScript.mock.calls[0] as [string, string];
		expect(code).toContain('import clientOptions from "site/c15t.client"');
		expect(code).toContain('boot(options, clientOptions);');
	});

	it('resolves a relative client entrypoint from the project root', async () => {
		const root = mkdtempSync(join(tmpdir(), 'c15t-astro-client-'));
		mkdirSync(join(root, 'src'));
		writeFileSync(join(root, 'src', 'consent.ts'), 'export default {};');
		const { calls } = await runSetup(
			{ clientEntrypoint: './src/consent.ts', mode: offlineMode() },
			{ root: pathToFileURL(`${root}/`) }
		);
		const [, code] = calls.injectScript.mock.calls[0] as [string, string];
		expect(code).toContain(
			`import clientOptions from ${JSON.stringify(join(root, 'src', 'consent.ts'))}`
		);
		await expect(
			runSetup(
				{ clientEntrypoint: './src/missing.ts', mode: offlineMode() },
				{ root: pathToFileURL(`${root}/`) }
			)
		).rejects.toThrow(
			/does not exist. Relative paths start from the project root/u
		);
	});

	it('finds src/c15t.client.ts on its own', async () => {
		const root = mkdtempSync(join(tmpdir(), 'c15t-astro-client-'));
		mkdirSync(join(root, 'src'));
		const file = join(root, 'src', 'c15t.client.ts');
		writeFileSync(file, 'export default {};');
		expect(
			await resolveClientEntrypoint(undefined, pathToFileURL(`${root}/`))
		).toBe(file);
		const empty = mkdtempSync(join(tmpdir(), 'c15t-astro-client-'));
		expect(
			await resolveClientEntrypoint(undefined, pathToFileURL(`${empty}/`))
		).toBeUndefined();
	});

	it('keeps the client entrypoint path out of the browser options', async () => {
		const { calls } = await runSetup({
			clientEntrypoint: 'site/c15t.client',
			mode: offlineMode(),
		});
		const [update] = calls.updateConfig.mock.calls[0] ?? [];
		const [plugin] = update.vite.plugins;
		const client = plugin.load('\0virtual:c15t/options', { ssr: false });
		expect(client).not.toContain('site/c15t.client');
		for (const key of ['middleware', 'inlineStyles', 'clientEntrypoint']) {
			expect(client).not.toContain(`"${key}"`);
		}
		expect(plugin.load('\0virtual:c15t/options', { ssr: true })).toContain(
			'"clientEntrypoint":"site/c15t.client"'
		);
	});

	it('quotes client entrypoints without letting them add statements', async () => {
		const clientEntrypoint = "client'\\file.ts';globalThis.injected=true;//";
		const { calls } = await runSetup({
			clientEntrypoint,
			mode: offlineMode(),
		});
		const [, code] = calls.injectScript.mock.calls[0] as [string, string];
		const module = parse(code, { sourceType: 'module' });
		const entrypointImports = module.program.body.filter(
			(statement) =>
				statement.type === 'ImportDeclaration' &&
				statement.specifiers.some(
					(imported) => imported.local.name === 'clientOptions'
				)
		);
		expect(entrypointImports).toHaveLength(1);
		expect(entrypointImports[0]).toMatchObject({
			source: { value: clientEntrypoint },
		});
	});

	it('serves the serialized options from the virtual module', async () => {
		const { calls } = await runSetup({
			consentCategories: ['necessary', 'measurement'],
			gpp: { usApproach: 'national', usFallback: 'none' },
			mode: hostedMode({ backendURL: 'https://consent.example.com' }),
		});
		const [config] = calls.updateConfig.mock.calls[0] as [
			{
				vite: {
					plugins: {
						resolveId: (id: string) => string;
						load: (id: string) => string;
					}[];
				};
			},
		];
		const [plugin] = config.vite.plugins;
		const resolved = plugin?.resolveId('virtual:c15t/options') as string;
		expect(resolved).toBe('\0virtual:c15t/options');

		const loaded = plugin?.load(resolved) as string;
		const parsed = JSON.parse(
			loaded.replace(/^export default /u, '').replace(/;$/u, '')
		);
		expect(parsed.mode).toEqual({
			backendURL: 'https://consent.example.com',
			type: 'hosted',
		});
		expect(parsed.consentCategories).toEqual(['necessary', 'measurement']);
		expect(parsed.gpp).toEqual({ usApproach: 'national', usFallback: 'none' });
	});

	it("shims Nuxt's #imports for the vue adapter only", async () => {
		const withVue = await runSetup({ mode: offlineMode(), ui: 'vue' });
		const [vueConfig] = withVue.calls.updateConfig.mock.calls[0] as [
			{ vite: { plugins: { name: string }[] } },
		];
		expect(vueConfig.vite.plugins.map((plugin) => plugin.name)).toEqual([
			'c15t:options',
			'c15t:class-maps-without-css',
			'@c15t/vue',
		]);

		const withSvelte = await runSetup({ mode: offlineMode() });
		const [svelteConfig] = withSvelte.calls.updateConfig.mock.calls[0] as [
			{ vite: { plugins: { name: string }[] } },
		];
		expect(svelteConfig.vite.plugins.map((plugin) => plugin.name)).toEqual([
			'c15t:options',
			'c15t:class-maps-without-css',
		]);
	});

	it('injects one catch-all route in manifest mode', async () => {
		const { calls } = await runSetup({
			backendURL: 'https://consent.example.com',
			mode: manifestMode(),
			routePrefix: '/consent',
		});
		expect(calls.injectRoute).toHaveBeenCalledTimes(1);
		expect(calls.injectRoute).toHaveBeenCalledWith({
			entrypoint: resolveOwnEntry('@c15t/astro/api'),
			pattern: '/consent/[...path]',
			prerender: false,
		});
	});

	it('prerenders the route for browser resolution on a site with no adapter', async () => {
		const options: C15tAstroOptions = {
			backendURL: 'https://consent.example.com',
			mode: manifestMode({ resolve: 'browser' }),
		};
		const { calls } = await runSetup(options);
		expect(calls.injectRoute).toHaveBeenCalledWith(
			expect.objectContaining({
				pattern: '/api/c15t/[...path]',
				prerender: true,
			})
		);
		const withAdapter = await runSetup(options, {
			adapter: { name: '@astrojs/node' },
		});
		expect(withAdapter.calls.injectRoute).toHaveBeenCalledWith(
			expect.objectContaining({ prerender: false })
		);
	});

	it.each([
		['hosted mode', { mode: hostedMode({ backendURL: '/api/c15t' }) }],
		['offline mode', { mode: offlineMode() }],
		[
			'routePrefix: false',
			{
				backendURL: 'https://consent.example.com',
				mode: manifestMode(),
				routePrefix: false,
			},
		],
	] satisfies [string, C15tAstroOptions][])(
		'injects no route with %s',
		async (_name, options) => {
			const { calls } = await runSetup(options);
			expect(calls.injectRoute).not.toHaveBeenCalled();
		}
	);
});

describe('astro:config:done', () => {
	/** Run setup for `command`, then done, the way Astro does. */
	const runForCommand = (
		options: C15tAstroOptions,
		command: string,
		adapter?: { name: string }
	) => runDone(options, ['@astrojs/svelte'], adapter, command);
	const MANIFEST: C15tAstroOptions = {
		backendURL: 'https://consent.example.com',
		mode: manifestMode(),
	};

	it('names the injected route when a build has no adapter', async () => {
		const done = await runForCommand(MANIFEST, 'build');
		await expect(done()).rejects.toThrowError(
			/on-demand route at \/api\/c15t\/\[\.\.\.path\], which needs a server adapter.*hosted\(\), offline\(\) or manifest\(\{ resolve: 'browser' \}\)/u
		);
	});

	it("lets manifest({ resolve: 'browser' }) build without an adapter", async () => {
		const done = await runForCommand(
			{ ...MANIFEST, mode: manifestMode({ resolve: 'browser' }) },
			'build'
		);
		await expect(done()).resolves.toBeUndefined();
	});

	it('adds the App.Locals type for Astro.locals.c15t', async () => {
		const done = await runForCommand(MANIFEST, 'dev');
		await done();
		expect(done.injectTypes).toHaveBeenCalledWith({
			content: expect.stringMatching(
				/c15t: import\('(?:c15t\/astro|@c15t\/astro)'\)\.C15tLocals;/u
			),
			filename: 'locals.d.ts',
		});
		const content = await buildLocalsTypes(undefined);
		expect(content).toMatch(/^declare namespace App \{/u);
	});

	it.each(['dev', 'sync'])(
		'lets `astro %s` run without an adapter, as Astro does',
		async (command) => {
			const done = await runForCommand(MANIFEST, command);
			await expect(done()).resolves.toBeUndefined();
		}
	);

	it('lets manifest mode build with an adapter', async () => {
		const done = await runForCommand(MANIFEST, 'build', {
			name: '@astrojs/node',
		});
		await expect(done()).resolves.toBeUndefined();
	});

	it('lets manifest mode build statically with `routePrefix: false`', async () => {
		const done = await runForCommand(
			{ ...MANIFEST, routePrefix: false },
			'build'
		);
		await expect(done()).resolves.toBeUndefined();
	});

	it.each([
		['svelte', '@astrojs/svelte'],
		['react', '@astrojs/react'],
		['vue', '@astrojs/vue'],
	] as const)(
		'fails clearly when %s is selected without %s',
		async (ui, astroIntegration) => {
			const run = await runDone({ mode: offlineMode(), ui }, []);
			await expect(run()).rejects.toThrowError(
				new RegExp(`ui: "${ui}" needs ${astroIntegration}`, 'u')
			);
		}
	);

	it('names every package to install in the error log', async () => {
		const run = await runDone({ mode: offlineMode(), ui: 'react' }, []);
		await expect(run()).rejects.toThrow();
		expect(run.logger.error).toHaveBeenCalledWith(
			expect.stringContaining('@astrojs/react, @c15t/react, react, react-dom')
		);
	});

	it.each([
		['svelte', '@astrojs/svelte'],
		['react', '@astrojs/react'],
		['vue', '@astrojs/vue'],
	] as const)(
		'passes when %s has %s installed',
		async (ui, astroIntegration) => {
			const run = await runDone({ mode: offlineMode(), ui }, [
				astroIntegration,
			]);
			await expect(run()).resolves.toBeUndefined();
		}
	);

	it('passes for a banner-only site', async () => {
		const run = await runDone(
			{ mode: offlineMode(), requireUIIntegration: false },
			[]
		);
		await expect(run()).resolves.toBeUndefined();
	});

	it.each([
		[['@astrojs/react'], 'react'],
		[['@astrojs/vue'], 'vue'],
		[['@astrojs/svelte'], 'svelte'],
		[[], 'svelte'],
		[['@astrojs/svelte', '@astrojs/react'], 'svelte'],
		[['@astrojs/react', '@astrojs/vue'], 'svelte'],
	] as const)('infers ui from %j as %s', (installed, ui) => {
		expect(inferUIAdapter(installed)).toBe(ui);
	});

	it('renders the dialog with the one UI integration the site registers', async () => {
		const { calls } = await runSetup(
			{ mode: offlineMode() },
			{ integrations: [{ name: '@astrojs/react' }] }
		);
		const [, code] = calls.injectScript.mock.calls[0] as [string, string];
		expect(code).toContain('registerDialogAdapter("react"');
		expect(code).not.toContain(resolveOwnEntry('@c15t/astro/ui/svelte'));

		const explicit = await runSetup(
			{ mode: offlineMode(), ui: 'svelte' },
			{ integrations: [{ name: '@astrojs/react' }] }
		);
		const [, explicitCode] = explicit.calls.injectScript.mock.calls[0] as [
			string,
			string,
		];
		expect(explicitCode).toContain('registerDialogAdapter("svelte"');
	});
});

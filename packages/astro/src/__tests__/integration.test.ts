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
import { c15t, createOwnEntryResolver, resolveOptions } from '../integration';
import { hostedMode, manifestMode, offlineMode } from '../mode';
import type { C15tAstroOptions } from '../types';

interface SetupCalls {
	addMiddleware: ReturnType<typeof vi.fn>;
	injectRoute: ReturnType<typeof vi.fn>;
	injectScript: ReturnType<typeof vi.fn>;
	logger: { warn: ReturnType<typeof vi.fn> };
	updateConfig: ReturnType<typeof vi.fn>;
}

// `manifest()` mode fetches a build snapshot by default. Keep tests that
// don't stub `fetch` themselves off the network.
beforeEach(() => {
	vi.stubGlobal(
		'fetch',
		vi.fn(() => Promise.reject(new Error('offline in tests')))
	);
});
afterEach(() => {
	vi.unstubAllGlobals();
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
		logger: { warn: vi.fn() },
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

const runDone = function runDone(
	options: C15tAstroOptions,
	integrationNames: string[],
	adapter?: { name: string }
) {
	const integration = c15t(options);
	const logger = { error: vi.fn(), warn: vi.fn() };
	const run = () =>
		integration.hooks['astro:config:done']?.({
			config: {
				adapter,
				integrations: integrationNames.map((name) => ({ name })),
			},
			logger,
		} as unknown as Parameters<
			NonNullable<(typeof integration)['hooks']['astro:config:done']>
		>[0]);
	return Object.assign(run, { logger });
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
		'buildManifest keeps the %s snapshot in server options only',
		async (command) => {
			const fetch = vi.fn<typeof globalThis.fetch>(() =>
				Promise.resolve(Response.json(INLINE_MANIFEST))
			);
			vi.stubGlobal('fetch', fetch);
			try {
				const { calls } = await runSetup(
					{
						buildManifest: true,
						mode: manifestMode({ backendURL: 'https://consent.example.com' }),
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
					expect(clientOptions.mode).toEqual({
						backendURL: 'https://consent.example.com',
						type: 'manifest',
					});
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
	])('buildManifest stops the build on $error', async ({ response, error }) => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(response()))
		);
		try {
			await expect(
				runSetup({
					buildManifest: true,
					mode: manifestMode({ backendURL: 'https://consent.example.com' }),
				})
			).rejects.toThrow(error);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it('preview never fetches a new build snapshot', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		vi.stubGlobal('fetch', fetch);
		try {
			await runSetup(
				{
					buildManifest: true,
					mode: manifestMode({ backendURL: 'https://consent.example.com' }),
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
			mode: manifestMode({ backendURL: 'https://consent.example.com' }),
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

	it('warns and keeps building when the default fetch fails', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(new Response(null, { status: 503 })))
		);
		const { calls } = await runSetup({
			mode: manifestMode({ backendURL: 'https://consent.example.com' }),
		});
		expect(calls.logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('/manifest responded 503')
		);
		expect(calls.logger.warn.mock.calls[0]?.[0]).not.toContain('@c15t/astro');
		expect(serverOptionsSource(calls)).not.toContain('"schemaVersion"');
	});

	it.each([
		['hosted()', { mode: hostedMode({ url: 'https://consent.example.com' }) }],
		['offline()', { mode: offlineMode() }],
		[
			'a relative manifest URL',
			{ mode: manifestMode({ backendURL: '', manifestURL: '/m.json' }) },
		],
		[
			'buildManifest: false',
			{
				buildManifest: false,
				mode: manifestMode({ backendURL: 'https://consent.example.com' }),
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

	it.each(['preview', 'sync'] as const)(
		'buildManifest: true with hosted() leaves %s alone',
		async (command) => {
			await expect(
				runSetup(
					{
						buildManifest: true,
						mode: hostedMode({ url: 'https://consent.example.com' }),
					},
					{},
					command
				)
			).resolves.toBeDefined();
		}
	);

	it('buildManifest: true still needs an absolute upstream URL', async () => {
		await expect(
			runSetup({
				buildManifest: true,
				mode: manifestMode({ backendURL: '', manifestURL: '/m.json' }),
			})
		).rejects.toThrow('absolute upstream URL');
	});

	it('defaults the ui adapter to svelte', () => {
		expect(resolveOptions({ mode: offlineMode() }).ui).toBe('svelte');
	});

	it('enables the injected routes only for manifest mode', () => {
		expect(resolveOptions({ mode: offlineMode() }).endpoints.enabled).toBe(
			false
		);
		expect(
			resolveOptions({
				mode: manifestMode({ backendURL: 'https://consent.example.com' }),
			}).endpoints.enabled
		).toBe(true);
		expect(
			resolveOptions({ mode: manifestMode({ manifest: INLINE_MANIFEST }) })
				.endpoints.enabled
		).toBe(true);
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
			/pass backendURL to manifest\(\)/u
		);
	});

	it('does not read a backend URL from the environment', () => {
		vi.stubEnv('C15T_BACKEND_URL', 'https://consent.example.com');
		vi.stubEnv('PUBLIC_C15T_BACKEND_URL', 'https://consent.example.com');
		try {
			expect(() => resolveOptions({ mode: manifestMode() })).toThrowError(
				'@c15t/astro: pass backendURL to manifest()'
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
					mode: manifestMode({ backendURL: '', manifestURL: '/m.json' }),
				}).mode
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
				resolveOptions({ mode: manifestMode({ backendURL: '' }) })
			).toThrowError(/gives the server no manifest to fetch/u);
		} finally {
			vi.unstubAllEnvs();
		}
	});

	it('accepts an empty backendURL with an inline manifest', () => {
		expect(
			resolveOptions({
				mode: manifestMode({ backendURL: '', manifest: INLINE_MANIFEST }),
			}).mode
		).toHaveProperty('backendURL', '');
	});

	it('does not take the manifest for an empty backendURL from the environment', () => {
		vi.stubEnv('C15T_MANIFEST_URL', 'https://consent.example.com/manifest');
		try {
			expect(() =>
				resolveOptions({ mode: manifestMode({ backendURL: '' }) })
			).toThrowError(/gives the server no manifest to fetch/u);
		} finally {
			vi.unstubAllEnvs();
		}
	});

	it('leaves an inline manifest without a backendURL alone', () => {
		// The network-free path: the app serves its own save route.
		expect(
			resolveOptions({ mode: manifestMode({ manifest: INLINE_MANIFEST }) }).mode
		).not.toHaveProperty('backendURL');
	});

	it('rejects a manifestURL with nowhere to save consent', () => {
		// The injected routes serve init and manifest; `POST /subjects` is
		// the backend's, so a `manifestURL` without one would 404 on save.
		expect(() =>
			resolveOptions({ mode: manifestMode({ manifestURL: '/m.json' }) })
		).toThrowError(/pass backendURL to manifest\(\)/u);
		expect(
			resolveOptions({
				mode: manifestMode({
					backendURL: 'https://consent.example.com',
					manifestURL: '/m.json',
				}),
			}).mode
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

	it('keeps custom route paths', () => {
		const resolved = resolveOptions({
			endpoints: { enabled: true, initPath: '/consent/init' },
			mode: offlineMode(),
		});
		expect(resolved.endpoints.initPath).toBe('/consent/init');
		expect(resolved.endpoints.manifestPath).toBe('/api/c15t/manifest');
	});

	it('rejects a missing mode', () => {
		expect(() =>
			resolveOptions({} as unknown as C15tAstroOptions)
		).toThrowError(/`mode` is required/u);
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
			clientEntrypoint: './src/c15t.client.ts',
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
			mode: hostedMode({ url: '/api/c15t' }),
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
			clientEntrypoint: './src/c15t.client.ts',
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
			clientEntrypoint: './src/c15t.client.ts',
			mode: offlineMode(),
		});
		const [, code] = calls.injectScript.mock.calls[0] as [string, string];
		expect(code).toContain('import clientOptions from "./src/c15t.client.ts"');
		expect(code).toContain('boot(options, clientOptions);');
	});

	it('quotes client entrypoints without letting them add statements', async () => {
		const clientEntrypoint = "./client'\\file.ts';globalThis.injected=true;//";
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
			mode: hostedMode({ url: 'https://consent.example.com' }),
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
			type: 'hosted',
			url: 'https://consent.example.com',
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

	it('injects the init and manifest routes in manifest mode', async () => {
		const { calls } = await runSetup({
			mode: manifestMode({ backendURL: 'https://consent.example.com' }),
		});
		expect(calls.injectRoute).toHaveBeenCalledWith({
			entrypoint: resolveOwnEntry('@c15t/astro/api/init'),
			pattern: '/api/c15t/init',
			prerender: false,
		});
		expect(calls.injectRoute).toHaveBeenCalledWith({
			entrypoint: resolveOwnEntry('@c15t/astro/api/manifest'),
			pattern: '/api/c15t/manifest',
			prerender: false,
		});
	});

	it('injects no routes in hosted mode', async () => {
		const { calls } = await runSetup({
			mode: hostedMode({ url: '/api/c15t' }),
		});
		expect(calls.injectRoute).not.toHaveBeenCalled();
	});
});

describe('astro:config:done', () => {
	/** Run setup for `command`, then done, the way Astro does. */
	const runForCommand = async function runForCommand(
		options: C15tAstroOptions,
		command: string,
		adapter?: { name: string }
	) {
		const integration = c15t(options);
		await integration.hooks['astro:config:setup']?.({
			addMiddleware: vi.fn(),
			command,
			injectRoute: vi.fn(),
			injectScript: vi.fn(),
			logger: { warn: vi.fn() },
			updateConfig: vi.fn(),
		} as unknown as Parameters<
			NonNullable<(typeof integration)['hooks']['astro:config:setup']>
		>[0]);
		return () =>
			integration.hooks['astro:config:done']?.({
				config: { adapter, integrations: [{ name: '@astrojs/svelte' }] },
				logger: { error: vi.fn(), warn: vi.fn() },
			} as unknown as Parameters<
				NonNullable<(typeof integration)['hooks']['astro:config:done']>
			>[0]);
	};
	const MANIFEST: C15tAstroOptions = {
		mode: manifestMode({ backendURL: 'https://consent.example.com' }),
	};

	it('names the injected routes when a build has no adapter', async () => {
		const done = await runForCommand(MANIFEST, 'build');
		expect(done).toThrowError(
			/manifest mode injects on-demand routes at \/api\/c15t\/init.*need a server adapter/u
		);
	});

	it('tells an explicit `endpoints` site how to build statically', async () => {
		const done = await runForCommand(
			{ endpoints: true, mode: offlineMode() },
			'build'
		);
		expect(done).toThrowError(/`endpoints` injects .*set `endpoints: false`/u);
	});

	it.each(['dev', 'sync'])(
		'lets `astro %s` run without an adapter, as Astro does',
		async (command) => {
			const done = await runForCommand(MANIFEST, command);
			expect(done).not.toThrow();
		}
	);

	it('lets manifest mode build with an adapter', async () => {
		const done = await runForCommand(MANIFEST, 'build', {
			name: '@astrojs/node',
		});
		expect(done).not.toThrow();
	});

	it('lets manifest mode build statically with `endpoints: false`', async () => {
		const done = await runForCommand(
			{ ...MANIFEST, endpoints: false },
			'build'
		);
		expect(done).not.toThrow();
	});

	it.each([
		['svelte', '@astrojs/svelte'],
		['react', '@astrojs/react'],
		['vue', '@astrojs/vue'],
	] as const)(
		'fails clearly when %s is selected without %s',
		(ui, astroIntegration) => {
			const run = runDone({ mode: offlineMode(), ui }, []);
			expect(run).toThrowError(
				new RegExp(`ui: "${ui}" needs ${astroIntegration}`, 'u')
			);
		}
	);

	it('names every package to install in the error log', () => {
		const run = runDone({ mode: offlineMode(), ui: 'react' }, []);
		expect(run).toThrow();
		expect(run.logger.error).toHaveBeenCalledWith(
			expect.stringContaining('@astrojs/react, @c15t/react, react, react-dom')
		);
	});

	it.each([
		['svelte', '@astrojs/svelte'],
		['react', '@astrojs/react'],
		['vue', '@astrojs/vue'],
	] as const)('passes when %s has %s installed', (ui, astroIntegration) => {
		expect(
			runDone({ mode: offlineMode(), ui }, [astroIntegration])
		).not.toThrow();
	});

	it('passes for a banner-only site', () => {
		expect(
			runDone({ mode: offlineMode(), requireUIIntegration: false }, [])
		).not.toThrow();
	});

	it.each(['@astrojs/react', '@astrojs/vue'])(
		'suggests reusing %s when ui was left at the default',
		(astroIntegration) => {
			const run = runDone({ mode: offlineMode() }, [
				'@astrojs/svelte',
				astroIntegration,
			]);
			run();
			expect(run.logger.warn).toHaveBeenCalledWith(
				expect.stringContaining(astroIntegration)
			);
		}
	);

	it('never switches the adapter on its own', async () => {
		const options: C15tAstroOptions = { mode: offlineMode() };
		runDone(options, ['@astrojs/svelte', '@astrojs/react'])();

		// The suggestion is advice, not a decision: the page still boots the
		// Svelte island until someone sets `ui` themselves.
		const { calls } = await runSetup(options);
		const [, code] = calls.injectScript.mock.calls[0] as [string, string];
		expect(code).toContain('registerDialogAdapter("svelte"');
		expect(code).not.toContain(resolveOwnEntry('@c15t/astro/ui/react'));
	});

	it('stays quiet when ui was chosen explicitly', () => {
		const run = runDone({ mode: offlineMode(), ui: 'svelte' }, [
			'@astrojs/svelte',
			'@astrojs/react',
		]);
		run();
		expect(run.logger.warn).not.toHaveBeenCalled();
	});
});

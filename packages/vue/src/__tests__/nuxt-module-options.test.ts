/**
 * The Nuxt module's options, as they reach the app through the public
 * runtime config.
 */
import { runWithNuxtContext } from '@nuxt/kit';
import { beforeAll, describe, expect, test, vi } from 'vitest';

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
	ssr = true
): Nuxt {
	return {
		hook: () => () => undefined,
		hooks: { addHooks: () => undefined, hook: () => () => undefined },
		options: {
			_requiredModules: {},
			alias: {},
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
		expect((await setUp({}, false)).ssr).toBe(false);
		expect((await setUp({})).ssr).toBe(true);
	});

	test('stays out of the runtime config the browser receives', async () => {
		const config = await publicConfig({ initPrefetch: false });
		expect(config).not.toHaveProperty('initPrefetch');
	});
});

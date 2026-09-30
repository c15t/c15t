/**
 * The Nuxt module's options, as they reach the app through the public
 * runtime config.
 */
import { runWithNuxtContext } from '@nuxt/kit';
import type { Nuxt } from '@nuxt/schema';
import { describe, expect, test } from 'vitest';

import module from '../module';

/** The parts of a Nuxt instance the module's setup touches. */
const createNuxt = function createNuxt(c15t: Record<string, unknown>): Nuxt {
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
			plugins: [],
			rootDir: '/virtual',
			runtimeConfig: { public: {} },
			serverHandlers: [],
			srcDir: '/virtual',
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

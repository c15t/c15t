/**
 * Colour-scheme plumbing.
 *
 * `c15t-dark` on `<html>` is the only thing that makes the surfaces dark —
 * the stylesheet carries no `prefers-color-scheme` block — so these cover
 * the two places that set it: the resolved option that reaches the browser,
 * and the inline script that runs before the first paint.
 */

import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import ConsentBanner from '../components/consent-banner.astro';
import ConsentScript from '../components/consent-script.astro';
import { c15t, resolveOptions } from '../integration';
import { offlineMode } from '../mode';
import { buildColorSchemeScript, resolveConsentContext } from '../server';
import type { C15tAstroOptions, C15tLocals } from '../types';

let container: AstroContainer;

beforeAll(async () => {
	container = await AstroContainer.create();
});

const buildLocals = async function buildLocals(
	options: C15tAstroOptions = { mode: offlineMode() }
): Promise<C15tLocals> {
	return await resolveConsentContext({
		headers: new Headers(),
		options: resolveOptions(options),
	});
};

const serializedOptions = async function serializedOptions(
	options: C15tAstroOptions
) {
	const integration = c15t(options);
	const updateConfig = vi.fn();
	await integration.hooks['astro:config:setup']?.({
		addMiddleware: vi.fn(),
		injectRoute: vi.fn(),
		injectScript: vi.fn(),
		updateConfig,
	} as unknown as Parameters<
		NonNullable<(typeof integration)['hooks']['astro:config:setup']>
	>[0]);
	const [config] = updateConfig.mock.calls[0] as [
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
	const loaded = plugin?.load(
		plugin.resolveId('virtual:c15t/options') as string
	) as string;
	return JSON.parse(loaded.replace(/^export default /u, '').replace(/;$/u, ''));
};

describe('the colorScheme option', () => {
	it('defaults to system', () => {
		expect(resolveOptions({ mode: offlineMode() }).colorScheme).toBe('system');
	});

	it.each(['light', 'dark', 'system'] as const)('keeps %s', (colorScheme) => {
		expect(
			resolveOptions({ colorScheme, mode: offlineMode() }).colorScheme
		).toBe(colorScheme);
	});

	it('reaches the browser through the virtual options module', async () => {
		expect(
			(await serializedOptions({ colorScheme: 'dark', mode: offlineMode() }))
				.colorScheme
		).toBe('dark');
		expect((await serializedOptions({ mode: offlineMode() })).colorScheme).toBe(
			'system'
		);
	});
});

describe('buildColorSchemeScript', () => {
	it('emits nothing for light, because light is the absence of the class', () => {
		expect(buildColorSchemeScript('light')).toBe('');
	});

	it('sets the class unconditionally for dark', () => {
		expect(buildColorSchemeScript('dark')).toContain(
			"classList.add('c15t-dark')"
		);
		expect(buildColorSchemeScript('dark')).not.toContain('matchMedia');
	});

	it('reads prefers-color-scheme for system', () => {
		const script = buildColorSchemeScript('system');
		expect(script).toContain('(prefers-color-scheme:dark)');
		expect(script).toContain("'c15t-dark'");
	});

	it('survives a webview with no matchMedia', () => {
		// A throw in a parser-blocking head script takes the rest of the
		// document with it.
		expect(buildColorSchemeScript('system')).toMatch(/^try\{.*\}catch/su);
	});

	it.each(['light', 'dark', 'system'] as const)(
		'keeps %s under the inline budget and free of framework code',
		(colorScheme) => {
			const script = buildColorSchemeScript(colorScheme);
			expect(new TextEncoder().encode(script).length).toBeLessThan(300);
			expect(script).not.toMatch(/\bimport\b|\brequire\b|\bexport\b/u);
		}
	);
});

describe('<ConsentScript />', () => {
	const render = async function render(locals: C15tLocals): Promise<string> {
		return await container.renderToString(ConsentScript, {
			locals: { c15t: locals },
		});
	};

	it('runs the colour-scheme script before the config script', async () => {
		const html = await render(await buildLocals());
		const colorScheme = html.indexOf('prefers-color-scheme');
		const config = html.indexOf('__c15tAstroConfig');
		expect(colorScheme).toBeGreaterThan(-1);
		expect(config).toBeGreaterThan(colorScheme);
	});

	it('emits the dark variant when the site pinned dark', async () => {
		const html = await render(
			await buildLocals({ colorScheme: 'dark', mode: offlineMode() })
		);
		expect(html).toContain("classList.add('c15t-dark')");
		expect(html).not.toContain('prefers-color-scheme');
	});

	it('emits no colour-scheme script for light', async () => {
		const html = await render(
			await buildLocals({ colorScheme: 'light', mode: offlineMode() })
		);
		expect(html).not.toContain('c15t-dark');
		expect(html).toContain('__c15tAstroConfig');
	});

	it('emits once per request, even alongside a banner', async () => {
		// One `locals` object for both renders: that identity is what the
		// emission guard keys off, and Astro hands the same one to every
		// component in a request.
		const locals = { c15t: await buildLocals() };
		const head = await container.renderToString(ConsentScript, { locals });
		const banner = await container.renderToString(ConsentBanner, {
			locals,
			props: {},
		});
		expect(head).toContain('prefers-color-scheme');
		expect(banner).not.toContain('prefers-color-scheme');
	});
});

describe('<ConsentBanner /> without a <ConsentScript /> in head', () => {
	it('emits the colour-scheme script before its own markup', async () => {
		const html = await container.renderToString(ConsentBanner, {
			locals: { c15t: await buildLocals() },
			props: {},
		});
		const script = html.indexOf('prefers-color-scheme');
		const root = html.indexOf('consent-banner-root');
		expect(script).toBeGreaterThan(-1);
		expect(root).toBeGreaterThan(script);
	});
});

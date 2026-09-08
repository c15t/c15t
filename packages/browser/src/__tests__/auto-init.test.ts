import { afterEach, describe, expect, it, vi } from 'vitest';

import { readPageOptions, readScriptOptions } from '../auto-init';
import { createGlobal, installGlobal } from '../global';
import type { C15tGlobal } from '../global';

type TestWindow = Window & {
	c15t?: unknown;
};

const testWindow = window as TestWindow;

const clearCookies = function clearCookies(): void {
	for (const entry of document.cookie.split(';')) {
		const name = entry.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
};

const scriptWith = function scriptWith(
	attributes: Record<string, string>
): HTMLScriptElement {
	const script = document.createElement('script');
	for (const [name, value] of Object.entries(attributes)) {
		script.setAttribute(name, value);
	}
	return script;
};

afterEach(() => {
	(testWindow.c15t as C15tGlobal | undefined)?.dispose?.();
	testWindow.c15t = undefined;
	localStorage.clear();
	clearCookies();
	document.body.replaceChildren();
});

describe('readScriptOptions', () => {
	it('maps data attributes to client options', () => {
		const options = readScriptOptions(
			scriptWith({
				'data-backend-url': 'https://x.c15t.dev',
				'data-categories': 'measurement, marketing',
				'data-color-scheme': 'dark',
				'data-country': 'DE',
				'data-hide-branding': '',
				'data-policies': 'europeOptIn,worldNoBanner',
				'data-privacy-policy-url': '/privacy',
				'data-trigger': 'true',
			})
		);

		expect(options).toEqual({
			backendURL: 'https://x.c15t.dev',
			consentCategories: ['measurement', 'marketing'],
			legalLinks: { privacyPolicy: { href: '/privacy' } },
			overrides: { country: 'DE' },
			policies: ['europeOptIn', 'worldNoBanner'],
			ui: {
				banner: { hideBranding: true },
				colorScheme: 'dark',
				dialog: { hideBranding: true },
				trigger: true,
			},
		});
	});

	it('turns the UI off with data-no-ui', () => {
		expect(readScriptOptions(scriptWith({ 'data-no-ui': '' }))).toEqual({
			ui: false,
		});
	});

	it('ignores unknown modes and schemes', () => {
		expect(
			readScriptOptions(
				scriptWith({ 'data-color-scheme': 'sepia', 'data-mode': 'magic' })
			)
		).toEqual({});
	});

	it('returns nothing without a script element', () => {
		expect(readScriptOptions(null)).toEqual({});
	});
});

describe('readPageOptions', () => {
	it('layers queued config over the script attributes, in order', () => {
		const { manual, options } = readPageOptions(
			scriptWith({
				'data-backend-url': 'https://x.c15t.dev',
				'data-color-scheme': 'light',
			}),
			[
				{ consentCategories: ['marketing'], ui: { trigger: true } },
				{ consentCategories: ['measurement'] },
			]
		);

		expect(manual).toBe(false);
		expect(options).toEqual({
			backendURL: 'https://x.c15t.dev',
			consentCategories: ['measurement'],
			ui: { colorScheme: 'light', trigger: true },
		});
	});

	it('honours data-manual', () => {
		expect(readPageOptions(scriptWith({ 'data-manual': '' })).manual).toBe(
			true
		);
		expect(readPageOptions(null).manual).toBe(false);
	});
});

describe('window.c15t', () => {
	it('waits for init before ready() and on() fire', async () => {
		const api = createGlobal({ pkg: '@c15t/browser/test' });
		installGlobal(api);
		const onReady = vi.fn();
		api.on('ready', onReady);
		const ready = api.ready();
		expect(() => api.getSnapshot()).toThrow(/init/u);

		api.init({ consentCategories: ['measurement'], ui: false });

		await expect(ready).resolves.toMatchObject({ activeUI: 'banner' });
		await vi.waitFor(() => {
			expect(onReady).toHaveBeenCalledOnce();
		});
		expect(api.mode).toBe('offline');
		expect(testWindow.c15t).toBe(api);
		expect(api.version).toBeTypeOf('string');
	});

	it('replays calls queued before the script loaded, config included', async () => {
		const onConsent = vi.fn();
		testWindow.c15t = [
			['config', { consentCategories: ['measurement'], ui: false }],
			['on', 'consent', onConsent],
		];
		const api = createGlobal({ pkg: '@c15t/browser/test' });

		installGlobal(api);
		const client = api.init();
		await api.ready();
		await api.acceptAll();

		expect(client.options.consentCategories).toEqual(['measurement']);
		expect(onConsent).toHaveBeenCalled();
	});

	it('lets init() options win over queued config, and warns after init', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
			/* silenced */
		});
		const api = createGlobal({ pkg: '@c15t/browser/test' });
		installGlobal(api);
		api.config({ consentCategories: ['marketing'], ui: false });

		const client = api.init({ consentCategories: ['measurement'] });
		api.config({ consentCategories: ['functionality'] });

		expect(client.options.consentCategories).toEqual(['measurement']);
		expect(client.options.ui).toBe(false);
		expect(warn).toHaveBeenCalledOnce();
		warn.mockRestore();
	});

	it('stays on window.c15t after the runtime starts', () => {
		const api = createGlobal({ pkg: '@c15t/browser/test' });
		installGlobal(api);

		api.init({ ui: false });

		// `@c15t/core` writes its own frozen debug object there on start.
		expect(testWindow.c15t).toBe(api);
		expect(api.init({ ui: false })).toBe(api.client);
	});
});

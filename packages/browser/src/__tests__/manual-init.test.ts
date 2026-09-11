import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';

import { autoInit, createGlobal, installGlobal } from '../global';
import type { C15tGlobal } from '../global';
import type { ConsentClientOptions } from '../types';

type TestWindow = Window & {
	c15t?: unknown;
};

const testWindow = window as TestWindow;

const scriptWith = function scriptWith(
	attributes: Record<string, string>
): HTMLScriptElement {
	const script = document.createElement('script');
	for (const [name, value] of Object.entries(attributes)) {
		script.setAttribute(name, value);
	}
	return script;
};

const installManual = function installManual(): {
	api: C15tGlobal;
	currentScript: MockInstance<() => Document['currentScript']>;
	script: HTMLScriptElement;
} {
	const script = scriptWith({
		'data-backend-url': 'https://original.c15t.dev',
		'data-categories': 'measurement',
		'data-color-scheme': 'dark',
		'data-country': 'DE',
		'data-manual': '',
	});
	document.body.append(script);
	const currentScript = vi
		.spyOn(document, 'currentScript', 'get')
		.mockReturnValue(script);
	const api = installGlobal(createGlobal({ pkg: '@c15t/browser' }));
	// Disabled clients still resolve their transport and options, without
	// issuing backend requests or mounting UI in these lifecycle tests.
	api.config({ enabled: false });
	expect(autoInit(api)).toBeNull();
	return { api, currentScript, script };
};

afterEach(() => {
	(testWindow.c15t as C15tGlobal | undefined)?.dispose?.();
	testWindow.c15t = undefined;
	vi.restoreAllMocks();
	localStorage.clear();
	document.body.replaceChildren();
});

describe('manual initialization', () => {
	it.each(['inline script', 'event callback'])(
		'keeps the bundle tag configuration when init runs in a later %s',
		(context) => {
			const { api, currentScript } = installManual();
			currentScript.mockReturnValue(
				context === 'inline script'
					? scriptWith({
							'data-backend-url': 'https://unrelated.c15t.dev',
							'data-categories': 'marketing',
							'data-mode': 'offline',
						})
					: null
			);

			const client = api.init();

			expect(client.mode).toBe('hosted');
			expect(client.options).toMatchObject({
				backendURL: 'https://original.c15t.dev',
				consentCategories: ['measurement'],
				overrides: { country: 'DE' },
				ui: { colorScheme: 'dark' },
			});
		}
	);

	it('captures attributes before the bundle tag is changed and removed', () => {
		const { api, currentScript, script } = installManual();
		script.setAttribute('data-backend-url', 'https://changed.c15t.dev');
		script.remove();
		currentScript.mockReturnValue(null);

		expect(api.init().options.backendURL).toBe('https://original.c15t.dev');
	});

	it('layers queued config and explicit init options over the captured tag', () => {
		const queuedOptions: ConsentClientOptions = {
			backendURL: 'https://queued.c15t.dev',
			consentCategories: ['marketing'],
			ui: { trigger: true },
		};
		testWindow.c15t = [['config', queuedOptions]];
		const { api, currentScript } = installManual();
		api.config({ consentCategories: ['functionality'] });
		currentScript.mockReturnValue(null);

		const client = api.init({
			backendURL: 'https://explicit.c15t.dev',
			consentCategories: ['measurement', 'marketing'],
		});

		expect(client.mode).toBe('hosted');
		expect(client.options).toMatchObject({
			backendURL: 'https://explicit.c15t.dev',
			consentCategories: ['measurement', 'marketing'],
			overrides: { country: 'DE' },
			ui: { colorScheme: 'dark', trigger: true },
		});
	});

	it('keeps the first bundle tag configuration when a second bundle loads', () => {
		const { api, currentScript } = installManual();
		currentScript.mockReturnValue(
			scriptWith({
				'data-backend-url': 'https://duplicate.c15t.dev',
				'data-manual': '',
			})
		);
		const duplicate = installGlobal(
			createGlobal({ pkg: '@c15t/browser/headless' })
		);
		expect(autoInit(duplicate)).toBeNull();
		currentScript.mockReturnValue(null);

		expect(duplicate).toBe(api);
		expect(duplicate.init().options.backendURL).toBe(
			'https://original.c15t.dev'
		);
		expect(duplicate.init()).toBe(api.client);
	});
});

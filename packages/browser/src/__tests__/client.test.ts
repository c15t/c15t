import { policyRulePresets, custom } from '@c15t/core';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createConsentClient } from '../client';
import type { ConsentClient } from '../types';

const clients: ConsentClient[] = [];

const clearCookies = function clearCookies(): void {
	for (const entry of document.cookie.split(';')) {
		const name = entry.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
};

const start = function start(
	options: Parameters<typeof createConsentClient>[0] = {}
): ConsentClient {
	const client = createConsentClient(
		{
			consentCategories: ['measurement', 'marketing'],
			policyRules: [
				{
					...policyRulePresets.europeOptIn(),
					categories: ['measurement', 'marketing'],
					match: { isDefault: true },
					scopeMode: 'strict',
				},
			],
			...options,
		},
		{ pkg: '@c15t/browser/test' }
	);
	clients.push(client);
	client.start();
	return client;
};

const cleanUp = function cleanUp(): void {
	for (const client of clients.splice(0)) {
		client.dispose();
	}
	localStorage.clear();
	clearCookies();
	document.body.replaceChildren();
};

/** A client whose saves go to `save`. */
const withSave = (
	save: () => Promise<{ ok: boolean }>,
	options: Parameters<typeof start>[0] = {}
) =>
	start({
		...options,
		mode: custom({
			init: () =>
				Promise.resolve({
					policyResolution: writePolicyResolutionWire(
						resolvePolicyRules({
							rules: [
								{
									...policyRulePresets.europeOptIn(),
									categories: ['measurement', 'marketing'],
									match: { isDefault: true },
									scopeMode: 'strict',
								},
							],
						})
					),
				}),
			save,
		}),
	});

// The client loads its script loader and network blocker, the save
// outbox's queue and persistence's writer on demand. The first test to
// need one would pay for its cold import, which a busy runner can stretch
// past a second. One client loads them all before any test runs.
beforeAll(async () => {
	const save = vi.fn(() => Promise.resolve({ ok: true }));
	const client = withSave(save, {
		scripts: [
			{
				category: 'necessary',
				id: 'warm-up',
				textContent: 'window.__warmUp = true;',
			},
		],
	});
	await client.ready();
	await client.save({ marketing: false, measurement: true });
	await vi.waitFor(
		() => {
			expect(save).toHaveBeenCalledOnce();
			expect(localStorage.getItem('c15t')).toContain('measurement');
			expect(
				Array.from(document.scripts).some((script) =>
					script.textContent?.includes('__warmUp')
				)
			).toBe(true);
		},
		{ timeout: 10_000 }
	);
	cleanUp();
}, 15_000);

afterEach(cleanUp);

describe('createConsentClient', () => {
	for (const surface of ['banner', 'dialog'] as const) {
		for (const outcome of ['pending', 'rejected'] as const) {
			it(`closes the ${surface} before a ${outcome} save settles`, async () => {
				const save = vi.fn(() =>
					outcome === 'pending'
						? Promise.withResolvers<{ ok: boolean }>().promise
						: Promise.reject(new Error('offline'))
				);
				const client = withSave(save);
				await client.ready();
				const onError = vi.fn();
				client.on('error', onError);
				if (surface === 'dialog') {
					client.openDialog();
				}
				expect(client.getSnapshot().activeUI).toBe(surface);
				const saving = client.save({ marketing: false, measurement: true });
				// Closed in the calling task, before the request starts.
				expect(client.getSnapshot().activeUI).toBe('none');
				expect(save).not.toHaveBeenCalled();
				expect(client.hasConsented()).toBe(true);
				await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
				expect(localStorage.getItem('c15t')).toContain('measurement');
				const settled = await Promise.race([
					saving,
					new Promise<null>((resolve) => {
						setTimeout(() => resolve(null), 20);
					}),
				]);
				// A failed request resolves `save()` with ok: false and reaches
				// the error event once; a pending one does neither.
				expect(settled?.ok ?? null).toBe(outcome === 'rejected' ? false : null);
				expect(onError).toHaveBeenCalledTimes(outcome === 'rejected' ? 1 : 0);
				await new Promise((resolve) => {
					setTimeout(resolve, 20);
				});
				expect(client.getSnapshot().activeUI).toBe('none');
				expect(
					client.getSnapshot().explicitChoice?.categories.measurement?.value
				).toBe(true);
			});
		}
	}

	it('resolves an offline policy and asks for the banner', async () => {
		const client = start();
		const snapshot = await client.ready();

		expect(client.mode).toBe('offline');
		expect(snapshot.activeUI).toBe('banner');
		expect(snapshot.model).toBe('opt-in');
		expect(client.hasConsented()).toBe(false);
		expect(client.consentCategories).toEqual([
			'necessary',
			'measurement',
			'marketing',
		]);
	});

	it('lists consentCategories in the fixed display order, as the dialog does', async () => {
		// Configured as marketing, experience, measurement; the resolved
		// policy scope is sorted alphabetically. The client follows neither:
		// it lists the categories in the display order the preference draft
		// uses in every framework.
		const categories = ['marketing', 'experience', 'measurement'] as const;
		const client = start({
			consentCategories: [...categories],
			policyRules: [
				{
					...policyRulePresets.europeOptIn(),
					categories: [...categories],
					match: { isDefault: true },
					scopeMode: 'strict',
				},
			],
		});
		await client.ready();
		expect(client.getSnapshot().policyRule.scope).toEqual([
			'experience',
			'marketing',
			'measurement',
		]);
		expect(client.consentCategories).toEqual([
			'necessary',
			'measurement',
			'experience',
			'marketing',
		]);
	});

	it('acceptAll grants the offered categories and closes the UI', async () => {
		const client = start();
		await client.ready();
		const onConsent = vi.fn();
		client.on('consent', onConsent);

		await client.acceptAll();

		expect(client.hasConsented()).toBe(true);
		expect(client.has('measurement')).toBe(true);
		expect(client.has('marketing')).toBe(true);
		expect(client.getSnapshot().activeUI).toBe('none');
		expect(onConsent).toHaveBeenCalled();
	});

	it('rejectAll keeps only strictly necessary', async () => {
		const client = start();
		await client.ready();

		await client.rejectAll();

		expect(client.has('necessary')).toBe(true);
		expect(client.has('measurement')).toBe(false);
	});

	it('save persists a partial choice', async () => {
		const client = start();
		await client.ready();

		await client.save({ marketing: false, measurement: true });

		expect(client.has('measurement')).toBe(true);
		expect(client.has('marketing')).toBe(false);
		expect(client.hasConsented()).toBe(true);
	});

	it('emits ui changes as client events and document events', async () => {
		const client = start();
		await client.ready();
		const onUI = vi.fn();
		const onDocument = vi.fn();
		client.on('ui', onUI);
		document.addEventListener('c15t:ui', onDocument);

		client.openDialog();

		expect(onUI).toHaveBeenCalledWith('dialog');
		expect(onDocument).toHaveBeenCalledOnce();
		expect(onDocument.mock.calls[0]?.[0]).toMatchObject({ detail: 'dialog' });
		document.removeEventListener('c15t:ui', onDocument);
	});

	it('emits a surface impression as a client event and a document event', async () => {
		const client = start();
		const onShown = vi.fn();
		const onDocument = vi.fn();
		client.on('surfaceShown', onShown);
		document.addEventListener('c15t:surfaceShown', onDocument);
		await client.ready();

		expect(onShown).toHaveBeenCalledOnce();
		expect(onShown.mock.calls[0]?.[0]).toMatchObject({ surface: 'banner' });
		expect(onDocument.mock.calls[0]?.[0]).toMatchObject({
			detail: { surface: 'banner' },
		});
		expect(client.getSnapshot().surfaceShownAt.banner).toBe(
			onShown.mock.calls[0]?.[0].shownAt
		);
		document.removeEventListener('c15t:surfaceShown', onDocument);
	});

	it('replays ready and the current surface to listeners attached after init', async () => {
		const client = start();
		await client.ready();
		const onReady = vi.fn();
		const onUI = vi.fn();

		client.on('ready', onReady);
		client.on('ui', onUI);

		expect(onReady).toHaveBeenCalledOnce();
		expect(onUI).toHaveBeenCalledWith('banner');
	});

	it('wires data-c15t-action buttons anywhere on the page', async () => {
		const client = start();
		await client.ready();
		const accept = document.createElement('button');
		accept.setAttribute('data-c15t-action', 'accept');
		document.body.append(accept);

		accept.click();
		await vi.waitFor(() => {
			expect(client.hasConsented()).toBe(true);
		});
	});

	it('opens the preference centre from a #c15t-preferences link', async () => {
		const client = start();
		await client.ready();
		const link = document.createElement('a');
		link.href = '#c15t-preferences';
		link.textContent = 'Cookie settings';
		document.body.append(link);

		link.click();

		expect(client.getSnapshot().activeUI).toBe('dialog');
	});

	it('remembers a stored choice on the next page load', async () => {
		const first = start();
		await first.ready();
		await first.acceptAll();
		first.dispose();

		const second = start();
		expect(second.hasConsented()).toBe(true);
		expect(second.getSnapshot().activeUI).toBe('none');
		await second.ready();
		expect(second.getSnapshot().activeUI).toBe('none');
	});

	it('picks hosted mode from a backendURL and requires one for hosted', () => {
		expect(() =>
			createConsentClient({ mode: 'hosted' }, { pkg: 'test' })
		).toThrow(/backendURL/u);

		const client = createConsentClient(
			{ backendURL: 'https://example.test' },
			{ pkg: 'test' }
		);
		clients.push(client);
		expect(client.mode).toBe('hosted');
	});

	it('resolves policy presets by name and picks one by country', async () => {
		const german = start({
			overrides: { country: 'DE' },
			policyRules: ['europeOptIn', 'usPrivacyStatesOptOut', 'worldNone'],
		});
		expect((await german.ready()).model).toBe('opt-in');
		german.dispose();

		const californian = start({
			overrides: { country: 'US', region: 'CA' },
			policyRules: ['europeOptIn', 'usPrivacyStatesOptOut', 'worldNone'],
		});
		expect((await californian.ready()).model).toBe('opt-out');
		californian.dispose();

		const elsewhere = start({
			overrides: { country: 'BR' },
			policyRules: ['europeOptIn', 'usPrivacyStatesOptOut', 'worldNone'],
		});
		const snapshot = await elsewhere.ready();
		expect(snapshot.model).toBe('none');
		expect(snapshot.activeUI).toBe('none');
	});

	it('rejects inherited object keys as preset names', () => {
		expect(() =>
			createConsentClient(
				{ policyRules: ['constructor' as never] },
				{ pkg: 'test' }
			)
		).toThrow(/unknown policy preset/u);
	});

	it('rejects an unknown policy preset name', () => {
		expect(() =>
			createConsentClient(
				{ policyRules: ['everywhereOptIn' as never] },
				{ pkg: 'test' }
			)
		).toThrow(/unknown policy preset/u);
	});

	it('throws from mountUI in the headless build', () => {
		const client = start({ ui: false });
		expect(() => client.mountUI()).toThrow(/headless/u);
	});

	it('exposes the ui theme with the assigned arm merged over it', async () => {
		const client = start({
			experiment: {
				arm: 'bold',
				arms: {
					bold: { theme: { colors: { primary: '#123456' } } },
				},
				id: 'button-style',
			},
			ui: { theme: { colors: { surface: '#abcdef' } } },
		});
		await client.ready();
		expect(client.theme).toEqual({
			colors: { primary: '#123456', surface: '#abcdef' },
		});
		expect(start({ ui: false }).theme).toBeUndefined();
	});

	it('keeps the theme undefined for a headless client with an arm theme', async () => {
		const client = start({
			experiment: {
				arm: 'bold',
				arms: { bold: { theme: { colors: { primary: '#123456' } } } },
				id: 'button-style',
			},
			ui: false,
		});
		await client.ready();
		expect(client.getSnapshot().experiment?.arm).toBe('bold');
		expect(client.theme).toBeUndefined();
	});
	it('resolves ready straight away when disabled', async () => {
		const client = start({ enabled: false });
		await expect(client.ready()).resolves.toBeDefined();
		expect(client.has('marketing')).toBe(true);
	});
});

describe('on() listener isolation', () => {
	it('keeps notifying listeners and the document after one throws', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {
			/* expected */
		});
		const client = start();
		await client.ready();
		const failure = new Error('listener failed');
		const later = vi.fn();
		const onDocument = vi.fn();
		client.on('consent', () => {
			throw failure;
		});
		client.on('consent', later);
		document.addEventListener('c15t:consent', onDocument);

		await client.acceptAll();

		expect(later).toHaveBeenCalledOnce();
		expect(onDocument).toHaveBeenCalledOnce();
		expect(error).toHaveBeenCalledWith(
			expect.stringContaining('"consent" listener threw'),
			failure
		);
		document.removeEventListener('c15t:consent', onDocument);
		error.mockRestore();
	});

	it('returns an unsubscribe when a replayed ready listener throws', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {
			/* expected */
		});
		const client = start();
		await client.ready();

		const off = client.on('ready', () => {
			throw new Error('ready listener failed');
		});

		expect(off).toBeTypeOf('function');
		expect(error).toHaveBeenCalledOnce();
		error.mockRestore();
	});
});

describe('runtime options', () => {
	it('keeps nothing in storage with persistence off', async () => {
		const client = start({ persistence: false });
		await client.ready();

		await client.acceptAll();
		// Storage writes land one task after the save.
		await new Promise((resolve) => {
			setTimeout(resolve, 10);
		});

		expect(client.has('measurement')).toBe(true);
		expect(document.cookie).not.toContain('c15t');
		expect(Object.keys(localStorage)).toEqual([]);
	});

	it('declares vendors given in the options', async () => {
		const client = start({
			vendors: [{ category: 'marketing', id: 'example-pixel' }],
		});
		await client.ready();

		expect(
			client.getSnapshot().vendors?.declared.map((vendor) => vendor.id)
		).toContain('example-pixel');
	});

	it('stamps the nonce on scripts it loads and reports to scriptLoader', async () => {
		const onDebug = vi.fn();
		const client = start({
			nonce: 'page-nonce',
			scriptLoader: { onDebug },
			scripts: [
				{
					category: 'necessary',
					id: 'nonce-probe',
					textContent: 'window.__nonceProbe = true;',
				},
			],
		});
		await client.ready();

		// The first test in this file to import the on-demand script loader,
		// so a busy runner can take over a second to load it.
		await vi.waitFor(
			() => {
				const loaded = Array.from(document.scripts).find((script) =>
					script.textContent?.includes('__nonceProbe')
				);
				expect(loaded?.nonce).toBe('page-nonce');
			},
			{ timeout: 5000 }
		);
		expect(onDebug).toHaveBeenCalled();
	});

	it('runs scripts once the on-demand script loader lands', async () => {
		const client = start({
			scripts: [
				{
					category: 'necessary',
					id: 'on-demand-probe',
					textContent: 'window.__onDemandProbe = true;',
				},
			],
		});
		const probe = () =>
			Array.from(document.scripts).some((script) =>
				script.textContent?.includes('__onDemandProbe')
			);
		await client.ready();
		await vi.dynamicImportSettled();
		expect(probe()).toBe(true);
	});
});

describe('processIframes', () => {
	it('checks frames on demand when automatic blocking is off', async () => {
		const iframe = document.createElement('iframe');
		iframe.setAttribute('data-category', 'marketing');
		iframe.setAttribute('src', 'https://example.com/embed');
		document.body.append(iframe);
		const client = start({
			iframeBlocker: { disableAutomaticBlocking: true },
		});
		await client.ready();
		expect(iframe.getAttribute('src')).toBe('https://example.com/embed');

		client.processIframes();
		expect(iframe.getAttribute('src')).toBeNull();

		await client.acceptAll();
		expect(iframe.getAttribute('src')).toBeNull();
		client.processIframes();
		expect(iframe.getAttribute('src')).toBe('https://example.com/embed');
	});
});

describe('translations', () => {
	const german = {
		de: { cookieBanner: { title: 'Wir schätzen Ihre Privatsphäre' } },
	};

	it('keeps an i18n override over hosted init copy for the same language', async () => {
		const client = start({
			i18n: { messages: { en: { cookieBanner: { title: 'App title' } } } },
			mode: custom({
				init: () =>
					Promise.resolve({
						policyResolution: writePolicyResolutionWire(
							resolvePolicyRules({ rules: [policyRulePresets.worldNone()] })
						),
						translations: {
							language: 'en',
							translations: {
								cookieBanner: {
									description: 'Backend description',
									title: 'Backend title',
								},
							} as never,
						},
					}),
			}),
		});

		const { translations } = await client.ready();
		expect(translations?.translations.cookieBanner.title).toBe('App title');
		expect(translations?.translations.cookieBanner.description).toBe(
			'Backend description'
		);
	});

	it('offline mode renders the language named by overrides (data-language)', async () => {
		const client = start({
			i18n: { messages: german },
			overrides: { language: 'de' },
		});

		const { translations } = await client.ready();
		expect(translations?.language).toBe('de');
		expect(translations?.translations.cookieBanner.title).toBe(
			'Wir schätzen Ihre Privatsphäre'
		);
		// Keys German does not override fall back to bundled English.
		expect(translations?.translations.common.acceptAll).toBe('Accept All');
	});

	it('offline setLanguage switches the copy when that language is available', async () => {
		const client = start({ i18n: { messages: german } });
		expect((await client.ready()).translations?.language).toBe('en');

		client.setLanguage('de');
		await vi.waitFor(() =>
			expect(client.getSnapshot().translations?.language).toBe('de')
		);
		expect(
			client.getSnapshot().translations?.translations.cookieBanner.title
		).toBe('Wir schätzen Ihre Privatsphäre');

		// No bundled or supplied copy for French: the default copy returns,
		// labelled as what it is rather than as French.
		client.setLanguage('fr');
		await client.kernel.commands.init();
		expect(client.getSnapshot().translations?.language).toBe('en');
		expect(
			client.getSnapshot().translations?.translations.cookieBanner.title
		).toBe('We value your privacy');
	});
});

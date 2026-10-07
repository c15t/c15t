import { policyRulePresets } from '@c15t/core';
import type { GPPPingData } from '@c15t/iab/gpp';
import {
	POLICY_CONTRACT_HEADER,
	POLICY_CONTRACT_VERSION,
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { translations } from '@c15t/translations/en';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createGlobal } from '../global';
import { autoInit, installGlobal } from '../global-base';
import type { C15tGlobalBase } from '../global-base';
import { createHostedGlobal } from '../hosted-global';
import { createOfflineGlobal } from '../offline-global';
import type { ConsentClientOptions } from '../types';

const testWindow = window as Window & { c15t?: unknown };
const policy = {
	...policyRulePresets.europeOptIn(),
	categories: ['measurement'] as const,
	match: { isDefault: true },
	scopeMode: 'strict' as const,
};
const resolution = resolvePolicyRules({ rules: [policy] });
const entries = [
	{ create: createHostedGlobal, mode: 'hosted' },
	{ create: createOfflineGlobal, mode: 'offline' },
] as const;

const scriptWith = function scriptWith(
	attributes: Record<string, string>
): HTMLScriptElement {
	const script = document.createElement('script');
	for (const [name, value] of Object.entries(attributes)) {
		script.setAttribute(name, value);
	}
	return script;
};

const optionsFor = function optionsFor(
	mode: 'hosted' | 'offline'
): ConsentClientOptions {
	return {
		...(mode === 'hosted'
			? { backendURL: 'https://consent.example.test' }
			: { policyRules: [policy] }),
		consentCategories: ['measurement'],
		prefetch: { initialPolicyResolution: resolution },
		reloadOnConsentRevoked: false,
		ui: false,
	};
};

const installed = function installed(): C15tGlobalBase {
	return testWindow.c15t as C15tGlobalBase;
};

const loadTag = async function loadTag(
	mode: 'hosted' | 'offline'
): Promise<C15tGlobalBase> {
	vi.resetModules();
	if (mode === 'hosted') {
		await import('../entries/cdn');
	} else {
		await import('../entries/cdn-offline');
	}
	return installed();
};

const loadGPP = async function loadGPP(): Promise<void> {
	vi.resetModules();
	await import('../entries/cdn-gpp');
};

const ping = function ping(): GPPPingData | undefined {
	let result: GPPPingData | undefined;
	window.__gpp?.('ping', (data) => {
		result = data as GPPPingData;
	});
	return result;
};

afterEach(() => {
	installed()?.dispose?.();
	testWindow.c15t = undefined;
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	localStorage.clear();
	for (const entry of document.cookie.split(';')) {
		const name = entry.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; Max-Age=0; path=/`;
		}
	}
	delete window.__gpp;
	document.body.replaceChildren();
});

describe.each(entries)('$mode browser global', ({ create, mode }) => {
	it('exposes its supported factory without the other transport factories', () => {
		const api = create();
		expect(api.pkg).toBe(`@c15t/browser/${mode}`);
		expect(api).toHaveProperty(mode, expect.any(Function));
		const unsupported = ['hosted', 'offline', 'manifest', 'custom'].filter(
			(other) => other !== mode
		);
		for (const other of unsupported) {
			expect(api).not.toHaveProperty(other);
		}
	});

	it.each(['magic', 'manifest', ''])(
		'rejects explicit data-mode=%j',
		(value) => {
			vi.spyOn(document, 'currentScript', 'get').mockReturnValue(
				scriptWith({ 'data-manual': '', 'data-mode': value })
			);
			expect(() => create()).toThrow(/data-mode/u);
		}
	);

	it('keeps the bundle tag options for a later manual init and re-init', async () => {
		const script = scriptWith({
			...(mode === 'hosted'
				? { 'data-backend-url': 'https://consent.example.test' }
				: { 'data-policy-rules': 'europeOptIn' }),
			'data-categories': 'marketing',
			'data-color-scheme': 'dark',
			'data-manual': '',
			'data-mode': mode,
			'data-nonce': 'tag-nonce',
		});
		const currentScript = vi
			.spyOn(document, 'currentScript', 'get')
			.mockReturnValue(script);
		testWindow.c15t = [
			['config', { consentCategories: ['measurement'], enabled: false }],
		];
		const api = installGlobal(create());
		expect(autoInit(api)).toBeNull();
		script.remove();
		currentScript.mockReturnValue(null);

		const first = api.init({ consentCategories: ['functionality'] });
		await api.ready();
		expect(first.mode).toBe(mode);
		expect(first.options).toMatchObject({
			consentCategories: ['functionality'],
			nonce: 'tag-nonce',
			ui: { colorScheme: 'dark' },
		});
		expect(api.init()).toBe(first);
		api.dispose();
		const second = api.init();
		await api.ready();
		expect(second).not.toBe(first);
		expect(second.options).toMatchObject({
			consentCategories: ['measurement'],
			nonce: 'tag-nonce',
			ui: { colorScheme: 'dark' },
		});
	});

	it('auto-initializes the CDN entry and saves the first choice synchronously', async () => {
		const fetchSpy = vi.fn<typeof fetch>(() =>
			Promise.resolve(Response.json({ subjectId: 'sub_browser_mode' }))
		);
		vi.stubGlobal('fetch', fetchSpy);
		const loaded = vi.fn();
		testWindow.c15t = [
			[
				'config',
				{
					...optionsFor(mode),
					scripts: [
						{
							callbackOnly: true,
							category: 'measurement',
							id: 'optional-measurement',
							onLoad: loaded,
						},
					],
				},
			],
		];
		vi.spyOn(document, 'currentScript', 'get').mockReturnValue(
			scriptWith({ 'data-no-ui': '' })
		);

		const api = await loadTag(mode);
		await api.ready();
		expect(api.mode).toBe(mode);
		expect(api.pkg).toBe(
			mode === 'hosted' ? '@c15t/browser' : '@c15t/browser/offline'
		);
		expect(loaded).not.toHaveBeenCalled();
		const saving = api.acceptAll();
		expect(api.has('measurement')).toBe(true);
		expect(api.getSnapshot().activeUI).toBe('none');
		await expect(saving).resolves.toMatchObject({
			confirmed: ['measurement'],
			ok: true,
		});
		await vi.waitFor(() => expect(loaded).toHaveBeenCalledOnce());
		expect(
			fetchSpy.mock.calls.map(([url, request]) => ({
				method: request?.method,
				url: String(url),
			}))
		).toEqual(
			mode === 'hosted'
				? [{ method: 'POST', url: 'https://consent.example.test/subjects' }]
				: []
		);
	});

	it('replays consent actions in order and discards actions from a disposed client', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn<typeof fetch>(() => Promise.resolve(Response.json({ ok: true })))
		);
		const consent = vi.fn();
		testWindow.c15t = [
			['config', optionsFor(mode)],
			['on', 'consent', consent],
			['acceptAll'],
			['rejectAll'],
		];
		const api = installGlobal(create());
		api.init();
		await vi.waitFor(() => expect(consent).toHaveBeenCalledTimes(2));
		expect(api.has('measurement')).toBe(false);

		api.dispose();
		const accept = vi.spyOn(api, 'acceptAll');
		api.push(['acceptAll']);
		await Promise.resolve();
		api.dispose();
		api.init();
		api.push(['openDialog']);
		await vi.waitFor(() => expect(api.getSnapshot().activeUI).toBe('dialog'));
		expect(accept).not.toHaveBeenCalled();
	});

	it('reuses the first global when the bundle or generic bundle loads again', async () => {
		testWindow.c15t = [['config', optionsFor(mode)]];
		const first = installGlobal(create());
		first.init();
		await first.ready();
		const duplicate = installGlobal(create());
		const generic = installGlobal(createGlobal({ pkg: '@c15t/browser' }));
		expect(duplicate).toBe(first);
		expect(generic).toBe(first);
		expect(autoInit(duplicate)).toBe(first.client);
	});

	it.each(['before', 'after'] as const)(
		'accepts the GPP add-on %s init',
		async (order) => {
			const california = {
				...policyRulePresets.californiaOptOut(),
				match: { isDefault: true },
			};
			const config: ConsentClientOptions = {
				...optionsFor(mode),
				overrides: { country: 'US', region: 'CA' },
				persistence: false,
				prefetch: {
					initialPolicyResolution: resolvePolicyRules({
						rules: [california],
					}),
				},
			};
			if (mode === 'offline') {
				config.policyRules = [california];
			}
			testWindow.c15t = [['config', config]];
			if (order === 'before') {
				await loadGPP();
			}
			expect(ping()?.cmpStatus).toBe(order === 'before' ? 'stub' : undefined);
			const api = installGlobal(create());
			api.init();
			await api.ready();
			if (order === 'after') {
				await loadGPP();
			}
			await vi.waitFor(() =>
				expect(ping()).toMatchObject({
					applicableSections: [8],
					cmpStatus: 'loaded',
					signalStatus: 'ready',
				})
			);
			api.dispose();
			expect(window.__gpp).toBeUndefined();
		}
	);
});

describe('default CDN entry', () => {
	it('selects hosted from the backend tag without an explicit mode', async () => {
		testWindow.c15t = [
			[
				'config',
				{
					prefetch: { initialPolicyResolution: resolution },
					ui: false,
				},
			],
		];
		vi.spyOn(document, 'currentScript', 'get').mockReturnValue(
			scriptWith({ 'data-backend-url': 'https://consent.example.test' })
		);

		const api = await loadTag('hosted');
		await api.ready();

		expect(api.pkg).toBe('@c15t/browser');
		expect(api.mode).toBe('hosted');
		expect(api).toHaveProperty('hosted', expect.any(Function));
		for (const factory of ['offline', 'manifest', 'custom']) {
			expect(api).not.toHaveProperty(factory);
		}
	});

	it('reports hosting from init on the default CDN entry', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn<typeof fetch>(() =>
				Promise.resolve(
					Response.json(
						{
							branding: 'c15t',
							hosting: 'inth',
							location: { countryCode: 'DE', regionCode: null },
							policyResolution: writePolicyResolutionWire(resolution),
							translations: { language: 'en', translations },
						},
						{
							headers: {
								[POLICY_CONTRACT_HEADER]: String(POLICY_CONTRACT_VERSION),
							},
						}
					)
				)
			)
		);
		vi.spyOn(document, 'currentScript', 'get').mockReturnValue(
			scriptWith({
				'data-backend-url': 'https://consent.example.test',
				'data-manual': '',
				'data-no-ui': '',
			})
		);

		const api = await loadTag('hosted');
		expect(api.hosting).toBeNull();
		api.init();
		await api.ready();
		expect(api.hosting).toBe('inth');
		api.dispose();
		expect(api.hosting).toBeNull();
	});

	it('requires a backend rather than falling back to offline', async () => {
		const fetchSpy = vi.fn<typeof fetch>();
		vi.stubGlobal('fetch', fetchSpy);
		vi.spyOn(document, 'currentScript', 'get').mockReturnValue(
			scriptWith({ 'data-no-ui': '' })
		);

		await expect(loadTag('hosted')).rejects.toThrow(/provide backendURL/u);

		expect(installed().client).toBeNull();
		expect(fetchSpy).not.toHaveBeenCalled();
		expect(localStorage.length).toBe(0);
	});

	it.each<[string, ConsentClientOptions, RegExp]>([
		['offline mode', { mode: 'offline' }, /only hosted mode/u],
		['preset names', { policyRules: ['europeOptIn'] }, /policy preset names/u],
		[
			'inline manifest',
			{ manifest: { branding: 'c15t', revision: '1', schemaVersion: 2 } },
			/manifest inputs/u,
		],
		['manifest URL', { manifestURL: '/manifest' }, /manifest inputs/u],
	])('rejects %s before starting', async (_name, options, error) => {
		const fetchSpy = vi.fn<typeof fetch>();
		vi.stubGlobal('fetch', fetchSpy);
		testWindow.c15t = [
			[
				'config',
				{ backendURL: 'https://consent.example.test', ui: false, ...options },
			],
		];

		await expect(loadTag('hosted')).rejects.toThrow(error);

		expect(installed().client).toBeNull();
		expect(fetchSpy).not.toHaveBeenCalled();
		expect(localStorage.length).toBe(0);
	});

	it('rejects an offline script-tag mode', async () => {
		vi.spyOn(document, 'currentScript', 'get').mockReturnValue(
			scriptWith({ 'data-mode': 'offline' })
		);

		await expect(loadTag('hosted')).rejects.toThrow(/data-mode/u);
		expect(testWindow.c15t).toBeUndefined();
	});
});

describe('offline CDN entry', () => {
	it('resolves offline presets without a backend or explicit mode', async () => {
		const fetchSpy = vi.fn<typeof fetch>();
		vi.stubGlobal('fetch', fetchSpy);
		testWindow.c15t = [
			[
				'config',
				{
					consentCategories: ['measurement'],
					overrides: { country: 'DE' },
					policyRules: ['europeOptIn'],
					ui: false,
				},
			],
		];

		const api = await loadTag('offline');
		const snapshot = await api.ready();
		await api.acceptAll();

		expect(api.mode).toBe('offline');
		expect(snapshot.model).toBe('opt-in');
		expect(api.has('measurement')).toBe(true);
		expect(fetchSpy).not.toHaveBeenCalled();
	});
});

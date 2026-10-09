import { custom, policyRulePresets } from '@c15t/core';
import type { PolicyRule } from '@c15t/core';
import {
	POLICY_CONTRACT_HEADER,
	POLICY_CONTRACT_VERSION,
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { translations } from '@c15t/translations/en';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createConsentClient as createHostedClient, hosted } from '../hosted';
import { createHostedConsentClient } from '../hosted-client';
import {
	createConsentClient as createOfflineClient,
	offline,
} from '../offline';
import { createOfflineConsentClient } from '../offline-client';
import type {
	ConsentClient,
	ConsentClientOptions,
	ConsentUIOptions,
} from '../types';

/** A request URL without the consent journey query the runtime adds. */
/** A request URL without the `c15t*` parameters a client adds to `/init`. */
const pathOf = (url: unknown): string => {
	const text = String(url);
	const [base = '', query] = text.split('?');
	if (query === undefined || !/(?:^|&)c15t[A-Z]/u.test(query)) {
		return text;
	}
	const kept = query
		.split('&')
		.filter((pair) => !/^c15t[A-Z]/u.test(pair))
		.join('&');
	return kept ? `${base}?${kept}` : base;
};

const clients: ConsentClient[] = [];
const backendURL = 'https://consent.example.test';
const authoredRule: PolicyRule = {
	...policyRulePresets.europeOptIn(),
	categories: ['measurement', 'marketing'],
	id: 'authored-opt-in',
	match: { isDefault: true },
	scopeMode: 'strict',
};
const policyResolution = resolvePolicyRules({ rules: [authoredRule] });
const uiOptions: ConsentUIOptions = {
	disableAnimation: true,
	shadow: false,
	styles: false,
};

const initResponse = (): Response =>
	Response.json(
		{
			branding: 'c15t',
			location: { countryCode: 'DE', regionCode: null },
			policyResolution: writePolicyResolutionWire(policyResolution),
			translations: { language: 'en', translations },
		},
		{
			headers: {
				[POLICY_CONTRACT_HEADER]: String(POLICY_CONTRACT_VERSION),
			},
		}
	);

const saveResponse = (): Response =>
	Response.json({ ok: true, subjectId: 'sub_browser_entry' });

const track = (client: ConsentClient): ConsentClient => {
	clients.push(client);
	return client;
};

const query = (client: ConsentClient, testId: string): HTMLElement => {
	const element = client.ui?.root.querySelector<HTMLElement>(
		`[data-testid="${testId}"]`
	);
	if (!element) {
		throw new Error(`Missing ${testId}`);
	}
	return element;
};

afterEach(() => {
	for (const client of clients.splice(0)) {
		client.dispose();
	}
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	localStorage.clear();
	for (const entry of document.cookie.split(';')) {
		const name = entry.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; Max-Age=0; path=/`;
		}
	}
	document.body.replaceChildren();
});

describe.each(['hosted', 'offline'] as const)('%s browser entry', (mode) => {
	it('waits for start before requests, persistence and UI mounting', async () => {
		const fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve(initResponse()));
		vi.stubGlobal('fetch', fetchSpy);
		const client = track(
			mode === 'hosted'
				? createHostedClient({ backendURL, ui: uiOptions })
				: createOfflineClient({ policyRules: [authoredRule], ui: uiOptions })
		);

		expect(client.started).toBe(false);
		expect(client.ui).toBeNull();
		expect(document.querySelector('[data-c15t-ui]')).toBeNull();
		expect(localStorage.length).toBe(0);
		expect(document.cookie).toBe('');
		expect(fetchSpy).not.toHaveBeenCalled();

		client.start();
		await client.ready();

		expect(client.mode).toBe(mode);
		expect(client.started).toBe(true);
		expect(query(client, 'consent-banner-root').isConnected).toBe(true);
		expect(fetchSpy).toHaveBeenCalledTimes(mode === 'hosted' ? 1 : 0);
	});

	it('keeps page actions, the preference draft and script gating working', async () => {
		const fetchSpy = vi.fn<typeof fetch>((input) =>
			Promise.resolve(
				String(input).split('?')[0]?.endsWith('/init')
					? initResponse()
					: saveResponse()
			)
		);
		vi.stubGlobal('fetch', fetchSpy);
		for (const category of ['measurement', 'marketing']) {
			const script = document.createElement('script');
			script.type = 'text/plain';
			script.dataset.c15tCategory = category;
			script.textContent = `window.${category} = true;`;
			document.body.append(script);
		}
		const client = track(
			mode === 'hosted'
				? createHostedClient({
						backendURL,
						reloadOnConsentRevoked: false,
						ui: uiOptions,
					})
				: createOfflineClient({
						policyRules: [authoredRule],
						reloadOnConsentRevoked: false,
						ui: uiOptions,
					})
		);
		client.start();
		await client.ready();
		expect(document.querySelector('[data-c15t-activated="true"]')).toBeNull();

		const link = document.createElement('a');
		link.href = '#c15t-preferences';
		document.body.append(link);
		link.click();
		expect(client.getSnapshot().activeUI).toBe('dialog');
		expect(query(client, 'consent-dialog-root').getAttribute('role')).toBe(
			'dialog'
		);
		query(client, 'consent-widget-switch-measurement').click();
		expect(client.has('measurement')).toBe(false);
		query(client, 'consent-widget-footer-save-button').click();
		expect(client.has('measurement')).toBe(true);
		expect(client.has('marketing')).toBe(false);
		expect(client.getSnapshot().activeUI).toBe('none');
		expect(
			client.ui?.root.querySelector('[data-testid="consent-dialog-root"]')
		).toBeNull();
		await vi.waitFor(() =>
			expect(
				document.querySelectorAll(
					'[data-c15t-category="measurement"][data-c15t-activated="true"]'
				)
			).toHaveLength(1)
		);
		expect(
			document.querySelector<HTMLScriptElement>(
				'[data-c15t-category="marketing"]'
			)?.type
		).toBe('text/plain');
		const reject = document.createElement('button');
		reject.dataset.c15tAction = 'reject';
		document.body.append(reject);
		reject.click();
		expect(client.has('measurement')).toBe(false);
		expect(client.getSnapshot().activeUI).toBe('none');
		expect(
			fetchSpy.mock.calls.every(
				([input]) =>
					mode === 'hosted' &&
					[`${backendURL}/init`, `${backendURL}/subjects`].includes(
						pathOf(input)
					)
			)
		).toBe(true);

		client.dispose();
		const click = new MouseEvent('click', { bubbles: true, cancelable: true });
		link.dispatchEvent(click);
		expect(click.defaultPrevented).toBe(false);
		expect(client.ui).toBeNull();
	});
});

describe('hosted browser entry', () => {
	it('uses the resolved /init policy when authored rules are also supplied', async () => {
		const fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve(initResponse()));
		vi.stubGlobal('fetch', fetchSpy);
		const client = track(
			createHostedClient({
				backendURL,
				policyRules: [policyRulePresets.worldNone()],
				ui: false,
			})
		);
		client.start();
		const snapshot = await client.ready();

		expect(fetchSpy.mock.calls.map(([input]) => pathOf(input))).toEqual([
			`${backendURL}/init`,
		]);
		expect(snapshot.resolution.status).toBe('matched');
		expect(snapshot.policyRule.id).toBe(authoredRule.id);
		expect(snapshot.model).toBe('opt-in');
		expect(snapshot.location?.countryCode).toBe('DE');
		expect(client.has('measurement')).toBe(false);
	});

	it('preserves the hosted factory fetch, init URL and allowed headers', async () => {
		const globalFetch = vi.fn<typeof fetch>();
		vi.stubGlobal('fetch', globalFetch);
		const fetchSpy = vi.fn<typeof fetch>((input) =>
			Promise.resolve(
				pathOf(input) === '/consent/init' ? initResponse() : saveResponse()
			)
		);
		const client = track(
			createHostedClient({
				mode: hosted({
					fetch: fetchSpy,
					headers: {
						'Accept-Language': 'de',
						Authorization: 'must-not-forward',
						'CF-IPCountry': 'DE',
					},
					initURL: '/consent/init',
					url: `${backendURL}/api/`,
				}),
				ui: false,
			})
		);
		client.start();
		await client.ready();
		await expect(client.acceptAll()).resolves.toMatchObject({ ok: true });

		expect(fetchSpy.mock.calls.map(([input]) => pathOf(input))).toEqual([
			'/consent/init',
			`${backendURL}/api/subjects`,
		]);
		const headers = new Headers(fetchSpy.mock.calls[0]?.[1]?.headers);
		expect(headers.get('accept-language')).toBe('de');
		expect(headers.get('cf-ipcountry')).toBe('DE');
		expect(headers.has('authorization')).toBe(false);
		expect(globalFetch).not.toHaveBeenCalled();
	});

	it('uses a ready server prefetch without calling /init', async () => {
		const fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve(saveResponse()));
		vi.stubGlobal('fetch', fetchSpy);
		const client = track(
			createHostedClient({
				backendURL,
				prefetch: {
					initialPolicyResolution: policyResolution,
					initialTranslations: { language: 'en', translations },
				},
				ui: false,
			})
		);
		client.start();
		expect((await client.ready()).policyRule.id).toBe(authoredRule.id);
		expect(fetchSpy).not.toHaveBeenCalled();
		await client.rejectAll();
		expect(fetchSpy.mock.calls.map(([input]) => pathOf(input))).toEqual([
			`${backendURL}/subjects`,
		]);
	});

	it.each(['accept', 'reject', 'save'] as const)(
		'applies and persists the first %s before the backend save settles',
		async (action) => {
			const request = Promise.withResolvers<Response>();
			const fetchSpy = vi.fn<typeof fetch>((input) =>
				String(input).split('?')[0]?.endsWith('/init')
					? Promise.resolve(initResponse())
					: request.promise
			);
			vi.stubGlobal('fetch', fetchSpy);
			const client = track(createHostedClient({ backendURL, ui: uiOptions }));
			client.start();
			await client.ready();
			if (action === 'save') {
				client.openDialog();
			}
			const actions = {
				accept: () => client.acceptAll(),
				reject: () => client.rejectAll(),
				save: () => client.save({ marketing: false, measurement: true }),
			};
			const saving = actions[action]();
			const measurement = action !== 'reject';
			const marketing = action === 'accept';

			expect(client.has('measurement')).toBe(measurement);
			expect(client.has('marketing')).toBe(marketing);
			expect(client.hasConsented()).toBe(true);
			expect(client.getSnapshot().activeUI).toBe('none');
			expect(
				client.ui?.root.querySelector(
					'[data-testid="consent-banner-root"], [data-testid="consent-dialog-root"]'
				)
			).toBeNull();
			expect(fetchSpy).toHaveBeenCalledOnce();
			await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
			expect(localStorage.getItem('c15t')).toContain('measurement');
			request.resolve(saveResponse());
			await expect(saving).resolves.toMatchObject({ ok: true });
			client.dispose();

			const next = track(createHostedClient({ backendURL, ui: uiOptions }));
			next.start();
			await next.ready();
			expect(next.has('measurement')).toBe(measurement);
			expect(next.has('marketing')).toBe(marketing);
			expect(next.hasConsented()).toBe(true);
			expect(next.getSnapshot().activeUI).toBe('none');
		}
	);
});

describe('offline browser entry', () => {
	it.each([
		['DE', undefined, 'opt-in', false],
		['US', 'CA', 'opt-out', true],
		['JP', undefined, 'none', true],
	] as const)(
		'resolves preset rules for %s/%s without a backend',
		async (country, region, model, measurement) => {
			const fetchSpy = vi.fn<typeof fetch>();
			vi.stubGlobal('fetch', fetchSpy);
			const client = track(
				createOfflineClient({
					consentCategories: ['measurement'],
					overrides: { country, region },
					policyRules: ['europeOptIn', 'usPrivacyStatesOptOut', 'worldNone'],
					ui: false,
				})
			);
			client.start();
			expect((await client.ready()).model).toBe(model);
			expect(client.has('measurement')).toBe(measurement);
			expect(fetchSpy).not.toHaveBeenCalled();
		}
	);

	it('keeps authored factory rules and custom language changes', async () => {
		const fetchSpy = vi.fn<typeof fetch>();
		vi.stubGlobal('fetch', fetchSpy);
		const client = track(
			createOfflineClient({
				consentCategories: ['measurement', 'experience'],
				i18n: {
					messages: { de: { cookieBanner: { title: 'Ihre Privatsphäre' } } },
				},
				mode: offline({
					policyRules: [
						{
							...authoredRule,
							categories: ['experience'],
							id: 'authored-experience',
						},
					],
				}),
				ui: uiOptions,
			})
		);
		client.start();
		expect((await client.ready()).policyRule.id).toBe('authored-experience');
		expect(client.consentCategories).toEqual(['necessary', 'experience']);
		client.setLanguage('de');
		await vi.waitFor(() =>
			expect(query(client, 'consent-banner-title').textContent).toBe(
				'Ihre Privatsphäre'
			)
		);
		expect(client.getSnapshot().translations?.language).toBe('de');
		await client.save({ experience: true });
		expect(client.has('experience')).toBe(true);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('restores a partial local choice on the next client without a request', async () => {
		const fetchSpy = vi.fn<typeof fetch>();
		vi.stubGlobal('fetch', fetchSpy);
		const client = track(
			createOfflineClient({ policyRules: [authoredRule], ui: false })
		);
		client.start();
		await client.ready();
		await expect(
			client.save({ marketing: false, measurement: true })
		).resolves.toMatchObject({ ok: true });
		client.dispose();

		const next = track(
			createOfflineClient({ policyRules: [authoredRule], ui: false })
		);
		next.start();
		await next.ready();
		expect(next.has('measurement')).toBe(true);
		expect(next.has('marketing')).toBe(false);
		expect(next.hasConsented()).toBe(true);
		expect(next.getSnapshot().activeUI).toBe('none');
		expect(fetchSpy).not.toHaveBeenCalled();
	});
});

const manifest = {
	branding: 'c15t' as const,
	revision: '1',
	schemaVersion: 2 as const,
};
const hostedInvalidCases: [string, ConsentClientOptions][] = [
	['missing backend', {}],
	['preset names', { backendURL, policyRules: ['europeOptIn'] }],
	['inline manifest', { backendURL, manifest }],
	['manifest URL', { backendURL, manifestURL: '/manifest' }],
	['offline mode', { backendURL, mode: 'offline' }],
	['manifest mode', { backendURL, mode: 'manifest' }],
	['offline factory', { mode: offline() }],
	['custom factory', { mode: custom({}) }],
];
const offlineInvalidCases: [string, ConsentClientOptions][] = [
	['backend URL', { backendURL }],
	['inline manifest', { manifest }],
	['manifest URL', { manifestURL: '/manifest' }],
	['hosted mode', { mode: 'hosted' }],
	['manifest mode', { mode: 'manifest' }],
	['hosted factory', { mode: hosted({ url: backendURL }) }],
	['custom factory', { mode: custom({}) }],
];

describe('mode-specific JavaScript configuration', () => {
	it.each(hostedInvalidCases)(
		'rejects %s in the hosted entry before startup',
		(_name, options) => {
			const fetchSpy = vi.fn<typeof fetch>();
			vi.stubGlobal('fetch', fetchSpy);
			expect(() => createHostedConsentClient(options)).toThrow(
				/@c15t\/browser\/hosted/u
			);
			expect(fetchSpy).not.toHaveBeenCalled();
			expect(document.querySelector('[data-c15t-ui]')).toBeNull();
		}
	);

	it.each(offlineInvalidCases)(
		'rejects %s in the offline entry before startup',
		(_name, options) => {
			const fetchSpy = vi.fn<typeof fetch>();
			vi.stubGlobal('fetch', fetchSpy);
			expect(() => createOfflineConsentClient(options)).toThrow(
				/@c15t\/browser\/offline/u
			);
			expect(fetchSpy).not.toHaveBeenCalled();
			expect(document.querySelector('[data-c15t-ui]')).toBeNull();
		}
	);
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { databuddy } from './databuddy';
import { gtag } from './google-tag';
import { googleTagManager } from './google-tag-manager';
import { linkedinInsights } from './linkedin-insights';
import { metaPixel } from './meta-pixel';
import { microsoftUet } from './microsoft-uet';
import { posthog } from './posthog';
import { tiktokPixel } from './tiktok-pixel';
import { xPixel } from './x-pixel';

type TestGlobal = typeof globalThis & Record<string, unknown>;

function setupMockBrowser() {
	const globalRef = globalThis as TestGlobal;
	const scriptAnchor = {
		parentNode: {
			insertBefore: vi.fn((node: Record<string, unknown>) => node),
		},
	};

	const document = {
		head: {
			appendChild: vi.fn((node: Record<string, unknown>) => node),
		},
		createElement: vi.fn((_tag: string) => ({
			textContent: '',
			async: false,
			defer: false,
			setAttribute: vi.fn(),
		})),
		getElementsByTagName: vi.fn(() => [scriptAnchor]),
	};

	vi.stubGlobal('window', globalRef as unknown as Window & typeof globalThis);
	vi.stubGlobal('document', document as unknown as Document);
}

describe('built-in script helpers', () => {
	beforeEach(() => {
		setupMockBrowser();
	});

	afterEach(() => {
		const globalRef = globalThis as TestGlobal;
		vi.unstubAllGlobals();
		delete globalRef.dataLayer;
		delete globalRef.gtag;
		delete globalRef.posthog;
		delete globalRef.databuddy;
		delete globalRef.databuddyConfig;
		delete globalRef.ttq;
		delete globalRef.twq;
		delete globalRef._linkedin_partner_id;
		delete globalRef._linkedin_data_partner_ids;
		delete globalRef.uetq;
		delete globalRef.fbq;
		delete globalRef._fbq;
	});

	it('keeps helper output parity across all bundled integrations', () => {
		const helpers = [
			{
				name: 'googleTagManager',
				script: googleTagManager({ id: 'GTM-123' }),
				expected: {
					id: 'google-tag-manager',
					category: 'necessary',
					alwaysLoad: true,
					persistAfterConsentRevoked: undefined,
					src: 'https://www.googletagmanager.com/gtm.js?id=GTM-123',
				},
			},
			{
				name: 'gtag',
				script: gtag({ id: 'G-123', category: 'measurement' }),
				expected: {
					id: 'gtag',
					category: 'measurement',
					alwaysLoad: true,
					persistAfterConsentRevoked: true,
					src: 'https://www.googletagmanager.com/gtag/js?id=G-123',
				},
			},
			{
				name: 'metaPixel',
				script: metaPixel({ pixelId: '123456' }),
				expected: {
					id: 'meta-pixel',
					category: 'marketing',
					alwaysLoad: undefined,
					persistAfterConsentRevoked: true,
					src: 'https://connect.facebook.net/en_US/fbevents.js',
				},
			},
			{
				name: 'tiktokPixel',
				script: tiktokPixel({ pixelId: 'tt-123' }),
				expected: {
					id: 'tiktok-pixel',
					category: 'marketing',
					alwaysLoad: undefined,
					persistAfterConsentRevoked: true,
					src: 'https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=tt-123&lib=ttq',
				},
			},
			{
				name: 'posthog',
				script: posthog({ id: 'phc_123' }),
				expected: {
					id: 'posthog',
					category: 'measurement',
					alwaysLoad: true,
					persistAfterConsentRevoked: undefined,
					src: 'https://eu-assets.i.posthog.com/static/array.js',
				},
			},
			{
				name: 'databuddy',
				script: databuddy({
					clientId: 'db_123',
					configWhenGranted: { clientId: 'db_123', disabled: false },
					configWhenDenied: { clientId: 'db_123', disabled: true },
				}),
				expected: {
					id: 'databuddy',
					category: 'measurement',
					alwaysLoad: true,
					persistAfterConsentRevoked: undefined,
					src: 'https://cdn.databuddy.cc/databuddy.js',
				},
			},
			{
				name: 'linkedinInsights',
				script: linkedinInsights({ id: '987654' }),
				expected: {
					id: 'linkedin-insights',
					category: 'marketing',
					alwaysLoad: undefined,
					persistAfterConsentRevoked: undefined,
					src: 'https://snap.licdn.com/li.lms-analytics/insight.min.js',
				},
			},
			{
				name: 'microsoftUet',
				script: microsoftUet({ id: 'uet-123' }),
				expected: {
					id: 'microsoft-uet',
					category: 'marketing',
					alwaysLoad: undefined,
					persistAfterConsentRevoked: true,
					src: '//bat.bing.com/bat.js',
				},
			},
			{
				name: 'xPixel',
				script: xPixel({ pixelId: 'tw-123' }),
				expected: {
					id: 'x-pixel',
					category: 'marketing',
					alwaysLoad: undefined,
					persistAfterConsentRevoked: undefined,
					src: 'https://static.ads-twitter.com/uwt.js',
				},
			},
		];

		for (const helper of helpers) {
			expect(helper.script.id, helper.name).toBe(helper.expected.id);
			expect(helper.script.category, helper.name).toBe(
				helper.expected.category
			);
			expect(helper.script.alwaysLoad, helper.name).toBe(
				helper.expected.alwaysLoad
			);
			expect(helper.script.persistAfterConsentRevoked, helper.name).toBe(
				helper.expected.persistAfterConsentRevoked
			);
			if ('src' in helper.expected) {
				expect(helper.script.src, helper.name).toBe(helper.expected.src);
			}
		}
	});

	it('runs Google Tag Manager consent defaults before boot logic', () => {
		const globalRef = globalThis as TestGlobal;
		const script = googleTagManager({ id: 'GTM-ORDER' });
		globalRef.dataLayer = [];

		script.onBeforeLoad?.({
			id: script.id,
			elementId: script.id,
			hasConsent: false,
			consents: {
				necessary: true,
				functionality: false,
				measurement: false,
				marketing: false,
				experience: false,
			},
		});

		const dataLayer = globalRef.dataLayer as unknown[];
		expect(Array.isArray(dataLayer[0])).toBe(false);
		expect(Array.from(dataLayer[0] as IArguments)).toEqual([
			'consent',
			'default',
			{
				security_storage: 'granted',
				functionality_storage: 'denied',
				analytics_storage: 'denied',
				ad_storage: 'denied',
				ad_user_data: 'denied',
				ad_personalization: 'denied',
				personalization_storage: 'denied',
			},
		]);
		expect(dataLayer[1]).toMatchObject({ event: 'gtm.js' });
		expect(document.head.appendChild).not.toHaveBeenCalled();
	});

	it('runs gtag consent defaults before config calls', () => {
		const globalRef = globalThis as TestGlobal;
		const script = gtag({ id: 'G-ORDER', category: 'measurement' });
		globalRef.dataLayer = [];

		script.onBeforeLoad?.({
			id: script.id,
			elementId: script.id,
			hasConsent: false,
			consents: {
				necessary: true,
				functionality: false,
				measurement: false,
				marketing: false,
				experience: false,
			},
		});

		const dataLayer = globalRef.dataLayer as unknown[];
		expect(Array.isArray(dataLayer[0])).toBe(false);
		expect(Array.from(dataLayer[0] as IArguments)).toEqual([
			'consent',
			'default',
			{
				security_storage: 'granted',
				functionality_storage: 'denied',
				analytics_storage: 'denied',
				ad_storage: 'denied',
				ad_user_data: 'denied',
				ad_personalization: 'denied',
				personalization_storage: 'denied',
			},
		]);
		expect(Array.from(dataLayer[1] as IArguments)[0]).toBe('js');
		expect(Array.from(dataLayer[2] as IArguments)).toEqual([
			'config',
			'G-ORDER',
		]);
		expect(document.head.appendChild).not.toHaveBeenCalled();
	});

	it('keeps PostHog init options as an object and syncs consent state', () => {
		const globalRef = globalThis as TestGlobal;
		const init = vi.fn();
		const optIn = vi.fn();
		const optOut = vi.fn();
		globalRef.posthog = {
			init: function initWithReceiver(
				token: string,
				options: Record<string, unknown>
			) {
				init(this, token, options);
			},
			opt_in_capturing: optIn,
			opt_out_capturing: optOut,
			get_explicit_consent_status: vi.fn(() => 'pending'),
		};

		const script = posthog({
			id: 'phc_123',
			apiHost: 'https://eu.i.posthog.com',
			scriptUrl: 'https://eu-assets.i.posthog.com/static/array.js',
			initOptions: {
				api_host: 'https://eu.i.posthog.com',
				ui_host: 'https://eu.i.posthog.com',
				autocapture: false,
				person_profiles: 'identified_only',
				cookieless_mode: 'on_reject',
			},
		});

		expect(script.src).toBe('https://eu-assets.i.posthog.com/static/array.js');
		expect(script.attributes).toEqual({
			crossorigin: 'anonymous',
			'data-api-host': 'https://eu.i.posthog.com',
			'data-ui-host': 'https://eu.i.posthog.com',
		});

		script.onLoad?.({
			id: script.id,
			elementId: script.id,
			hasConsent: false,
			consents: {
				necessary: true,
				functionality: false,
				measurement: false,
				marketing: false,
				experience: false,
			},
		});

		expect(init).toHaveBeenCalledWith(globalRef.posthog, 'phc_123', {
			api_host: 'https://eu.i.posthog.com',
			ui_host: 'https://eu.i.posthog.com',
			autocapture: false,
			person_profiles: 'identified_only',
			cookieless_mode: 'on_reject',
		});
		expect(optOut).toHaveBeenCalledTimes(1);

		script.onConsentChange?.({
			id: script.id,
			elementId: script.id,
			hasConsent: true,
			consents: {
				necessary: true,
				functionality: false,
				measurement: true,
				marketing: false,
				experience: false,
			},
		});

		expect(optIn).toHaveBeenCalledTimes(1);
	});

	it('uses PostHog defaults when optional options are omitted', () => {
		const script = posthog({
			id: 'phc_defaults',
		});

		expect(script.src).toBe('https://eu-assets.i.posthog.com/static/array.js');
		expect(script.attributes).toEqual({
			crossorigin: 'anonymous',
			'data-api-host': 'https://eu.i.posthog.com',
			'data-ui-host': 'https://eu.i.posthog.com',
		});
	});

	it('preserves DataBuddy config seeding and sync behavior', () => {
		const globalRef = globalThis as TestGlobal;
		const script = databuddy({
			clientId: 'db_123',
			apiUrl: 'https://basket.databuddy.cc',
			configWhenGranted: {
				clientId: 'db_123',
				apiUrl: 'https://basket.databuddy.cc',
				trackScreenViews: true,
				disabled: false,
			},
			configWhenDenied: {
				clientId: 'db_123',
				apiUrl: 'https://basket.databuddy.cc',
				trackScreenViews: true,
				disabled: true,
			},
		});

		expect(script.src).toBe('https://cdn.databuddy.cc/databuddy.js');
		expect(script.attributes).toEqual({
			crossorigin: 'anonymous',
			'data-client-id': 'db_123',
			'data-api-url': 'https://basket.databuddy.cc',
		});

		script.onBeforeLoad?.({
			id: script.id,
			elementId: script.id,
			hasConsent: false,
			consents: {
				necessary: true,
				functionality: false,
				measurement: false,
				marketing: false,
				experience: false,
			},
		});

		expect(globalRef.databuddyConfig).toEqual({
			clientId: 'db_123',
			apiUrl: 'https://basket.databuddy.cc',
			trackScreenViews: true,
			disabled: true,
		});

		globalRef.databuddy = {
			track: vi.fn(),
			screenView: vi.fn(),
			clear: vi.fn(),
			flush: vi.fn(),
			setGlobalProperties: vi.fn(),
			trackCustomEvent: vi.fn(),
			options: {
				disabled: true,
			},
		};

		script.onLoad?.({
			id: script.id,
			elementId: script.id,
			hasConsent: true,
			consents: {
				necessary: true,
				functionality: false,
				measurement: true,
				marketing: false,
				experience: false,
			},
		});

		expect(
			(globalRef.databuddy as { options: { disabled: boolean } }).options
				.disabled
		).toBe(false);

		script.onConsentChange?.({
			id: script.id,
			elementId: script.id,
			hasConsent: false,
			consents: {
				necessary: true,
				functionality: false,
				measurement: false,
				marketing: false,
				experience: false,
			},
		});

		expect(
			(globalRef.databuddy as { options: { disabled: boolean } }).options
				.disabled
		).toBe(true);
		expect(globalRef.databuddyConfig).toEqual({
			clientId: 'db_123',
			apiUrl: 'https://basket.databuddy.cc',
			trackScreenViews: true,
			disabled: true,
		});

		script.onConsentChange?.({
			id: script.id,
			elementId: script.id,
			hasConsent: true,
			consents: {
				necessary: true,
				functionality: false,
				measurement: true,
				marketing: false,
				experience: false,
			},
		});

		expect(globalRef.databuddyConfig).toEqual({
			clientId: 'db_123',
			apiUrl: 'https://basket.databuddy.cc',
			trackScreenViews: true,
			disabled: false,
		});
	});

	it('preserves deprecated gtag script overrides', () => {
		const script = gtag({
			id: 'G-OVERRIDE',
			category: 'measurement',
			script: {
				nonce: 'abc123',
				target: 'body',
				attributes: {
					'data-test': '1',
				},
			},
		});

		expect(script.nonce).toBe('abc123');
		expect(script.target).toBe('body');
		expect(script.attributes).toEqual({
			'data-test': '1',
		});
	});
});

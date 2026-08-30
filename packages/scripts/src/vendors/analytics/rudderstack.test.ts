import { describe, expect, it } from 'vitest';

import {
	createCallbackInfo,
	deniedConsentState,
	expectScriptMatchesIntegration,
	getTestGlobal,
	grantedMeasurementConsentState,
	setupScriptHelperTest,
	toArgumentsArray,
} from '../../__tests__/helpers';
import { RUDDERSTACK_QUEUE_METHODS, rudderstack } from './rudderstack';

type RudderStackQueue = unknown[] & {
	snippetExecuted?: boolean;
	[key: string]: unknown;
};

describe('rudderstack', () => {
	setupScriptHelperTest();

	it('matches registry metadata with default page tracking', () => {
		const script = rudderstack({
			writeKey: 'WRITE_KEY',
			dataPlaneUrl: 'https://c15t-live-probe.invalid',
		});

		expectScriptMatchesIntegration('rudderstack', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.rudderlabs.com/v3/modern/rsa.min.js',
		});
	});

	it('queues load and page by default with load options', () => {
		const globalRef = getTestGlobal();
		const script = rudderstack({
			writeKey: ' WRITE_KEY ',
			dataPlaneUrl: ' https://c15t-live-probe.invalid ',
			loadOptions: {
				useBeacon: true,
				plugins: ['BeaconQueue'],
			},
		});

		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));
		const rudderanalytics = globalRef.rudderanalytics as
			| RudderStackQueue
			| undefined;

		expect(Array.isArray(rudderanalytics)).toBe(true);
		expect(globalRef.RudderSnippetVersion).toBe('3.0.32');
		expect(globalRef.rudderAnalyticsBuildType).toBe('modern');
		expect(rudderanalytics?.snippetExecuted).toBe(true);
		expect(rudderanalytics?.[0]).toEqual(
			toArgumentsArray([
				'load',
				'WRITE_KEY',
				'https://c15t-live-probe.invalid',
				{
					useBeacon: true,
					plugins: ['BeaconQueue'],
				},
			])
		);
		expect(rudderanalytics?.[1]).toEqual(toArgumentsArray(['page']));
	});

	it('defines the official v3 snippet queue methods before load', () => {
		const globalRef = getTestGlobal();
		const script = rudderstack({
			writeKey: 'WRITE_KEY',
			dataPlaneUrl: 'https://c15t-live-probe.invalid',
		});

		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));
		const rudderanalytics = globalRef.rudderanalytics as
			| RudderStackQueue
			| undefined;
		const methodTypes = Object.fromEntries(
			RUDDERSTACK_QUEUE_METHODS.map((method) => [
				method,
				typeof rudderanalytics?.[method],
			])
		);

		expect(methodTypes).toEqual(
			Object.fromEntries(
				RUDDERSTACK_QUEUE_METHODS.map((method) => [method, 'function'])
			)
		);
	});

	it('can disable default page queue and use a custom script URL', () => {
		const globalRef = getTestGlobal();
		const script = rudderstack({
			writeKey: 'WRITE_KEY',
			dataPlaneUrl: 'https://c15t-live-probe.invalid',
			trackPageView: false,
			scriptUrl: 'https://cdn.example.com/rsa.min.js',
		});

		expect(script.src).toBe('https://cdn.example.com/rsa.min.js');
		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));
		const rudderanalytics = globalRef.rudderanalytics as
			| RudderStackQueue
			| undefined;

		expect(Array.isArray(rudderanalytics)).toBe(true);
		expect(rudderanalytics?.length).toBe(1);
		expect(rudderanalytics?.[0]).toEqual(
			toArgumentsArray([
				'load',
				'WRITE_KEY',
				'https://c15t-live-probe.invalid',
				{},
			])
		);
		expect(rudderanalytics?.[1]).not.toEqual(toArgumentsArray(['page']));
	});

	it('falls back to the default URL when scriptUrl is blank', () => {
		const script = rudderstack({
			writeKey: 'WRITE_KEY',
			dataPlaneUrl: 'https://c15t-live-probe.invalid',
			scriptUrl: '   ',
		});

		expect(script.src).toBe('https://cdn.rudderlabs.com/v3/modern/rsa.min.js');
	});

	it('throws for an empty write key', () => {
		expect(() =>
			rudderstack({
				writeKey: '   ',
				dataPlaneUrl: 'https://c15t-live-probe.invalid',
			})
		).toThrowError('rudderstack: missing or invalid writeKey');
	});

	it('throws for an empty data plane URL', () => {
		expect(() =>
			rudderstack({
				writeKey: 'WRITE_KEY',
				dataPlaneUrl: '   ',
			})
		).toThrowError('rudderstack: missing or invalid dataPlaneUrl');
	});

	it('throws for a non-HTTPS scriptUrl override', () => {
		expect(() =>
			rudderstack({
				writeKey: 'WRITE_KEY',
				dataPlaneUrl: 'https://c15t-live-probe.invalid',
				scriptUrl: 'http://cdn.example.com/rsa.min.js',
			})
		).toThrowError('rudderstack: scriptUrl must be a valid https URL');
	});

	it('throws for a non-HTTPS data plane URL', () => {
		expect(() =>
			rudderstack({
				writeKey: 'WRITE_KEY',
				dataPlaneUrl: 'http://c15t-live-probe.invalid',
			})
		).toThrowError('rudderstack: dataPlaneUrl must be a valid https URL');
	});

	it('loads inert with buffered events and signals denied IDs in pre-consent mode', () => {
		const globalRef = getTestGlobal();
		const script = rudderstack({
			writeKey: 'WRITE_KEY',
			dataPlaneUrl: 'https://c15t-live-probe.invalid',
			consentManagement: {
				mapping: {
					measurement: ['product-analytics'],
					marketing: [' ad-destinations '],
				},
			},
		});

		expect(script.alwaysLoad).toBe(true);
		expect(script.persistAfterConsentRevoked).toBe(true);

		script.onBeforeLoad?.(
			createCallbackInfo({ id: script.id, consents: deniedConsentState })
		);
		const rudderanalytics = globalRef.rudderanalytics as
			| RudderStackQueue
			| undefined;

		// Consent default signal is queued before load(), so the SDK knows the
		// denied state the moment it replays the queue.
		expect(rudderanalytics?.[0]).toEqual(
			toArgumentsArray([
				'consent',
				{
					consentManagement: {
						enabled: true,
						provider: 'custom',
						allowedConsentIds: [],
						deniedConsentIds: ['product-analytics', 'ad-destinations'],
					},
				},
			])
		);
		expect(rudderanalytics?.[1]).toEqual(
			toArgumentsArray([
				'load',
				'WRITE_KEY',
				'https://c15t-live-probe.invalid',
				{
					preConsent: {
						enabled: true,
						storage: { strategy: 'none' },
						events: { delivery: 'buffer' },
					},
					consentManagement: {
						enabled: true,
						provider: 'custom',
					},
				},
			])
		);
	});

	it('signals partitioned consent IDs on consent changes in pre-consent mode', () => {
		const globalRef = getTestGlobal();
		const consentCalls: unknown[][] = [];
		globalRef.rudderanalytics = {
			consent: (...args: unknown[]) => {
				consentCalls.push(args);
			},
		};

		const script = rudderstack({
			writeKey: 'WRITE_KEY',
			dataPlaneUrl: 'https://c15t-live-probe.invalid',
			consentManagement: {
				mapping: {
					measurement: ['product-analytics'],
					marketing: ['ad-destinations'],
				},
			},
		});

		script.onConsentChange?.(
			createCallbackInfo({
				id: script.id,
				hasConsent: true,
				consents: grantedMeasurementConsentState,
			})
		);

		expect(consentCalls).toEqual([
			[
				{
					consentManagement: {
						enabled: true,
						provider: 'custom',
						allowedConsentIds: ['product-analytics'],
						deniedConsentIds: ['ad-destinations'],
					},
				},
			],
		]);
	});

	it('lets user preConsent load options win while forcing the custom provider', () => {
		const globalRef = getTestGlobal();
		const script = rudderstack({
			writeKey: 'WRITE_KEY',
			dataPlaneUrl: 'https://c15t-live-probe.invalid',
			trackPageView: false,
			loadOptions: {
				preConsent: {
					enabled: true,
					storage: { strategy: 'session' },
					events: { delivery: 'buffer' },
				},
				consentManagement: { provider: 'oneTrust' },
			},
			consentManagement: {
				mapping: { measurement: ['product-analytics'] },
			},
		});

		script.onBeforeLoad?.(
			createCallbackInfo({ id: script.id, consents: deniedConsentState })
		);
		const rudderanalytics = globalRef.rudderanalytics as
			| RudderStackQueue
			| undefined;

		expect(rudderanalytics?.[1]).toEqual(
			toArgumentsArray([
				'load',
				'WRITE_KEY',
				'https://c15t-live-probe.invalid',
				{
					preConsent: {
						enabled: true,
						storage: { strategy: 'session' },
						events: { delivery: 'buffer' },
					},
					consentManagement: {
						enabled: true,
						provider: 'custom',
					},
				},
			])
		);
	});

	it('throws when a declared category has no valid consent IDs', () => {
		expect(() =>
			rudderstack({
				writeKey: 'WRITE_KEY',
				dataPlaneUrl: 'https://c15t-live-probe.invalid',
				consentManagement: { mapping: { measurement: ['   '] } },
			})
		).toThrowError(
			'rudderstack: consentManagement.mapping.measurement is declared but contains no valid consent IDs'
		);
	});

	it('throws for an empty consent mapping', () => {
		expect(() =>
			rudderstack({
				writeKey: 'WRITE_KEY',
				dataPlaneUrl: 'https://c15t-live-probe.invalid',
				consentManagement: { mapping: {} },
			})
		).toThrowError(
			'rudderstack: consentManagement.mapping must map at least one c15t category to a non-empty list of RudderStack consent IDs'
		);
	});
});

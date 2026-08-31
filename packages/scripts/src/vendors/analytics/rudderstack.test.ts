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
			dataPlaneUrl: 'https://c15t-live-probe.invalid',
			writeKey: 'WRITE_KEY',
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
			dataPlaneUrl: ' https://c15t-live-probe.invalid ',
			loadOptions: {
				plugins: ['BeaconQueue'],
				useBeacon: true,
			},
			writeKey: ' WRITE_KEY ',
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
					plugins: ['BeaconQueue'],
					useBeacon: true,
				},
			])
		);
		expect(rudderanalytics?.[1]).toEqual(toArgumentsArray(['page']));
	});

	it('defines the official v3 snippet queue methods before load', () => {
		const globalRef = getTestGlobal();
		const script = rudderstack({
			dataPlaneUrl: 'https://c15t-live-probe.invalid',
			writeKey: 'WRITE_KEY',
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
			dataPlaneUrl: 'https://c15t-live-probe.invalid',
			scriptUrl: 'https://cdn.example.com/rsa.min.js',
			trackPageView: false,
			writeKey: 'WRITE_KEY',
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
			dataPlaneUrl: 'https://c15t-live-probe.invalid',
			scriptUrl: '   ',
			writeKey: 'WRITE_KEY',
		});

		expect(script.src).toBe('https://cdn.rudderlabs.com/v3/modern/rsa.min.js');
	});

	it('throws for an empty write key', () => {
		expect(() =>
			rudderstack({
				dataPlaneUrl: 'https://c15t-live-probe.invalid',
				writeKey: '   ',
			})
		).toThrowError('rudderstack: missing or invalid writeKey');
	});

	it('throws for an empty data plane URL', () => {
		expect(() =>
			rudderstack({
				dataPlaneUrl: '   ',
				writeKey: 'WRITE_KEY',
			})
		).toThrowError('rudderstack: missing or invalid dataPlaneUrl');
	});

	it('throws for a non-HTTPS scriptUrl override', () => {
		expect(() =>
			rudderstack({
				dataPlaneUrl: 'https://c15t-live-probe.invalid',
				scriptUrl: 'http://cdn.example.com/rsa.min.js',
				writeKey: 'WRITE_KEY',
			})
		).toThrowError('rudderstack: scriptUrl must be a valid https URL');
	});

	it('throws for a non-HTTPS data plane URL', () => {
		expect(() =>
			rudderstack({
				dataPlaneUrl: 'http://c15t-live-probe.invalid',
				writeKey: 'WRITE_KEY',
			})
		).toThrowError('rudderstack: dataPlaneUrl must be a valid https URL');
	});

	it('loads inert with buffered events and signals denied IDs in pre-consent mode', () => {
		const globalRef = getTestGlobal();
		const script = rudderstack({
			consentManagement: {
				// oxlint-disable-next-line sort-keys -- Mapping order defines emitted consent ID order.
				mapping: {
					measurement: ['product-analytics'],
					marketing: [' ad-destinations '],
				},
			},
			dataPlaneUrl: 'https://c15t-live-probe.invalid',
			writeKey: 'WRITE_KEY',
		});

		expect(script.alwaysLoad).toBe(true);
		expect(script.persistAfterConsentRevoked).toBe(true);

		script.onBeforeLoad?.(
			createCallbackInfo({ consents: deniedConsentState, id: script.id })
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
						allowedConsentIds: [],
						deniedConsentIds: ['product-analytics', 'ad-destinations'],
						enabled: true,
						provider: 'custom',
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
					consentManagement: {
						enabled: true,
						provider: 'custom',
					},
					preConsent: {
						enabled: true,
						events: { delivery: 'buffer' },
						storage: { strategy: 'none' },
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
			consentManagement: {
				mapping: {
					marketing: ['ad-destinations'],
					measurement: ['product-analytics'],
				},
			},
			dataPlaneUrl: 'https://c15t-live-probe.invalid',
			writeKey: 'WRITE_KEY',
		});

		script.onConsentChange?.(
			createCallbackInfo({
				consents: grantedMeasurementConsentState,
				hasConsent: true,
				id: script.id,
			})
		);

		expect(consentCalls).toEqual([
			[
				{
					consentManagement: {
						allowedConsentIds: ['product-analytics'],
						deniedConsentIds: ['ad-destinations'],
						enabled: true,
						provider: 'custom',
					},
				},
			],
		]);
	});

	it('lets user preConsent load options win while forcing the custom provider', () => {
		const globalRef = getTestGlobal();
		const script = rudderstack({
			consentManagement: {
				mapping: { measurement: ['product-analytics'] },
			},
			dataPlaneUrl: 'https://c15t-live-probe.invalid',
			loadOptions: {
				consentManagement: { provider: 'oneTrust' },
				preConsent: {
					enabled: true,
					events: { delivery: 'buffer' },
					storage: { strategy: 'session' },
				},
			},
			trackPageView: false,
			writeKey: 'WRITE_KEY',
		});

		script.onBeforeLoad?.(
			createCallbackInfo({ consents: deniedConsentState, id: script.id })
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
					consentManagement: {
						enabled: true,
						provider: 'custom',
					},
					preConsent: {
						enabled: true,
						events: { delivery: 'buffer' },
						storage: { strategy: 'session' },
					},
				},
			])
		);
	});

	it('throws when a declared category has no valid consent IDs', () => {
		expect(() =>
			rudderstack({
				consentManagement: { mapping: { measurement: ['   '] } },
				dataPlaneUrl: 'https://c15t-live-probe.invalid',
				writeKey: 'WRITE_KEY',
			})
		).toThrowError(
			'rudderstack: consentManagement.mapping.measurement is declared but contains no valid consent IDs'
		);
	});

	it('throws for an empty consent mapping', () => {
		expect(() =>
			rudderstack({
				consentManagement: { mapping: {} },
				dataPlaneUrl: 'https://c15t-live-probe.invalid',
				writeKey: 'WRITE_KEY',
			})
		).toThrowError(
			'rudderstack: consentManagement.mapping must map at least one c15t category to a non-empty list of RudderStack consent IDs'
		);
	});
});

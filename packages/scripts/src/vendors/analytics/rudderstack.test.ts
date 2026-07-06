import { describe, expect, it } from 'vitest';
import {
	createCallbackInfo,
	expectScriptMatchesIntegration,
	getTestGlobal,
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

	it('throws for a non-HTTPS data plane URL', () => {
		expect(() =>
			rudderstack({
				writeKey: 'WRITE_KEY',
				dataPlaneUrl: 'http://c15t-live-probe.invalid',
			})
		).toThrowError('rudderstack: dataPlaneUrl must be a valid https URL');
	});
});

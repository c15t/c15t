import { describe, expect, it } from 'bun:test';
import {
	createCallbackInfo,
	deniedConsentState,
	expectScriptMatchesIntegration,
	getTestGlobal,
	setupScriptHelperTest,
	toArgumentsArray,
} from '../../__tests__/helpers';
import { plausibleAnalytics } from './plausible-analytics';

describe('plausibleAnalytics', () => {
	setupScriptHelperTest();

	it('matches registry metadata for the legacy domain loader', () => {
		const script = plausibleAnalytics({ domain: 'example.com' });

		expectScriptMatchesIntegration('plausibleAnalytics', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://plausible.io/js/script.js',
		});
		expect(script.attributes?.['data-domain']).toBe('example.com');
		expect(script.attributes?.['data-api']).toBeUndefined();
	});

	it('joins script extensions into the loader filename', () => {
		const script = plausibleAnalytics({
			domain: 'example.com',
			extension: ['file-downloads', 'outbound-links'],
		});

		expect(script.src).toBe(
			'https://plausible.io/js/script.file-downloads.outbound-links.js'
		);
		expect(script.attributes?.['data-domain']).toBe('example.com');
		expect(script.attributes?.['data-api']).toBeUndefined();
	});

	it('uses the new scriptId loader and drops domain/data-api attributes', () => {
		const script = plausibleAnalytics({
			scriptId: 'abc123',
			endpoint: 'https://example.com/api/event',
		});

		expect(script.src).toBe('https://plausible.io/js/pa-abc123.js');
		expect(script.attributes?.['data-domain']).toBeUndefined();
		expect(script.attributes?.['data-api']).toBeUndefined();
	});

	it('trims identifiers before building manifest values', () => {
		const script = plausibleAnalytics({ domain: ' example.com ' });

		expect(script.attributes?.['data-domain']).toBe('example.com');
		expect(script.attributes?.['data-api']).toBeUndefined();
	});

	it('throws when neither scriptId nor domain is provided', () => {
		expect(() => plausibleAnalytics({})).toThrow(
			'plausibleAnalytics: missing scriptId or domain'
		);
		expect(() =>
			plausibleAnalytics({ scriptId: '   ', domain: '   ' })
		).toThrow('plausibleAnalytics: missing scriptId or domain');
	});

	it('seeds the plausible queue stub and buffers calls before the script loads', () => {
		const globalRef = getTestGlobal();
		const script = plausibleAnalytics({
			domain: 'example.com',
			hashBasedRouting: true,
			autoCapturePageviews: false,
		});

		script.onBeforeLoad?.(
			createCallbackInfo({
				id: script.id,
				consents: deniedConsentState,
			})
		);

		const stub = globalRef.plausible as
			| (((...args: unknown[]) => void) & {
					q?: unknown[];
					o?: Record<string, unknown>;
			  })
			| undefined;

		expect(typeof stub).toBe('function');
		expect(stub?.o).toEqual({
			hashBasedRouting: true,
			autoCapturePageviews: false,
		});

		stub?.('pageview');
		stub?.('event', 'signup');

		expect(stub?.q).toEqual([
			toArgumentsArray(['pageview']),
			toArgumentsArray(['event', 'signup']),
		]);
	});
});

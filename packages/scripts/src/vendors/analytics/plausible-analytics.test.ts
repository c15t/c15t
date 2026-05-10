import { describe, expect, it } from 'vitest';
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
		expect(script.attributes).toEqual({
			'data-domain': 'example.com',
			'data-api': undefined,
		});
	});

	it('joins script extensions into the loader filename', () => {
		const script = plausibleAnalytics({
			domain: 'example.com',
			extension: ['file-downloads', 'outbound-links'],
		});

		expect(script.src).toBe(
			'https://plausible.io/js/script.file-downloads.outbound-links.js'
		);
		expect(script.attributes).toEqual({
			'data-domain': 'example.com',
			'data-api': undefined,
		});
	});

	it('uses the new scriptId loader and drops domain/data-api attributes', () => {
		const script = plausibleAnalytics({
			scriptId: 'abc123',
			endpoint: 'https://example.com/api/event',
		});

		expect(script.src).toBe('https://plausible.io/js/pa-abc123.js');
		expect(script.attributes).toEqual({
			'data-domain': undefined,
			'data-api': undefined,
		});
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

		delete globalRef.plausible;
	});
});

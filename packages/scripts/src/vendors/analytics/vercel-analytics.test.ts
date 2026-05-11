import { describe, expect, it } from 'vitest';
import {
	createCallbackInfo,
	expectScriptMatchesIntegration,
	getTestGlobal,
	setupScriptHelperTest,
	toArgumentsArray,
} from '../../__tests__/helpers';
import { vercelAnalytics } from './vercel-analytics';

describe('vercelAnalytics', () => {
	setupScriptHelperTest();

	it('matches registry metadata with default loader URL', () => {
		const script = vercelAnalytics();

		expectScriptMatchesIntegration('vercelAnalytics', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://va.vercel-scripts.com/v1/script.js',
		});
	});

	it('uses debug bundle when mode or debug flag requests it', () => {
		expect(vercelAnalytics({ mode: 'development' }).src).toBe(
			'https://va.vercel-scripts.com/v1/script.debug.js'
		);
		expect(vercelAnalytics({ debug: true }).src).toBe(
			'https://va.vercel-scripts.com/v1/script.debug.js'
		);
	});

	it('queues events and maps script attributes', () => {
		const globalRef = getTestGlobal() as typeof globalThis & {
			va?: (event: string, properties?: unknown) => void;
			vaq?: unknown[];
		};
		const script = vercelAnalytics({
			dsn: 'dsn_123',
			endpoint: 'https://analytics.example.com/v1/events',
			disableAutoTrack: true,
		});

		expect(script.attributes).toEqual({
			'data-sdkn': 'c15t',
			'data-dsn': 'dsn_123',
			'data-disable-auto-track': '1',
			'data-endpoint': 'https://analytics.example.com/v1/events',
		});

		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));
		// Intentional cast: `globalRef.va` can be emitted incorrectly in CI dts
		// generation; keep this workaround to avoid non-callable ambient output.
		const va = globalRef.va as
			| ((event: string, properties?: unknown) => void)
			| undefined;
		va?.('signup', { plan: 'pro' });
		expect(globalRef.vaq).toEqual([
			toArgumentsArray(['signup', { plan: 'pro' }]),
		]);
	});
});

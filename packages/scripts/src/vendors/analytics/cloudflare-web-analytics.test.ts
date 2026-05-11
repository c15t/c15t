import { describe, expect, it } from 'vitest';
import {
	expectScriptMatchesIntegration,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { cloudflareWebAnalytics } from './cloudflare-web-analytics';

describe('cloudflareWebAnalytics', () => {
	setupScriptHelperTest();

	it('matches registry metadata with the default loader and enables SPA tracking by default', () => {
		const script = cloudflareWebAnalytics({ token: 'tok-abc' });

		expectScriptMatchesIntegration('cloudflareWebAnalytics', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://static.cloudflareinsights.com/beacon.min.js',
		});
		expect(script.attributes).toEqual({
			'data-cf-beacon': JSON.stringify({ token: 'tok-abc', spa: true }),
		});
	});

	it('serializes spa: false into the beacon config', () => {
		const script = cloudflareWebAnalytics({ token: 'tok-abc', spa: false });

		expect(script.attributes).toEqual({
			'data-cf-beacon': JSON.stringify({ token: 'tok-abc', spa: false }),
		});
	});

	it('honors a custom loader URL', () => {
		const script = cloudflareWebAnalytics({
			token: 'tok-abc',
			scriptUrl: 'https://cdn.example.com/beacon.js',
		});

		expect(script.src).toBe('https://cdn.example.com/beacon.js');
	});
});

import { describe, expect, it } from 'vitest';
import {
	expectScriptMatchesIntegration,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { umamiAnalytics } from './umami-analytics';

describe('umamiAnalytics', () => {
	setupScriptHelperTest();

	it('matches registry metadata with the default loader', () => {
		const script = umamiAnalytics({ websiteId: 'site-abc' });

		expectScriptMatchesIntegration('umamiAnalytics', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://cloud.umami.is/script.js',
		});
		expect(script.attributes).toEqual({
			'data-website-id': 'site-abc',
			'data-host-url': undefined,
			'data-auto-track': undefined,
			'data-domains': undefined,
			'data-tag': undefined,
			'data-before-send': undefined,
		});
	});

	it('joins a domain array into a comma-separated attribute', () => {
		const script = umamiAnalytics({
			websiteId: 'site-abc',
			domains: ['example.com', 'www.example.com'],
		});

		expect(script.attributes).toMatchObject({
			'data-domains': 'example.com,www.example.com',
		});
	});

	it('serializes optional flags and passes through string values', () => {
		const script = umamiAnalytics({
			websiteId: 'site-abc',
			hostUrl: 'https://analytics.example.com',
			autoTrack: false,
			tag: 'release-2025',
			beforeSend: 'window.umamiBeforeSend',
			domains: 'example.com',
		});

		expect(script.attributes).toEqual({
			'data-website-id': 'site-abc',
			'data-host-url': 'https://analytics.example.com',
			'data-auto-track': 'false',
			'data-domains': 'example.com',
			'data-tag': 'release-2025',
			'data-before-send': 'window.umamiBeforeSend',
		});
	});

	it('honors a custom loader URL', () => {
		const script = umamiAnalytics({
			websiteId: 'site-abc',
			scriptUrl: 'https://cdn.example.com/umami.js',
		});

		expect(script.src).toBe('https://cdn.example.com/umami.js');
	});
});

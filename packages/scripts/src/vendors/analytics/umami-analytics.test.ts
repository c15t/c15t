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
			'data-auto-track': undefined,
			'data-before-send': undefined,
			'data-domains': undefined,
			'data-host-url': undefined,
			'data-tag': undefined,
			'data-website-id': 'site-abc',
		});
	});

	it('serializes a domain array into a JSON attribute', () => {
		const script = umamiAnalytics({
			domains: ['example.com', 'www.example.com'],
			websiteId: 'site-abc',
		});

		expect(script.attributes).toMatchObject({
			'data-domains': '["example.com","www.example.com"]',
		});
	});

	it('serializes optional flags and passes through string values', () => {
		const script = umamiAnalytics({
			autoTrack: false,
			beforeSend: 'window.umamiBeforeSend',
			domains: 'example.com',
			hostUrl: 'https://analytics.example.com',
			tag: 'release-2025',
			websiteId: 'site-abc',
		});

		expect(script.attributes).toEqual({
			'data-auto-track': 'false',
			'data-before-send': 'window.umamiBeforeSend',
			'data-domains': 'example.com',
			'data-host-url': 'https://analytics.example.com',
			'data-tag': 'release-2025',
			'data-website-id': 'site-abc',
		});
	});

	it('honors a custom loader URL', () => {
		const script = umamiAnalytics({
			scriptUrl: 'https://cdn.example.com/umami.js',
			websiteId: 'site-abc',
		});

		expect(script.src).toBe('https://cdn.example.com/umami.js');
	});
});

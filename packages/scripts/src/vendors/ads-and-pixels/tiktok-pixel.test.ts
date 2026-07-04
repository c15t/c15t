import { describe, expect, it, vi } from 'vitest';
import {
	expectScriptMatchesIntegration,
	getTestGlobal,
	runOnBeforeLoad,
	setupScriptHelperTest,
	toArgumentsArray,
} from '../../__tests__/helpers';
import { tiktokPixel } from './tiktok-pixel';

describe('tiktokPixel', () => {
	setupScriptHelperTest();

	it('matches registry metadata with default loader URL', () => {
		const script = tiktokPixel({ pixelId: 'tt-123' });

		expectScriptMatchesIntegration('tiktokPixel', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=tt-123&lib=ttq',
		});
	});

	it('seeds the ttq queue and page event before script load', () => {
		const globalRef = getTestGlobal();
		const script = tiktokPixel({ pixelId: 'tt-123' });

		runOnBeforeLoad(script, { hasConsent: true });

		const queue = globalRef.ttq as unknown[] | undefined;

		expect(globalRef.TiktokAnalyticsObject).toBe('ttq');
		expect(queue?.map((entry) => toArgumentsArray(entry))).toEqual([
			['grantConsent'],
			['page'],
		]);
		expect(typeof window.ttq.track).toBe('function');
	});

	it('supports overriding the loader base URL', () => {
		const script = tiktokPixel({
			pixelId: 'tt-123',
			scriptSrc: 'https://cdn.example.com/events.js',
		});

		expect(script.src).toBe(
			'https://cdn.example.com/events.js?sdkid=tt-123&lib=ttq'
		);
	});

	it('signals consent changes through TikTok consent methods', () => {
		const grantConsent = vi.fn();
		const revokeConsent = vi.fn();
		const script = tiktokPixel({ pixelId: 'tt-123' });

		runOnBeforeLoad(script, { hasConsent: true });
		window.ttq.grantConsent = grantConsent;
		window.ttq.revokeConsent = revokeConsent;

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
		script.onConsentChange?.({
			id: script.id,
			elementId: script.id,
			hasConsent: true,
			consents: {
				necessary: true,
				functionality: false,
				measurement: false,
				marketing: true,
				experience: false,
			},
		});

		expect(revokeConsent).toHaveBeenCalledTimes(1);
		expect(grantConsent).toHaveBeenCalledTimes(1);
	});
});

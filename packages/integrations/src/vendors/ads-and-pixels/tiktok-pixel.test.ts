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

	it('registers the pixel the way ttq.load does in the TikTok base code', () => {
		const globalRef = getTestGlobal();
		const script = tiktokPixel({ pixelId: 'tt-123' });

		runOnBeforeLoad(script, { hasConsent: true });

		const ttq = globalRef.ttq as {
			_i?: Record<string, unknown[] & { _u?: string }>;
			_o?: Record<string, unknown>;
			_t?: Record<string, unknown>;
		};

		expect(Array.isArray(ttq._i?.['tt-123'])).toBe(true);
		expect(ttq._i?.['tt-123']?._u).toBe(
			'https://analytics.tiktok.com/i18n/pixel/events.js'
		);
		expect(typeof ttq._t?.['tt-123']).toBe('number');
		expect(ttq._o?.['tt-123']).toEqual({});
	});

	it('keeps other pixels registered on the same ttq queue', () => {
		const globalRef = getTestGlobal();
		const first = tiktokPixel({ pixelId: 'tt-first' });
		const second = tiktokPixel({ pixelId: 'tt-second' });

		runOnBeforeLoad(first, { hasConsent: true });
		runOnBeforeLoad(second, { hasConsent: true });

		const ttq = globalRef.ttq as { _i?: Record<string, unknown> };
		expect(Object.keys(ttq._i ?? {})).toEqual(['tt-first', 'tt-second']);
	});

	it('grants TikTok consent once when the pixel loads with consent', () => {
		const grantConsent = vi.fn();
		const script = tiktokPixel({ pixelId: 'tt-123' });

		runOnBeforeLoad(script, { hasConsent: true });
		window.ttq.grantConsent = grantConsent;
		script.onLoad?.({
			consents: {
				experience: false,
				functionality: false,
				marketing: true,
				measurement: false,
				necessary: true,
			},
			elementId: script.id,
			hasConsent: true,
			id: script.id,
		});

		const queue = getTestGlobal().ttq as unknown[];
		expect(
			queue.filter((entry) => toArgumentsArray(entry)[0] === 'grantConsent')
		).toHaveLength(1);
		expect(grantConsent).not.toHaveBeenCalled();
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
			consents: {
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			},
			elementId: script.id,
			hasConsent: false,
			id: script.id,
		});
		script.onConsentChange?.({
			consents: {
				experience: false,
				functionality: false,
				marketing: true,
				measurement: false,
				necessary: true,
			},
			elementId: script.id,
			hasConsent: true,
			id: script.id,
		});

		expect(revokeConsent).toHaveBeenCalledTimes(1);
		expect(grantConsent).toHaveBeenCalledTimes(1);
	});
});

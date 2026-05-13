import { describe, expect, it, vi } from 'vitest';
import {
	createCallbackInfo,
	expectScriptMatchesIntegration,
	expectStubCommandQueue,
	getTestGlobal,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import {
	metaPixel,
	metaPixelCustomEvent,
	metaPixelEvent,
	metaPixelSingleCustomEvent,
	metaPixelSingleEvent,
} from './meta-pixel';

describe('metaPixel', () => {
	setupScriptHelperTest();

	it('matches registry metadata with default loader URL', () => {
		const script = metaPixel({ pixelId: '123456' });

		expectScriptMatchesIntegration('metaPixel', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://connect.facebook.net/en_US/fbevents.js',
		});
	});

	it('seeds fbq queue with consent grant, init, and PageView', () => {
		const globalRef = getTestGlobal();
		const script = metaPixel({ pixelId: '123456' });

		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));

		const fbq = globalRef.fbq as
			| (((...args: unknown[]) => void) & {
					queue?: unknown[][];
					version?: string;
			  })
			| undefined;

		expect(fbq?.version).toBe('2.0');
		expect(globalRef._fbq).toBe(fbq);
		expectStubCommandQueue(fbq, 'queue', [
			['consent', 'grant'],
			['init', '123456'],
			['track', 'PageView'],
		]);
	});

	it('supports init options and disabling the default PageView', () => {
		const globalRef = getTestGlobal();
		const script = metaPixel({
			pixelId: '123456',
			initOptions: { external_id: 'customer-123' },
			trackPageView: false,
		});

		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));

		const fbq = globalRef.fbq as
			| (((...args: unknown[]) => void) & { queue?: unknown[][] })
			| undefined;
		expectStubCommandQueue(fbq, 'queue', [
			['consent', 'grant'],
			['init', '123456', { external_id: 'customer-123' }],
		]);
	});

	it('queues data processing options before pixel init', () => {
		const globalRef = getTestGlobal();
		const script = metaPixel({
			pixelId: '123456',
			dataProcessingOptions: {
				options: ['LDU'],
				country: 1,
				state: 1000,
			},
		});

		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));

		const fbq = globalRef.fbq as
			| (((...args: unknown[]) => void) & { queue?: unknown[][] })
			| undefined;
		expectStubCommandQueue(fbq, 'queue', [
			['consent', 'grant'],
			['dataProcessingOptions', ['LDU'], 1, 1000],
			['init', '123456'],
			['track', 'PageView'],
		]);
	});

	it('supports explicitly disabling limited data use', () => {
		const globalRef = getTestGlobal();
		const script = metaPixel({
			pixelId: '123456',
			dataProcessingOptions: {
				options: [],
			},
		});

		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));

		const fbq = globalRef.fbq as
			| (((...args: unknown[]) => void) & { queue?: unknown[][] })
			| undefined;
		expectStubCommandQueue(fbq, 'queue', [
			['consent', 'grant'],
			['dataProcessingOptions', []],
			['init', '123456'],
			['track', 'PageView'],
		]);
	});

	it('maps consent changes to fbq consent calls', () => {
		const globalRef = getTestGlobal();
		const script = metaPixel({ pixelId: '123456' });

		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));
		script.onConsentChange?.(
			createCallbackInfo({
				id: script.id,
				hasConsent: true,
			})
		);
		script.onConsentChange?.(
			createCallbackInfo({
				id: script.id,
				hasConsent: false,
			})
		);

		const fbq = globalRef.fbq as
			| (((...args: unknown[]) => void) & { queue?: unknown[][] })
			| undefined;
		expectStubCommandQueue(fbq, 'queue', [
			['consent', 'grant'],
			['init', '123456'],
			['track', 'PageView'],
			['consent', 'grant'],
			['consent', 'revoke'],
		]);
	});

	it('supports overriding the loader URL', () => {
		const script = metaPixel({
			pixelId: '123456',
			scriptSrc: 'https://cdn.example.com/fbevents.js',
		});

		expect(script.src).toBe('https://cdn.example.com/fbevents.js');
	});
});

describe('metaPixelEvent', () => {
	setupScriptHelperTest();

	it('forwards event payload to fbq', () => {
		const globalRef = getTestGlobal();
		const fbq = vi.fn();
		globalRef.fbq = fbq;

		metaPixelEvent('Purchase', {
			value: 10,
			currency: 'USD',
		});

		expect(fbq).toHaveBeenCalledWith(
			'track',
			'Purchase',
			{
				value: 10,
				currency: 'USD',
			},
			undefined
		);
	});

	it('forwards event IDs using Meta event options', () => {
		const globalRef = getTestGlobal();
		const fbq = vi.fn();
		globalRef.fbq = fbq;

		metaPixelEvent(
			'Purchase',
			{
				value: 10,
				currency: 'USD',
			},
			'event-123'
		);

		expect(fbq).toHaveBeenCalledWith(
			'track',
			'Purchase',
			{
				value: 10,
				currency: 'USD',
			},
			{ eventID: 'event-123' }
		);
	});

	it('forwards custom event payloads to fbq', () => {
		const globalRef = getTestGlobal();
		const fbq = vi.fn();
		globalRef.fbq = fbq;

		metaPixelCustomEvent(
			'ShareDiscount',
			{ promotion: 'share_discount_10%' },
			{ eventID: 'event-456' }
		);

		expect(fbq).toHaveBeenCalledWith(
			'trackCustom',
			'ShareDiscount',
			{ promotion: 'share_discount_10%' },
			{ eventID: 'event-456' }
		);
	});

	it('supports tracking a standard event for a single pixel', () => {
		const globalRef = getTestGlobal();
		const fbq = vi.fn();
		globalRef.fbq = fbq;

		metaPixelSingleEvent(
			'pixel-a',
			'Lead',
			{
				value: 40,
				currency: 'USD',
			},
			'event-789'
		);

		expect(fbq).toHaveBeenCalledWith(
			'trackSingle',
			'pixel-a',
			'Lead',
			{
				value: 40,
				currency: 'USD',
			},
			{ eventID: 'event-789' }
		);
	});

	it('supports tracking a custom event for a single pixel', () => {
		const globalRef = getTestGlobal();
		const fbq = vi.fn();
		globalRef.fbq = fbq;

		metaPixelSingleCustomEvent(
			'pixel-b',
			'Step4',
			{ funnel: 'checkout' },
			'event-abc'
		);

		expect(fbq).toHaveBeenCalledWith(
			'trackSingleCustom',
			'pixel-b',
			'Step4',
			{ funnel: 'checkout' },
			{ eventID: 'event-abc' }
		);
	});
});

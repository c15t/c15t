import { describe, expect, it, vi } from 'vitest';
import {
	createCallbackInfo,
	expectScriptMatchesIntegration,
	expectStubCommandQueue,
	getTestGlobal,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { metaPixel, metaPixelEvent } from './meta-pixel';

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
});

import { describe, expect, it, vi } from 'vitest';
import {
	createCallbackInfo,
	expectScriptMatchesIntegration,
	expectStubCommandQueue,
	getTestGlobal,
	runOnBeforeLoad,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { redditPixel, redditPixelEvent } from './reddit-pixel';

type RdtStub =
	| (((...args: unknown[]) => void) & {
			callQueue?: unknown[][];
	  })
	| undefined;

describe('redditPixel', () => {
	setupScriptHelperTest();

	it('matches registry metadata with default page visit tracking', () => {
		const script = redditPixel({ pixelId: 't2_abcdef' });

		expectScriptMatchesIntegration('redditPixel', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://www.redditstatic.com/ads/pixel.js',
		});
	});

	it('seeds the rdt queue and init/page visit events', () => {
		const globalRef = getTestGlobal();
		const script = redditPixel({ pixelId: 't2_abcdef' });

		runOnBeforeLoad(script);

		const stub = globalRef.rdt as RdtStub;
		expect(typeof stub).toBe('function');
		expectStubCommandQueue(stub, 'callQueue', [
			['init', 't2_abcdef'],
			['track', 'PageVisit'],
		]);
	});

	it('can disable the default page visit call', () => {
		const globalRef = getTestGlobal();
		const script = redditPixel({
			pixelId: 't2_abcdef',
			trackPageVisit: false,
			scriptUrl: 'https://cdn.example.com/reddit-pixel.js',
		});

		expect(script.src).toBe('https://cdn.example.com/reddit-pixel.js');
		runOnBeforeLoad(script);

		const stub = globalRef.rdt as RdtStub;
		expectStubCommandQueue(stub, 'callQueue', [['init', 't2_abcdef']]);
	});

	it('passes privacy and matching options to pixel init', () => {
		const globalRef = getTestGlobal();
		const script = redditPixel({
			pixelId: 't2_abcdef',
			disableFirstPartyCookies: true,
			initOptions: {
				optOut: true,
				email: 'person@example.com',
				externalId: 'customer-123',
				aam: {
					email: false,
					phone_number: false,
				},
				dpm: ['LDU'],
				dpcc: 'US',
				dprc: 'CA',
				partner: 'c15t',
				partner_version: '2.0.0',
			},
		});

		runOnBeforeLoad(script);

		const stub = globalRef.rdt as RdtStub;
		expectStubCommandQueue(stub, 'callQueue', [
			[
				'init',
				't2_abcdef',
				{
					optOut: true,
					email: 'person@example.com',
					externalId: 'customer-123',
					aam: {
						email: false,
						phone_number: false,
					},
					dpm: ['LDU'],
					dpcc: 'US',
					dprc: 'CA',
					partner: 'c15t',
					partner_version: '2.0.0',
					disableFirstPartyCookies: true,
				},
			],
			['track', 'PageVisit'],
		]);
	});

	it('queues first-party cookie controls on consent changes', () => {
		const globalRef = getTestGlobal();
		const script = redditPixel({ pixelId: 't2_abcdef' });

		runOnBeforeLoad(script);
		script.onConsentChange?.(
			createCallbackInfo({
				id: script.id,
				hasConsent: false,
			})
		);
		script.onConsentChange?.(
			createCallbackInfo({
				id: script.id,
				hasConsent: true,
				consents: {
					necessary: true,
					functionality: false,
					measurement: false,
					marketing: true,
					experience: false,
				},
			})
		);

		const stub = globalRef.rdt as RdtStub;
		expectStubCommandQueue(stub, 'callQueue', [
			['init', 't2_abcdef'],
			['track', 'PageVisit'],
			['disableFirstPartyCookies'],
			['enableFirstPartyCookies'],
		]);
	});
});

describe('redditPixelEvent', () => {
	setupScriptHelperTest();

	it('forwards metadata and conversion IDs to rdt', () => {
		const globalRef = getTestGlobal();
		const rdt = vi.fn();
		globalRef.rdt = rdt;

		redditPixelEvent('Purchase', {
			value: 99,
			currency: 'USD',
			conversionId: 'conversion-123',
			products: [
				{
					id: 'sku-123',
					name: 'Example product',
					quantity: 1,
					itemPrice: 99,
				},
			],
		});

		expect(rdt).toHaveBeenCalledWith('track', 'Purchase', {
			value: 99,
			currency: 'USD',
			conversionId: 'conversion-123',
			products: [
				{
					id: 'sku-123',
					name: 'Example product',
					quantity: 1,
					itemPrice: 99,
				},
			],
		});
	});
});

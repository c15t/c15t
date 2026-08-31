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
			scriptUrl: 'https://cdn.example.com/reddit-pixel.js',
			trackPageVisit: false,
		});

		expect(script.src).toBe('https://cdn.example.com/reddit-pixel.js');
		runOnBeforeLoad(script);

		const stub = globalRef.rdt as RdtStub;
		expectStubCommandQueue(stub, 'callQueue', [['init', 't2_abcdef']]);
	});

	it('passes privacy and matching options to pixel init', () => {
		const globalRef = getTestGlobal();
		const script = redditPixel({
			disableFirstPartyCookies: true,
			initOptions: {
				aam: {
					email: false,
					phone_number: false,
				},
				dpcc: 'US',
				dpm: ['LDU'],
				dprc: 'CA',
				email: 'person@example.com',
				externalId: 'customer-123',
				optOut: true,
				partner: 'c15t',
				partner_version: '2.0.0',
			},
			pixelId: 't2_abcdef',
		});

		runOnBeforeLoad(script);

		const stub = globalRef.rdt as RdtStub;
		expectStubCommandQueue(stub, 'callQueue', [
			[
				'init',
				't2_abcdef',
				{
					aam: {
						email: false,
						phone_number: false,
					},
					disableFirstPartyCookies: true,
					dpcc: 'US',
					dpm: ['LDU'],
					dprc: 'CA',
					email: 'person@example.com',
					externalId: 'customer-123',
					optOut: true,
					partner: 'c15t',
					partner_version: '2.0.0',
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
				hasConsent: false,
				id: script.id,
			})
		);
		script.onConsentChange?.(
			createCallbackInfo({
				consents: {
					experience: false,
					functionality: false,
					marketing: true,
					measurement: false,
					necessary: true,
				},
				hasConsent: true,
				id: script.id,
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
			conversionId: 'conversion-123',
			currency: 'USD',
			products: [
				{
					id: 'sku-123',
					itemPrice: 99,

					name: 'Example product',
					quantity: 1,
				},
			],
			value: 99,
		});

		expect(rdt).toHaveBeenCalledWith('track', 'Purchase', {
			conversionId: 'conversion-123',
			currency: 'USD',
			products: [
				{
					id: 'sku-123',
					itemPrice: 99,

					name: 'Example product',
					quantity: 1,
				},
			],
			value: 99,
		});
	});
});

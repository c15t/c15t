import { describe, expect, it, vi } from 'vitest';

import {
	createCallbackInfo,
	expectStubCommandQueue,
	getTestGlobal,
	runOnBeforeLoad,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { openaiPixel, openaiPixelEvent } from './openai-pixel';
import type { OpenAIPixelEventArgs } from './openai-pixel';

const pixelId = 'FZfHJsmuTCvv8LyoCnzMuh';

describe('openaiPixel', () => {
	setupScriptHelperTest();

	it('denies consent before init and grants it before loading the SDK', () => {
		const script = openaiPixel({ debug: true, pixelId });
		runOnBeforeLoad(script, { hasConsent: true });

		expectStubCommandQueue(getTestGlobal().oaiq, 'q', [
			['consent', false],
			['init', { debug: true, pixelId }],
			['consent', true],
		]);
	});

	it('keeps consent denied when invoked without consent', () => {
		const script = openaiPixel({ pixelId });
		runOnBeforeLoad(script);

		expectStubCommandQueue(getTestGlobal().oaiq, 'q', [
			['consent', false],
			['init', { debug: false, pixelId }],
		]);
	});

	it('preserves an existing SDK and forwards withdrawal and re-grant', () => {
		const oaiq = vi.fn();
		getTestGlobal().oaiq = oaiq;
		const script = openaiPixel({ pixelId });
		runOnBeforeLoad(script, { hasConsent: true });
		oaiq.mockClear();

		for (const hasConsent of [false, true]) {
			script.onConsentChange?.(
				createCallbackInfo({ hasConsent, id: script.id })
			);
		}

		expect(getTestGlobal().oaiq).toBe(oaiq);
		expect(oaiq.mock.calls).toEqual([
			['consent', false],
			['consent', true],
		]);
	});

	it('passes every documented user matching field to init', () => {
		const user = {
			city: 'San Francisco',
			country: 'US',
			email_sha256: 'a'.repeat(64),
			external_id_sha256: 'c'.repeat(64),
			first_name_sha256: 'd'.repeat(64),
			last_name_sha256: 'e'.repeat(64),
			phone_number_sha256: 'b'.repeat(64),
			postal_code: '94107',
			region: 'California',
		};
		runOnBeforeLoad(openaiPixel({ pixelId, user }));
		expectStubCommandQueue(getTestGlobal().oaiq, 'q', [
			['consent', false],
			['init', { debug: false, pixelId, user }],
		]);
	});

	it('supports a custom SDK URL', () => {
		expect(
			openaiPixel({ pixelId, scriptSrc: 'https://cdn.example.com/oaiq.js' }).src
		).toBe('https://cdn.example.com/oaiq.js');
	});

	it('can construct the script without a browser', () => {
		vi.stubGlobal('window', undefined);
		expect(openaiPixel({ pixelId }).id).toBe('openai-pixel');
	});
});

describe('openaiPixelEvent', () => {
	setupScriptHelperTest();

	it.each<OpenAIPixelEventArgs>([
		[
			'order_created',
			{
				amount: 2599,
				contents: [{ id: 'sku-1', quantity: 1 }],
				currency: 'USD',
				type: 'contents',
			},
			{ event_id: 'order-1', opt_out: true },
		],
		['lead_created', { type: 'customer_action' }],
		['trial_started', { plan_id: 'trial', type: 'plan_enrollment' }],
		[
			'custom',
			{ plan_id: 'pro', type: 'custom' },
			{
				custom_event_name: 'c15t_integration_test',
				event_id: 'test-1',
				opt_out: true,
			},
		],
	])('forwards %s and its data/options unchanged', (...args) => {
		const oaiq = vi.fn();
		getTestGlobal().oaiq = oaiq;
		openaiPixelEvent(...args);
		expect(oaiq).toHaveBeenCalledExactlyOnceWith('measure', ...args);
	});

	it('queues conversions after consent while the SDK is loading', () => {
		runOnBeforeLoad(openaiPixel({ pixelId }), { hasConsent: true });
		openaiPixelEvent('page_viewed', { type: 'contents' });
		expectStubCommandQueue(getTestGlobal().oaiq, 'q', [
			['consent', false],
			['init', { debug: false, pixelId }],
			['consent', true],
			['measure', 'page_viewed', { type: 'contents' }],
		]);
	});

	it('does not create a queue for events before consent', () => {
		openaiPixelEvent('lead_created', { type: 'customer_action' });
		expect(getTestGlobal().oaiq).toBeUndefined();
	});

	it('does nothing during server rendering', () => {
		vi.stubGlobal('window', undefined);
		expect(() =>
			openaiPixelEvent('lead_created', { type: 'customer_action' })
		).not.toThrow();
	});
});

import { describe, expect, it, vi } from 'vitest';
import {
	expectScriptMatchesIntegration,
	expectStubCommandQueue,
	getTestGlobal,
	runOnBeforeLoad,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { xPixel, xPixelEvent } from './x-pixel';

describe('xPixel', () => {
	setupScriptHelperTest();

	it('matches registry metadata with default loader URL', () => {
		const script = xPixel({ pixelId: 'tw-123' });

		expectScriptMatchesIntegration('xPixel', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://static.ads-twitter.com/uwt.js',
		});
	});

	it('seeds the twq queue and config call before script load', () => {
		const globalRef = getTestGlobal();
		const script = xPixel({ pixelId: 'tw-123' });

		runOnBeforeLoad(script);

		const stub = globalRef.twq as
			| (((...args: unknown[]) => void) & {
					queue?: unknown[][];
					version?: string;
			  })
			| undefined;

		expect(stub?.version).toBe('1.1');
		expectStubCommandQueue(stub, 'queue', [['config', 'tw-123']]);
	});

	it('supports overriding the loader URL', () => {
		const script = xPixel({
			pixelId: 'tw-123',
			scriptSrc: 'https://cdn.example.com/uwt.js',
		});

		expect(script.src).toBe('https://cdn.example.com/uwt.js');
	});
});

describe('xPixelEvent', () => {
	setupScriptHelperTest();

	it('forwards event payload to twq when available', () => {
		const globalRef = getTestGlobal();
		const twq = vi.fn();
		globalRef.twq = twq;

		xPixelEvent('tw-pixel-event', {
			value: 200,
			currency: 'USD',
			status: 'completed',
			conversion_id: 'order-123',
		});

		expect(twq).toHaveBeenCalledWith('event', 'tw-pixel-event', {
			value: 200,
			currency: 'USD',
			status: 'completed',
			conversion_id: 'order-123',
		});
	});

	it('is a no-op when twq is unavailable', () => {
		const globalRef = getTestGlobal();
		delete globalRef.twq;

		expect(() => xPixelEvent('tw-pixel-event')).not.toThrow();
	});
});

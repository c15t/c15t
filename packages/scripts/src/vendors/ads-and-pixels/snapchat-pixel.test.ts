import { describe, expect, it, vi } from 'vitest';
import {
	expectScriptMatchesIntegration,
	expectStubCommandQueue,
	getTestGlobal,
	runOnBeforeLoad,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { resolveManifest } from '../../resolve';
import {
	snapchatPixel,
	snapchatPixelEvent,
	snapchatPixelManifest,
} from './snapchat-pixel';

type SnaptrStub =
	| (((...args: unknown[]) => void) & {
			queue?: unknown[][];
			version?: string;
	  })
	| undefined;

describe('snapchatPixel', () => {
	setupScriptHelperTest();

	it('matches registry metadata with default tracking', () => {
		const script = snapchatPixel({ pixelId: '123456789012345' });

		expectScriptMatchesIntegration('snapchatPixel', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://sc-static.net/scevent.min.js',
		});
	});

	it('queues init and default page view before script load', () => {
		const globalRef = getTestGlobal();
		const script = snapchatPixel({ pixelId: '123456789012345' });

		runOnBeforeLoad(script);

		const stub = globalRef.snaptr as SnaptrStub;

		expect(stub?.version).toBe('1.0');
		expectStubCommandQueue(stub, 'queue', [
			['init', '123456789012345'],
			['track', 'PAGE_VIEW'],
		]);
	});

	it('supports init options and disabling PAGE_VIEW', () => {
		const globalRef = getTestGlobal();
		const script = snapchatPixel({
			pixelId: '123456789012345',
			initOptions: { user_email: 'hello@example.com' },
			trackPageView: false,
			scriptUrl: 'https://cdn.example.com/scevent.min.js',
		});

		expect(script.src).toBe('https://cdn.example.com/scevent.min.js');
		runOnBeforeLoad(script);

		const stub = globalRef.snaptr as SnaptrStub;
		expectStubCommandQueue(stub, 'queue', [
			['init', '123456789012345', { user_email: 'hello@example.com' }],
		]);
	});

	it('keeps the exported manifest resolvable without init options', () => {
		const globalRef = getTestGlobal();
		const script = resolveManifest(snapchatPixelManifest, {
			pixelId: '123456789012345',
			scriptUrl: 'https://sc-static.net/scevent.min.js',
		});

		runOnBeforeLoad(script);

		const stub = globalRef.snaptr as SnaptrStub;
		expectStubCommandQueue(stub, 'queue', [
			['init', '123456789012345'],
			['track', 'PAGE_VIEW'],
		]);
	});
});

describe('snapchatPixelEvent', () => {
	setupScriptHelperTest();

	it('forwards purchase metadata and deduplication IDs to snaptr', () => {
		const globalRef = getTestGlobal();
		const snaptr = vi.fn();
		globalRef.snaptr = snaptr;

		snapchatPixelEvent('PURCHASE', {
			price: 99,
			currency: 'USD',
			transaction_id: 'order-123',
			client_dedup_id: 'event-123',
			item_ids: ['sku-123'],
			number_items: 1,
		});

		expect(snaptr).toHaveBeenCalledWith('track', 'PURCHASE', {
			price: 99,
			currency: 'USD',
			transaction_id: 'order-123',
			client_dedup_id: 'event-123',
			item_ids: ['sku-123'],
			number_items: 1,
		});
	});
});

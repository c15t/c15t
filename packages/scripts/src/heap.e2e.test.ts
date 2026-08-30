/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';

import {
	deniedConsents,
	grantedMeasurementConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	type TestWindow,
	updateScripts,
} from './e2e-test-utils';
import {
	DEFAULT_HEAP_CONFIG_BASE_URL,
	HEAP_QUEUE_METHODS,
	heap,
} from './vendors/analytics/heap';

function snapshotHeapReadyQueue(win: TestWindow): Array<{
	name: string;
	fnType: string;
}> {
	return (win.heapReadyCb ?? []).map((entry) => ({
		name: entry.name,
		fnType: typeof entry.fn,
	}));
}

describe('heap contract', () => {
	registerVendorContractCleanup();

	it('boots the heap.js callback queue contract before the loader appends', () => {
		let methodTypes: Record<string, string> | undefined;
		let queueSnapshot: Array<{ name: string; fnType: string }> | undefined;
		let scriptSrc: string | undefined;
		let envId: string | undefined;
		let appid: string | undefined;
		let clientConfig: Record<string, unknown> | undefined;

		installHeadProbe((node, win) => {
			if (!node.src.includes('cdn.us.heap-api.com/config/123456789')) {
				return;
			}

			scriptSrc = node.src;
			envId = win.heap?.envId;
			appid = win.heap?.appid;
			clientConfig = win.heap?.clientConfig;
			methodTypes = Object.fromEntries(
				HEAP_QUEUE_METHODS.map((method) => [method, typeof win.heap?.[method]])
			);

			win.heap?.track?.('Signup', { plan: 'pro' });
			win.heap?.identify?.('user-123');
			queueSnapshot = snapshotHeapReadyQueue(win);
			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...heap({
						envId: '123456789',
						clientConfig: {
							disableTextCapture: true,
						},
					}),
					id: 'heap-contract',
				},
			],
			grantedMeasurementConsents
		);

		expect(scriptSrc).toBe(
			`${DEFAULT_HEAP_CONFIG_BASE_URL}/123456789/heap_config.js`
		);
		expect(envId).toBe('123456789');
		expect(appid).toBe('123456789');
		expect(clientConfig).toEqual({
			disableTextCapture: true,
			shouldFetchServerConfig: false,
		});
		expect(methodTypes).toEqual(
			Object.fromEntries(
				HEAP_QUEUE_METHODS.map((method) => [method, 'function'])
			)
		);
		expect(queueSnapshot).toEqual([
			{
				name: 'track',
				fnType: 'function',
			},
			{
				name: 'identify',
				fnType: 'function',
			},
		]);
	});

	it('replays queued callbacks against the loaded Heap runtime shape', () => {
		const calls: unknown[][] = [];

		installHeadProbe((node, win) => {
			if (!node.src.includes('cdn.us.heap-api.com/config/123456789')) {
				return;
			}

			win.heap?.track?.('Signup', { plan: 'pro' });
			win.heap = {
				track: (...args: unknown[]) => {
					calls.push(args);
				},
			};

			for (const entry of win.heapReadyCb ?? []) {
				entry.fn();
			}

			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...heap({
						envId: '123456789',
					}),
					id: 'heap-contract',
				},
			],
			grantedMeasurementConsents
		);

		expect(calls).toEqual([['Signup', { plan: 'pro' }]]);
	});

	it('waits for measurement consent before appending the loader', () => {
		let appended = false;

		installHeadProbe((node) => {
			if (node.src.includes('cdn.us.heap-api.com/config/123456789')) {
				appended = true;
			}
		});

		loadScripts(
			[
				{
					...heap({
						envId: '123456789',
					}),
					id: 'heap-contract',
				},
			],
			deniedConsents
		);

		expect(appended).toBe(false);
		expect((window as TestWindow).heap).toBeUndefined();
		expect((window as TestWindow).heapReadyCb).toBeUndefined();
	});

	it('unloads by default on measurement consent revocation', () => {
		const script = {
			...heap({
				envId: '123456789',
			}),
			id: 'heap-contract',
		};

		installHeadProbe((node) => {
			if (node.src.includes('cdn.us.heap-api.com/config/123456789')) {
				node.dispatchEvent(new Event('load'));
			}
		});

		loadScripts([script], grantedMeasurementConsents);

		const result = updateScripts([script], deniedConsents);

		expect(result.unloaded).toEqual(['heap-contract']);
		expect(document.getElementById('c15t-script-heap-contract')).toBeNull();
	});
});

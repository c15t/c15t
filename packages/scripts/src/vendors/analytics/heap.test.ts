import { describe, expect, it } from 'vitest';
import {
	createCallbackInfo,
	expectScriptMatchesIntegration,
	getTestGlobal,
	grantedMeasurementConsentState,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import {
	DEFAULT_HEAP_CONFIG_BASE_URL,
	HEAP_QUEUE_METHODS,
	type HeapReadyCallback,
	heap,
} from './heap';

type HeapStub = unknown[] &
	Record<string, unknown> & {
		appid?: string;
		clientConfig?: Record<string, unknown>;
		envId?: string;
		track?: (event: string, properties?: Record<string, unknown>) => void;
		identify?: (identity: string) => void;
	};

function snapshotHeapReadyQueue(): Array<{
	name: string;
	fnType: string;
}> {
	const globalRef = getTestGlobal() as typeof globalThis & {
		heapReadyCb?: HeapReadyCallback[];
	};

	return (globalRef.heapReadyCb ?? []).map((entry) => ({
		name: entry.name,
		fnType: typeof entry.fn,
	}));
}

describe('heap', () => {
	setupScriptHelperTest();

	it('matches registry metadata with the default config loader URL', () => {
		const script = heap({
			envId: '123456789',
		});

		expectScriptMatchesIntegration('heap', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: `${DEFAULT_HEAP_CONFIG_BASE_URL}/123456789/heap_config.js`,
		});
	});

	it('seeds the heap.js callback queue contract before load', () => {
		const globalRef = getTestGlobal() as typeof globalThis & {
			heap?: HeapStub;
			heapReadyCb?: HeapReadyCallback[];
		};
		const script = heap({
			envId: ' 123456789 ',
			clientConfig: {
				disableTextCapture: true,
				metadataStorage: 'localstorage',
			},
		});

		script.onBeforeLoad?.(
			createCallbackInfo({
				id: script.id,
				consents: grantedMeasurementConsentState,
				hasConsent: true,
			})
		);

		const methodTypes = Object.fromEntries(
			HEAP_QUEUE_METHODS.map((method) => [
				method,
				typeof globalRef.heap?.[method],
			])
		);

		expect(Array.isArray(globalRef.heap)).toBe(true);
		expect(Array.isArray(globalRef.heapReadyCb)).toBe(true);
		expect(globalRef.heap?.envId).toBe('123456789');
		expect(globalRef.heap?.appid).toBe('123456789');
		expect(globalRef.heap?.clientConfig).toEqual({
			disableTextCapture: true,
			metadataStorage: 'localstorage',
			shouldFetchServerConfig: false,
		});
		expect(methodTypes).toEqual(
			Object.fromEntries(
				HEAP_QUEUE_METHODS.map((method) => [method, 'function'])
			)
		);
		expect(snapshotHeapReadyQueue()).toEqual([]);
	});

	it('queues callback records that replay against the loaded runtime', () => {
		const globalRef = getTestGlobal() as typeof globalThis & {
			heap?: HeapStub | Record<string, unknown>;
			heapReadyCb?: HeapReadyCallback[];
		};
		const calls: unknown[][] = [];
		const script = heap({
			envId: '123456789',
		});

		script.onBeforeLoad?.(
			createCallbackInfo({
				id: script.id,
				consents: grantedMeasurementConsentState,
				hasConsent: true,
			})
		);

		(globalRef.heap as HeapStub | undefined)?.track?.('Signup', {
			plan: 'pro',
		});
		(globalRef.heap as HeapStub | undefined)?.identify?.('user-123');

		expect(snapshotHeapReadyQueue()).toEqual([
			{
				name: 'track',
				fnType: 'function',
			},
			{
				name: 'identify',
				fnType: 'function',
			},
		]);

		globalRef.heap = {
			track: (...args: unknown[]) => {
				calls.push(['track', ...args]);
			},
			identify: (...args: unknown[]) => {
				calls.push(['identify', ...args]);
			},
		};

		for (const entry of globalRef.heapReadyCb ?? []) {
			entry.fn();
		}

		expect(calls).toEqual([
			['track', 'Signup', { plan: 'pro' }],
			['identify', 'user-123'],
		]);
	});

	it('uses a custom loader URL and falls back when the override is blank', () => {
		expect(
			heap({
				envId: '123456789',
				scriptUrl: 'https://analytics.example.com/heap_config.js',
			}).src
		).toBe('https://analytics.example.com/heap_config.js');

		expect(
			heap({
				envId: '123456789',
				scriptUrl: '   ',
			}).src
		).toBe(`${DEFAULT_HEAP_CONFIG_BASE_URL}/123456789/heap_config.js`);
	});

	it('throws for an empty env id', () => {
		expect(() => heap({ envId: '   ' })).toThrowError(
			'heap: missing or invalid envId'
		);
	});

	it('throws for non-JSON client config values', () => {
		expect(() =>
			heap({
				envId: '123456789',
				clientConfig: {
					createdAt: new Date(),
				},
			})
		).toThrowError('heap: clientConfig.createdAt must be JSON-serializable');

		expect(() =>
			heap({
				envId: '123456789',
				clientConfig: {
					sampleRate: Number.NaN,
				},
			})
		).toThrowError('heap: clientConfig.sampleRate must be a finite number');
	});
});

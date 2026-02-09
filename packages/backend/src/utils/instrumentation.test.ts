import { afterEach, describe, expect, it, vi } from 'vitest';
import type { C15TOptions } from '../types';
import {
	withCacheSpan,
	withDatabaseSpan,
	withExternalSpan,
} from './instrumentation';

// Mock create-telemetry-options
vi.mock('./create-telemetry-options', () => {
	const { SpanStatusCode } = require('@opentelemetry/api');

	const mockSpan = () => ({
		setStatus: vi.fn(),
		setAttribute: vi.fn(),
		updateName: vi.fn(),
		end: vi.fn(),
	});

	return {
		isTelemetryEnabled: vi.fn(
			(options) => options?.advanced?.telemetry?.enabled === true
		),
		getTracer: vi.fn(() => ({
			startSpan: vi.fn(() => mockSpan()),
		})),
		getDefaultAttributes: vi.fn(() => ({
			'service.name': 'test',
			'service.version': '1.0.0',
		})),
		withSpanContext: vi.fn((_span, operation) => operation()),
		handleSpanError: vi.fn((span, error) => {
			span.setStatus({
				code: SpanStatusCode.ERROR,
				message: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof Error) {
				span.setAttribute('error.type', error.name);
			}
		}),
	};
});

afterEach(() => {
	vi.clearAllMocks();
});

const enabledOptions: C15TOptions = {
	trustedOrigins: [],
	adapter: {} as C15TOptions['adapter'],
	advanced: {
		telemetry: {
			enabled: true,
		},
	},
};

describe('withDatabaseSpan', () => {
	it('returns operation result when telemetry is disabled', async () => {
		const result = await withDatabaseSpan(
			{ operation: 'find', entity: 'subject' },
			async () => ({ id: '123', name: 'test' })
		);

		expect(result).toEqual({ id: '123', name: 'test' });
	});

	it('returns operation result when telemetry is enabled', async () => {
		const result = await withDatabaseSpan(
			{ operation: 'find', entity: 'subject' },
			async () => ({ id: '123', name: 'test' }),
			enabledOptions
		);

		expect(result).toEqual({ id: '123', name: 'test' });
	});

	it('propagates errors from operation', async () => {
		const error = new Error('DB connection failed');

		await expect(
			withDatabaseSpan(
				{ operation: 'find', entity: 'subject' },
				async () => {
					throw error;
				},
				enabledOptions
			)
		).rejects.toThrow('DB connection failed');
	});

	it('executes operation without span when telemetry is disabled', async () => {
		const operation = vi.fn().mockResolvedValue('result');

		const result = await withDatabaseSpan(
			{ operation: 'create', entity: 'consent' },
			operation
		);

		expect(result).toBe('result');
		expect(operation).toHaveBeenCalledTimes(1);
	});
});

describe('withExternalSpan', () => {
	it('returns operation result when telemetry is disabled', async () => {
		const result = await withExternalSpan(
			{ url: 'https://example.com/api', method: 'GET' },
			async () => ({ status: 200 })
		);

		expect(result).toEqual({ status: 200 });
	});

	it('returns operation result when telemetry is enabled', async () => {
		const result = await withExternalSpan(
			{ url: 'https://example.com/api', method: 'GET' },
			async () => ({ status: 200 }),
			enabledOptions
		);

		expect(result).toEqual({ status: 200 });
	});

	it('propagates errors from operation', async () => {
		const error = new Error('Network error');

		await expect(
			withExternalSpan(
				{ url: 'https://example.com/api', method: 'POST' },
				async () => {
					throw error;
				},
				enabledOptions
			)
		).rejects.toThrow('Network error');
	});
});

describe('withCacheSpan', () => {
	it('returns operation result when telemetry is disabled', async () => {
		const result = await withCacheSpan('get', 'memory', async () => ({
			data: 'cached',
		}));

		expect(result).toEqual({ data: 'cached' });
	});

	it('returns operation result when telemetry is enabled', async () => {
		const result = await withCacheSpan(
			'get',
			'external',
			async () => ({ data: 'cached' }),
			enabledOptions
		);

		expect(result).toEqual({ data: 'cached' });
	});

	it('returns null for cache miss', async () => {
		const result = await withCacheSpan(
			'get',
			'memory',
			async () => null,
			enabledOptions
		);

		expect(result).toBeNull();
	});

	it('propagates errors from operation', async () => {
		const error = new Error('Cache connection failed');

		await expect(
			withCacheSpan(
				'get',
				'external',
				async () => {
					throw error;
				},
				enabledOptions
			)
		).rejects.toThrow('Cache connection failed');
	});
});

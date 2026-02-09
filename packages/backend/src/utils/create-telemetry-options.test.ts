import { afterEach, describe, expect, it, vi } from 'vitest';
import type { C15TOptions } from '../types';
import {
	createRequestSpan,
	createTelemetryOptions,
	getDefaultAttributes,
	getMeter,
	getTraceContext,
	getTracer,
	isTelemetryEnabled,
	resetTelemetryConfig,
	withRequestSpan,
} from './create-telemetry-options';

afterEach(() => {
	resetTelemetryConfig();
});

describe('createTelemetryOptions', () => {
	it('returns disabled by default (opt-in)', () => {
		const options = createTelemetryOptions('test-app');

		expect(options?.enabled).toBe(false);
	});

	it('sets enabled when explicitly configured', () => {
		const options = createTelemetryOptions('test-app', { enabled: true });

		expect(options?.enabled).toBe(true);
	});

	it('includes default attributes with service name and version', () => {
		const options = createTelemetryOptions('my-app');

		expect(options?.defaultAttributes).toMatchObject({
			'service.name': 'my-app',
		});
		expect(options?.defaultAttributes?.['service.version']).toBeDefined();
	});

	it('merges user-provided default attributes', () => {
		const options = createTelemetryOptions('my-app', {
			defaultAttributes: {
				environment: 'production',
				region: 'us-east-1',
			},
		});

		expect(options?.defaultAttributes).toMatchObject({
			'service.name': 'my-app',
			environment: 'production',
			region: 'us-east-1',
		});
	});

	it('preserves user-provided tracer', () => {
		const mockTracer = { startSpan: vi.fn() };
		type TelemetryConfig = NonNullable<
			NonNullable<C15TOptions['advanced']>['telemetry']
		>;
		const options = createTelemetryOptions('my-app', {
			tracer: mockTracer as unknown as TelemetryConfig['tracer'],
		});

		expect(options?.tracer).toBe(mockTracer);
	});
});

describe('isTelemetryEnabled', () => {
	it('returns false when no options provided', () => {
		expect(isTelemetryEnabled()).toBe(false);
	});

	it('returns false when telemetry is not configured', () => {
		const options: C15TOptions = {
			trustedOrigins: [],
			adapter: {} as C15TOptions['adapter'],
		};

		expect(isTelemetryEnabled(options)).toBe(false);
	});

	it('returns false when enabled is not set', () => {
		const options: C15TOptions = {
			trustedOrigins: [],
			adapter: {} as C15TOptions['adapter'],
			advanced: {
				telemetry: {},
			},
		};

		expect(isTelemetryEnabled(options)).toBe(false);
	});

	it('returns true when enabled is true', () => {
		const options: C15TOptions = {
			trustedOrigins: [],
			adapter: {} as C15TOptions['adapter'],
			advanced: {
				telemetry: {
					enabled: true,
				},
			},
		};

		expect(isTelemetryEnabled(options)).toBe(true);
	});
});

describe('getTracer', () => {
	it('returns a tracer even when telemetry is disabled', () => {
		const tracer = getTracer();

		expect(tracer).toBeDefined();
		expect(tracer.startSpan).toBeDefined();
	});

	it('uses user-provided tracer when available', () => {
		const mockTracer = { startSpan: vi.fn() };
		type TelemetryConfig = NonNullable<
			NonNullable<C15TOptions['advanced']>['telemetry']
		>;
		const options: C15TOptions = {
			trustedOrigins: [],
			adapter: {} as C15TOptions['adapter'],
			advanced: {
				telemetry: {
					enabled: true,
					tracer: mockTracer as unknown as TelemetryConfig['tracer'],
				},
			},
		};

		const tracer = getTracer(options);
		expect(tracer).toBe(mockTracer);
	});
});

describe('getMeter', () => {
	it('returns a meter even when telemetry is disabled', () => {
		const meter = getMeter();

		expect(meter).toBeDefined();
		expect(meter.createCounter).toBeDefined();
	});

	it('returns meter with expected interface when telemetry is enabled', () => {
		const options: C15TOptions = {
			trustedOrigins: [],
			adapter: {} as C15TOptions['adapter'],
			advanced: {
				telemetry: {
					enabled: true,
				},
			},
		};

		const meter = getMeter(options);
		// Verify the meter has the expected interface
		expect(meter.createCounter).toBeDefined();
		expect(meter.createHistogram).toBeDefined();
	});
});

describe('createRequestSpan', () => {
	it('returns null when telemetry is disabled', () => {
		const span = createRequestSpan('GET', '/test');

		expect(span).toBeNull();
	});

	it('creates span when telemetry is enabled', () => {
		const options: C15TOptions = {
			trustedOrigins: [],
			adapter: {} as C15TOptions['adapter'],
			advanced: {
				telemetry: {
					enabled: true,
				},
			},
		};

		const span = createRequestSpan('GET', '/test', options);

		expect(span).toBeDefined();
		// Clean up
		span?.end();
	});
});

describe('withRequestSpan', () => {
	it('executes operation without span when telemetry is disabled', async () => {
		const operation = vi.fn().mockResolvedValue('result');

		const result = await withRequestSpan('GET', '/test', operation);

		expect(result).toBe('result');
		expect(operation).toHaveBeenCalledTimes(1);
	});

	it('wraps operation in span when telemetry is enabled', async () => {
		const options: C15TOptions = {
			trustedOrigins: [],
			adapter: {} as C15TOptions['adapter'],
			advanced: {
				telemetry: {
					enabled: true,
				},
			},
		};
		const operation = vi.fn().mockResolvedValue('result');

		const result = await withRequestSpan('GET', '/test', operation, options);

		expect(result).toBe('result');
		expect(operation).toHaveBeenCalledTimes(1);
	});

	it('propagates errors from operation', async () => {
		const error = new Error('Test error');
		const operation = vi.fn().mockRejectedValue(error);

		await expect(withRequestSpan('GET', '/test', operation)).rejects.toThrow(
			'Test error'
		);
	});
});

describe('getTraceContext', () => {
	it('returns null when no active span', () => {
		const context = getTraceContext();

		expect(context).toBeNull();
	});
});

describe('cached telemetry config', () => {
	it('isTelemetryEnabled returns false before init', () => {
		expect(isTelemetryEnabled()).toBe(false);
	});

	it('isTelemetryEnabled returns cached value after init', () => {
		createTelemetryOptions('test-app', { enabled: true });

		expect(isTelemetryEnabled()).toBe(true);
	});

	it('getDefaultAttributes returns empty before init', () => {
		const attrs = getDefaultAttributes();

		expect(Object.keys(attrs)).toHaveLength(0);
	});

	it('getDefaultAttributes returns cached attributes after init', () => {
		createTelemetryOptions('test-app', {
			defaultAttributes: { environment: 'test' },
		});

		const attrs = getDefaultAttributes();
		expect(attrs['service.name']).toBe('test-app');
		expect(attrs['environment']).toBe('test');
	});

	it('includes tenantId in default attributes when provided', () => {
		createTelemetryOptions('test-app', {}, 'tenant-123');

		const attrs = getDefaultAttributes();
		expect(attrs['tenant.id']).toBe('tenant-123');
	});

	it('does not include tenant.id when tenantId is undefined', () => {
		createTelemetryOptions('test-app');

		const attrs = getDefaultAttributes();
		expect(attrs['tenant.id']).toBeUndefined();
	});

	it('resetTelemetryConfig clears the cache', () => {
		createTelemetryOptions('test-app', { enabled: true });
		expect(isTelemetryEnabled()).toBe(true);

		resetTelemetryConfig();
		expect(isTelemetryEnabled()).toBe(false);
		expect(Object.keys(getDefaultAttributes())).toHaveLength(0);
	});

	it('getTracer returns a tracer without explicit options after init', () => {
		createTelemetryOptions('test-app', { enabled: true });

		const tracer = getTracer();
		expect(tracer).toBeDefined();
		expect(tracer.startSpan).toBeDefined();
	});

	it('getMeter returns a meter without explicit options after init', () => {
		createTelemetryOptions('test-app', { enabled: true });

		const meter = getMeter();
		expect(meter).toBeDefined();
		expect(meter.createCounter).toBeDefined();
	});
});

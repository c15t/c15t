import { afterEach, describe, expect, it, vi } from 'vitest';
import type { C15TOptions } from '../types';
import { type C15TMetrics, getMetrics, resetMetrics } from './metrics';

// Mock the telemetry options
vi.mock('./create-telemetry-options', () => ({
	isTelemetryEnabled: vi.fn((options) => options?.telemetry?.enabled === true),
	getMeter: vi.fn(() => ({
		createCounter: vi.fn(() => ({
			add: vi.fn(),
		})),
		createHistogram: vi.fn(() => ({
			record: vi.fn(),
		})),
	})),
}));

afterEach(() => {
	resetMetrics();
	vi.clearAllMocks();
});

describe('getMetrics', () => {
	it('returns null when telemetry is disabled', () => {
		const options: C15TOptions = {
			trustedOrigins: [],
			adapter: {} as C15TOptions['adapter'],
		};

		const metrics = getMetrics(options);

		expect(metrics).toBeNull();
	});

	it('returns C15TMetrics instance when telemetry is enabled', () => {
		const options: C15TOptions = {
			trustedOrigins: [],
			adapter: {} as C15TOptions['adapter'],
			telemetry: {
				enabled: true,
			},
		};

		const metrics = getMetrics(options);

		expect(metrics).toHaveProperty('recordHttpRequest');
	});

	it('returns same instance on subsequent calls', () => {
		const options: C15TOptions = {
			trustedOrigins: [],
			adapter: {} as C15TOptions['adapter'],
			telemetry: {
				enabled: true,
			},
		};

		const metrics1 = getMetrics(options);
		const metrics2 = getMetrics(options);

		expect(metrics1).toBe(metrics2);
	});
});

describe('C15TMetrics', () => {
	function createMetrics(): C15TMetrics {
		const options: C15TOptions = {
			trustedOrigins: [],
			adapter: {} as C15TOptions['adapter'],
			telemetry: {
				enabled: true,
			},
		};
		return getMetrics(options) as C15TMetrics;
	}

	describe('business metrics', () => {
		it('has consentCreated counter', () => {
			const metrics = createMetrics();
			expect(metrics.consentCreated).toBeDefined();
		});

		it('has consentAccepted counter', () => {
			const metrics = createMetrics();
			expect(metrics.consentAccepted).toBeDefined();
		});

		it('has consentRejected counter', () => {
			const metrics = createMetrics();
			expect(metrics.consentRejected).toBeDefined();
		});

		it('has subjectCreated counter', () => {
			const metrics = createMetrics();
			expect(metrics.subjectCreated).toBeDefined();
		});

		it('has subjectLinked counter', () => {
			const metrics = createMetrics();
			expect(metrics.subjectLinked).toBeDefined();
		});

		it('has consentCheckCount counter', () => {
			const metrics = createMetrics();
			expect(metrics.consentCheckCount).toBeDefined();
		});

		it('has initCount counter', () => {
			const metrics = createMetrics();
			expect(metrics.initCount).toBeDefined();
		});
	});

	describe('HTTP metrics', () => {
		it('has httpRequestDuration histogram', () => {
			const metrics = createMetrics();
			expect(metrics.httpRequestDuration).toBeDefined();
		});

		it('has httpRequestCount counter', () => {
			const metrics = createMetrics();
			expect(metrics.httpRequestCount).toBeDefined();
		});

		it('has httpErrorCount counter', () => {
			const metrics = createMetrics();
			expect(metrics.httpErrorCount).toBeDefined();
		});
	});

	describe('database metrics', () => {
		it('has dbQueryDuration histogram', () => {
			const metrics = createMetrics();
			expect(metrics.dbQueryDuration).toBeDefined();
		});

		it('has dbQueryCount counter', () => {
			const metrics = createMetrics();
			expect(metrics.dbQueryCount).toBeDefined();
		});

		it('has dbErrorCount counter', () => {
			const metrics = createMetrics();
			expect(metrics.dbErrorCount).toBeDefined();
		});
	});

	describe('cache metrics', () => {
		it('has cacheHit counter', () => {
			const metrics = createMetrics();
			expect(metrics.cacheHit).toBeDefined();
		});

		it('has cacheMiss counter', () => {
			const metrics = createMetrics();
			expect(metrics.cacheMiss).toBeDefined();
		});

		it('has cacheLatency histogram', () => {
			const metrics = createMetrics();
			expect(metrics.cacheLatency).toBeDefined();
		});
	});

	describe('GVL metrics', () => {
		it('has gvlFetchDuration histogram', () => {
			const metrics = createMetrics();
			expect(metrics.gvlFetchDuration).toBeDefined();
		});

		it('has gvlFetchCount counter', () => {
			const metrics = createMetrics();
			expect(metrics.gvlFetchCount).toBeDefined();
		});

		it('has gvlFetchError counter', () => {
			const metrics = createMetrics();
			expect(metrics.gvlFetchError).toBeDefined();
		});
	});

	describe('helper methods', () => {
		it('recordConsentCreated adds to counter with attributes', () => {
			const metrics = createMetrics();
			const addSpy = vi.spyOn(metrics.consentCreated, 'add');

			metrics.recordConsentCreated({
				type: 'cookie_banner',
				status: 'accepted',
				jurisdiction: 'GDPR',
				country: 'DE',
				region: 'BY',
			});

			expect(addSpy).toHaveBeenCalledWith(1, {
				type: 'cookie_banner',
				status: 'accepted',
				jurisdiction: 'GDPR',
				country: 'DE',
				region: 'BY',
			});
		});

		it('recordHttpRequest records both count and duration', () => {
			const metrics = createMetrics();
			const countSpy = vi.spyOn(metrics.httpRequestCount, 'add');
			const durationSpy = vi.spyOn(metrics.httpRequestDuration, 'record');

			metrics.recordHttpRequest(
				{ method: 'GET', route: '/subjects', status: 200 },
				42
			);

			expect(countSpy).toHaveBeenCalledWith(1, {
				method: 'GET',
				route: '/subjects',
				status: 200,
			});
			expect(durationSpy).toHaveBeenCalledWith(42, {
				method: 'GET',
				route: '/subjects',
				status: 200,
			});
		});

		it('recordHttpRequest records error when status >= 400', () => {
			const metrics = createMetrics();
			const errorSpy = vi.spyOn(metrics.httpErrorCount, 'add');

			metrics.recordHttpRequest(
				{ method: 'POST', route: '/subjects', status: 500 },
				100
			);

			expect(errorSpy).toHaveBeenCalledTimes(1);
		});

		it('recordCacheHit increments cache hit counter', () => {
			const metrics = createMetrics();
			const hitSpy = vi.spyOn(metrics.cacheHit, 'add');

			metrics.recordCacheHit('memory');

			expect(hitSpy).toHaveBeenCalledWith(1, { layer: 'memory' });
		});

		it('recordCacheMiss increments cache miss counter', () => {
			const metrics = createMetrics();
			const missSpy = vi.spyOn(metrics.cacheMiss, 'add');

			metrics.recordCacheMiss('external');

			expect(missSpy).toHaveBeenCalledWith(1, { layer: 'external' });
		});

		it('recordInit increments init counter with geo attributes', () => {
			const metrics = createMetrics();
			const initSpy = vi.spyOn(metrics.initCount, 'add');

			metrics.recordInit({
				jurisdiction: 'CCPA',
				country: 'US',
				region: 'CA',
			});

			expect(initSpy).toHaveBeenCalledWith(1, {
				jurisdiction: 'CCPA',
				country: 'US',
				region: 'CA',
			});
		});
	});
});

describe('getMetrics cached singleton', () => {
	it('returns cached instance without options after initialization', () => {
		const options: C15TOptions = {
			trustedOrigins: [],
			adapter: {} as C15TOptions['adapter'],
			telemetry: {
				enabled: true,
			},
		};

		// Initialize with options
		const metrics1 = getMetrics(options);
		expect(metrics1).not.toBeNull();

		// Call without options — should return cached instance
		const metrics2 = getMetrics();
		expect(metrics2).toBe(metrics1);
	});
});

describe('resetMetrics', () => {
	it('clears the metrics instance', () => {
		const options: C15TOptions = {
			trustedOrigins: [],
			adapter: {} as C15TOptions['adapter'],
			telemetry: {
				enabled: true,
			},
		};

		const metrics1 = getMetrics(options);
		resetMetrics();
		const metrics2 = getMetrics(options);

		expect(metrics1).not.toBe(metrics2);
	});
});

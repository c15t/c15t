/**
 * E2E test: every span attribute key must be in the allowlist,
 * and no attribute value may match PII patterns.
 *
 * Uses a real BasicTracerProvider + InMemorySpanExporter (no mocks).
 */

import {
	BasicTracerProvider,
	InMemorySpanExporter,
	SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { C15TOptions } from '../types';
import {
	createRequestSpan,
	createTelemetryOptions,
	resetTelemetryConfig,
	withRequestSpan,
} from './create-telemetry-options';
import {
	withCacheSpan,
	withDatabaseSpan,
	withExternalSpan,
} from './instrumentation';

// ── Allowlist ───────────────────────────────────────────────────────────
const ALLOWED_KEYS = new Set([
	'http.method',
	'http.route',
	'http.host',
	'http.path',
	'http.url',
	'error.type',
	'db.system',
	'db.operation',
	'db.entity',
	'cache.operation',
	'cache.layer',
	'service.name',
	'service.version',
	'tenant.id',
]);

const BLOCKED_KEYS = new Set(['error.stack', 'error.message']);

const PII_PATTERNS = [
	/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, // IPv4
	/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // email
	/at .+\(.+:\d+:\d+\)/, // stack trace line
	/\?[^=]+=/, // query string
];

// ── Provider setup ──────────────────────────────────────────────────────
const exporter = new InMemorySpanExporter();
const provider = new BasicTracerProvider();
provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
provider.register();

const tracer = provider.getTracer('pii-test');

function telemetryOptions(): C15TOptions {
	return {
		trustedOrigins: [],
		adapter: {} as C15TOptions['adapter'],
		telemetry: {
			enabled: true,
			tracer,
		},
	};
}

// ── Helpers ─────────────────────────────────────────────────────────────
function drainSpans() {
	const spans = exporter.getFinishedSpans();
	const copy = [...spans];
	exporter.reset();
	return copy;
}

function assertAllowlist(spans: ReturnType<typeof drainSpans>) {
	for (const span of spans) {
		const attrs = span.attributes;
		for (const key of Object.keys(attrs)) {
			expect(ALLOWED_KEYS.has(key)).toBe(true);
		}
	}
}

function assertNoBlockedKeys(spans: ReturnType<typeof drainSpans>) {
	for (const span of spans) {
		const attrs = span.attributes;
		for (const key of Object.keys(attrs)) {
			expect(BLOCKED_KEYS.has(key)).toBe(false);
		}
	}
}

function assertNoPiiValues(spans: ReturnType<typeof drainSpans>) {
	for (const span of spans) {
		const attrs = span.attributes;
		for (const [key, value] of Object.entries(attrs)) {
			if (typeof value === 'string') {
				for (const pattern of PII_PATTERNS) {
					expect(
						pattern.test(value),
						`Attribute "${key}" value "${value}" matches PII pattern ${pattern}`
					).toBe(false);
				}
			}
		}
	}
}

// ── Tests ───────────────────────────────────────────────────────────────
beforeAll(() => {
	createTelemetryOptions('pii-test', { enabled: true, tracer });
});

afterEach(() => {
	exporter.reset();
});

describe('telemetry PII safeguards', () => {
	// 1. withDatabaseSpan success
	it('withDatabaseSpan attributes pass allowlist', async () => {
		await withDatabaseSpan(
			{ operation: 'find', entity: 'subject' },
			async () => 'ok',
			telemetryOptions()
		);

		const spans = drainSpans();
		expect(spans.length).toBe(1);
		assertAllowlist(spans);
		assertNoPiiValues(spans);
	});

	// 2. withExternalSpan success — span name = hostname only
	it('withExternalSpan span name is HTTP METHOD hostname only', async () => {
		await withExternalSpan(
			{ url: 'https://api.example.com/v1/charges', method: 'GET' },
			async () => 'ok',
			telemetryOptions()
		);

		const spans = drainSpans();
		expect(spans.length).toBe(1);
		expect(spans[0].name).toBe('HTTP GET api.example.com');
		assertAllowlist(spans);
		assertNoPiiValues(spans);
	});

	// 3. withExternalSpan strips query params from http.url
	it('withExternalSpan strips query params from http.url', async () => {
		await withExternalSpan(
			{
				url: 'https://api.example.com/v1/data?key=secret&email=user@ex.com',
				method: 'POST',
			},
			async () => 'ok',
			telemetryOptions()
		);

		const spans = drainSpans();
		expect(spans.length).toBe(1);
		const url = spans[0].attributes['http.url'] as string;
		expect(url).toBe('https://api.example.com/v1/data');
		expect(url).not.toContain('?');
		assertAllowlist(spans);
		assertNoPiiValues(spans);
	});

	// 4. withCacheSpan success
	it('withCacheSpan has no unexpected attributes', async () => {
		await withCacheSpan('get', 'memory', async () => 'ok', telemetryOptions());

		const spans = drainSpans();
		expect(spans.length).toBe(1);
		assertAllowlist(spans);
		assertNoPiiValues(spans);
	});

	// 5. withRequestSpan success — no http.path
	it('withRequestSpan has no http.path attribute', async () => {
		await withRequestSpan(
			'GET',
			'/subjects/abc123',
			async () => 'ok',
			telemetryOptions()
		);

		const spans = drainSpans();
		expect(spans.length).toBe(1);
		expect(spans[0].attributes['http.path']).toBeUndefined();
		assertAllowlist(spans);
	});

	// 6. createRequestSpan direct — no http.path
	it('createRequestSpan has no http.path attribute', () => {
		const span = createRequestSpan(
			'POST',
			'/subjects/xyz789',
			telemetryOptions()
		);

		expect(span).toBeDefined();
		span!.end();

		const spans = drainSpans();
		expect(spans.length).toBe(1);
		expect(spans[0].attributes['http.path']).toBeUndefined();
		assertAllowlist(spans);
	});

	// 7. withDatabaseSpan error — PII in message
	it('withDatabaseSpan error does not leak error.message or error.stack', async () => {
		await expect(
			withDatabaseSpan(
				{ operation: 'find', entity: 'subject' },
				async () => {
					throw new Error('User user@example.com not found at 192.168.1.1');
				},
				telemetryOptions()
			)
		).rejects.toThrow();

		const spans = drainSpans();
		expect(spans.length).toBe(1);
		assertNoBlockedKeys(spans);
		assertNoPiiValues(spans);
	});

	// 8. withExternalSpan error — IP in message
	it('withExternalSpan error does not leak error.message or error.stack', async () => {
		await expect(
			withExternalSpan(
				{ url: 'https://api.example.com/v1/data', method: 'GET' },
				async () => {
					throw new Error('Connection refused at 10.0.0.1:5432');
				},
				telemetryOptions()
			)
		).rejects.toThrow();

		const spans = drainSpans();
		expect(spans.length).toBe(1);
		assertNoBlockedKeys(spans);
		assertNoPiiValues(spans);
	});

	// 9. withCacheSpan error
	it('withCacheSpan error does not leak error.message or error.stack', async () => {
		await expect(
			withCacheSpan(
				'get',
				'external',
				async () => {
					throw new Error('Redis timeout at 172.16.0.1');
				},
				telemetryOptions()
			)
		).rejects.toThrow();

		const spans = drainSpans();
		expect(spans.length).toBe(1);
		assertNoBlockedKeys(spans);
		assertNoPiiValues(spans);
	});

	// 10. withRequestSpan error
	it('withRequestSpan error does not leak error.message or error.stack', async () => {
		await expect(
			withRequestSpan(
				'GET',
				'/subjects/abc123',
				async () => {
					throw new Error('Subject user@corp.io failed auth');
				},
				telemetryOptions()
			)
		).rejects.toThrow();

		const spans = drainSpans();
		expect(spans.length).toBe(1);
		assertNoBlockedKeys(spans);
		assertNoPiiValues(spans);
	});

	// 11. All 4 span types combined — every key in allowlist
	it('all span types combined: every attribute key is in allowlist', async () => {
		// database
		await withDatabaseSpan(
			{ operation: 'create', entity: 'consent' },
			async () => 'ok',
			telemetryOptions()
		);

		// external
		await withExternalSpan(
			{ url: 'https://vendor.example.com/api', method: 'POST' },
			async () => 'ok',
			telemetryOptions()
		);

		// cache
		await withCacheSpan('set', 'bundled', async () => 'ok', telemetryOptions());

		// request
		await withRequestSpan(
			'DELETE',
			'/consents/123',
			async () => 'ok',
			telemetryOptions()
		);

		const spans = drainSpans();
		expect(spans.length).toBe(4);
		assertAllowlist(spans);
		assertNoBlockedKeys(spans);
		assertNoPiiValues(spans);
	});
});

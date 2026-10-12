import { describe, expect, it } from 'vitest';

import {
	DEFAULT_BENCH_BACKEND_LATENCY_MS,
	benchScenarioKey,
	parseBenchBackendLatencyMs,
	resolveBenchBackendLatencyMs,
	resolveBenchConditionFromEnv,
} from './browser';
import {
	defaultBenchCondition,
	expectedBenchmarkResults,
	expectedBenchmarkResultsFor,
} from './expected-results';

const noFlags = () => undefined;
const flags =
	(values: Record<string, string>) =>
	(name: string): string | undefined =>
		values[name];

describe('backend latency', () => {
	it('defaults to 200 ms when nothing sets it', () => {
		expect(DEFAULT_BENCH_BACKEND_LATENCY_MS).toBe(200);
		expect(resolveBenchBackendLatencyMs(noFlags, {})).toBe(200);
		expect(parseBenchBackendLatencyMs(undefined)).toBe(200);
		expect(parseBenchBackendLatencyMs('  ')).toBe(200);
	});

	it('keeps 0 selectable from the environment and the CLI', () => {
		expect(
			resolveBenchBackendLatencyMs(noFlags, {
				C15T_BENCH_BACKEND_LATENCY_MS: '0',
			})
		).toBe(0);
		expect(
			resolveBenchBackendLatencyMs(flags({ '--backend-latency-ms': '0' }), {})
		).toBe(0);
	});

	it('reads the old variable and flags as aliases', () => {
		expect(
			resolveBenchBackendLatencyMs(noFlags, {
				C15T_BENCH_INIT_LATENCY_MS: '40',
			})
		).toBe(40);
		expect(
			resolveBenchBackendLatencyMs(flags({ '--init-latency-ms': '40' }), {})
		).toBe(40);
		expect(
			resolveBenchBackendLatencyMs(flags({ '--init-latency': '40' }), {})
		).toBe(40);
	});

	it('prefers a flag over the environment and the new name over the alias', () => {
		expect(
			resolveBenchBackendLatencyMs(flags({ '--backend-latency-ms': '10' }), {
				C15T_BENCH_BACKEND_LATENCY_MS: '20',
			})
		).toBe(10);
		expect(
			resolveBenchBackendLatencyMs(
				flags({ '--backend-latency-ms': '10', '--init-latency-ms': '30' }),
				{}
			)
		).toBe(10);
		expect(
			resolveBenchBackendLatencyMs(noFlags, {
				C15T_BENCH_BACKEND_LATENCY_MS: '20',
				C15T_BENCH_INIT_LATENCY_MS: '30',
			})
		).toBe(20);
	});

	it('ignores an empty variable instead of reading it as 0', () => {
		expect(
			resolveBenchBackendLatencyMs(noFlags, {
				C15T_BENCH_BACKEND_LATENCY_MS: '',
				C15T_BENCH_INIT_LATENCY_MS: '30',
			})
		).toBe(30);
	});

	it('rounds to whole milliseconds and rejects bad values by name', () => {
		expect(parseBenchBackendLatencyMs('12.6')).toBe(13);
		expect(() =>
			resolveBenchBackendLatencyMs(flags({ '--backend-latency-ms': '-1' }), {})
		).toThrow('--backend-latency-ms must be a non-negative number');
		expect(() =>
			resolveBenchBackendLatencyMs(noFlags, {
				C15T_BENCH_BACKEND_LATENCY_MS: 'fast',
			})
		).toThrow('C15T_BENCH_BACKEND_LATENCY_MS must be a non-negative number');
	});
});

describe('bench condition in result keys', () => {
	it('names the profile and latency in every key, 0 ms included', () => {
		expect(
			benchScenarioKey('ssr', { backendLatencyMs: 200, profile: 'none' })
		).toBe('ssr:profile-none:latency-200ms');
		expect(
			benchScenarioKey('ssr', { backendLatencyMs: 0, profile: 'mobile' })
		).toBe('ssr:profile-mobile:latency-0ms');
	});

	it('resolves the gate condition from the same environment the runners read', () => {
		expect(resolveBenchConditionFromEnv({})).toEqual(defaultBenchCondition);
		expect(
			resolveBenchConditionFromEnv({
				C15T_BENCH_BACKEND_LATENCY_MS: '0',
				C15T_BENCH_PROFILE: 'mobile',
			})
		).toEqual({ backendLatencyMs: 0, profile: 'mobile' });
	});

	it('expects browser-runtime keys under the run condition and leaves other suites alone', () => {
		const zero = expectedBenchmarkResultsFor({
			backendLatencyMs: 0,
			profile: 'none',
		});
		const browserKeys = (results: typeof zero) =>
			results
				.filter((entry) => entry.suite === 'browser-runtime')
				.map((entry) => entry.key);
		expect(browserKeys(expectedBenchmarkResults)).toContain(
			'@c15t/vue:ssr:profile-none:latency-200ms:browser-runtime'
		);
		expect(browserKeys(zero)).toContain(
			'@c15t/vue:ssr:profile-none:latency-0ms:browser-runtime'
		);
		for (const key of browserKeys(expectedBenchmarkResults)) {
			expect(key).toMatch(/:profile-none:latency-200ms:browser-runtime$/u);
		}
		const others = (results: typeof zero) =>
			results
				.filter((entry) => entry.suite !== 'browser-runtime')
				.map((entry) => entry.key);
		expect(others(zero)).toEqual(others(expectedBenchmarkResults));
	});
});

/**
 * The native rows are only as good as the parsers that lift them out of two
 * unrelated toolchains' stdout. These cases use real captured output from
 * `C15tCoreBench` and `:c15t-core:bench`, so a label change upstream shows up as
 * a red test rather than as a table that quietly lost rows.
 */

import { describe, expect, it } from 'vitest';

import { parseKotlinBench, parseSwiftBench } from '../measure/native';

const SWIFT_OUTPUT = `C15tCore benchmarks
reference: Apple silicon, in-process; budgets from native/CONTRACT.md
stored envelope: 1898 bytes

hydrate-from-store  (budget 3 ms for a realistic payload)
---------------------------------------------------------
bootstrap + hydrate, stored envelope n=300    mean µs=  169.98  p50=  163.54  p95=  200.04  max=   312.25  (budget 3000.0, OK)

bootstrap() to first synchronous snapshot()
-------------------------------------------
cold (first touch this process) n=1      mean µs=  205.71  p50=  205.71  p95=  205.71  max=   205.71  (budget 15000.0, OK)
warm (repeat hydrate) n=300    mean µs=  169.98  p50=  163.54  p95=  200.04  max=   312.25  (budget 5000.0, OK)

policy evaluation  (wire already parsed, records in, permissions out)
---------------------------------------------------------------------
evaluate, 4 categories + receipts n=20000  mean µs=    0.33  p50=    0.33  p95=    0.42  max=     9.46  (budget 50.0, OK)

snapshot() and isAllowed()  (must be synchronous reads)
-------------------------------------------------------
snapshot() n=500000 mean µs=    0.06  p50=    0.08  p95=    0.08  max=    16.54
isAllowed(.marketing) n=500000 mean µs=    0.01  p50=    0.00  p95=    0.04  max=     7.71

consent action to native commit acknowledged, no network  (budget 50 ms)
------------------------------------------------------------------------
save(.all), in-memory store n=500    mean µs=  184.10  p50=  182.96  p95=  201.62  max=   271.92  (budget 50000.0, OK)
save(.custom), FileStore + dead transport n=200    mean µs= 1450.65  p50= 1396.21  p95= 1572.54  max=  5101.88  (budget 50000.0, OK)

pending queue replay, transport already failed once
---------------------------------------------------
read 10 queued bodies n=200    mean µs=   20.52  p50=   20.42  p95=   20.88  max=    25.33

Done.
`;

const KOTLIN_OUTPUT = `c15t-core benchmarks
  jvm=17.0.20+0 cores=18
  warmup=500 measured=3000  medians in microseconds

  hydrate from store
    median=31.67 us  p95=43.08 us  min=27.79 us  (envelope is 9053 bytes; contract budget is 3 ms)
    ok

  policy evaluation
    median=0.67 us  p95=1.63 us  min=0.58 us  (no budget in the contract; guards against evaluation blow-up)

  snapshot() + 3 x isAllowed()
    median=0.17 us  p95=0.33 us  min=0.13 us  (contract: no allocation of a new snapshot per call (identity stable: true))
    ok

  save-acknowledge-without-network
    median=190.83 us  p95=243.88 us  min=175.67 us  (budget 50 ms)
    ok

all measured budgets met
`;

describe('parseSwiftBench', () => {
	it('reads every budgeted label out of the real bench output', () => {
		const metrics = parseSwiftBench(SWIFT_OUTPUT);

		expect(Object.keys(metrics).sort()).toEqual(
			[
				'native_bootstrap_cold_us',
				'native_bootstrap_warm_us',
				'native_commit_ack_disk_us',
				'native_commit_ack_us',
				'native_hydrate_envelope_us',
				'native_is_allowed_us',
				'native_policy_evaluation_us',
				'native_queue_replay_us',
				'native_snapshot_read_us',
			].sort()
		);
	});

	it('takes the p50 rather than the mean, and keeps the sample count', () => {
		const metrics = parseSwiftBench(SWIFT_OUTPUT);
		expect(metrics.native_hydrate_envelope_us?.value).toBe(163.54);
		expect(metrics.native_hydrate_envelope_us?.samples).toBe(300);
	});

	it('carries the envelope size the bench measured', () => {
		const metrics = parseSwiftBench(SWIFT_OUTPUT);
		expect(metrics.native_hydrate_envelope_us?.detail).toContain('1898');
	});

	it('returns nothing rather than zeros when the output changes shape', () => {
		expect(parseSwiftBench('Done.\n')).toEqual({});
	});
});

describe('parseKotlinBench', () => {
	it('reads every budgeted label out of the real bench output', () => {
		const metrics = parseKotlinBench(KOTLIN_OUTPUT);

		expect(Object.keys(metrics).sort()).toEqual(
			[
				'native_commit_ack_us',
				'native_hydrate_envelope_us',
				'native_policy_evaluation_us',
				'native_snapshot_identities',
				'native_snapshot_read_us',
			].sort()
		);
	});

	it('maps a stable object identity onto one snapshot object', () => {
		const metrics = parseKotlinBench(KOTLIN_OUTPUT);
		expect(metrics.native_snapshot_identities?.value).toBe(1);
	});

	it('maps an unstable identity onto two, which is the failure the budget guards', () => {
		const metrics = parseKotlinBench(
			KOTLIN_OUTPUT.replace('identity stable: true', 'identity stable: false')
		);
		expect(metrics.native_snapshot_identities?.value).toBe(2);
	});

	it('uses the reported measured count as the sample count', () => {
		const metrics = parseKotlinBench(KOTLIN_OUTPUT);
		expect(metrics.native_policy_evaluation_us?.samples).toBe(3000);
	});
});

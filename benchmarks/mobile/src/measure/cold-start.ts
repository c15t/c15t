/**
 * Cold-start cost of the JavaScript boundary, measured in fresh processes.
 *
 * The contract budgets 10 ms of cold start "attributable to c15t". The warm loop
 * in `measure/javascript.ts` cannot answer that: a handshake that costs 0.003 ms
 * after 300 repetitions costs milliseconds the first time the process runs it. So
 * this measurement spawns one process per sample and lets each do exactly one
 * launch, which is the only way to observe a cold module graph.
 *
 * What it does not claim: an app-launch number. A device spends time starting the
 * process, the React Native runtime, and Hermes before any c15t code runs, and
 * Node's ESM resolver charges c15t for resolving 58 file specifiers that a bundled
 * app resolves from one bundle. So this is the JavaScript half of the contract's
 * span, measured under a loader that is harsher than the one in the binary. The
 * native half is `native_bootstrap_to_snapshot_cold_ms`.
 */

import { median } from '@c15t/benchmarking/utils';

import type { ColdStartReport } from '../support/cold-start-subject';
import { spawnSubject } from '../support/spawn-subject';

export interface ColdStartResult {
	/** Module evaluation for the entry and everything it links, median ms. */
	moduleLoadMs: number;
	/** Cold handshake to the first readable snapshot, median ms. */
	attachMs: number;
	/** The whole launch span, median of per-process sums. */
	toFirstConsentMs: number;
	/** Host work excluded from the number, median ms, for the report detail. */
	hostMs: number;
	/** Fresh processes that produced a usable sample. */
	samples: number;
	unavailable?: string;
}

const medianMs = function medianMs(samples: number[]): number {
	return Number(median(samples).toFixed(3));
};

/**
 * Measure one cold launch per process.
 *
 * @param processes - Fresh processes to spend on samples.
 * @returns The medians, or `unavailable` with the reason the launch failed.
 */
export const measureColdStart = function measureColdStart(
	processes: number
): ColdStartResult {
	const empty: ColdStartResult = {
		attachMs: 0,
		hostMs: 0,
		moduleLoadMs: 0,
		samples: 0,
		toFirstConsentMs: 0,
		unavailable: 'no cold-start process was run',
	};

	if (processes < 1) {
		return {
			...empty,
			unavailable: 'the sampling plan asked for no processes',
		};
	}

	const loads: number[] = [];
	const attaches: number[] = [];
	const totals: number[] = [];
	let hostMs = 0;

	for (let index = 0; index < processes; index += 1) {
		const { reason, report } = spawnSubject<ColdStartReport>({
			args: [],
			name: 'cold-start-subject',
			timeoutMs: 120_000,
		});

		if (reason) {
			return { ...empty, unavailable: reason };
		}

		if (!report?.readyAfterFirstRead) {
			return {
				...empty,
				unavailable:
					'a cold launch did not end with a readable snapshot, so its span is not a launch cost',
			};
		}

		loads.push(report.moduleLoadMs);
		attaches.push(report.attachMs);
		totals.push(report.moduleLoadMs + report.attachMs);
		({ hostMs } = report);
	}

	return {
		attachMs: medianMs(attaches),
		hostMs: medianMs([hostMs]),
		moduleLoadMs: medianMs(loads),
		samples: totals.length,
		toFirstConsentMs: medianMs(totals),
	};
};

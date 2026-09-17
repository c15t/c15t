/**
 * The Swift and Kotlin rows.
 *
 * Both cores already ship a bench program, and this module's whole job is to turn
 * their numbers into table rows, including the rows that have no number because the
 * bench does not produce one. It is apart from `run.ts` so the runner stays a
 * sequence of measurements rather than a wall of row plumbing.
 */

import { makeRow, ROWS } from '../rows';
import type { Outcome } from '../rows';
import type { MobileBenchRow, MobileBudget } from '../types';
import type { NativeBenchResult } from './native';

const microsToMillis = function microsToMillis(micros: number): number {
	return Number((micros / 1000).toFixed(4));
};

/**
 * Build every native-core row from the two bench runs.
 *
 * @param swift - Output of `C15tCoreBench`, or the reason it is absent.
 * @param kotlin - Output of `:c15t-core:bench`, or the reason it is absent.
 * @param budgets - The loaded budget map.
 * @returns Rows in report order, measured or carrying a reason.
 */
export const nativeRows = function nativeRows(
	swift: NativeBenchResult,
	kotlin: NativeBenchResult,
	budgets: Record<string, MobileBudget>
): MobileBenchRow[] {
	const rows: MobileBenchRow[] = [];

	/** Lift one Swift metric into an outcome. */
	const swiftMetric = function swiftMetric(
		key: string,
		convert: 'ms' | 'none' = 'none'
	): Outcome {
		if (swift.unavailable) {
			return { reason: swift.unavailable };
		}
		const metric = swift.metrics[key];
		if (!metric) {
			return { reason: `C15tCoreBench did not report "${key}"` };
		}
		return {
			detail: metric.detail,
			samples: metric.samples,
			value: convert === 'ms' ? microsToMillis(metric.value) : metric.value,
		};
	};

	/** Lift one Kotlin metric into an outcome. */
	const kotlinMetric = function kotlinMetric(
		key: string,
		convert: 'ms' | 'none' = 'none'
	): Outcome {
		if (kotlin.unavailable) {
			return { reason: kotlin.unavailable };
		}
		const metric = kotlin.metrics[key];
		if (!metric) {
			return { reason: `:c15t-core:bench did not report "${key}"` };
		}
		return {
			detail: metric.detail,
			samples: metric.samples,
			value: convert === 'ms' ? microsToMillis(metric.value) : metric.value,
		};
	};

	// Swift core.
	rows.push(
		makeRow(
			ROWS.nativeBootstrapWarm,
			budgets,
			swiftMetric('native_bootstrap_warm_us', 'ms')
		)
	);
	rows.push(
		makeRow(
			ROWS.nativeBootstrapCold,
			budgets,
			swiftMetric('native_bootstrap_cold_us', 'ms')
		)
	);
	rows.push(
		makeRow(
			ROWS.nativeHydrate,
			budgets,
			swiftMetric('native_hydrate_envelope_us', 'ms')
		)
	);
	rows.push(
		makeRow(
			ROWS.nativePolicyEvaluation,
			budgets,
			swiftMetric('native_policy_evaluation_us')
		)
	);
	rows.push(
		makeRow(
			ROWS.nativeSnapshotRead,
			budgets,
			swiftMetric('native_snapshot_read_us')
		)
	);
	rows.push(
		makeRow(ROWS.nativeIsAllowed, budgets, swiftMetric('native_is_allowed_us'))
	);
	rows.push(
		makeRow(
			ROWS.nativeCommitAck,
			budgets,
			swiftMetric('native_commit_ack_us', 'ms')
		)
	);
	rows.push(
		makeRow(
			ROWS.nativeCommitAckDisk,
			budgets,
			swiftMetric('native_commit_ack_disk_us', 'ms')
		)
	);
	rows.push(
		makeRow(
			ROWS.nativeQueueReplay,
			budgets,
			swiftMetric('native_queue_replay_us')
		)
	);

	// Kotlin core. Its cold row prints its own number: the bench forks one JVM per
	// sample precisely because a warm loop cannot produce a cold one, so the row reads
	// that number rather than standing on a reason.
	rows.push(
		makeRow(
			ROWS.kotlinHydrate,
			budgets,
			kotlinMetric('native_hydrate_envelope_us', 'ms')
		)
	);
	rows.push(
		makeRow(
			ROWS.kotlinPolicyEvaluation,
			budgets,
			kotlinMetric('native_policy_evaluation_us')
		)
	);
	rows.push(
		makeRow(
			ROWS.kotlinSnapshotAndAllowed,
			budgets,
			kotlinMetric('native_snapshot_read_us')
		)
	);
	rows.push(
		makeRow(
			ROWS.kotlinCommitAck,
			budgets,
			kotlinMetric('native_commit_ack_us', 'ms')
		)
	);
	rows.push(
		makeRow(
			ROWS.kotlinIdentities,
			budgets,
			kotlinMetric('native_snapshot_identities')
		)
	);
	rows.push(
		makeRow(
			ROWS.kotlinBootstrapCold,
			budgets,
			kotlinMetric('native_bootstrap_cold_us', 'ms')
		)
	);

	return rows;
};

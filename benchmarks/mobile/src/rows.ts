/**
 * Every row the report carries, in report order.
 *
 * This lives apart from `run.ts` so a test can check that each row's budget key
 * exists in `budgets.json` without importing the runner, which measures as soon
 * as it is loaded.
 */

import type {
	MobileBenchRow,
	MobileBudget,
	MobileSurface,
	MobileUnit,
} from './types';

/** A row before its number is known. */
export interface RowSpec {
	id: string;
	label: string;
	surface: MobileSurface;
	unit: MobileUnit;
	budgetKey: string | null;
}

/** What a measurement produced: a number, or the reason there is none. */
export interface Outcome {
	value?: number | null;
	samples?: number;
	detail?: string;
	reason?: string;
}

/**
 * Build one table row.
 *
 * @param spec - Identity and which budget gates it.
 * @param budgets - The loaded budget map.
 * @param outcome - The measured value, or the reason it is absent.
 * @returns A row ready for the report and the artifact.
 * @throws {Error} When a row has neither a value nor a reason.
 */
/**
 * Round a measured value for the artifact without letting it read as zero.
 *
 * Three decimals is the right precision for a span of milliseconds and the wrong one
 * for a span a bench reports in fractions of a microsecond. Printing `0` there would
 * claim the work cost nothing, and the next run's diff would score it a total win, so
 * such a value keeps four significant figures and says so in the detail.
 *
 * @param unit - The row's unit, which is what the third decimal is a third of.
 * @param detail - The detail the measurement supplied, if any.
 * @param value - The raw measured value.
 * @returns The value to store and the detail to store beside it.
 */
const reportableValue = function reportableValue(
	unit: MobileUnit,
	detail: string | undefined,
	value: number
): { detail: string | undefined; value: number } {
	const rounded = Number(value.toFixed(3));

	if (value === 0 || rounded !== 0) {
		return { detail, value: rounded };
	}

	const widened = Number(value.toPrecision(4));

	return {
		detail:
			detail === undefined
				? `reported to four significant figures: ${widened}, below three decimals in ${unit}`
				: `${detail}; reported to four significant figures: ${widened}, below three decimals in ${unit}`,
		value: widened,
	};
};

/**
 * Build one table row.
 *
 * @param spec - Identity and which budget gates it.
 * @param budgets - The loaded budget map.
 * @param outcome - The measured value, or the reason it is absent.
 * @returns A row ready for the report and the artifact.
 * @throws {Error} When a row has neither a value nor a reason.
 */
export const makeRow = function makeRow(
	spec: RowSpec,
	budgets: Record<string, MobileBudget>,
	outcome: Outcome
): MobileBenchRow {
	const budget = spec.budgetKey ? budgets[spec.budgetKey] : undefined;
	const value = outcome.value ?? null;

	if (value === null && outcome.reason === undefined) {
		throw new Error(`row "${spec.id}" has no value and no reason`);
	}

	const reported =
		value === null
			? undefined
			: reportableValue(spec.unit, outcome.detail, value);

	return {
		budget: budget?.max ?? null,
		budgetSource: budget?.source ?? null,
		detail: reported?.detail,
		id: spec.id,
		label: spec.label,
		reason: outcome.reason,
		samples: outcome.samples ?? 0,
		status: value === null ? 'not-measured' : 'measured',
		surface: spec.surface,
		unit: spec.unit,
		value: reported?.value ?? null,
	};
};

/** Every row the report carries, in report order. */
export const ROWS = {
	androidBinary: {
		budgetKey: 'android_binary_bytes',
		id: 'android_binary_bytes',
		label: 'Android class bytes added to the app',
		surface: 'bundle',
		unit: 'bytes',
	},
	bootstrapCold: {
		budgetKey: 'bootstrap_to_snapshot_cold_ms',
		id: 'bootstrap_to_snapshot_cold_ms',
		label: 'handshake to first snapshot(), cold',
		surface: 'react-native-js',
		unit: 'ms',
	},
	bootstrapWarm: {
		budgetKey: 'bootstrap_to_snapshot_warm_ms',
		id: 'bootstrap_to_snapshot_warm_ms',
		label: 'handshake to first snapshot(), warm',
		surface: 'react-native-js',
		unit: 'ms',
	},
	cachedConsent: {
		budgetKey: 'cached_consent_available_ms',
		id: 'cached_consent_available_ms',
		label: 'stored envelope on disk to a readable answer',
		surface: 'react-native-js',
		unit: 'ms',
	},
	coldStartJsLaunch: {
		budgetKey: 'cold_start_js_to_first_consent_ms',
		id: 'cold_start_js_to_first_consent_ms',
		label: 'built entry to first snapshot(), fresh process',
		surface: 'react-native-js',
		unit: 'ms',
	},
	coldStartOverhead: {
		budgetKey: 'cold_start_overhead_ms',
		id: 'cold_start_overhead_ms',
		label: 'cold-start overhead attributable to c15t',
		surface: 'react-native-js',
		unit: 'ms',
	},
	commitAck: {
		budgetKey: 'commit_ack_no_network_ms',
		id: 'commit_ack_no_network_ms',
		label: 'action to acknowledged commit, no network',
		surface: 'react-native-js',
		unit: 'ms',
	},
	hydrate: {
		budgetKey: 'js_hydrate_envelope_ms',
		id: 'js_hydrate_envelope_ms',
		label: 'hydrate stored envelope',
		surface: 'react-native-js',
		unit: 'ms',
	},
	idleCpu: {
		budgetKey: 'idle_cpu_percent',
		id: 'idle_cpu_percent',
		label: 'idle CPU with one live subscription',
		surface: 'react-native-js',
		unit: 'percent',
	},
	idleHeap: {
		budgetKey: 'idle_heap_growth_bytes',
		id: 'idle_heap_growth_bytes',
		label: 'heap growth over the quiet window',
		surface: 'react-native-js',
		unit: 'bytes',
	},
	idleRss: {
		budgetKey: 'idle_rss_growth_bytes',
		id: 'idle_rss_growth_bytes',
		label: 'resident-set growth over the quiet window',
		surface: 'react-native-js',
		unit: 'bytes',
	},
	iosBinary: {
		budgetKey: 'ios_binary_bytes',
		id: 'ios_binary_bytes',
		label: 'iOS bytes added to the app binary',
		surface: 'bundle',
		unit: 'bytes',
	},
	iosBinding: {
		budgetKey: 'ios_binding_bytes',
		id: 'ios_binding_bytes',
		label: 'iOS TurboModule binding bytes',
		surface: 'bundle',
		unit: 'bytes',
	},
	isAllowed: {
		budgetKey: 'snapshot_read_us',
		id: 'is_allowed_us',
		label: 'isAllowed() read',
		surface: 'react-native-js',
		unit: 'us',
	},
	jsClosureBytes: {
		budgetKey: 'js_closure_bytes',
		id: 'js_closure_bytes',
		label: 'JavaScript an app carries from the entry',
		surface: 'bundle',
		unit: 'bytes',
	},
	jsClosureGzip: {
		budgetKey: 'js_closure_gzip_bytes',
		id: 'js_closure_gzip_bytes',
		label: 'JavaScript an app carries, gzipped',
		surface: 'bundle',
		unit: 'bytes',
	},
	jsClosureModules: {
		budgetKey: 'js_closure_modules',
		id: 'js_closure_modules',
		label: 'modules reachable from the built entry',
		surface: 'bundle',
		unit: 'count',
	},
	jsGzip: {
		budgetKey: 'js_shipped_gzip_bytes',
		id: 'js_shipped_gzip_bytes',
		label: 'JavaScript shipped, gzipped',
		surface: 'bundle',
		unit: 'bytes',
	},
	jsIdentities: {
		budgetKey: 'snapshot_object_identities',
		id: 'snapshot_object_identities',
		label: 'distinct snapshot objects across repeated reads',
		surface: 'react-native-js',
		unit: 'count',
	},
	jsRaw: {
		budgetKey: 'js_shipped_bytes',
		id: 'js_shipped_bytes',
		label: 'JavaScript shipped, unpacked',
		surface: 'bundle',
		unit: 'bytes',
	},
	jsxGlobalFiles: {
		budgetKey: 'jsx_global_reference_files',
		id: 'jsx_global_reference_files',
		label: 'built files using a React global they never import',
		surface: 'bundle',
		unit: 'count',
	},
	kotlinBootstrapCold: {
		budgetKey: 'native_bootstrap_to_snapshot_cold_ms',
		id: 'kotlin_bootstrap_to_snapshot_cold_ms',
		label: 'bootstrap() to first snapshot(), cold',
		surface: 'kotlin-core',
		unit: 'ms',
	},
	kotlinCommitAck: {
		budgetKey: 'native_commit_ack_no_network_ms',
		id: 'kotlin_commit_ack_no_network_ms',
		label: 'commit acknowledged, no network',
		surface: 'kotlin-core',
		unit: 'ms',
	},
	kotlinHydrate: {
		budgetKey: 'native_hydrate_envelope_ms',
		id: 'kotlin_hydrate_envelope_ms',
		label: 'hydrate from stored envelope',
		surface: 'kotlin-core',
		unit: 'ms',
	},
	kotlinIdentities: {
		budgetKey: 'native_snapshot_object_identities',
		id: 'kotlin_snapshot_object_identities',
		label: 'distinct snapshot objects across repeated reads',
		surface: 'kotlin-core',
		unit: 'count',
	},
	kotlinPolicyEvaluation: {
		budgetKey: 'policy_evaluation_us',
		id: 'kotlin_policy_evaluation_us',
		label: 'policy evaluation, one rule set',
		surface: 'kotlin-core',
		unit: 'us',
	},
	kotlinSnapshotAndAllowed: {
		budgetKey: 'native_is_allowed_us',
		id: 'kotlin_snapshot_plus_is_allowed_us',
		label: 'snapshot() plus three isAllowed() reads',
		surface: 'kotlin-core',
		unit: 'us',
	},
	manifestParse: {
		budgetKey: 'package_manifest_parse_errors',
		id: 'package_manifest_parse_errors',
		label: 'package manifest parse errors',
		surface: 'bundle',
		unit: 'count',
	},
	nativeBootstrapCold: {
		budgetKey: 'native_bootstrap_to_snapshot_cold_ms',
		id: 'native_bootstrap_to_snapshot_cold_ms',
		label: 'bootstrap() to first snapshot(), cold',
		surface: 'swift-core',
		unit: 'ms',
	},
	nativeBootstrapWarm: {
		budgetKey: 'native_bootstrap_to_snapshot_warm_ms',
		id: 'native_bootstrap_to_snapshot_warm_ms',
		label: 'bootstrap() to first snapshot(), warm',
		surface: 'swift-core',
		unit: 'ms',
	},
	nativeCommitAck: {
		budgetKey: 'native_commit_ack_no_network_ms',
		id: 'native_commit_ack_no_network_ms',
		label: 'commit acknowledged, in-memory store, no network',
		surface: 'swift-core',
		unit: 'ms',
	},
	nativeCommitAckDisk: {
		budgetKey: 'native_commit_ack_no_network_ms',
		id: 'native_commit_ack_disk_ms',
		label: 'commit acknowledged, FileStore plus dead transport',
		surface: 'swift-core',
		unit: 'ms',
	},
	nativeHydrate: {
		budgetKey: 'native_hydrate_envelope_ms',
		id: 'native_hydrate_envelope_ms',
		label: 'hydrate from stored envelope',
		surface: 'swift-core',
		unit: 'ms',
	},
	nativeIsAllowed: {
		budgetKey: 'native_is_allowed_us',
		id: 'native_is_allowed_us',
		label: 'isAllowed() read',
		surface: 'swift-core',
		unit: 'us',
	},
	nativePolicyEvaluation: {
		budgetKey: 'policy_evaluation_us',
		id: 'native_policy_evaluation_us',
		label: 'policy evaluation, one rule set',
		surface: 'swift-core',
		unit: 'us',
	},
	nativeQueueReplay: {
		budgetKey: null,
		id: 'native_queue_replay_us',
		label: 'read queued save bodies',
		surface: 'swift-core',
		unit: 'us',
	},
	nativeSnapshotRead: {
		budgetKey: 'native_snapshot_read_us',
		id: 'native_snapshot_read_us',
		label: 'snapshot() read',
		surface: 'swift-core',
		unit: 'us',
	},
	policyRuleSets: {
		budgetKey: null,
		id: 'policy_rule_sets_covered',
		label: 'rule sets covered by the sweep',
		surface: 'react-native-js',
		unit: 'count',
	},
	policySweep: {
		budgetKey: 'policy_apply_per_rule_set_us',
		id: 'policy_apply_per_rule_set_us',
		label:
			'apply a rule set (init to snapshot), median over the fixture corpus',
		surface: 'react-native-js',
		unit: 'us',
	},
	pullCount: {
		budgetKey: null,
		id: 'native_snapshot_pulls_per_run',
		label: 'times the bridge pulled a snapshot',
		surface: 'react-native-js',
		unit: 'count',
	},
	rerenderChange: {
		budgetKey: 'rerenders_per_consent_change',
		id: 'rerenders_per_consent_change',
		label: 'rerenders per consent change, worst component',
		surface: 'react-native-js',
		unit: 'count',
	},
	rerenderUnchanged: {
		budgetKey: 'rerenders_per_unchanged_event',
		id: 'rerenders_per_unchanged_event',
		label: 'rerenders per unchanged snapshot event, worst component',
		surface: 'react-native-js',
		unit: 'count',
	},
	snapshotRead: {
		budgetKey: 'snapshot_read_us',
		id: 'snapshot_read_us',
		label: 'snapshot() read',
		surface: 'react-native-js',
		unit: 'us',
	},
	uiActionToCommit: {
		budgetKey: 'consent_ui_action_to_commit_ms',
		id: 'consent_ui_action_to_commit_ms',
		label: 'tap on the primary action to the module holding it',
		surface: 'react-native-js',
		unit: 'ms',
	},
	uiMount: {
		budgetKey: 'consent_ui_mount_to_interactive_ms',
		id: 'consent_ui_mount_to_interactive_ms',
		label: 'first banner mount to a live press handler',
		surface: 'react-native-js',
		unit: 'ms',
	},
	uiOpen: {
		budgetKey: 'consent_ui_open_to_interactive_ms',
		id: 'consent_ui_open_to_interactive_ms',
		label: 'prompt owed to a live press handler',
		surface: 'react-native-js',
		unit: 'ms',
	},
	uiRemount: {
		budgetKey: 'consent_ui_remount_to_interactive_ms',
		id: 'consent_ui_remount_to_interactive_ms',
		label: 'warm banner mount to a live press handler',
		surface: 'react-native-js',
		unit: 'ms',
	},
} satisfies Record<string, RowSpec>;

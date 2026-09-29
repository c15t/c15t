/**
 * `bun run bench:mobile`.
 *
 * Measures every budget in `native/CONTRACT.md` that this machine can measure,
 * prints one table, stores the run as JSON, and with `--check` exits non-zero when
 * a number misses a ceiling.
 *
 * Rows that cannot be measured stay in the table with the reason. A row is never
 * dropped, because a table that quietly shrinks is how a gate starts passing
 * without measuring anything.
 */

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	getEnvironment,
	readJson,
	safeCommitSha,
	safeGitDirty,
	writeJson,
} from '@c15t/benchmarking/utils';

import { coverageNotes } from './axes';
import { loadBudgets } from './budgets';
import type { BundleResult } from './measure/bundle';
import { measureBundle } from './measure/bundle';
import type { CachedConsentResult } from './measure/cached-consent';
import { measureCachedConsent } from './measure/cached-consent';
import type { ColdStartResult } from './measure/cold-start';
import { measureColdStart } from './measure/cold-start';
import type { IdleResult } from './measure/idle';
import { measureIdle } from './measure/idle';
import { measureJavaScript } from './measure/javascript';
import { runKotlinBench, runSwiftBench } from './measure/native';
import { nativeRows } from './measure/native-rows';
import type { PolicySweepResult } from './measure/policy-sweep';
import { measurePolicySweep } from './measure/policy-sweep';
import { measureRerenders } from './measure/rerender';
import type { UiInteractiveResult } from './measure/ui-interactive';
import { measureUiInteractive } from './measure/ui-interactive';
import { buildCheck, diffRows, renderReport } from './report';
import { makeRow, ROWS } from './rows';
import type {
	MobileBenchArtifact,
	MobileBenchRow,
	MobileBudget,
	MobileSampling,
} from './types';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Where a run stores its numbers, committed so the next run can diff. */
export const RESULTS_FILE = resolve(HERE, '..', 'results', 'latest.json');

const SCHEMA_VERSION = 1;

const readPrevious = function readPrevious(): MobileBenchArtifact | undefined {
	if (!existsSync(RESULTS_FILE)) {
		return undefined;
	}
	try {
		return readJson<MobileBenchArtifact>(RESULTS_FILE);
	} catch {
		return undefined;
	}
};

/**
 * Rows for the JavaScript boundary: the handshake, the reads, and the rerenders.
 *
 * @param budgets - The loaded budget map.
 * @param sampling - The sampling plan for this run.
 * @returns Rows in report order.
 */
const javaScriptRows = async function javaScriptRows(
	budgets: Record<string, MobileBudget>,
	sampling: MobileSampling
): Promise<MobileBenchRow[]> {
	const js = await measureJavaScript(
		sampling.warmupIterations,
		sampling.measuredIterations
	);
	const rerender = await measureRerenders();

	return [
		makeRow(ROWS.bootstrapWarm, budgets, {
			samples: js.samples,
			value: js.bootstrapToSnapshotWarmMs,
		}),
		makeRow(ROWS.bootstrapCold, budgets, {
			samples: 1,
			value: js.bootstrapToSnapshotColdMs,
		}),
		makeRow(ROWS.coldStartOverhead, budgets, {
			detail:
				'same span as the cold handshake: the only c15t work before the first read',
			samples: 1,
			value: js.bootstrapToSnapshotColdMs,
		}),
		makeRow(ROWS.hydrate, budgets, {
			detail: `envelope ${js.envelopeBytes} B`,
			samples: js.samples,
			value: js.hydrateEnvelopeMs,
		}),
		makeRow(ROWS.commitAck, budgets, {
			samples: js.samples,
			value: js.commitAckNoNetworkMs,
		}),
		makeRow(ROWS.snapshotRead, budgets, {
			samples: js.samples,
			value: js.snapshotReadUs,
		}),
		makeRow(ROWS.isAllowed, budgets, {
			samples: js.samples,
			value: js.isAllowedUs,
		}),
		makeRow(ROWS.jsIdentities, budgets, {
			samples: sampling.measuredIterations,
			value: js.snapshotObjectIdentities,
		}),
		makeRow(ROWS.rerenderChange, budgets, {
			detail: JSON.stringify(rerender.consentChange.perComponent),
			samples: rerender.components,
			value: rerender.consentChange.maxRenders,
		}),
		makeRow(ROWS.rerenderUnchanged, budgets, {
			detail: JSON.stringify(rerender.unchangedEvent.perComponent),
			samples: rerender.components,
			value: rerender.unchangedEvent.maxRenders,
		}),
		makeRow(ROWS.pullCount, budgets, {
			detail: `${rerender.distinctSnapshotsAcrossStates} state changes, ${rerender.distinctSnapshotsAcrossStates} distinct snapshot objects`,
			samples: rerender.components,
			value: rerender.nativeSnapshotCalls,
		}),
	];
};

/**
 * Rows for the quiet window. All three share one reason when the window produced
 * nothing, because they are three readings of the same child process.
 *
 * @param idle - What the child reported.
 * @param budgets - The loaded budget map.
 * @returns Rows in report order.
 */
const idleRows = function idleRows(
	idle: IdleResult,
	budgets: Record<string, MobileBudget>
): MobileBenchRow[] {
	const reason =
		idle.unavailable ??
		(idle.listeners === 0
			? 'the quiet window held no live subscription, so the number would not mean anything'
			: undefined);

	if (reason) {
		return [
			makeRow(ROWS.idleCpu, budgets, { reason }),
			makeRow(ROWS.idleRss, budgets, { reason }),
			makeRow(ROWS.idleHeap, budgets, { reason }),
		];
	}

	const detail = `${idle.elapsedMs} ms window after a ${idle.settleMs} ms settle, ${idle.listeners} live listener(s)`;
	return [
		makeRow(ROWS.idleCpu, budgets, {
			detail,
			samples: 1,
			value: idle.cpuPercentOfOneCore,
		}),
		makeRow(ROWS.idleRss, budgets, { samples: 1, value: idle.rssGrowthBytes }),
		makeRow(ROWS.idleHeap, budgets, {
			samples: 1,
			value: idle.heapGrowthBytes,
		}),
	];
};

/**
 * Rows for the rule-set sweep, plus the count of rule sets it actually covered.
 *
 * @param sweep - What the sweep measured and skipped.
 * @param budgets - The loaded budget map.
 * @returns Rows in report order.
 */
const sweepRows = function sweepRows(
	sweep: PolicySweepResult,
	budgets: Record<string, MobileBudget>
): MobileBenchRow[] {
	if (sweep.unavailable) {
		return [
			makeRow(ROWS.policySweep, budgets, { reason: sweep.unavailable }),
			makeRow(ROWS.policyRuleSets, budgets, { reason: sweep.unavailable }),
		];
	}

	return [
		makeRow(ROWS.policySweep, budgets, {
			detail: `${sweep.ruleSets} rule sets from native/protocol, worst ${sweep.worstRuleSetUs} us, span is init plus first read`,
			samples: sweep.samplesPerRuleSet * Math.max(sweep.ruleSets, 1),
			value: sweep.evaluationUs,
		}),
		makeRow(ROWS.policyRuleSets, budgets, {
			detail:
				sweep.skipped.length > 0
					? `${sweep.skipped.length} fixture(s) skipped`
					: 'every evaluation fixture driven',
			samples: sweep.ruleSets,
			value: sweep.ruleSets,
		}),
	];
};

/**
 * Rows for the launch cost a warm process cannot show.
 *
 * @param cold - What the fresh processes produced.
 * @param budgets - The loaded budget map.
 * @returns Rows in report order.
 */
const coldStartRows = function coldStartRows(
	cold: ColdStartResult,
	budgets: Record<string, MobileBudget>
): MobileBenchRow[] {
	if (cold.unavailable) {
		return [
			makeRow(ROWS.coldStartJsLaunch, budgets, { reason: cold.unavailable }),
		];
	}

	return [
		makeRow(ROWS.coldStartJsLaunch, budgets, {
			detail: `median of ${cold.samples} fresh processes: ${cold.moduleLoadMs} ms evaluating the entry and what it links, ${cold.attachMs} ms to the first read; ${cold.hostMs} ms of React and harness work excluded`,
			samples: cold.samples,
			value: cold.toFirstConsentMs,
		}),
	];
};

/**
 * Rows for the store-to-answer span.
 *
 * @param cached - What the store reads produced.
 * @param budgets - The loaded budget map.
 * @returns Rows in report order.
 */
const cachedConsentRows = function cachedConsentRows(
	cached: CachedConsentResult,
	budgets: Record<string, MobileBudget>
): MobileBenchRow[] {
	if (cached.unavailable) {
		return [
			makeRow(ROWS.cachedConsent, budgets, { reason: cached.unavailable }),
		];
	}

	return [
		makeRow(ROWS.cachedConsent, budgets, {
			detail: `envelope ${cached.envelopeBytes} B read off disk, granted marketing as the store said`,
			samples: cached.samples,
			value: cached.coldMs,
		}),
	];
};

/**
 * Rows for the rendered banner. All four share one reason when the sheet never
 * became actionable, because they are four readings of one mount.
 *
 * @param ui - What the mounts produced.
 * @param budgets - The loaded budget map.
 * @returns Rows in report order.
 */
const uiRows = function uiRows(
	ui: UiInteractiveResult,
	budgets: Record<string, MobileBudget>
): MobileBenchRow[] {
	if (ui.unavailable) {
		return [
			makeRow(ROWS.uiMount, budgets, { reason: ui.unavailable }),
			makeRow(ROWS.uiRemount, budgets, { reason: ui.unavailable }),
			makeRow(ROWS.uiOpen, budgets, { reason: ui.unavailable }),
			makeRow(ROWS.uiActionToCommit, budgets, { reason: ui.unavailable }),
		];
	}

	return [
		makeRow(ROWS.uiMount, budgets, {
			detail: `${ui.controls} live controls; react-test-renderer, so no layout pass or platform Modal`,
			samples: 1,
			value: ui.coldMountMs,
		}),
		makeRow(ROWS.uiRemount, budgets, {
			detail: `median of ${ui.samples} mounts against one attached client`,
			samples: ui.samples,
			value: ui.mountMs,
		}),
		makeRow(ROWS.uiOpen, budgets, {
			detail: `${ui.controls} controls after ${ui.openTicks} settle frame(s) past the event's own turn`,
			samples: 1,
			value: ui.openMs,
		}),
		makeRow(ROWS.uiActionToCommit, budgets, {
			detail: `press to the intent reaching the module; ${ui.controlsAfterAccept} control(s) left, which should be 0`,
			samples: 1,
			value: ui.actionToCommitMs,
		}),
	];
};

/**
 * Rows for shipped bytes. A metric with no value carries the reason its build
 * could not run, which is the difference between a small artifact and no evidence.
 *
 * @param bundle - Every shipped-bytes metric.
 * @param budgets - The loaded budget map.
 * @returns Rows in report order.
 */
const bundleRows = function bundleRows(
	bundle: BundleResult,
	budgets: Record<string, MobileBudget>
): MobileBenchRow[] {
	const specs = [
		[ROWS.jsRaw, bundle.jsShippedBytes],
		[ROWS.jsGzip, bundle.jsShippedGzipBytes],
		[ROWS.jsClosureBytes, bundle.jsClosureBytes],
		[ROWS.jsClosureGzip, bundle.jsClosureGzipBytes],
		[ROWS.jsClosureModules, bundle.jsClosureFiles],
		[ROWS.iosBinary, bundle.iosBinaryBytes],
		[ROWS.iosBinding, bundle.iosBindingBytes],
		[ROWS.androidBinary, bundle.androidBinaryBytes],
		[ROWS.jsxGlobalFiles, bundle.jsxGlobalReferenceFiles],
		[ROWS.manifestParse, bundle.packageManifestParseErrors],
	] as const;

	return specs.map(([spec, metric]) =>
		makeRow(spec, budgets, {
			detail: metric.detail,
			reason:
				metric.value === null ? (metric.reason ?? 'no measurement') : undefined,
			value: metric.value,
		})
	);
};

/**
 * Run the suite once.
 *
 * @param argv - Process arguments, so `--check` and `--quick` reach the sampling plan.
 * @returns The artifact to print and store, plus the gate outcome.
 */
export const runBenchmark = async function runBenchmark(
	argv: string[]
): Promise<{
	artifact: MobileBenchArtifact;
	check: ReturnType<typeof buildCheck>;
}> {
	const enforce = argv.includes('--check') || process.env.BENCH_CHECK === '1';
	const quick = argv.includes('--quick') || process.env.BENCH_QUICK === '1';
	const file = loadBudgets();
	const sampling = quick
		? {
				...file.sampling,
				coldStartProcesses: file.sampling.quickColdStartProcesses,
				idleWindowMs: file.sampling.quickIdleWindowMs,
				measuredIterations: file.sampling.quickMeasuredIterations,
				uiMountIterations: file.sampling.quickUiMountIterations,
				warmupIterations: file.sampling.quickWarmupIterations,
			}
		: file.sampling;

	const { budgets } = file;
	const notes: string[] = [];
	const rows: MobileBenchRow[] = [];
	const timeoutMs = quick ? 120000 : 900000;

	const swift = runSwiftBench(timeoutMs);
	const kotlin = runKotlinBench(timeoutMs);
	rows.push(...nativeRows(swift, kotlin, budgets));

	rows.push(...(await javaScriptRows(budgets, sampling)));

	const cold = measureColdStart(sampling.coldStartProcesses);
	rows.push(...coldStartRows(cold, budgets));
	const contractCold = budgets.cold_start_overhead_ms?.max;
	if (contractCold !== undefined && cold.toFirstConsentMs > contractCold) {
		notes.push(
			`the cold JavaScript span measures ${cold.toFirstConsentMs} ms, over the ${contractCold} ms the contract budgets for cold-start overhead. The contract row above times only the read path in a warm process; the contract number is a device-profile one and this harness runs on Node's module loader, which charges c15t for resolving every specifier a bundled app resolves from one bundle. Read the two rows together and treat neither as an app-launch number.`
		);
	}

	rows.push(
		...cachedConsentRows(
			measureCachedConsent(
				sampling.warmupIterations,
				sampling.measuredIterations
			),
			budgets
		)
	);
	rows.push(
		...uiRows(measureUiInteractive(sampling.uiMountIterations), budgets)
	);

	rows.push(...idleRows(measureIdle(sampling.idleWindowMs), budgets));
	const sweep = await measurePolicySweep(
		Math.max(10, Math.round(sampling.warmupIterations / 2)),
		Math.max(50, sampling.measuredIterations)
	);
	rows.push(...sweepRows(sweep, budgets));
	for (const skipped of sweep.skipped) {
		notes.push(`policy sweep skipped ${skipped.id}: ${skipped.reason}`);
	}

	const bundle = measureBundle();
	rows.push(...bundleRows(bundle, budgets));
	if ((bundle.jsxGlobalReferenceFiles.value ?? 0) > 0) {
		notes.push(
			`dist emits classic-runtime JSX without importing React in ${bundle.jsxGlobalReferenceFiles.detail}. The harness supplies that global so the boundary can be measured; the artifact is still broken for an app until the build emits the import.`
		);
	}

	// Record coverage the same way every run sees it, so an axis that silently loses its
	// last row shows up here and not only in a README that nobody re-reads.
	notes.push(...coverageNotes(rows));
	const previous = readPrevious();
	const outputDir = process.env.BENCH_OUTPUT_DIR;
	const artifact: MobileBenchArtifact = {
		budgets,
		commitSha: safeCommitSha(),
		contract: file.contract,
		environment: getEnvironment(),
		gitDirty: safeGitDirty(),
		notes,
		package: '@c15t/react-native',
		previous: previous
			? {
					previousCommitSha: previous.commitSha,
					previousTimestamp: previous.timestamp,
					rows: diffRows(
						rows,
						previous.rows,
						file.sampling.subsequentRunDiffTolerancePercent
					),
					tolerancePercent: file.sampling.subsequentRunDiffTolerancePercent,
				}
			: undefined,
		rows,
		runtime:
			process.versions.bun === undefined
				? `node ${process.version}`
				: `bun ${process.versions.bun}`,
		sampling,
		schemaVersion: SCHEMA_VERSION,
		suite: 'mobile-runtime',
		timestamp: new Date().toISOString(),
	};

	writeJson(
		outputDir ? resolve(outputDir, 'mobile-runtime.json') : RESULTS_FILE,
		artifact
	);

	return { artifact, check: buildCheck(rows, enforce) };
};

await runBenchmark(process.argv.slice(2)).then(({ artifact, check }) => {
	for (const line of renderReport(artifact)) {
		process.stdout.write(`${line}\n`);
	}

	process.stdout.write(
		`\n${check.measuredCount} measured, ${check.unmeasured.length} not-measured, ${check.failed.length} over budget${check.enforced ? '' : ' (report mode: budgets are not enforced)'}\n`
	);

	for (const failure of check.failed) {
		process.stdout.write(`FAIL ${failure}\n`);
	}

	if (!check.ok) {
		process.exitCode = 1;
	}
});

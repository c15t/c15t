/**
 * Issue #1010's seven performance axes, mapped onto the rows that measure them.
 *
 * The mapping is source rather than a paragraph in a README because a table written
 * by hand goes stale the first time a row is renamed. These lines are asserted in
 * `__tests__/axis-coverage.test.ts`: an axis that loses its last covering row fails
 * the suite, and a row named here must exist and must carry a budget, so an axis
 * cannot be marked covered by an unnumbered row.
 */

import { ROWS } from './rows';

/** One axis from the issue, and what this harness does about it. */
export interface BenchAxis {
	/** The issue's numbering, 1 through 7. */
	axis: number;
	/** The axis as the issue words it. */
	title: string;
	/** Row ids that measure it. Every one of them is gated by a budget. */
	rows: readonly string[];
	/**
	 * What the rows here do not reach, when they do not reach all of it.
	 *
	 * Short by design: it goes into the run's notes, so a reader of the table sees
	 * the limit of the number in front of them. The full account of what it would
	 * take lives in `benchmarks/mobile/README.md`.
	 */
	gap?: string;
}

/** The seven axes issue #1010 asks for, in the order it lists them. */
export const MOBILE_AXES: readonly BenchAxis[] = [
	{
		axis: 1,
		gap: 'no job here launches the app on a simulator or a device, so the process spawn, Metro, and the native SDK init around these spans stay unmeasured',
		rows: [
			ROWS.coldStartJsLaunch.id,
			ROWS.coldStartOverhead.id,
			ROWS.bootstrapCold.id,
			ROWS.nativeBootstrapCold.id,
			ROWS.kotlinBootstrapCold.id,
		],
		title: 'Cold-start overhead',
	},
	{
		axis: 2,
		rows: [
			ROWS.cachedConsent.id,
			ROWS.hydrate.id,
			ROWS.nativeHydrate.id,
			ROWS.kotlinHydrate.id,
		],
		title: 'Time until cached consent is available',
	},
	{
		axis: 3,
		gap: 'mounted under react-test-renderer, which runs no layout pass, no platform Modal, and no font loading, so these are the React half of interactivity',
		rows: [ROWS.uiMount.id, ROWS.uiRemount.id, ROWS.uiOpen.id],
		title: 'Time until consent UI is interactive',
	},
	{
		axis: 4,
		rows: [
			ROWS.uiActionToCommit.id,
			ROWS.commitAck.id,
			ROWS.nativeCommitAck.id,
			ROWS.nativeCommitAckDisk.id,
			ROWS.kotlinCommitAck.id,
		],
		title: 'Consent action latency',
	},
	{
		axis: 5,
		rows: [ROWS.rerenderChange.id, ROWS.rerenderUnchanged.id],
		title: 'React rerenders',
	},
	{
		axis: 6,
		gap: 'measured in the JavaScript process on a shared runner, so it says nothing about the native core sitting idle on a device',
		rows: [ROWS.idleCpu.id, ROWS.idleRss.id, ROWS.idleHeap.id],
		title: 'Idle CPU and memory use',
	},
	{
		axis: 7,
		gap: 'the TurboModule binding slice and the Metro bundle delta need a host app build, which no job here runs',
		rows: [
			ROWS.jsRaw.id,
			ROWS.jsGzip.id,
			ROWS.jsClosureBytes.id,
			ROWS.jsClosureGzip.id,
			ROWS.iosBinary.id,
			ROWS.androidBinary.id,
		],
		title: 'Native and JavaScript bundle-size impact',
	},
] as const;

/**
 * Describe coverage as report notes, one line per axis.
 *
 * @param rows - The rows the run produced, measured or not.
 * @returns Note lines, in axis order.
 */
export const coverageNotes = function coverageNotes(
	rows: readonly { id: string; status: string }[]
): string[] {
	const byId = new Map(rows.map((row) => [row.id, row]));
	const notes: string[] = [];

	for (const entry of MOBILE_AXES) {
		const counted = entry.rows.filter(
			(id) => byId.get(id)?.status === 'measured'
		);
		const missing = entry.rows.filter(
			(id) => byId.get(id)?.status !== 'measured'
		);

		const tail =
			missing.length === 0
				? ''
				: ` (not measured this run: ${missing.join(', ')})`;

		notes.push(
			`axis ${entry.axis}/7 ${entry.title}: ${counted.length > 0 ? counted.join(', ') : 'NOT COVERED'}${tail}`
		);

		if (entry.gap !== undefined) {
			notes.push(`axis ${entry.axis} gap: ${entry.gap}`);
		}
	}

	return notes;
};

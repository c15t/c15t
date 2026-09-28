/**
 * One cold launch of the JavaScript boundary, in a process that has never seen it.
 *
 * Cold start is the one axis a warm process cannot measure: the same
 * `createConsentClient()` call costs 0.003 ms after 300 repetitions and several
 * milliseconds in the process that runs it first. So this file does the launch
 * exactly once per process and prints both halves of the span.
 *
 * What runs before the anchor is excluded from the number on purpose:
 *
 * - `react`, because an app pays it whether or not c15t is installed;
 * - the bench stub, because a device has React Native loaded before app code runs;
 * - the harness's own support files, including the sweep over `dist` that looks for
 *   a missing `React` import, which reads every built file and would otherwise be
 *   charged to c15t as launch cost.
 *
 * That sweep also warms the page cache for `dist`, which is the faithful choice: a
 * bundled app reads its one JS bundle regardless, so the bytes are not attributable
 * to c15t and the module evaluation is.
 *
 * Spawned as its own process by `measure/cold-start.ts`, one process per sample.
 */

import type { BenchNativeModule } from './fake-native';

/** Name the native cores register the TurboModule under. */
const MODULE_NAME = 'C15t';

const now = function now(): number {
	return performance.now();
};

/** What this process measured, in milliseconds. */
export interface ColdStartReport {
	/** Handshake to the first readable snapshot, with nothing warmed. */
	attachMs: number;
	/** Module evaluation for the built entry and everything it links. */
	moduleLoadMs: number;
	/** Host cost paid before the anchor, reported so the exclusion is visible. */
	hostMs: number;
	/** The snapshot the first read answered with, so the row cannot be a default. */
	readyAfterFirstRead: boolean;
}

const hostStart = now();

await import('react');
await import('./react-native-stub');

const { installBenchNativeModule } = await import('./fake-native');
const { buildSnapshot } = await import('./fixtures');
const { ensureReactGlobalForDist } = await import('./ensure-react-global');
const { resetNativeStub, setNativeModule } =
	await import('./react-native-stub');

// Reads every built file looking for the shipped defect this harness works around.
// Deliberately outside the measured span, and it warms the page cache for `dist`.
ensureReactGlobalForDist();
resetNativeStub();
const hostMs = now() - hostStart;

// The fake module, installed before the anchor: registering it is harness work.
const native: BenchNativeModule = installBenchNativeModule(
	MODULE_NAME,
	setNativeModule,
	buildSnapshot()
);

const moduleStart = now();
const boundary = await import('@c15t/react-native');
const moduleLoadMs = now() - moduleStart;

const attachStart = now();
const client = boundary.createConsentClient(
	native as never,
	{ addListener: () => ({ remove: () => undefined }) } as never
);
const snapshot = client.getSnapshot() as { ready?: boolean };
const attachMs = now() - attachStart;
const readyAfterFirstRead = snapshot.ready === true;

client.dispose();

process.stdout.write(
	JSON.stringify({
		attachMs: Number(attachMs.toFixed(4)),
		hostMs: Number(hostMs.toFixed(4)),
		moduleLoadMs: Number(moduleLoadMs.toFixed(4)),
		readyAfterFirstRead,
	})
);

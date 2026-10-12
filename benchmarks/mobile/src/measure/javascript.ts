/**
 * JavaScript-side measurements for `@c15t/react-native`.
 *
 * The consent kernel is native, so the numbers the contract budgets belong to
 * Swift and Kotlin. What lives here is the boundary the app actually waits on:
 * handshake to first readable snapshot, decode of a stored envelope, the cost of
 * a synchronous read, and the round trip from a subject's action to an
 * acknowledged commit with no network.
 */

import { median } from '@c15t/benchmarking/utils';
import { createConsentClient } from '@c15t/react-native';

import { ensureReactGlobalForDist } from '../support/ensure-react-global';
import { installBenchNativeModule } from '../support/fake-native';
import {
	BENCH_BOOTSTRAP,
	REALISTIC_SNAPSHOT_JSON,
	buildSnapshot,
} from '../support/fixtures';
import { resetNativeStub, setNativeModule } from '../support/react-native-stub';

const MODULE_NAME = 'C15t';

/** The event surface a client needs, without a real emitter. */
const silentEvents = {
	addListener: () => ({ remove: () => undefined }),
};

/** Pre-encoded native replies, so no encoder runs inside a timed region. */
interface NativeTables {
	envelope: string;
	replies: string[];
	snapshots: string[];
}

/**
 * Encode the payloads a device would hand back, once per run.
 *
 * @param payloadCount - Distinct revisions to prepare.
 * @returns The tables {@link attach} reads.
 */
const buildNativeTables = function buildNativeTables(
	payloadCount: number
): NativeTables {
	const replies: string[] = [];
	const snapshots: string[] = [];

	for (let index = 1; index <= payloadCount; index += 1) {
		replies.push(
			JSON.stringify({
				action: 'all',
				confirmed: [
					'necessary',
					'functionality',
					'experience',
					'measurement',
					'marketing',
				],
				ok: true,
				queued: false,
				revision: index,
				subjectId: 'sub-bench-1',
			})
		);
		snapshots.push(
			REALISTIC_SNAPSHOT_JSON.replace('"revision":0', `"revision":${index}`)
		);
	}

	return { envelope: REALISTIC_SNAPSHOT_JSON, replies, snapshots };
};

/**
 * One fresh client plus the module it reads, as an app would have them.
 *
 * The payloads a commit would answer with are encoded up front. A device encodes
 * them in Swift or Kotlin, so encoding them inside the timed region would charge
 * the JavaScript number for native work.
 *
 * @param tables - Pre-encoded replies and snapshots, built once per run.
 * @returns The client and the module behind it.
 */
const attach = function attach(tables: NativeTables) {
	const native = installBenchNativeModule(
		MODULE_NAME,
		setNativeModule,
		buildSnapshot()
	);
	let served = tables.envelope;
	const { replies, snapshots } = tables;
	let commitIndex = 0;

	native.getSnapshot = () => served;
	native.getBootstrap = () => JSON.stringify(BENCH_BOOTSTRAP);
	native.commit = (intent: string) => {
		native.commitIntents.push(intent);
		served = snapshots[commitIndex % snapshots.length] ?? served;
		const reply = replies[commitIndex % replies.length] ?? '';
		commitIndex += 1;

		return Promise.resolve(reply);
	};

	return {
		client: createConsentClient(native as never, silentEvents as never),
		native,
	};
};

const nowNs = function nowNs(): number {
	return Number(process.hrtime.bigint());
};

const medianMicros = function medianMicros(samples: number[]): number {
	return Number(median(samples).toFixed(3));
};

export interface JavaScriptResult {
	/** Warm handshake to first readable snapshot, milliseconds. */
	bootstrapToSnapshotWarmMs: number;
	/** Same span measured on the first client this process builds. */
	bootstrapToSnapshotColdMs: number;
	/** Decode a stored envelope into a readable snapshot, milliseconds. */
	hydrateEnvelopeMs: number;
	/** A synchronous `getSnapshot()` read, microseconds. */
	snapshotReadUs: number;
	/** A synchronous `isAllowed()` read, microseconds. */
	isAllowedUs: number;
	/** Distinct snapshot objects across repeated reads of one state. */
	snapshotObjectIdentities: number;
	/** Action to acknowledged commit with no network, milliseconds. */
	commitAckNoNetworkMs: number;
	/** Bytes of the realistic stored envelope, for the report detail. */
	envelopeBytes: number;
	samples: number;
}

/**
 * Run every JavaScript measurement.
 *
 * @param warmup - Iterations discarded before sampling.
 * @param iterations - Iterations kept.
 * @returns Medians in the units the budget file names.
 */
/**
 * Commit to acknowledged, with no network.
 *
 * The bridge hands back a promise, so the measured span runs to the resolution.
 * Timing only the synchronous half would measure the call, not the acknowledgement
 * the contract budgets.
 *
 * @param client - A client attached to a module that answers offline.
 * @param warmup - Iterations discarded before sampling.
 * @param iterations - Iterations kept.
 * @returns Median milliseconds to an acknowledged commit.
 */
const measureCommitAck = async function measureCommitAck(
	client: ReturnType<typeof createConsentClient>,
	warmup: number,
	iterations: number
): Promise<number[]> {
	const samples: number[] = [];

	for (let index = 0; index < warmup + iterations; index += 1) {
		const startedAt = nowNs();
		// A latency sample has to await the thing it times. Running these in
		// parallel would measure throughput and overlap, not the budgeted span.
		// eslint-disable-next-line no-await-in-loop
		const result = await client.commit({ action: 'all' });
		const elapsed = (nowNs() - startedAt) / 1e6;
		if (!result.ok && result.reason !== 'queued') {
			throw new Error(
				`commit did not acknowledge: ${result.reason ?? 'unknown'}`
			);
		}
		if (index >= warmup) {
			samples.push(elapsed);
		}
	}

	return samples;
};

export const measureJavaScript = async function measureJavaScript(
	warmup: number,
	iterations: number
): Promise<JavaScriptResult> {
	ensureReactGlobalForDist();

	// Built before anything is timed: encoding a reply here keeps the JavaScript
	// number from paying for an encoder a real device runs in native code.
	const tables = buildNativeTables(warmup + iterations + 1);

	// Cold: the very first client this process builds, before anything is warm.
	resetNativeStub();
	const cold = attach(tables);
	const coldStart = nowNs();
	cold.client.getSnapshot();
	const bootstrapToSnapshotColdMs = Number(
		((nowNs() - coldStart) / 1e6).toFixed(3)
	);
	cold.client.dispose();

	// Warm: the same span, repeated.
	const handshakeSamples: number[] = [];
	for (let index = 0; index < warmup + iterations; index += 1) {
		resetNativeStub();
		const run = attach(tables);
		const startedAt = nowNs();
		run.client.getSnapshot();
		const elapsed = (nowNs() - startedAt) / 1e6;
		run.client.dispose();
		if (index >= warmup) {
			handshakeSamples.push(elapsed);
		}
	}

	// Hydrate: envelope bytes in, readable snapshot out.
	const hydrateSamples: number[] = [];
	for (let index = 0; index < warmup + iterations; index += 1) {
		resetNativeStub();
		const startedAt = nowNs();
		const run = attach(tables);
		const snapshot = run.client.getSnapshot();
		const readable =
			snapshot.ready && typeof snapshot.effectivePermissions === 'object';
		const elapsed = (nowNs() - startedAt) / 1e6;
		run.client.dispose();
		if (!readable) {
			throw new Error('hydrate measurement produced an unreadable snapshot');
		}
		if (index >= warmup) {
			hydrateSamples.push(elapsed);
		}
	}

	// Repeated synchronous reads of one unchanged state.
	const attached = attach(tables);
	attached.client.getSnapshot();

	// A live subscriber, because an app that commits has a banner mounted. Without
	// one the client marks itself stale and skips the pull, and the number stops
	// being the round trip the contract budgets.
	const stopWatching = attached.client.subscribe(
		(snapshot: { revision: number }) => snapshot.revision,
		() => undefined
	);
	const commitSamples = await measureCommitAck(
		attached.client,
		warmup,
		iterations
	);
	stopWatching();

	const readSamples: number[] = [];
	for (let index = 0; index < warmup + iterations; index += 1) {
		const startedAt = nowNs();
		const snapshot = attached.client.getSnapshot();
		const elapsed = (nowNs() - startedAt) / 1e3;
		if (index >= warmup) {
			readSamples.push(elapsed);
		}
		void snapshot;
	}

	const allowedSamples: number[] = [];
	for (let index = 0; index < warmup + iterations; index += 1) {
		const startedAt = nowNs();
		const allowed = attached.client.isAllowed('marketing');
		const elapsed = (nowNs() - startedAt) / 1e3;
		if (index >= warmup) {
			allowedSamples.push(elapsed);
		}
		void allowed;
	}

	const identities: object[] = [];
	for (let index = 0; index < iterations; index += 1) {
		const snapshot = attached.client.getSnapshot() as object;
		if (!identities.some((seen) => seen === snapshot)) {
			identities.push(snapshot);
		}
	}

	attached.client.dispose();

	return {
		bootstrapToSnapshotColdMs,
		bootstrapToSnapshotWarmMs: medianMicros(handshakeSamples),
		commitAckNoNetworkMs: medianMicros(commitSamples),
		envelopeBytes: Buffer.byteLength(REALISTIC_SNAPSHOT_JSON, 'utf8'),
		hydrateEnvelopeMs: medianMicros(hydrateSamples),
		isAllowedUs: medianMicros(allowedSamples),
		samples: iterations,
		snapshotObjectIdentities: identities.length,
		snapshotReadUs: medianMicros(readSamples),
	};
};

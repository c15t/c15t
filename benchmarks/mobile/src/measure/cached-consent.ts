/**
 * Time until cached consent is available to JavaScript.
 *
 * A subject who consented last week should not wait on anything to open the app, so
 * the launch number that matters is: stored envelope on disk to a readable answer.
 * The contract budgets the decode half (`hydrate from stored envelope: under 3 ms`),
 * which `measure/javascript.ts` reports. The half that goes to the store has never
 * been measured here, because the fake module answered a read out of memory.
 *
 * So this writes the realistic envelope the fixtures describe to a file and makes
 * the fake module answer a read from that file, the way a core whose hydrate sits on
 * the critical path does. One sample is one client and one read, because the second
 * read of the same client is the warm path `snapshot_read_us` already reports.
 *
 * The assertion that carries the weight is the one on the stored value. The envelope
 * grants marketing, and a boundary that fell back to its default-deny snapshot would
 * read false, so a row that measures the fallback fails instead of reporting a fast
 * number about the wrong thing.
 */

import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { median } from '@c15t/benchmarking/utils';
import { createConsentClient } from '@c15t/react-native';

import { ensureReactGlobalForDist } from '../support/ensure-react-global';
import { installBenchNativeModule } from '../support/fake-native';
import {
	buildExplicitChoice,
	buildSnapshot,
	buildStoredEnvelope,
} from '../support/fixtures';
import { resetNativeStub, setNativeModule } from '../support/react-native-stub';

/** Name the native cores register the TurboModule under. */
const MODULE_NAME = 'C15t';

/** The event surface a client needs, without a real emitter. */
const silentEvents = {
	addListener: () => ({ remove: () => undefined }),
};

/**
 * The stored answer: a subject who accepted everything, on file.
 *
 * The default fixture denies marketing, so storing it would make every read agree
 * with the deny-all fallback and make the check below meaningless.
 */
export const STORED_SNAPSHOT = buildSnapshot({
	activeUI: 'none',
	effectivePermissions: {
		experience: true,
		functionality: true,
		marketing: true,
		measurement: true,
		necessary: true,
	},
	explicitChoice: buildExplicitChoice(1_769_500_000_000),
	promptRequirement: { kind: 'none', reason: 'granted' },
	revision: 7,
});

/** The envelope as a store holds it: the snapshot plus the records behind it. */
export const STORED_ENVELOPE = JSON.stringify({
	...JSON.parse(buildStoredEnvelope()),
	snapshot: STORED_SNAPSHOT,
});

const nowNs = function nowNs(): number {
	return Number(process.hrtime.bigint());
};

/**
 * Register a module that answers a snapshot read by going to the file.
 *
 * A core decodes its envelope and serialises the snapshot for the bridge, so the
 * fake does both: read the file, parse the envelope, hand the snapshot text across.
 * Nothing is memoised, so every sample pays the read.
 */
const attachStore = function attachStore(storePath: string) {
	const native = installBenchNativeModule(
		MODULE_NAME,
		setNativeModule,
		STORED_SNAPSHOT
	);

	native.getBootstrap = () =>
		JSON.stringify({
			hasStoredSnapshot: true,
			maxSupportedProtocolVersion: 1,
			minSupportedProtocolVersion: 1,
			nativeSdkVersion: 'rn->9.9.9',
			protocolVersion: 1,
			subjectId: 'sub-bench-1',
		});

	native.getSnapshot = () => {
		const envelope = JSON.parse(readFileSync(storePath, 'utf8')) as {
			snapshot: unknown;
		};
		return JSON.stringify(envelope.snapshot);
	};

	return native;
};

export interface CachedConsentResult {
	/** Store file to a readable answer, median ms. */
	coldMs: number;
	/** Bytes one store read carried, for the report detail. */
	envelopeBytes: number;
	samples: number;
	unavailable?: string;
}

/**
 * Run the cached-consent measurements.
 *
 * @param warmup - Iterations discarded before sampling.
 * @param iterations - Iterations kept.
 * @returns Medians in milliseconds, or `unavailable` with the reason.
 */
export const measureCachedConsent = function measureCachedConsent(
	warmup: number,
	iterations: number
): CachedConsentResult {
	const failed = function failed(unavailable: string): CachedConsentResult {
		return { coldMs: 0, envelopeBytes: 0, samples: 0, unavailable };
	};

	ensureReactGlobalForDist();

	const storePath = join(
		mkdtempSync(join(tmpdir(), 'c15t-bench-store-')),
		'consent.json'
	);
	writeFileSync(storePath, STORED_ENVELOPE, 'utf8');
	const envelopeBytes = Buffer.byteLength(STORED_ENVELOPE, 'utf8');

	const coldSamples: number[] = [];

	for (let index = 0; index < warmup + iterations; index += 1) {
		resetNativeStub();
		const native = attachStore(storePath);

		const startedAt = nowNs();
		const client = createConsentClient(native as never, silentEvents as never);
		const snapshot = client.getSnapshot() as {
			effectivePermissions?: Record<string, boolean>;
			ready?: boolean;
		};
		const coldMs = (nowNs() - startedAt) / 1e6;

		const readable =
			snapshot.ready === true &&
			typeof snapshot.effectivePermissions === 'object';

		if (!readable) {
			client.dispose();
			return failed('a store read never produced a readable snapshot');
		}

		if (client.isAllowed('marketing') !== true) {
			client.dispose();
			return failed(
				'the boundary answered a stored grant with a denial, so the span measured the deny-all fallback rather than the cache'
			);
		}

		client.dispose();

		if (index >= warmup) {
			coldSamples.push(coldMs);
		}
	}

	return {
		coldMs: Number(median(coldSamples).toFixed(3)),
		envelopeBytes,
		samples: coldSamples.length,
	};
};

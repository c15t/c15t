/**
 * The TurboModule the JavaScript measurements drive.
 *
 * It answers the way a device does with the network down: `getBootstrap()` and
 * `getSnapshot()` are synchronous reads of an in-memory value, `commit()`
 * applies the action, bumps the revision, and resolves without a socket. The
 * 50 ms commit budget is about exactly that path, so a fake that resolved on a
 * timer would measure the timer.
 */

import { BENCH_BOOTSTRAP, buildSnapshot } from './fixtures';
import type { BenchSnapshot } from './fixtures';

/** What the fake records, so a measurement can assert rather than assume. */
export interface BenchNativeModule {
	addListener: (eventName: string) => void;
	bootstrapCalls: number;
	commit: (intent: string) => Promise<string>;
	commitIntents: string[];
	dismissNotice: () => void;
	getBootstrap: () => string;
	getSnapshot: () => string;
	identify: (externalId: string) => Promise<void>;
	logout: () => Promise<void>;
	/** Replace the served snapshot and hand back its new revision. */
	push: (snapshot: BenchSnapshot) => number;
	refresh: () => Promise<void>;
	removeListeners: (count: number) => void;
	setOverrides: (overrides: string) => Promise<void>;
	snapshotCalls: number;
	/** Last snapshot the module would serve, as an object. */
	current: () => BenchSnapshot;
}

/**
 * Build the fake and register it under the real module name.
 *
 * @param moduleName - Registration name the bridge looks up.
 * @param initial - Snapshot to serve at first.
 * @param setModule - Registration function from the React Native stub.
 * @returns The fake module, already registered.
 */
export const installBenchNativeModule = function installBenchNativeModule(
	moduleName: string,
	setModule: (name: string, module: unknown) => void,
	initial: BenchSnapshot = buildSnapshot()
): BenchNativeModule {
	let snapshot = initial;
	let bootstrap = BENCH_BOOTSTRAP;

	const fake: BenchNativeModule = {
		addListener: () => undefined,
		bootstrapCalls: 0,
		commit: (intent: string) => {
			fake.commitIntents.push(intent);
			snapshot = {
				...snapshot,
				activeUI: 'none',
				explicitChoice: {
					action: 'accept',
					actionAt: snapshot.evaluatedAt + 25,
					consents: {
						experience: true,
						functionality: true,
						marketing: true,
						measurement: true,
					},
				},
				promptRequirement: { kind: 'choice', reason: 'standing' },
				revision: snapshot.revision + 1,
			};

			return Promise.resolve(
				JSON.stringify({
					confirmed: [
						'necessary',
						'functionality',
						'experience',
						'measurement',
						'marketing',
					],
					ok: true,
					queued: false,
					revision: snapshot.revision,
					subjectId: 'sub-bench-1',
				})
			);
		},
		commitIntents: [],
		current: () => snapshot,
		dismissNotice: () => undefined,
		getBootstrap: () => {
			fake.bootstrapCalls += 1;
			return JSON.stringify(bootstrap);
		},
		getSnapshot: () => {
			fake.snapshotCalls += 1;
			return JSON.stringify(snapshot);
		},
		identify: () => Promise.resolve(),
		logout: () => Promise.resolve(),
		push: (next: BenchSnapshot) => {
			snapshot = next;
			return next.revision;
		},
		refresh: () => Promise.resolve(),
		removeListeners: () => undefined,
		setOverrides: () => Promise.resolve(),
		snapshotCalls: 0,
	};

	setModule(moduleName, fake);

	// Keep the handshake reachable for a run that wants to change it.
	Object.defineProperty(fake, 'bootstrap', {
		get: () => bootstrap,
		set: (value: unknown) => {
			bootstrap = value as typeof BENCH_BOOTSTRAP;
		},
	});

	return fake;
};

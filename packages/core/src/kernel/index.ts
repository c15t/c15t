/**
 * Pure consent kernel.
 *
 * The kernel is the single source of truth for consent state. It owns
 * a frozen snapshot, a snapshot-listener set, and a typed event bus.
 * Concerns are split across siblings:
 *
 * - `snapshot.ts`             — initial-state construction + freezing.
 * - `patch.ts`                — `SnapshotPatch` shape + pure derivation.
 * - `records.ts`              — validation for hydration records.
 * - `runtime.ts`              — commit, hydrate, refresh, timers, GPC directive.
 * - `apply-init-response.ts`  — pure transport-response folder.
 * - `setters.ts`              — `kernel.set.*` (sync mutators).
 * - `commands.ts`             — `kernel.commands.*` (async I/O).
 * - `events.ts`               — typed event bus.
 *
 * Invariants:
 * - `createConsentKernel()` has zero side effects. No window writes, no
 *   DOM observers, no network, no localStorage, no hashing, no timers.
 * - `getSnapshot()` is non-allocating in the steady state and derived
 *   fields keep their reference when their value did not change.
 * - Only `commands.save()` records an explicit choice. Hydration,
 *   initialization, setters, elapsed time and privacy signals change
 *   permissions at most, never the choice.
 * - Timers and browser listeners are installed by lifecycle commands
 *   (`init`, `hydrate`) and removed by `dispose()`.
 */
import type { ConsentKernel, KernelConfig } from '../types';
import { buildCommands } from './commands';
import { createEventBus } from './events';
import { createRuntime } from './runtime';
import { buildSetters } from './setters';
import { buildDraft, buildInitialSnapshot } from './snapshot';

/**
 * Create a fresh consent kernel.
 *
 * Pure: takes plain config, returns a kernel handle. No I/O. See the
 * file-level invariants above for guarantees.
 */
export const createConsentKernel = function createConsentKernel(
	config: KernelConfig = {}
): ConsentKernel {
	const { transport } = config;
	const eventBus = createEventBus();
	const initialSnapshot = buildInitialSnapshot(config);
	// The revision-0 snapshot, held immutably. This is what a server render
	// saw, so hydration-time consumers can render exactly what the server
	// rendered even when client boot mutations land before hydration completes.
	const serverSnapshot = initialSnapshot;

	const runtime = createRuntime({
		emit: eventBus.emit,
		initialDraft: buildDraft(config.initialDraft),
		initialSnapshot,
		transport,
	});
	const set = buildSetters(runtime);
	const commandHandle = buildCommands({
		initRetry: config.initRetry,
		runtime,
		transport,
	});

	return {
		commands: commandHandle.commands,
		dispose: commandHandle.dispose,
		events: {
			emit: eventBus.emit,
			on: eventBus.on,
		},
		getRecordsGeneration: runtime.getGeneration,
		getServerSnapshot: () => serverSnapshot,
		getSnapshot: runtime.getSnapshot,
		hydrate: runtime.hydrate,
		refresh: runtime.refresh,
		set,
		subscribe: runtime.subscribe,
	};
};

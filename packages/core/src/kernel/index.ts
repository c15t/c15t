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
 * - `runtime.ts`              — commit, hydrate, refresh, timers, GPC detection.
 * - `apply-init-response.ts`  — pure transport-response folder.
 * - `setters.ts`              — `kernel.set.*` (sync mutators).
 * - `commands.ts`             — `kernel.commands.*` (async I/O).
 * - `save-outbox/`            — sending recorded choices, the replay queue
 *                               and its storage seam.
 * - `events.ts`               — typed event bus.
 * - `dispatch.ts`             — ordered, isolated listener delivery.
 *
 * Invariants:
 * - `createConsentKernel()` has zero side effects. No window writes, no
 *   DOM observers, no network, no localStorage, no hashing, no timers.
 *   Storage is reached only through the save outbox's store, and only when
 *   a save fails, a replay runs or the records are cleared.
 * - `getSnapshot()` is non-allocating in the steady state and derived
 *   fields keep their reference when their value did not change.
 * - Only `commands.save()` records an explicit choice. Hydration,
 *   initialization, setters, elapsed time and privacy signals change
 *   permissions at most, never the choice.
 * - Timers and browser listeners are installed by lifecycle commands
 *   (`init`, `hydrate`) and removed by `dispose()`.
 * - Subscribers and event listeners are notified synchronously, in commit
 *   order. A throwing listener is reported and never fails the command or
 *   hides the change from other listeners. A commit's follow-up event is
 *   delivered before any transition a listener starts in response.
 */
import type { ConsentKernel, KernelConfig } from '../types';
import { buildCommands } from './commands';
import { createDispatcher } from './dispatch';
import { createEventBus } from './events';
import { createRuntime } from './runtime';
import { createBrowserOutboxStore, createSaveOutbox } from './save-outbox';
import type { SaveOutboxOptions } from './save-outbox';
import type { SaveOutboxStore } from './save-outbox/store';
import { buildSetters } from './setters';
import { buildDraft, buildInitialSnapshot } from './snapshot';

/**
 * Seams a kernel is assembled with.
 *
 * Typed without the outbox's own interfaces: the published declarations of
 * this file then name only the store, and the outbox, snapshot-cell and
 * dispatcher declarations stay out of the package.
 */
export interface KernelSeams {
	/**
	 * Where the save outbox keeps queued saves. Defaults to the browser
	 * store (localStorage under a Web Lock, memory without localStorage).
	 */
	outboxStore?: SaveOutboxStore;
	/**
	 * Loads the outbox's queue module (`./save-outbox/queue`), which is
	 * code-split. Defaults to a dynamic import of it.
	 */
	loadOutboxQueue?: () => Promise<unknown>;
}

/**
 * Assemble a kernel with explicit seams. Tests pass an in-memory outbox
 * store so two kernels can share one queue the way two tabs do.
 *
 * @internal
 */
export const createKernel = function createKernel(
	config: KernelConfig = {},
	seams: KernelSeams = {}
): ConsentKernel {
	const { transport } = config;
	const dispatcher = createDispatcher();
	const eventBus = createEventBus(dispatcher);
	const initialSnapshot = buildInitialSnapshot(config);
	// The revision-0 snapshot, held immutably. This is what a server render
	// saw, so hydration-time consumers can render exactly what the server
	// rendered even when client boot mutations land before hydration completes.
	const serverSnapshot = initialSnapshot;

	const runtime = createRuntime({
		dispatcher,
		emit: eventBus.emit,
		initialDraft: buildDraft(config.initialDraft),
		initialSnapshot,
	});
	const set = buildSetters(runtime, config);
	const outbox = createSaveOutbox({
		// Tests pass `() => import('./save-outbox/queue')` or a fake of it.
		loadQueue: seams.loadOutboxQueue as SaveOutboxOptions['loadQueue'],
		// oxlint-disable-next-line no-use-before-define -- Called only after a send, once the commands exist.
		retryWhenOnline: () => commandHandle.retryWhenOnline(),
		runtime,
		store: seams.outboxStore ?? createBrowserOutboxStore(),
		transport,
	});
	// Every way of clearing the visitor's records announces it here, with or
	// without persistence, so queued saves of the cleared subject never
	// replay into the new history.
	eventBus.on('records:cleared', () => {
		void outbox.clear();
	});
	const commandHandle = buildCommands({
		initRetry: config.initRetry,
		outbox,
		runtime,
		translationOverrides: config.translationOverrides,
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
		markLive: runtime.markLive,
		refresh: runtime.refresh,
		set,
		subscribe: runtime.subscribe,
	};
};

/**
 * Create a fresh consent kernel.
 *
 * Pure: takes plain config, returns a kernel handle. No I/O. See the
 * file-level invariants above for guarantees.
 */
export const createConsentKernel: (config?: KernelConfig) => ConsentKernel =
	createKernel;

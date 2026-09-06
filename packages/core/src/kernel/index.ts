/**
 * Pure consent kernel.
 *
 * The kernel is the single source of truth for consent state. It owns
 * a frozen snapshot, a snapshot-listener set, and a typed event bus.
 * Concerns are split across siblings:
 *
 * - `snapshot.ts`             — initial-state construction + freezing.
 * - `patch.ts`                — `SnapshotPatch` shape + pure `advance`.
 * - `apply-init-response.ts`  — pure transport-response folder.
 * - `setters.ts`              — `kernel.set.*` (sync mutators).
 * - `commands.ts`             — `kernel.commands.*` (async I/O).
 * - `events.ts`               — typed event bus.
 *
 * Invariants:
 * - `createConsentKernel()` has zero side effects. No window writes,
 *   no DOM observers, no network, no localStorage. Enforced by the
 *   kernel tests in `packages/core/src/kernel/__tests__/`.
 * - `getSnapshot()` is non-allocating in the steady state — returns
 *   the current frozen snapshot by reference. Adapters can use `===`
 *   to bail out of work cheaply.
 * - `set.*` methods are synchronous. They produce a new frozen
 *   snapshot (with structural sharing where possible) and notify
 *   subscribers in insertion order. Notification cost is O(n) in
 *   subscribers.
 * - `commands.*` are async I/O boundaries. Retry listeners and failed-save
 *   storage are installed lazily after a command runs, never at construction.
 */
import type {
	ConsentKernel,
	ConsentSnapshot,
	KernelConfig,
	Listener,
} from '../types';
import { buildCommands } from './commands';
import { createEventBus } from './events';
import { applyPatch } from './patch';
import { buildSetters } from './setters';
import { buildInitialSnapshot } from './snapshot';

/**
 * Create a fresh consent kernel.
 *
 * Pure: takes plain config, returns a kernel handle. No I/O. The handle
 * exposes `getSnapshot()`, `subscribe()`, `set.*`, `commands.*`, `events.*`,
 * and `dispose()`. See the file-level invariants above for guarantees.
 */
export const createConsentKernel = function createConsentKernel(
	config: KernelConfig = {}
): ConsentKernel {
	const { transport } = config;

	let snapshot: ConsentSnapshot = buildInitialSnapshot(config);
	// The revision-0 snapshot, held immutably. This is what a server render
	// saw (no persistence hydrate, no init application run server-side), so
	// hydration-time consumers (React's useSyncExternalStore
	// getServerSnapshot) can render EXACTLY what the server rendered even
	// when client boot mutations (sync persistence hydrate, eager init)
	// land before hydration completes. Without it, a mid-hydration state
	// flip strands server-rendered consent UI as unowned DOM.
	const serverSnapshot: ConsentSnapshot = snapshot;
	const snapshotListeners = new Set<Listener<ConsentSnapshot>>();
	const eventBus = createEventBus();

	const getSnapshot = () => snapshot;
	const getServerSnapshot = () => serverSnapshot;

	const notifySnapshot = function notifySnapshot(): void {
		for (const listener of snapshotListeners) {
			listener(snapshot);
		}
	};

	const advance = function advance(
		patch: Parameters<typeof applyPatch>[1]
	): void {
		snapshot = applyPatch(snapshot, patch);
		notifySnapshot();
	};

	const set = buildSetters({ advance, emit: eventBus.emit, getSnapshot });
	const commandHandle = buildCommands({
		advance,
		emit: eventBus.emit,
		getSnapshot,
		initRetry: config.initRetry,
		transport,
	});

	return {
		commands: commandHandle.commands,
		dispose: commandHandle.dispose,
		events: {
			emit: eventBus.emit,
			on: eventBus.on,
		},
		getServerSnapshot,
		getSnapshot,
		set,
		subscribe(listener) {
			snapshotListeners.add(listener);
			return () => {
				snapshotListeners.delete(listener);
			};
		},
	};
};

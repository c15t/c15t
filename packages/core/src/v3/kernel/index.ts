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
 *   v3 correctness-gate tests in
 *   `packages/core/src/__tests__/v3-correctness-gates.test.ts`.
 * - `getSnapshot()` is non-allocating in the steady state — returns
 *   the current frozen snapshot by reference. Adapters can use `===`
 *   to bail out of work cheaply.
 * - `set.*` methods are synchronous. They produce a new frozen
 *   snapshot (with structural sharing where possible) and notify
 *   subscribers in insertion order. Notification cost is O(n) in
 *   subscribers.
 * - `commands.*` are async but still do not touch browser globals.
 *   Network calls, DOM mutations, and localStorage live in opt-in
 *   boot modules under `c15t/v3/modules/*`.
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
 * exposes `getSnapshot()`, `subscribe()`, `set.*`, `commands.*`, and
 * `events.*`. See the file-level invariants above for guarantees.
 */
export function createConsentKernel(config: KernelConfig = {}): ConsentKernel {
	const transport = config.transport;

	let snapshot: ConsentSnapshot = buildInitialSnapshot(config);
	const snapshotListeners = new Set<Listener<ConsentSnapshot>>();
	const eventBus = createEventBus();

	const getSnapshot = () => snapshot;

	function notifySnapshot(): void {
		for (const listener of snapshotListeners) {
			listener(snapshot);
		}
	}

	function advance(patch: Parameters<typeof applyPatch>[1]): void {
		snapshot = applyPatch(snapshot, patch);
		notifySnapshot();
	}

	const set = buildSetters({ getSnapshot, advance, emit: eventBus.emit });
	const commands = buildCommands({
		getSnapshot,
		advance,
		emit: eventBus.emit,
		transport,
	});

	return {
		getSnapshot,
		subscribe(listener) {
			snapshotListeners.add(listener);
			return () => {
				snapshotListeners.delete(listener);
			};
		},
		set,
		commands,
		events: {
			on: eventBus.on,
			emit: eventBus.emit,
		},
	};
}

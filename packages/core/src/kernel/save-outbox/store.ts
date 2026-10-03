/**
 * Storage seam of the save outbox.
 *
 * The outbox keeps two lists: saves waiting for a replay and subject
 * reassignments. A store holds them and gives the outbox exclusive access
 * for one read-modify-write at a time. The outbox owns what the lists mean
 * and validates whatever a store hands back; a store only keeps the values
 * and serializes access to them.
 *
 * Adapters:
 * - {@link createBrowserOutboxStore}: localStorage under a Web Lock, shared
 *   by every tab of the origin. The default.
 * - {@link createMemoryOutboxStore}: one in-memory copy, shared by every
 *   kernel given the same store. Tests, and the browser store's fallback
 *   without localStorage.
 */

import {
	PENDING_SAVES_STORAGE_KEY,
	SUBJECT_REASSIGNMENTS_STORAGE_KEY,
} from '../../libs/storage-keys';

/** The lists a store keeps. */
export type OutboxSlot = 'saves' | 'reassignments';

/** Access to the stored lists inside one {@link SaveOutboxStore.transact}. */
export interface OutboxTransaction {
	/**
	 * The stored value: `undefined` when nothing is stored, `null` when the
	 * stored data cannot be read. Never trusted; the outbox validates it.
	 */
	read: (slot: OutboxSlot) => unknown;
	/**
	 * Store a list. An empty list removes the slot. A failed write is
	 * swallowed: the choice is recorded locally whether or not the outbox
	 * can keep it.
	 */
	write: (slot: OutboxSlot, value: readonly unknown[]) => void;
}

/**
 * Where the outbox keeps its lists.
 *
 * Invariants every adapter keeps:
 * - Transactions on one store never interleave, including transactions
 *   from different kernels (and, for the browser adapter, different tabs)
 *   sharing it. Each one sees the writes of every transaction before it.
 * - `run` is synchronous and does not throw. The outbox never holds a
 *   transaction open across a network call.
 * - `transact` resolves with what `run` returned and never rejects.
 */
export interface SaveOutboxStore {
	transact: <Result>(run: (tx: OutboxTransaction) => Result) => Promise<Result>;
}

/** The part of `Storage` a store uses. */
type TextStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

/** Browser globals the browser store reads, injectable for its own tests. */
export interface BrowserOutboxEnvironment {
	localStorage: () => TextStorage | null;
	locks: () => LockManager | null;
}

const browserEnvironment: BrowserOutboxEnvironment = {
	localStorage() {
		try {
			return typeof window === 'undefined' ? null : window.localStorage;
		} catch {
			return null;
		}
	},
	locks() {
		try {
			const locks =
				typeof navigator === 'undefined'
					? undefined
					: (navigator as Partial<Navigator>).locks;
			return locks && typeof locks.request === 'function' ? locks : null;
		} catch {
			return null;
		}
	},
};

const SLOT_KEYS: Record<OutboxSlot, string> = {
	reassignments: SUBJECT_REASSIGNMENTS_STORAGE_KEY,
	saves: PENDING_SAVES_STORAGE_KEY,
};

/**
 * The outbox store every tab of an origin shares: JSON arrays in
 * localStorage under `c15t-v3-pending-consent-saves:v1` and
 * `c15t-v3-subject-reassignments:v1`, the keys earlier releases wrote, so
 * saves a visitor queued before an upgrade still replay.
 *
 * Every transaction holds the Web Lock named after the saves key, so two
 * tabs cannot overwrite each other's entries or replay one twice. Without
 * the Web Locks API, or when the lock request fails (insecure context,
 * aborted request), a transaction runs unsynchronized rather than being
 * dropped. Without localStorage (server, blocked storage) the store falls
 * back to memory for this kernel.
 *
 * Globals are read on every transaction, never at creation.
 */
export const createBrowserOutboxStore = function createBrowserOutboxStore(
	environment: BrowserOutboxEnvironment = browserEnvironment
): SaveOutboxStore {
	const values = new Map<string, string>();
	const memory: TextStorage = {
		getItem: (key) => values.get(key) ?? null,
		removeItem: (key) => {
			values.delete(key);
		},
		setItem: (key, value) => {
			values.set(key, value);
		},
	};
	return {
		async transact(run) {
			const storage = environment.localStorage() ?? memory;
			const tx: OutboxTransaction = {
				read(slot) {
					try {
						const text = storage.getItem(SLOT_KEYS[slot]);
						return text === null ? undefined : JSON.parse(text);
					} catch {
						return null;
					}
				},
				write(slot, value) {
					try {
						if (value.length === 0) {
							storage.removeItem(SLOT_KEYS[slot]);
						} else {
							storage.setItem(SLOT_KEYS[slot], JSON.stringify(value));
						}
					} catch {
						// Blocked or full storage: the choice is still recorded locally.
					}
				},
			};
			const locks = storage === memory ? null : environment.locks();
			if (!locks) {
				return run(tx);
			}
			try {
				return await locks.request(PENDING_SAVES_STORAGE_KEY, () => run(tx));
			} catch {
				return run(tx);
			}
		},
	};
};

/**
 * An outbox store held in memory: the browser store's own fallback, with no
 * localStorage. Kernels given the same store share it the way tabs share
 * the browser store, which is how tests run two tabs against one queue.
 * Transactions are synchronous, so each one runs alone; values are kept
 * serialized, so nothing the outbox reads back aliases an object it wrote.
 */
export const createMemoryOutboxStore =
	function createMemoryOutboxStore(): SaveOutboxStore {
		return createBrowserOutboxStore({
			localStorage: () => null,
			locks: () => null,
		});
	};

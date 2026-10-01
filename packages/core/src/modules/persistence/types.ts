/**
 * Shared types for the persistence module.
 */

import type { StorageConfig } from '../../libs/cookie';
import type { ConsentKernel } from '../../types';

export type { StorageConfig };

export interface PersistenceOptions {
	kernel: ConsentKernel;
	/**
	 * Cookie + storage configuration. Forwarded to the storage layer; any
	 * option the cookie library accepts is accepted here.
	 */
	storageConfig?: StorageConfig;
	/**
	 * Skip the initial hydration pass. Useful when the adapter has
	 * already seeded the kernel from an SSR record seed.
	 */
	skipHydration?: boolean;
	/**
	 * Clock used for reads and writes. Defaults to `Date.now`. Tests and
	 * server renders pass a fixed time.
	 */
	now?: () => number;
	/**
	 * Reconcile automatically with records other runtimes store. Defaults
	 * to `true`.
	 *
	 * While mounted in a browser, the module schedules
	 * {@link PersistenceHandle.reconcile} when another tab or window of the
	 * same origin changes a c15t localStorage key (the `storage` event), when
	 * the page becomes visible again, and when the window regains focus.
	 * Bursts coalesce into one reconciliation in a later macrotask.
	 * `dispose()` removes every listener and cancels a scheduled run.
	 *
	 * Set `false` to reconcile only when you call `reconcile()` yourself.
	 */
	sync?: boolean;
}

export interface PersistenceHandle {
	dispose: () => void;
	/**
	 * Re-run hydration from storage. Returns whether any record was found.
	 * Unreadable records preserve their in-memory values; readable empty
	 * storage clears them.
	 */
	hydrate: () => boolean;
	/**
	 * Bring the kernel in line with records another runtime stored, for
	 * example a denial saved or records cleared in another tab.
	 *
	 * Order: writes this module still has queued land first, so the read
	 * that follows never reverts this runtime's latest action. Storage is
	 * then read once and merged with the kernel's records:
	 *
	 * - category decisions merge per category; each keeps the decision with
	 *   the newer confirmation time;
	 * - the notice dismissal and the vendor record are replaced by a stored
	 *   one at least as new, and kept when the stored one is older;
	 * - a record removed from readable storage since this runtime last read
	 *   or wrote it is cleared, so the active policy decides again (for
	 *   example, an opt-in policy denies). A record the kernel holds but
	 *   storage never had, such as a receipt merged from the server, stays;
	 * - storage that cannot be read, or bytes that do not decode, leave the
	 *   in-memory record as is, so a failed read never grants anything.
	 *
	 * Differences are applied through `kernel.hydrate()`: validated, never
	 * written back, evaluated for expiry by the consent evaluator, and
	 * announced to subscribers and `permissions:changed` listeners once. A
	 * save still in flight whose choice changed is superseded, as with any
	 * hydration.
	 *
	 * Queued writes follow the same rules: a choice write stores the
	 * per-category merge with what storage holds, a notice or vendor write
	 * never replaces a newer stored record, and the rewrite that adds a
	 * server-resolved subject id never recreates a cleared record.
	 *
	 * @returns Whether any in-memory record changed. Always `false` outside
	 * the browser and after `dispose()`.
	 */
	reconcile: () => boolean;
	/**
	 * Cancel queued writes, clear every c15t record (choice, notice, vendors,
	 * their cookie projections, the legacy `<key>-privacy` record an earlier
	 * v3 alpha may have stored, and the queued backend replays) and reset
	 * the kernel's in-memory records.
	 */
	clear: () => void;
}

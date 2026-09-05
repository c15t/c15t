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
}

export interface PersistenceHandle {
	dispose: () => void;
	/** Re-run hydration from storage. Returns whether any record was found. */
	hydrate: () => boolean;
	/**
	 * Cancel queued writes, clear every c15t record (choice, notice, privacy,
	 * their cookie projections and the queued backend replays) and reset the
	 * kernel's in-memory records.
	 */
	clear: () => void;
}

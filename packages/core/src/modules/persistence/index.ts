/**
 * `@c15t/core/modules/persistence`
 *
 * Kernel-consuming persistence module. Reads stored records on mount
 * (`hydrate`) and writes back on explicit kernel events.
 *
 * Concerns are split across siblings:
 * - `types.ts`          — public type definitions.
 * - `record-codec.ts`   — versioned decoders for every stored record.
 * - `record-storage.ts` — raw candidate reads and selection.
 * - `hydrate.ts`        — read path and the SSR seed reader.
 * - `clear.ts`          — removing every record and storing the clear epoch.
 * - `index.ts`          — this file: the public entry.
 * - `mount.ts`          — hydration, event wiring, lifecycle.
 * - `writer-loader.ts`  — loads and preloads the write code.
 * - `writer/`           — everything else that runs after a choice or a
 *                         later event: encoders, storage writes, the write
 *                         scheduler and reconciliation. Loaded on demand;
 *                         `tools.ts` passes it what it calls here.
 *
 * Invariants:
 * - Hydration runs synchronously inside `createPersistence` so the
 *   caller can block first paint until stored records are applied. It
 *   reads cookies and localStorage, so call it in the browser only.
 * - Hydration is read-only and never creates a choice. Kernel changes it
 *   causes never schedule a write, so startup does not renew a receipt or
 *   recreate a missing cookie or localStorage mirror. A `hydrate()` call
 *   flushes any queued write first.
 * - Choice envelope writes follow `choice:recorded` and `subject:resolved`.
 *   The vendor record follows `subject:resolved` too, since it carries the
 *   subject for a visitor with no category choice yet.
 *   A canonical subject acknowledgement preserves every receipt timestamp.
 *   Separate writes follow
 *   `notice:dismissed` (the notice record and its cookie projection) and
 *   `vendors:recorded` (the vendor denial list and its cookie projection).
 *   Permission changes, policy changes, elapsed time and the live GPC
 *   signal never write.
 * - A recorded choice is stored before its save request leaves: writes
 *   are scheduled from the commit's listeners and run in the next macrotask,
 *   which the save outbox waits out before it sends (see
 *   `writer/schedule.ts`). Until the write code has loaded, the listener
 *   holds the request with `kernel.holdSaves()` instead, and the write runs
 *   as soon as the code lands, before the hold is released.
 * - A write is never taken as stored before it is. When the write code
 *   fails to load, the save stays held: its request does not leave, and
 *   nothing waiting for its completion (a revocation reload) runs while
 *   storage still holds the record it replaces. The load is retried after
 *   1, 4 and 16 seconds and on every later event that needs it.
 * - Nothing is lost while the write code loads. Writes, a `reconcile()` and
 *   the sync listeners' reconciliations requested before it lands run when
 *   it lands, in that order. So do writes requested before `dispose()`.
 * - A handle mounted while another handle's writes for the same storage
 *   key wait for the write code (a provider remounted right after a
 *   choice) hydrates from that handle's kernel records instead of the
 *   storage those writes have not reached, including a revocation. Its
 *   writer still starts from storage. A write from the new handle
 *   supersedes the queued ones, and when they land they keep the newer
 *   decision per category like every write. `clear()` drops them.
 * - The write code starts loading on the first write or reconciliation, or,
 *   once a banner or dialog has been shown, on a press, key or focus inside
 *   one, or in idle time three seconds after the page's load event,
 *   whichever comes first. Once loaded it serves every later handle
 *   synchronously. Script-tag builds bundle it and swap in
 *   `writer-loader-static.ts`.
 * - `clear()` needs no write code: it clears the kernel's records and
 *   storage, and stores the clear epoch, before it returns, so a reload
 *   right after it cannot restore a cleared grant. It cancels queued writes
 *   first, so a pending flush cannot recreate what was just cleared. Its
 *   `records:cleared` event makes the kernel drop its queued saves.
 * - Writes and `reconcile()` follow the ordering rules in
 *   `writer/reconcile.ts`: choices merge per category, a notice or vendor
 *   write never replaces a newer stored record, a subject-only rewrite
 *   never recreates a cleared one, and reconciliation lands queued writes
 *   before it reads.
 * - With `sync` on (the default), `storage`, `visibilitychange` and `focus`
 *   schedule one coalesced `reconcile()`. `pagehide` runs queued writes at
 *   once, so leaving the page does not drop a write still waiting for its
 *   macrotask. `dispose()` removes the listeners and cancels the scheduled
 *   run.
 */
import { STORAGE_KEY_V2 } from '../../libs/storage-keys';
import { mountPersistence } from './mount';
import type { PersistenceHandle, PersistenceOptions } from './types';

export type {
	PersistenceHandle,
	PersistenceOptions,
	StorageConfig,
} from './types';
export {
	readStoredRecords,
	readStoredRecordsFromCookieHeader,
} from './hydrate';
export type { StoredRecords } from './hydrate';
export type {
	StoredIabMetadata,
	StoredConsentEnvelope,
	StoredVendorChoice,
} from './record-codec';
export { resolveStorageKeys } from './record-storage';

export const CONSENT_STORAGE_KEY = STORAGE_KEY_V2;

/**
 * Mount persistence on a kernel: hydrate it from storage now, and store its
 * records after the kernel's events from then on.
 *
 * @param options - Kernel, storage configuration, clock and sync.
 * @returns The handle.
 */
export const createPersistence: (
	options: PersistenceOptions
) => PersistenceHandle = mountPersistence;

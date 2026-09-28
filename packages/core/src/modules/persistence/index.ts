import type {
	CategoryDecision,
	ConsentSubject,
	ExplicitChoice,
	PrivacyOptOut,
} from '../../consent-record/types';
/**
 * `@c15t/core/modules/persistence`
 *
 * Kernel-consuming persistence module. Reads stored records on mount
 * (`hydrate`) and writes back on explicit kernel events.
 *
 * Concerns are split across siblings:
 * - `types.ts`          — public type definitions.
 * - `record-codec.ts`   — versioned codecs for every stored record.
 * - `record-storage.ts` — raw candidate reads, selection, writes, clear.
 * - `hydrate.ts`        — read path and the SSR seed reader.
 * - `write.ts`          — write path.
 * - `schedule.ts`       — macrotask-debounced write scheduler.
 * - `index.ts`          — this file: subscription wiring + lifecycle.
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
 *   `notice:dismissed` (the notice record and its cookie projection),
 *   `privacy:opt-out` (the privacy record and its cookie projection) and
 *   `vendors:recorded` (the vendor denial list and its cookie projection).
 *   Permission changes, policy changes and elapsed time never write.
 * - `clear()` cancels queued writes before it removes storage, so a
 *   pending flush cannot recreate what was just cleared.
 * - Writes and `reconcile()` follow the ordering rules in `reconcile.ts`:
 *   choices merge per category and directives as a union, a notice or
 *   vendor write never replaces a newer stored record, a subject-only
 *   rewrite never recreates a cleared one, and reconciliation lands queued
 *   writes before it reads.
 * - With `sync` on (the default), `storage`, `visibilitychange` and `focus`
 *   schedule one coalesced `reconcile()`. `dispose()` removes the
 *   listeners and cancels the scheduled run.
 */
import { STORAGE_KEY_V2 } from '../../libs/storage-keys';
import type { ConsentSnapshot, HydrationRecords } from '../../types';
import { directiveIdentity, mergeDirectives } from './directives';
import {
	choiceSinceEpoch,
	directivesSinceEpoch,
	noticeSinceEpoch,
	vendorChoiceSinceEpoch,
} from './epoch';
import { hydrateFromStorage, readStoredRecordsForReconcile } from './hydrate';
import {
	choiceToWrite,
	directivesToWrite,
	fingerprintStoredRecords,
	mayWriteNotice,
	mayWriteVendorChoice,
	sameRecord,
	selectReconciledRecords,
	subjectToWrite,
} from './reconcile';
import type { StorageFingerprints, StoredRecordKind } from './reconcile';
import { EPOCH_CLOCK_TOLERANCE_MS } from './record-codec';
import type { StoredIabMetadata } from './record-codec';
import {
	clearStoredConsentRecords,
	readStoredClearEpoch,
	readStoredVendorChoice,
	resolveStorageKeys,
	writeStoredClearEpoch,
} from './record-storage';
import { createWriteScheduler } from './schedule';
import type { PersistenceHandle, PersistenceOptions } from './types';
import {
	writeChoiceToStorage,
	writeNoticeToStorage,
	writePrivacyToStorage,
	writeVendorChoiceToStorage,
} from './write';

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

export const createPersistence = function createPersistence(
	options: PersistenceOptions
): PersistenceHandle {
	const { kernel, storageConfig } = options;
	const now = options.now ?? (() => Date.now());

	// IAB transport metadata carried by the stored record. Preserved on the
	// next explicit save so an envelope rewrite never drops it.
	let storedIab: StoredIabMetadata | null = null;

	// What storage held when this runtime last read or wrote each record.
	// Reconciliation acts only on records that changed since.
	let seen: StorageFingerprints = {};
	// Records this runtime wrote with parts taken from storage that memory
	// does not hold yet. The next reconciliation treats them as changed.
	const unadopted = new Set<StoredRecordKind>();
	// Category decisions and directives this runtime has stored. Another
	// tab can read storage before one of these writes lands and then write
	// over it; reconciliation writes back any it finds missing.
	const ownDecisions = new Map<
		string,
		{ decision: CategoryDecision; epoch: number }
	>();
	const ownDirectives = new Map<string, PrivacyOptOut>();
	// Whether a decision was recorded since the last write. Without one, a
	// scheduled write only acknowledges the server's subject id.
	let choiceRecorded = false;
	let vendorsRecorded = false;
	let disposed = false;
	// The subject id storage held at the last readable read or write, and
	// the id a save generated because this runtime held none. An in-memory
	// id equal to either yields to a stored subject; any other one came from
	// the server and is kept.
	let seenSubjectId: string | null | undefined;
	// The clear epoch the records in memory belong to. A stored epoch past
	// it means another runtime cleared the records since.
	let memoryEpoch = 0;
	let freshSubjectId: string | undefined;
	// When the save that generated `freshSubjectId` acted.
	let freshSubjectAt: number | undefined;
	let subjectBeforeSave: string | undefined;

	const rememberSubject = function rememberSubject(
		records: HydrationRecords
	): void {
		if (records.choice !== undefined) {
			seenSubjectId = records.subject?.subjectId ?? null;
		}
	};

	const subjectYields = function subjectYields(): boolean {
		const id = kernel.getSnapshot().subject?.subjectId;
		return !id || id === freshSubjectId || id === seenSubjectId;
	};

	const observe = function observe(kind?: StoredRecordKind): void {
		if (typeof document === 'undefined') {
			return;
		}
		const read = readStoredRecordsForReconcile(storageConfig, now());
		const prints = fingerprintStoredRecords(read);
		if (kind) {
			seen[kind] = prints[kind];
		} else {
			seen = prints;
		}
		if (kind === undefined || kind === 'choice') {
			rememberSubject(read.records);
		}
		if (kind === undefined) {
			memoryEpoch = read.epoch;
		}
	};

	const noteGeneratedSubject = function noteGeneratedSubject(
		snapshot: ConsentSnapshot,
		actionAt: number
	): void {
		const id = snapshot.subject?.subjectId;
		if (id && !subjectBeforeSave) {
			freshSubjectId = id;
			freshSubjectAt = actionAt;
		}
	};

	/**
	 * Whether the subject in memory was generated by a save made after
	 * `epoch`. Such a subject belongs to the post-clear history even when
	 * this runtime missed the clear, so it is kept.
	 */
	const subjectBornAfter = function subjectBornAfter(epoch: number): boolean {
		const id = kernel.getSnapshot().subject?.subjectId;
		return (
			id !== undefined &&
			id === freshSubjectId &&
			freshSubjectAt !== undefined &&
			freshSubjectAt > epoch
		);
	};

	type StoredRead = ReturnType<typeof readStoredRecordsForReconcile>;

	/**
	 * Whether storage holds something for a record that memory lacks: another
	 * runtime changed it since this runtime last saw it, or this runtime's
	 * own merged write took parts of it from storage. Such a record wins a
	 * tie with a queued write and blocks a subject-only rewrite.
	 */
	const changedSinceSeen = function changedSinceSeen(
		kind: StoredRecordKind,
		read: StoredRead
	): boolean {
		const print = fingerprintStoredRecords(read)[kind];
		return (print !== undefined && print !== seen[kind]) || unadopted.has(kind);
	};

	/**
	 * Mark a record after writing it. The record is seen as written, so a
	 * later removal is recognised as one. A write that took anything from
	 * storage is also marked unadopted: memory lacks part of it, so the next
	 * reconciliation treats it as changed and brings the merge into memory.
	 */
	const markWritten = function markWritten(
		kind: StoredRecordKind,
		wroteOwnState: boolean
	): void {
		observe(kind);
		if (wroteOwnState) {
			unadopted.delete(kind);
		} else {
			unadopted.add(kind);
		}
	};

	/**
	 * The subject a write stores. After a clear this runtime missed, a
	 * subject from before it belongs to the cleared history: only what
	 * storage holds now is kept, or none. A subject a save generated after
	 * the clear follows the usual rules.
	 */
	const writtenSubject = function writtenSubject(
		snapshot: ConsentSnapshot,
		stored: ConsentSubject | null | undefined,
		subjectOnly: boolean,
		read: StoredRead
	): ConsentSubject | null {
		if (subjectOnly) {
			return snapshot.subject;
		}
		if (read.epoch > memoryEpoch && !subjectBornAfter(read.epoch)) {
			return stored ?? null;
		}
		return subjectToWrite(snapshot.subject, stored, subjectYields());
	};

	// Every write reads storage first and voids what this runtime holds from
	// before the stored clear epoch, so a runtime that missed a clear can
	// only write decisions made after it.
	const choiceWrites = createWriteScheduler(() => {
		const subjectOnly = !choiceRecorded;
		choiceRecorded = false;
		const snapshot = kernel.getSnapshot();
		const at = now();
		const read = readStoredRecordsForReconcile(storageConfig, at);
		const clearMissed = read.epoch > memoryEpoch;
		const stored = read.records.choice ?? null;
		const explicitChoice =
			subjectOnly && clearMissed
				? null
				: choiceToWrite(
						choiceSinceEpoch(snapshot.explicitChoice, read.epoch, !clearMissed),
						stored,
						subjectOnly,
						changedSinceSeen('choice', read)
					);
		if (!explicitChoice) {
			return;
		}
		const subject = writtenSubject(
			snapshot,
			stored ? read.records.subject : null,
			subjectOnly,
			read
		);
		writeChoiceToStorage(
			{ ...snapshot, explicitChoice, subject },
			storedIab,
			storageConfig,
			at,
			read.epoch
		);
		// Only what was written counts as this runtime's: the merge keeps a
		// newer stored decision over the one in memory, and that older
		// in-memory value must never be written back later.
		for (const [category, decision] of Object.entries(
			explicitChoice.categories
		)) {
			if (decision) {
				ownDecisions.set(category, { decision, epoch: read.epoch });
			}
		}
		markWritten(
			'choice',
			sameRecord(explicitChoice, snapshot.explicitChoice) &&
				sameRecord(subject, snapshot.subject)
		);
	});
	const noticeWrites = createWriteScheduler(() => {
		const snapshot = kernel.getSnapshot();
		const at = now();
		const read = readStoredRecordsForReconcile(storageConfig, at);
		const ours = noticeSinceEpoch(snapshot.noticeDismissal, read.epoch);
		if (
			ours &&
			mayWriteNotice(
				ours,
				read.records.noticeDismissal ?? null,
				changedSinceSeen('notice', read)
			)
		) {
			writeNoticeToStorage(snapshot, storageConfig, at);
			observe('notice');
		}
	});
	const privacyWrites = createWriteScheduler(() => {
		const snapshot = kernel.getSnapshot();
		const at = now();
		const read = readStoredRecordsForReconcile(storageConfig, at);
		const optOutDirectives = directivesToWrite(
			directivesSinceEpoch(snapshot.optOutDirectives, read.epoch),
			read.records.optOutDirectives ?? null
		);
		if (optOutDirectives.length === 0) {
			return;
		}
		writePrivacyToStorage({ ...snapshot, optOutDirectives }, storageConfig, at);
		for (const directive of snapshot.optOutDirectives) {
			ownDirectives.set(directiveIdentity(directive), directive);
		}
		observe('privacy');
	});
	const vendorWrites = createWriteScheduler(() => {
		const subjectOnly = !vendorsRecorded;
		vendorsRecorded = false;
		const snapshot = kernel.getSnapshot();
		const at = now();
		const read = readStoredRecordsForReconcile(storageConfig, at);
		const clearMissed = read.epoch > memoryEpoch;
		const ours = vendorChoiceSinceEpoch(snapshot.vendorChoice, read.epoch);
		if (
			(snapshot.vendorChoice && !ours) ||
			(subjectOnly && clearMissed) ||
			!mayWriteVendorChoice(
				ours,
				read.records.vendorChoice ?? null,
				subjectOnly,
				changedSinceSeen('vendors', read)
			)
		) {
			return;
		}
		const subject = writtenSubject(
			snapshot,
			read.vendorSubject,
			subjectOnly,
			read
		);
		writeVendorChoiceToStorage({ ...snapshot, subject }, storageConfig, at);
		markWritten('vendors', sameRecord(subject, snapshot.subject));
	});

	const unsubscribers = [
		kernel.events.on('command:save:started', () => {
			subjectBeforeSave = kernel.getSnapshot().subject?.subjectId;
		}),
		kernel.events.on('choice:recorded', ({ actionAt, snapshot }) => {
			noteGeneratedSubject(snapshot, actionAt);
			choiceRecorded = true;
			choiceWrites.schedule();
		}),
		kernel.events.on('subject:resolved', ({ snapshot }) => {
			choiceWrites.schedule();
			// The vendor record carries the subject only once a vendor decision
			// exists. Scheduling without one would run the writer's clear branch
			// and delete a stored denial this kernel never hydrated.
			if (snapshot.vendorChoice !== null) {
				vendorWrites.schedule();
			}
		}),
		kernel.events.on('notice:dismissed', () => {
			noticeWrites.schedule();
		}),
		kernel.events.on('privacy:opt-out', () => {
			privacyWrites.schedule();
		}),
		kernel.events.on('vendors:recorded', ({ actionAt, snapshot }) => {
			noteGeneratedSubject(snapshot, actionAt);
			vendorsRecorded = true;
			vendorWrites.schedule();
		}),
	];

	const flushAll = function flushAll(): void {
		choiceWrites.flush();
		noticeWrites.flush();
		privacyWrites.flush();
		vendorWrites.flush();
	};

	const cancelAll = function cancelAll(): void {
		choiceWrites.cancel();
		noticeWrites.cancel();
		privacyWrites.cancel();
		vendorWrites.cancel();
		choiceRecorded = false;
		vendorsRecorded = false;
	};

	/**
	 * A server prefetch seeds the kernel from the cookie alone. The vendor
	 * record keeps a localStorage copy that outlives a cookie the browser
	 * dropped, most often because many denied ids pushed it past the
	 * per-cookie limit, so the seeded list can be older than what this
	 * browser last saved. Read both projections and apply the newer one
	 * before any gate consults the denials; the category records stay as
	 * seeded.
	 */
	const reconcileVendorChoice = function reconcileVendorChoice(): void {
		if (typeof document === 'undefined') {
			return;
		}
		const at = now();
		const stored = readStoredVendorChoice(storageConfig, at);
		if (!stored?.ok) {
			return;
		}
		const current = kernel.getSnapshot().vendorChoice;
		if (
			(current && current.confirmedAt >= stored.record.confirmedAt) ||
			stored.record.confirmedAt < readStoredClearEpoch(storageConfig, at)
		) {
			return;
		}
		kernel.hydrate({
			now: at,
			vendorChoice: {
				confirmedAt: stored.record.confirmedAt,
				denied: stored.record.denied,
				version: stored.record.version,
			},
		});
	};

	/**
	 * A server prefetch seeds the kernel from the cookie alone, and the seed
	 * stays authoritative (`skipHydration`): nothing stored replaces it. But a
	 * browser can drop a cookie write while localStorage takes it, so a newer
	 * denial or privacy directive may exist only there. Those only restrict,
	 * so they are applied on top of the seed; a stored grant never is.
	 */
	const applyNewerStoredRestrictions =
		function applyNewerStoredRestrictions(): void {
			if (typeof document === 'undefined') {
				return;
			}
			const at = now();
			const { records } = readStoredRecordsForReconcile(storageConfig, at);
			const snapshot = kernel.getSnapshot();
			const patch: HydrationRecords = {};
			const seeded = snapshot.explicitChoice?.categories ?? {};
			const denials = Object.entries(records.choice?.categories ?? {}).filter(
				([category, decision]) => {
					const current = seeded[category as keyof typeof seeded];
					return (
						decision?.value === false &&
						(!current || decision.confirmedAt > current.confirmedAt)
					);
				}
			);
			if (denials.length > 0) {
				patch.choice = {
					categories: { ...seeded, ...Object.fromEntries(denials) },
					version: 3,
				};
			}
			const directives = mergeDirectives(
				snapshot.optOutDirectives,
				records.optOutDirectives ?? []
			);
			if (directives.length > snapshot.optOutDirectives.length) {
				patch.optOutDirectives = directives;
			}
			if (Object.keys(patch).length > 0) {
				kernel.hydrate({ ...patch, now: at });
			}
		};

	const hydrate = function hydrate(): boolean {
		// An explicit choice may still be queued. Land it first so
		// rehydration reads the new choice back instead of overwriting it
		// with whatever storage held before the user acted.
		flushAll();
		const stored = hydrateFromStorage(kernel, storageConfig, now());
		if (!stored) {
			return false;
		}
		seen = fingerprintStoredRecords(stored);
		rememberSubject(stored.records);
		memoryEpoch = stored.epoch;
		if (stored.records.choice !== undefined) {
			storedIab = stored.iab;
		}
		return stored.found;
	};

	// Coalesces bursts of triggers (one save writes several keys) into one
	// read in a later macrotask.
	const scheduledReconcile = createWriteScheduler(() => {
		// oxlint-disable-next-line no-use-before-define -- Mutually recursive with the scheduler.
		reconcile();
	});

	/**
	 * Schedule the writes that restore what this runtime stored and another
	 * runtime then wrote over. localStorage has no compare-and-swap, so two
	 * tabs can both read before either writes and the second write drops the
	 * first tab's category or directive. A decision is written back only when
	 * this runtime stored it, still holds it, and storage holds nothing as
	 * new for that category; a directive, when storage lacks it. Nothing the
	 * clear epoch voids or another runtime replaced comes back, and once
	 * storage holds the union no tab writes again.
	 */
	const restoreLostWrites = function restoreLostWrites(read: StoredRead): void {
		const snapshot = kernel.getSnapshot();
		const storedChoice = read.records.choice;
		if (storedChoice !== undefined) {
			const lost = [...ownDecisions].some(([category, written]) => {
				const { decision: own } = written;
				const held =
					snapshot.explicitChoice?.categories[
						category as keyof ExplicitChoice['categories']
					];
				const stored =
					storedChoice?.categories[
						category as keyof ExplicitChoice['categories']
					];
				return (
					held !== undefined &&
					held.confirmedAt === own.confirmedAt &&
					held.value === own.value &&
					// A decision in the clearing millisecond counts when it was
					// written under that epoch, as in `choiceSinceEpoch`.
					(own.confirmedAt > read.epoch ||
						(own.confirmedAt === read.epoch && written.epoch === read.epoch)) &&
					(!stored || stored.confirmedAt < own.confirmedAt)
				);
			});
			if (lost) {
				choiceRecorded = true;
				choiceWrites.schedule();
			}
		}
		const storedDirectives = read.records.optOutDirectives;
		if (storedDirectives !== undefined) {
			const present = new Set(storedDirectives.map(directiveIdentity));
			const held = new Set(snapshot.optOutDirectives.map(directiveIdentity));
			const lost = [...ownDirectives.keys()].some(
				(key) => held.has(key) && !present.has(key)
			);
			if (lost) {
				privacyWrites.schedule();
			}
		}
	};

	const reconcile = function reconcile(): boolean {
		scheduledReconcile.cancel();
		if (disposed || typeof document === 'undefined') {
			return false;
		}
		// Land this runtime's queued writes first. Each one merges with what
		// storage holds, so it cannot undo a newer decision another runtime
		// stored meanwhile.
		flushAll();
		const at = now();
		const stored = readStoredRecordsForReconcile(storageConfig, at);
		const next = selectReconciledRecords(
			kernel.getSnapshot(),
			stored,
			seen,
			at,
			subjectYields(),
			unadopted,
			memoryEpoch,
			subjectBornAfter(stored.epoch)
		);
		({ seen } = next);
		unadopted.clear();
		rememberSubject(stored.records);
		memoryEpoch = stored.epoch;
		if (!next.records) {
			restoreLostWrites(stored);
			return false;
		}
		const result = kernel.hydrate(next.records);
		if (result.ok === false) {
			console.warn(
				'[c15t] Stored consent records were rejected.',
				result.issues
			);
			return false;
		}
		if (next.records.choice !== undefined) {
			storedIab = next.records.choice ? stored.iab : null;
		}
		restoreLostWrites(stored);
		return result.changed;
	};

	const installSyncListeners = function installSyncListeners(): () => void {
		if (
			options.sync === false ||
			typeof window === 'undefined' ||
			typeof document === 'undefined' ||
			typeof window.addEventListener !== 'function' ||
			typeof document.addEventListener !== 'function'
		) {
			return () => undefined;
		}
		const keys = resolveStorageKeys(storageConfig);
		const watched = new Set<string | null>([
			keys.consent,
			keys.legacyConsent,
			keys.notice,
			keys.privacy,
			keys.vendors,
			keys.epoch,
			// Another page called `localStorage.clear()`.
			null,
		]);
		const onStorage = function onStorage(event: StorageEvent): void {
			if (watched.has(event.key)) {
				scheduledReconcile.schedule();
			}
		};
		const onVisibilityChange = function onVisibilityChange(): void {
			if (document.visibilityState !== 'hidden') {
				scheduledReconcile.schedule();
			}
		};
		const onFocus = function onFocus(): void {
			scheduledReconcile.schedule();
		};
		window.addEventListener('storage', onStorage);
		window.addEventListener('focus', onFocus);
		document.addEventListener('visibilitychange', onVisibilityChange);
		return () => {
			window.removeEventListener('storage', onStorage);
			window.removeEventListener('focus', onFocus);
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	};

	if (options.skipHydration) {
		reconcileVendorChoice();
		applyNewerStoredRestrictions();
		observe();
	} else {
		hydrate();
	}

	const removeListeners = installSyncListeners();

	return {
		clear() {
			cancelAll();
			unadopted.clear();
			ownDecisions.clear();
			ownDirectives.clear();
			storedIab = null;
			// The cleared subject is gone: an id generated by a save already
			// under way is a new local id, not one the server resolved.
			subjectBeforeSave = undefined;
			freshSubjectId = undefined;
			const at = now();
			if (typeof document !== 'undefined') {
				clearStoredConsentRecords(undefined, storageConfig);
				// The epoch outlives the clear it records: decisions confirmed
				// before it stay void wherever another runtime writes them back.
				// Always past the previous epoch, even when the clock went back:
				// a lower epoch would let decisions between the two back in.
				const previous = Math.max(
					memoryEpoch,
					readStoredClearEpoch(storageConfig, at)
				);
				// Never further ahead of the clock than readers accept, or
				// every runtime whose clock is behind would read the epoch as
				// corrupt (0) and void nothing. Known limit: after the clock went
				// back more than the tolerance, the capped epoch is below times
				// cleared records carried, so a decision with such a time that a
				// runtime which missed the clear writes back counts again once
				// clocks recover. Times alone cannot order that case.
				const epoch = Math.max(
					at,
					Math.min(previous + 1, at + EPOCH_CLOCK_TOLERANCE_MS)
				);
				writeStoredClearEpoch(epoch, storageConfig);
			}
			observe();
			kernel.hydrate({
				choice: null,
				noticeDismissal: null,
				now: at,
				optOutDirectives: [],
				subject: null,
				vendorChoice: null,
			});
			kernel.events.emit({ type: 'records:cleared' });
		},
		dispose() {
			if (disposed) {
				return;
			}
			disposed = true;
			removeListeners();
			scheduledReconcile.cancel();
			for (const unsubscribe of unsubscribers) {
				unsubscribe();
			}
			// A write queued in the current tick must not fire after dispose.
			// Flushing synchronously keeps the last change durable without
			// leaving a timer behind.
			flushAll();
		},
		hydrate,
		reconcile,
	};
};

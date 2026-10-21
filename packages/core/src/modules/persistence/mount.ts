/**
 * Persistence's first-load half: hydration, event wiring and lifecycle.
 * `index.ts` is the public entry; see it for the invariants.
 *
 * @internal
 */
import { clearKernelRecords } from '../../kernel/clear-records';
import type { InternalKernel } from '../../kernel/internals';
import { generateSubjectId } from '../../libs/generate-subject-id';
import type {
	ConsentSnapshot,
	ConsentSubject,
	HydrationRecords,
} from '../../types';
import { clearStoredRecords, writeStoredSubjectId } from './clear';
import { hydrateFromStorage, readStoredRecordsForReconcile } from './hydrate';
import type { StoredRecords } from './hydrate';
import {
	isNewerDenial,
	readStoredSubjectId,
	readSyncedSubjectId,
	resolveStorageKeys,
} from './record-storage';
import { persistenceTools } from './tools';
import type { PersistenceHandle, PersistenceOptions } from './types';
import { pageWriterLoader, preloadWriter } from './writer-loader';
import type { WriterLoader, WriterModule } from './writer-loader';
import type {
	PersistenceContext,
	PersistenceWriter,
	WriteKind,
} from './writer/types';

// A write waits for the write code: after a failed load, try again after
// 1, 4 and 16 seconds. Later events, focus and visibility changes try too.
const RETRY_BASE_MS = 1000;
const RETRIES = 3;

// By consent key, the kernel whose writes wait for the write code, while
// they wait. A handle mounted meanwhile (a provider remounted right after a
// choice) starts from that kernel's records, not from storage that does not
// hold them yet. A later handle's own write replaces the entry; the earlier
// write landing afterwards keeps the newer decision per category, as every
// write does, and leaves the newer entry alone. Entries are compared by
// kernel, so handles sharing a kernel share one. Landing, a landed write
// and `clear()` remove the entry. A disposed handle whose load retries give
// up keeps it: its writes never reach storage, so a later mount still needs
// its records. That holds one kernel per key until a handle for the key
// writes or clears.
/**
 * Exported for tests.
 *
 * @internal
 */
export const queuedWrites = new Map<string, InternalKernel>();

/**
 * `createPersistence`, with the place the write code comes from. Tests
 * pass their own loader.
 *
 * @param options - Kernel, storage configuration, clock and sync.
 * @param loader - Where the write code comes from.
 * @returns The handle.
 * @internal
 */
export const mountPersistence = function mountPersistence(
	options: PersistenceOptions,
	loader: WriterLoader = pageWriterLoader
): PersistenceHandle {
	const { storageConfig } = options;
	const kernel = options.kernel as InternalKernel;
	const now = options.now ?? (() => Date.now());
	const state: PersistenceContext['state'] = {
		choiceRecorded: false,
		vendorsRecorded: false,
	};
	const browser = typeof document !== 'undefined';
	// A browser page this module can listen to.
	const listenable =
		browser &&
		typeof window !== 'undefined' &&
		typeof window.addEventListener === 'function' &&
		typeof document.addEventListener === 'function';
	let disposed = false;
	const keys = resolveStorageKeys(storageConfig);
	const consentKey = keys.consent;

	let writer: PersistenceWriter | undefined;
	// The read memory last matched, for the writer to start from, and
	// whether its IAB metadata is the next choice write's.
	let baseline: [StoredRecords, boolean] | undefined;
	// Requested before the writer landed, applied in this order when it does.
	const requested = new Set<WriteKind>();
	let reconcileRequested = false;
	let hydrateRequested = false;
	// Settles once the writer has landed: what a held save waits for.
	let markLanded: () => void = () => undefined;
	const landing = new Promise<void>((resolve) => {
		markLanded = resolve;
	});
	let retries = 0;
	let retryTimer: ReturnType<typeof setTimeout> | undefined;
	// The subject ID the kernel holds, as this handle last saw it.
	let subjectId: string | undefined;
	// The ID both copies of `<key>-sid` were last read as or written with;
	// `null` when a copy was missing, so the next store writes both.
	let storedSubjectId: string | null = null;
	// An ID this runtime generated or read from `<key>-sid` that no save or
	// `identify()` has used yet. Another tab's stored ID replaces it, so two
	// tabs opened together settle on one ID.
	let unusedSubjectId: string | undefined;
	// Set while this handle announces a subject change it only followed. The
	// change came from records or a response, so there is nothing to write.
	let followingSubject = false;
	// Set while this handle takes the unused ID another tab stored.
	let adopting = false;

	const land = function land(module: WriterModule): void {
		if (writer) {
			return;
		}
		clearTimeout(retryTimer);
		writer = module.createPersistenceWriter(
			{ kernel, now, state, storageConfig },
			persistenceTools
		);
		if (baseline) {
			writer.adopt(...baseline);
			baseline = undefined;
		}
		// At once, not in a later macrotask: a save request held for these
		// writes is released as soon as they are stored.
		for (const kind of requested) {
			writer.schedule(kind);
		}
		requested.clear();
		writer.flush();
		if (queuedWrites.get(consentKey) === kernel) {
			queuedWrites.delete(consentKey);
		}
		markLanded();
		if (hydrateRequested && !disposed) {
			hydrateRequested = false;
			// oxlint-disable-next-line no-use-before-define -- Runs only after assembly.
			hydrate();
		}
		if (reconcileRequested && !disposed) {
			reconcileRequested = false;
			writer.reconcile();
		}
	};

	/** The writer, landing it first when its code loaded for another handle. */
	const landedWriter = function landedWriter(): PersistenceWriter | undefined {
		if (!writer && loader.module) {
			land(loader.module);
		}
		return writer;
	};

	/** Land the writer once its code has loaded. Never rejects on a failed load. */
	const withWriter = async function withWriter(): Promise<void> {
		let module: WriterModule;
		try {
			module = await loader.load();
		} catch {
			// Not loaded: what was requested stays requested, and a save held
			// for it stays held, so nothing that waits for the save (its
			// request, a revocation reload) runs while storage holds the old
			// record. The next request tries again, and so does a timer while
			// a write waits.
			if (requested.size > 0 && retries < RETRIES && !retryTimer) {
				retryTimer = setTimeout(
					() => {
						retryTimer = undefined;
						void withWriter();
					},
					RETRY_BASE_MS * 4 ** retries
				);
				retries += 1;
			}
			return;
		}
		land(module);
	};

	/** Write `kinds` now through the writer, or once it has landed. */
	const request = function request(...kinds: WriteKind[]): void {
		const landed = landedWriter();
		// A write stored from this kernel, which started from any queued
		// records, supersedes them. One that waits is queued itself.
		if (landed) {
			queuedWrites.delete(consentKey);
			for (const kind of kinds) {
				landed.schedule(kind);
			}
			return;
		}
		queuedWrites.set(consentKey, kernel);
		for (const kind of kinds) {
			requested.add(kind);
		}
		// The write must land before the save request this event belongs to
		// leaves, and before the save completes.
		kernel.holdSaves(landing);
		void withWriter();
	};

	const scheduleReconcile = function scheduleReconcile(): void {
		const landed = landedWriter();
		if (landed) {
			landed.scheduleReconcile();
			return;
		}
		reconcileRequested = true;
		void withWriter();
	};

	const noteGeneratedSubject = function noteGeneratedSubject(
		snapshot: ConsentSnapshot,
		actionAt: number
	): void {
		const id = snapshot.subject?.subjectId;
		if (id && !state.subjectBeforeSave) {
			state.freshSubjectId = id;
			state.freshSubjectAt = actionAt;
		}
	};

	/** Writes the stored records again under the kernel's subject ID. */
	const rekeyRecords = function rekeyRecords(snapshot: ConsentSnapshot): void {
		// The vendor record carries the subject only once a vendor decision
		// exists. Scheduling without one would run the writer's clear branch
		// and delete a stored denial this kernel never hydrated. Without
		// either record, `<key>-sid` alone holds the subject.
		const kinds: WriteKind[] = [];
		if (snapshot.explicitChoice) {
			kinds.push('choice');
		}
		if (snapshot.vendorChoice) {
			kinds.push('vendors');
		}
		if (kinds.length > 0) {
			request(...kinds);
		}
	};

	const unsubscribers = [
		kernel.events.on('command:save:started', () => {
			state.subjectBeforeSave = kernel.getSnapshot().subject?.subjectId;
			unusedSubjectId = undefined;
		}),
		kernel.events.on('user:identified', () => {
			unusedSubjectId = undefined;
		}),
		kernel.events.on('choice:recorded', ({ actionAt, snapshot }) => {
			noteGeneratedSubject(snapshot, actionAt);
			state.choiceRecorded = true;
			// A choice under a notice prompt acknowledges the notice too.
			request('choice', 'notice');
		}),
		kernel.events.on('subject:resolved', ({ snapshot }) => {
			if (!followingSubject) {
				rekeyRecords(snapshot);
			}
		}),
		kernel.events.on('notice:dismissed', () => {
			request('notice');
		}),
		kernel.events.on('vendors:recorded', ({ actionAt, snapshot }) => {
			noteGeneratedSubject(snapshot, actionAt);
			state.vendorsRecorded = true;
			request('vendors');
		}),
	];

	/**
	 * `records`, or the records another handle's queued writes will store
	 * over them. Never this handle's own: `hydrate()` waits for those.
	 */
	const withQueued = function withQueued(
		records: HydrationRecords
	): HydrationRecords {
		const snapshot = queuedWrites.get(consentKey)?.getSnapshot();
		// The snapshot's subject, notice and vendor records under their
		// hydration names; hydration ignores every other field.
		return snapshot
			? { ...records, ...snapshot, choice: snapshot.explicitChoice }
			: records;
	};

	/**
	 * A server prefetch seeds the kernel from the cookie alone, and the seed
	 * stays authoritative (`skipHydration`). But a browser can drop a cookie
	 * write while localStorage takes it, so a newer record may exist only
	 * there. A newer denial only restricts, so it is
	 * applied on top of the seed; a stored grant never is. A denial from the
	 * same millisecond as a seeded grant counts as newer. The vendor record
	 * outlives a dropped cookie most often, since many denied ids push it
	 * past the per-cookie limit, so a newer stored one replaces the seeded
	 * list before any gate consults the denials.
	 *
	 * The read also becomes what the writer starts from: the kernel's
	 * records stay the seed's, and storage is what it was read as here.
	 * Reconciling merges only records that changed since this read, so a
	 * grant left out here stays out until another runtime writes storage.
	 * Returns the subject ID the stored records carry, `null` for none.
	 */
	const applyNewerStoredRecords = function applyNewerStoredRecords():
		| string
		| null {
		const at = now();
		const read = readStoredRecordsForReconcile(storageConfig, at);
		baseline = [read, false];
		const records = withQueued(read.records);
		const snapshot = kernel.getSnapshot();
		const patch: HydrationRecords = {};
		const seeded = snapshot.explicitChoice?.categories ?? {};
		const denials = Object.entries(records.choice?.categories ?? {}).filter(
			([category, decision]) =>
				isNewerDenial(decision, seeded[category as keyof typeof seeded])
		);
		if (denials.length > 0) {
			patch.choice = {
				categories: { ...seeded, ...Object.fromEntries(denials) },
				version: 3,
			};
		}
		const { vendorChoice } = records;
		if (
			vendorChoice &&
			vendorChoice.confirmedAt > (snapshot.vendorChoice?.confirmedAt ?? -1)
		) {
			patch.vendorChoice = vendorChoice;
		}
		if (Object.keys(patch).length > 0) {
			kernel.hydrate({ ...patch, now: at });
		}
		return read.recordedSubjectId;
	};

	/** Hydrates from storage and returns the read, `null` when none ran. */
	const hydrateStored = function hydrateStored(): StoredRecords | null {
		// An explicit choice may still be queued. Land it first so
		// rehydration reads the new choice back instead of overwriting it
		// with whatever storage held before the user acted.
		const landed = landedWriter();
		if (landed) {
			landed.flush();
		} else if (requested.size > 0) {
			// Its write code has not landed yet: hydrate once it has.
			hydrateRequested = true;
			void withWriter();
			return null;
		}
		// What another handle queued wins over what storage holds; the
		// writer still starts from storage.
		const stored = hydrateFromStorage(kernel, storageConfig, now(), withQueued);
		if (!stored) {
			return null;
		}
		if (landed) {
			landed.adopt(stored, true);
		} else {
			baseline = [stored, true];
		}
		return stored;
	};

	const hydrate = function hydrate(): boolean {
		return hydrateStored()?.found ?? false;
	};

	const storeSubjectId = function storeSubjectId(id: string): void {
		if (id !== storedSubjectId) {
			writeStoredSubjectId(id, storageConfig);
			storedSubjectId = id;
		}
	};

	/**
	 * Follows the kernel's subject ID into `<key>-sid`. An ID removed with
	 * `set.subjectId(null)` is replaced with a new one: a browser runtime
	 * always has an ID. When an unused ID is replaced, `subject:resolved`
	 * names it, so anything that referred to it can follow.
	 */
	const followSubjectId = function followSubjectId(
		snapshot: ConsentSnapshot
	): void {
		const id = snapshot.subject?.subjectId;
		if (id === subjectId) {
			return;
		}
		const previous = subjectId;
		subjectId = id;
		if (!id) {
			const next = generateSubjectId();
			unusedSubjectId =
				snapshot.explicitChoice || snapshot.vendorChoice ? undefined : next;
			state.freshSubjectId = next;
			state.freshSubjectAt = now();
			kernel.hydrate({ subject: { ...snapshot.subject, subjectId: next } });
			return;
		}
		storeSubjectId(id);
		if (
			(snapshot.explicitChoice || snapshot.vendorChoice) &&
			readStoredRecordsForReconcile(storageConfig, now()).recordedSubjectId !==
				id
		) {
			// `set.subjectId` and init change the ID without a save. The
			// records follow it, or the next load restores the old ID.
			rekeyRecords(snapshot);
		}
		if (previous !== undefined && previous === unusedSubjectId) {
			// Another tab's ID stays unused. One the app or the server named
			// is kept.
			unusedSubjectId = adopting ? id : undefined;
			if (adopting) {
				state.freshSubjectId = id;
			}
			followingSubject = true;
			try {
				kernel.events.emit({
					previousSubjectId: previous,
					snapshot,
					type: 'subject:resolved',
				});
			} finally {
				followingSubject = false;
			}
		}
	};

	/**
	 * Gives the kernel a subject ID at startup, before anything binds to
	 * it. Records storage held keep the ID they carry. Otherwise a subject
	 * the server named is kept, then the ID in `<key>-sid`, then a new one.
	 * An ID no stored record carries is stored in `<key>-sid` at once so a
	 * reload keeps it. The ID alone records no choice.
	 */
	const startSubject = function startSubject(
		before: ConsentSubject | null,
		recordedSubjectId: string | null
	): void {
		const stored = readStoredSubjectId(storageConfig);
		storedSubjectId = readSyncedSubjectId(storageConfig);
		const snapshot = kernel.getSnapshot();
		let { subject } = snapshot;
		let local = false;
		if (!recordedSubjectId && before?.subjectId) {
			subject = { ...subject, ...before };
		} else if (recordedSubjectId && !subject?.subjectId) {
			// Hydration is deferred: take the ID it will bring.
			subject = { ...subject, subjectId: recordedSubjectId };
		} else if (!(recordedSubjectId && subject?.subjectId)) {
			subject = {
				...subject,
				subjectId: subject?.subjectId ?? stored ?? generateSubjectId(),
			};
			local = true;
		}
		const id = subject.subjectId as string;
		subjectId = id;
		if (local) {
			// Like an ID a save generated: it yields to a subject another
			// runtime stored.
			state.freshSubjectId = id;
			state.freshSubjectAt = now();
			if (!snapshot.explicitChoice && !snapshot.vendorChoice) {
				unusedSubjectId = id;
			}
		}
		if (id !== snapshot.subject?.subjectId) {
			kernel.hydrate({ subject });
		}
		// Records that carry the ID already keep it: hydrating them writes
		// nothing. A clear stores it before it removes them.
		if (id !== recordedSubjectId) {
			storeSubjectId(id);
		}
	};

	/**
	 * Takes the ID another tab stored when this runtime's is unused, and
	 * stores this runtime's again when storage lost it.
	 */
	const adoptStoredSubjectId = function adoptStoredSubjectId(): void {
		if (subjectId === undefined || disposed) {
			return;
		}
		const stored = readStoredSubjectId(storageConfig);
		storedSubjectId = readSyncedSubjectId(storageConfig);
		if (!stored || stored === subjectId) {
			// Restores a copy the browser dropped.
			storeSubjectId(subjectId);
			return;
		}
		const snapshot = kernel.getSnapshot();
		if (
			subjectId === unusedSubjectId &&
			!snapshot.explicitChoice &&
			!snapshot.vendorChoice
		) {
			adopting = true;
			try {
				kernel.hydrate({ subject: { ...snapshot.subject, subjectId: stored } });
			} finally {
				adopting = false;
			}
		}
	};

	const installListeners = function installListeners(): () => void {
		if (!listenable) {
			return () => undefined;
		}
		const listeners: [EventTarget, string, (event: Event) => void][] = [
			// Leaving the page: a write still waiting for its macrotask runs now.
			[window, 'pagehide', () => writer?.flush()],
		];
		if (options.sync !== false) {
			const watchStorage = function watchStorage(): void {
				adoptStoredSubjectId();
				scheduleReconcile();
			};
			const watched = new Set<string | null>([
				consentKey,
				keys.legacyConsent,
				keys.notice,
				keys.vendors,
				keys.epoch,
				// Another page called `localStorage.clear()`.
				null,
			]);
			listeners.push(
				[
					window,
					'storage',
					(event) => {
						const { key } = event as StorageEvent;
						if (key === keys.subject) {
							adoptStoredSubjectId();
						} else if (watched.has(key)) {
							watchStorage();
						}
					},
				],
				[window, 'focus', watchStorage],
				[
					document,
					'visibilitychange',
					() => {
						if (document.visibilityState !== 'hidden') {
							watchStorage();
						}
					},
				]
			);
		}
		const toggle = (add: boolean) => {
			for (const [target, type, listener] of listeners) {
				target[add ? 'addEventListener' : 'removeEventListener'](
					type,
					listener
				);
			}
		};
		toggle(true);
		return () => toggle(false);
	};

	if (browser) {
		const before = kernel.getSnapshot().subject;
		let recordedSubjectId: string | null = null;
		if (options.skipHydration) {
			recordedSubjectId = applyNewerStoredRecords();
		} else {
			recordedSubjectId = hydrateStored()?.recordedSubjectId ?? null;
		}
		if (!options.keepSubject && !kernel.getSnapshot().externalPermissions) {
			startSubject(before, recordedSubjectId);
			unsubscribers.push(kernel.subscribe(followSubjectId));
		}
	}
	// Without a document there is nothing to read, and every write is a
	// no-op.

	if (!landedWriter() && listenable) {
		// See `preloadWriter` for when the write code loads.
		unsubscribers.push(
			preloadWriter(kernel, () => {
				if (!disposed) {
					void withWriter();
				}
			})
		);
	}

	const removeListeners = installListeners();

	return {
		clear() {
			// What any handle queued belongs to the cleared records.
			queuedWrites.delete(consentKey);
			state.choiceRecorded = false;
			state.vendorsRecorded = false;
			// The cleared records' identity is gone, and the ID stays: an ID
			// a save already under way generates is a new local one, not one
			// the server resolved.
			state.subjectBeforeSave = undefined;
			state.freshSubjectId = undefined;
			if (subjectId) {
				storeSubjectId(subjectId);
			}
			const at = now();
			const landed = landedWriter();
			if (landed) {
				landed.clearStorage(at);
			} else if (browser) {
				// Queued writes belong to the cleared records. Storage is
				// cleared now, without the write code, so a reload or a write
				// code that never loads cannot bring a cleared record back.
				requested.clear();
				hydrateRequested = false;
				clearStoredRecords(storageConfig, at, baseline?.[0].epoch ?? 0);
				baseline = [readStoredRecordsForReconcile(storageConfig, at), false];
			}
			clearKernelRecords(kernel, at);
		},
		dispose() {
			if (disposed) {
				return;
			}
			disposed = true;
			removeListeners();
			for (const unsubscribe of unsubscribers) {
				unsubscribe();
			}
			// A write queued in the current tick must not fire after dispose.
			// Flushing synchronously keeps the last change durable without
			// leaving a timer behind. Writes requested before the writer landed
			// still land with it, and their `queuedWrites` entry stays until then.
			landedWriter()?.dispose();
			writer?.flush();
		},
		hydrate,
		reconcile() {
			if (disposed || !browser) {
				return false;
			}
			const landed = landedWriter();
			if (landed) {
				return landed.reconcile();
			}
			// Runs once the write code has landed.
			reconcileRequested = true;
			void withWriter();
			return false;
		},
	};
};

/**
 * Load persistence's write code now. Every handle created afterwards has
 * it from the start, and an existing handle takes it on its next write.
 *
 * @internal
 */
export const preloadPersistenceWriter =
	async function preloadPersistenceWriter(): Promise<void> {
		await pageWriterLoader.load();
	};

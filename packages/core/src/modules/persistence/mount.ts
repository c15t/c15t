/**
 * Persistence's first-load half: hydration, event wiring and lifecycle.
 * `index.ts` is the public entry; see it for the invariants.
 *
 * @internal
 */
import { clearKernelRecords } from '../../kernel/clear-records';
import type { InternalKernel } from '../../kernel/internals';
import type { ConsentSnapshot, HydrationRecords } from '../../types';
import { clearStoredRecords } from './clear';
import { hydrateFromStorage, readStoredRecordsForReconcile } from './hydrate';
import type { StoredRecords } from './hydrate';
import { resolveStorageKeys } from './record-storage';
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
		if (landed) {
			for (const kind of kinds) {
				landed.schedule(kind);
			}
			return;
		}
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

	const unsubscribers = [
		kernel.events.on('command:save:started', () => {
			state.subjectBeforeSave = kernel.getSnapshot().subject?.subjectId;
		}),
		kernel.events.on('choice:recorded', ({ actionAt, snapshot }) => {
			noteGeneratedSubject(snapshot, actionAt);
			state.choiceRecorded = true;
			// A choice under a notice prompt acknowledges the notice too.
			request('choice', 'notice');
		}),
		kernel.events.on('subject:resolved', ({ snapshot }) => {
			// The vendor record carries the subject only once a vendor decision
			// exists. Scheduling without one would run the writer's clear branch
			// and delete a stored denial this kernel never hydrated.
			if (snapshot.vendorChoice === null) {
				request('choice');
			} else {
				request('choice', 'vendors');
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
	 */
	const applyNewerStoredRecords = function applyNewerStoredRecords(): void {
		const at = now();
		const read = readStoredRecordsForReconcile(storageConfig, at);
		baseline = [read, false];
		const { records } = read;
		const snapshot = kernel.getSnapshot();
		const patch: HydrationRecords = {};
		const seeded = snapshot.explicitChoice?.categories ?? {};
		const denials = Object.entries(records.choice?.categories ?? {}).filter(
			([category, decision]) => {
				const current = seeded[category as keyof typeof seeded];
				return (
					decision?.value === false &&
					(!current ||
						decision.confirmedAt > current.confirmedAt ||
						(decision.confirmedAt === current.confirmedAt && current.value))
				);
			}
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
	};

	const hydrate = function hydrate(): boolean {
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
			return false;
		}
		const stored = hydrateFromStorage(kernel, storageConfig, now());
		if (!stored) {
			return false;
		}
		if (landed) {
			landed.adopt(stored, true);
		} else {
			baseline = [stored, true];
		}
		return stored.found;
	};

	const installListeners = function installListeners(): () => void {
		if (!listenable) {
			return () => undefined;
		}
		// Leaving the page: a write still waiting for its macrotask runs now.
		const onPageHide = function onPageHide(): void {
			writer?.flush();
		};
		window.addEventListener('pagehide', onPageHide);
		if (options.sync === false) {
			return () => {
				window.removeEventListener('pagehide', onPageHide);
			};
		}
		const keys = resolveStorageKeys(storageConfig);
		const watched = new Set<string | null>([
			keys.consent,
			keys.legacyConsent,
			keys.notice,
			keys.vendors,
			keys.epoch,
			// Another page called `localStorage.clear()`.
			null,
		]);
		const onStorage = function onStorage(event: StorageEvent): void {
			if (watched.has(event.key)) {
				scheduleReconcile();
			}
		};
		const onVisibilityChange = function onVisibilityChange(): void {
			if (document.visibilityState !== 'hidden') {
				scheduleReconcile();
			}
		};
		window.addEventListener('storage', onStorage);
		window.addEventListener('focus', scheduleReconcile);
		document.addEventListener('visibilitychange', onVisibilityChange);
		return () => {
			window.removeEventListener('pagehide', onPageHide);
			window.removeEventListener('storage', onStorage);
			window.removeEventListener('focus', scheduleReconcile);
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	};

	if (!browser) {
		// Nothing to read, and every write is a no-op without a document.
	} else if (options.skipHydration) {
		applyNewerStoredRecords();
	} else {
		// Known gap: a handle mounted while an earlier one's write still waits
		// for the write code (a provider remounted right after a choice) reads
		// storage before that write lands, and does not see it until reload.
		hydrate();
	}

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
			state.choiceRecorded = false;
			state.vendorsRecorded = false;
			// The cleared subject is gone: an id generated by a save already
			// under way is a new local id, not one the server resolved.
			state.subjectBeforeSave = undefined;
			state.freshSubjectId = undefined;
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
			// still land with it.
			const landed = landedWriter();
			if (landed) {
				landed.dispose();
				landed.flush();
			}
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

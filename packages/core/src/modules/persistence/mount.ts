/**
 * Persistence's first-load half: hydration, event wiring and lifecycle.
 * `index.ts` is the public entry; see it for the invariants.
 *
 * @internal
 */
import {
	clearKernelRecords,
	subjectAfterClear,
} from '../../kernel/clear-records';
import type { InternalKernel } from '../../kernel/internals';
import { generateSubjectId } from '../../libs/generate-subject-id';
import {
	readLegacySubjectId,
	removeLegacySubjectId,
} from '../../libs/legacy-subject-id';
import type {
	ConsentSnapshot,
	ConsentSubject,
	ExplicitChoice,
	HydrationRecords,
} from '../../types';
import { clearStoredRecords } from './clear';
import {
	choiceSinceEpoch,
	noticeSinceEpoch,
	vendorChoiceSinceEpoch,
} from './epoch';
import {
	hydrateFromStorage,
	readStoredRecordsForReconcile,
	readStoredRecordsFromCookieHeader,
} from './hydrate';
import type { StoredRecords } from './hydrate';
import { isNewerDenial, resolveStorageKeys } from './record-storage';
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

// A kernel whose queued records a later handle started from (see
// `startQueuedSubject`), with that handle's kernel. A remount can do this
// again, so the handovers form a chain. Its live end holds the subject
// for every queued record along it.
const handedOver = new WeakMap<InternalKernel, InternalKernel>();

/**
 * `document.cookie`, or `null` when the browser refuses to read it. The
 * cookie readers treat that as an unavailable source, and persistence
 * keeps working from localStorage.
 */
const readCookieHeader = function readCookieHeader(): string | null {
	try {
		return document.cookie;
	} catch {
		return null;
	}
};

/** Whether two subjects name the same ID and linked identity. */
const sameSubject = function sameSubject(
	left: ConsentSubject | null | undefined,
	right: ConsentSubject | null | undefined
): boolean {
	return (
		left?.subjectId === right?.subjectId &&
		left?.externalId === right?.externalId &&
		left?.identityProvider === right?.identityProvider
	);
};

/**
 * The choice a seeded kernel takes when it mounts, or `undefined` to keep
 * the seed. A seed the clear epoch voided whole yields to storage. Seeded
 * decisions that outlive the clear stay, and only a newer stored denial is
 * laid over them. A seeded category the epoch voided takes what storage
 * holds for it.
 */
const seededChoicePatch = function seededChoicePatch(
	seeded: ExplicitChoice | null,
	surviving: ExplicitChoice | null,
	stored: ExplicitChoice | null | undefined
): ExplicitChoice | null | undefined {
	if (seeded && !surviving) {
		return stored ?? null;
	}
	const kept = surviving?.categories ?? {};
	const denials = Object.entries(stored?.categories ?? {}).filter(
		([category, decision]) =>
			isNewerDenial(decision, kept[category as keyof typeof kept])
	);
	if (surviving === seeded && denials.length === 0) {
		return undefined;
	}
	// Only a category the epoch voided yields to storage. One that survived
	// wins, and one the seed never held takes no stored grant.
	const yielded = Object.entries(stored?.categories ?? {}).filter(
		([category]) =>
			seeded !== null && category in seeded.categories && !(category in kept)
	);
	return {
		categories: {
			...Object.fromEntries(yielded),
			...kept,
			...Object.fromEntries(denials),
		},
		version: 3,
	};
};

/**
 * Whether another handle's queued records include one from before the clear
 * epoch. Such a queue never saw that clear, so a seeded page takes from it
 * only what was recorded since.
 */
const queueMissedClear = function queueMissedClear(
	queued: ConsentSnapshot,
	epoch: number
): boolean {
	return [
		choiceSinceEpoch(queued.explicitChoice, epoch, false) !==
			queued.explicitChoice,
		noticeSinceEpoch(queued.noticeDismissal, epoch) !== queued.noticeDismissal,
		vendorChoiceSinceEpoch(queued.vendorChoice, epoch) !== queued.vendorChoice,
	].includes(true);
};

/**
 * The record made later, or the one that exists. The stored record wins a
 * tie, as it does when the writer reconciles.
 */
const laterOf = function laterOf<RecordType>(
	stored: RecordType | null,
	queued: RecordType | null,
	madeAt: (record: RecordType) => number
): RecordType | null {
	if (!(stored && queued)) {
		return queued ?? stored;
	}
	return madeAt(queued) > madeAt(stored) ? queued : stored;
};

/**
 * Storage's records with another handle's queued ones laid over them, for a
 * queue that missed the clear `epoch` marks. A queued record from before
 * that clear is void. Of the rest, the later of the queued and the stored
 * one stands, category by category for a choice.
 */
const queuedSinceClear = function queuedSinceClear(
	stored: HydrationRecords,
	queued: ConsentSnapshot,
	epoch: number
): HydrationRecords {
	const choice = choiceSinceEpoch(queued.explicitChoice, epoch, false);
	const categories = { ...stored.choice?.categories };
	for (const [category, decision] of Object.entries(choice?.categories ?? {})) {
		const key = category as keyof typeof categories;
		categories[key] = laterOf(
			categories[key] ?? null,
			decision,
			(made) => made.confirmedAt
		) as (typeof categories)[typeof key];
	}
	return {
		...stored,
		choice:
			Object.keys(categories).length > 0 ? { categories, version: 3 } : null,
		noticeDismissal: laterOf(
			stored.noticeDismissal ?? null,
			noticeSinceEpoch(queued.noticeDismissal, epoch),
			(made) => made.dismissedAt
		),
		vendorChoice: laterOf(
			stored.vendorChoice ?? null,
			vendorChoiceSinceEpoch(queued.vendorChoice, epoch),
			(made) => made.confirmedAt
		),
	};
};

/**
 * A seeded subject cut to its ID, as a clear leaves it, or `undefined`
 * when it holds nothing more.
 */
const seededSubjectCut = function seededSubjectCut(
	subject: ConsentSubject | null
): ConsentSubject | null | undefined {
	return subject && Object.keys(subject).some((key) => key !== 'subjectId')
		? subjectAfterClear(subject)
		: undefined;
};

/** The complete subject a storage read's records carry, `null` for none. */
const recordedSubjectOf = function recordedSubjectOf(
	read: StoredRecords | null | undefined
): ConsentSubject | null {
	if (!read?.recordedSubjectId) {
		return null;
	}
	return { ...read.records.subject, subjectId: read.recordedSubjectId };
};

/**
 * The kernel at the live end of the handovers from `kernel`. The chain
 * has no cycle: a kernel loses its own handover when it mounts, before
 * any earlier kernel is handed to it.
 */
const subjectHolder = function subjectHolder(
	kernel: InternalKernel
): InternalKernel {
	let holder = kernel;
	for (let next = handedOver.get(holder); next; next = handedOver.get(holder)) {
		holder = next;
	}
	return holder;
};

/**
 * `owner` as its writes see it once handed over: its records, under the
 * subject the live end of its handovers holds when each write runs.
 */
const withHolderSubject = function withHolderSubject(
	owner: InternalKernel
): InternalKernel {
	return {
		...owner,
		getSnapshot: () => ({
			...owner.getSnapshot(),
			subject: subjectHolder(owner).getSnapshot().subject,
		}),
	};
};

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
	// An ID this runtime generated that no save or `identify()` has used
	// yet. It lives in memory only: nothing stores a subject ID before a
	// record carries it. When the records another tab stores replace it,
	// `subject:resolved` names it.
	let unusedSubjectId: string | undefined;
	// The ID this handle generated and marked provisional, until a record
	// carries it. `identify()` does not link it, so it stays unused.
	let provisionalSubjectId: string | undefined;
	// Set while this handle announces a subject change it only followed. The
	// change came from records or a response, so there is nothing to write.
	let followingSubject = false;

	const land = function land(module: WriterModule): void {
		if (writer) {
			return;
		}
		clearTimeout(retryTimer);
		const handed = handedOver.has(kernel);
		writer = module.createPersistenceWriter(
			{
				kernel: handed ? withHolderSubject(kernel) : kernel,
				now,
				state,
				storageConfig,
			},
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

	// Set from a save's start to its completion. The records it commits are
	// announced in between, synchronously.
	let saving = false;
	// The notice acknowledgement when the latest save started.
	let noticeBeforeSave: ConsentSnapshot['noticeDismissal'] = null;

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
		// and delete a stored denial this kernel never hydrated. The notice
		// record carries it for a visitor who only acknowledged a notice.
		// Without any of them, the subject lives in memory only.
		const kinds: WriteKind[] = [];
		if (snapshot.explicitChoice) {
			kinds.push('choice');
		}
		if (snapshot.noticeDismissal) {
			kinds.push('notice');
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
			saving = true;
			state.subjectBeforeSave = kernel.getSnapshot().subject?.subjectId;
			noticeBeforeSave = kernel.getSnapshot().noticeDismissal;
			unusedSubjectId = undefined;
		}),
		kernel.events.on('command:save:completed', () => {
			saving = false;
		}),
		kernel.events.on('user:identified', () => {
			// `identify()` links an ID only once a record carries it. A
			// provisional one stays unused and still follows another tab.
			if (unusedSubjectId !== provisionalSubjectId) {
				unusedSubjectId = undefined;
			}
		}),
		kernel.events.on('choice:recorded', ({ actionAt, snapshot }) => {
			noteGeneratedSubject(snapshot, actionAt);
			state.choiceRecorded = true;
			state.noticeRecorded = snapshot.noticeDismissal !== null;
			// A choice under a notice prompt acknowledges the notice too.
			request('choice', 'notice');
		}),
		kernel.events.on('subject:resolved', ({ snapshot }) => {
			if (!followingSubject) {
				rekeyRecords(snapshot);
			}
		}),
		kernel.events.on('notice:dismissed', ({ snapshot, dismissal }) => {
			// Only a save can have made the subject ID. `dismissNotice()` keeps
			// the one it found, which may be a server's.
			if (saving) {
				noteGeneratedSubject(snapshot, dismissal.dismissedAt);
			}
			state.noticeRecorded = true;
			request('notice');
			// `dismissNotice()` sends nothing, so the ID stops being
			// provisional only once the stored acknowledgement carries it.
			const id = snapshot.subject?.subjectId;
			void (async () => {
				await landing;
				writer?.flush();
				if (
					id !== undefined &&
					kernel.getSnapshot().subject?.subjectId === id &&
					readStoredRecordsForReconcile(storageConfig, now())
						.recordedSubjectId === id
				) {
					kernel.markProvisionalSubject(null);
					provisionalSubjectId = undefined;
				}
			})();
		}),
		kernel.events.on('vendors:recorded', ({ actionAt, snapshot }) => {
			noteGeneratedSubject(snapshot, actionAt);
			state.vendorsRecorded = true;
			// A save under a notice prompt acknowledges the notice. One that
			// confirms no category emits no `choice:recorded` to carry it.
			if (
				snapshot.noticeDismissal &&
				snapshot.noticeDismissal !== noticeBeforeSave
			) {
				state.noticeRecorded = true;
				request('vendors', 'notice');
			} else {
				request('vendors');
			}
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
	 * Another tab can clear after the server read the cookies. The browser's
	 * clear epoch then voids the seeded records from before it, as it voids
	 * stored ones, and a record it voids yields to what storage holds. A
	 * seeded decision from the clearing millisecond is kept: the seed does
	 * not say whether its writer had seen the clear. Seeded decisions that
	 * outlive the clear stay the seed, so a stored grant still cannot
	 * replace them. From another handle's queue that missed the clear, only
	 * records made since count. The seeded subject keeps its ID alone, as after any
	 * clear.
	 *
	 * The read also becomes what the writer starts from: the kernel's
	 * records stay the seed's, and storage is what it was read as here.
	 * Reconciling merges only records that changed since this read, so a
	 * grant left out here stays out until another runtime writes storage.
	 * Returns the subject the stored records carry, `null` for none.
	 */
	let seedMissedClear = false;
	const applyNewerStoredRecords =
		function applyNewerStoredRecords(): ConsentSubject | null {
			const at = now();
			const read = readStoredRecordsForReconcile(storageConfig, at);
			baseline = [read, false];
			const queued = queuedWrites.get(consentKey)?.getSnapshot();
			const records =
				queued && queueMissedClear(queued, read.epoch)
					? queuedSinceClear(read.records, queued, read.epoch)
					: withQueued(read.records);
			const snapshot = kernel.getSnapshot();
			const patch: HydrationRecords = {};
			const choice = choiceSinceEpoch(
				snapshot.explicitChoice,
				read.epoch,
				false
			);
			const choicePatch = seededChoicePatch(
				snapshot.explicitChoice,
				choice,
				records.choice
			);
			if (choicePatch !== undefined) {
				patch.choice = choicePatch;
			}
			const notice = noticeSinceEpoch(snapshot.noticeDismissal, read.epoch);
			if (notice !== snapshot.noticeDismissal) {
				patch.noticeDismissal = records.noticeDismissal ?? null;
			}
			const vendors = vendorChoiceSinceEpoch(snapshot.vendorChoice, read.epoch);
			const { vendorChoice } = records;
			if (vendors !== snapshot.vendorChoice) {
				patch.vendorChoice = vendorChoice ?? null;
			} else if (
				vendorChoice &&
				vendorChoice.confirmedAt > (vendors?.confirmedAt ?? -1)
			) {
				patch.vendorChoice = vendorChoice;
			}
			seedMissedClear = [
				choice !== snapshot.explicitChoice,
				notice !== snapshot.noticeDismissal,
				vendors !== snapshot.vendorChoice,
			].includes(true);
			const subject = seedMissedClear
				? seededSubjectCut(snapshot.subject)
				: undefined;
			if (subject !== undefined) {
				patch.subject = subject;
			}
			if (Object.keys(patch).length > 0) {
				kernel.hydrate({ ...patch, now: at });
			}
			return recordedSubjectOf(read);
		};

	/**
	 * Whether this handle gives the kernel a subject ID. A throwaway kernel
	 * keeps whatever subject it has, and an app that owns permissions owns
	 * the subject too.
	 */
	const handlesSubject = function handlesSubject(): boolean {
		return !options.keepSubject && !kernel.getSnapshot().externalPermissions;
	};

	/**
	 * `records` with the ID the kernel holds when no stored record carries
	 * one, such as after another runtime removed the records. The ID lives
	 * in memory until a record carries it, so a read that finds none keeps
	 * it instead of making a new one. A linked identity goes with the
	 * records that carried it.
	 */
	const withKernelSubjectId = function withKernelSubjectId(
		records: HydrationRecords,
		read: StoredRecords
	): HydrationRecords {
		const held = kernel.getSnapshot().subject?.subjectId;
		if (
			!handlesSubject() ||
			read.recordedSubjectId ||
			records.subject === undefined ||
			!held
		) {
			return records;
		}
		return {
			...records,
			subject: { ...records.subject, subjectId: held },
		};
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
		const stored = hydrateFromStorage(
			kernel,
			storageConfig,
			now(),
			(records, read) => withQueued(withKernelSubjectId(records, read))
		);
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

	/**
	 * Follows the kernel's subject ID. An ID removed with
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
			// The records rewritten under the new ID, a notice acknowledgement
			// included, keep it from following another tab.
			unusedSubjectId =
				snapshot.explicitChoice ||
				snapshot.vendorChoice ||
				snapshot.noticeDismissal
					? undefined
					: next;
			state.freshSubjectId = next;
			state.freshSubjectAt = now();
			// With records, the new ID is rewritten into them below.
			if (unusedSubjectId === next) {
				kernel.markProvisionalSubject(next);
				provisionalSubjectId = next;
			}
			kernel.hydrate({ subject: { ...snapshot.subject, subjectId: next } });
			return;
		}
		if (
			(snapshot.explicitChoice ||
				snapshot.vendorChoice ||
				snapshot.noticeDismissal) &&
			readStoredRecordsForReconcile(storageConfig, now()).recordedSubjectId !==
				id
		) {
			// `set.subjectId` and init change the ID without a save. The
			// records follow it, or the next load restores the old ID.
			rekeyRecords(snapshot);
		}
		if (previous !== undefined && previous === unusedSubjectId) {
			unusedSubjectId = undefined;
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
	 * Whether `id` is only what the cookies say, read as a server reads
	 * them. A seed like that adds nothing to what storage holds here: a
	 * record cookie whose rewrite the browser dropped still names the old
	 * ID, and only localStorage shows it is stale.
	 */
	const fromCookiesAlone = function fromCookiesAlone(id: string): boolean {
		const header = readCookieHeader();
		// Cookies this page cannot read leave localStorage as the only record
		// source, so a seed adds nothing to what it holds.
		return (
			header === null ||
			readStoredRecordsFromCookieHeader(header, storageConfig, now()).subject
				?.subjectId === id
		);
	};

	/**
	 * Whether a seed's linked identity is more than the cookies say: an
	 * account or provider that a seed from elsewhere, such as a backend,
	 * names for the ID storage holds. Cookies this page cannot read cannot
	 * tell, so storage keeps it.
	 */
	const seedBringsIdentity = function seedBringsIdentity(
		seed: ConsentSubject
	): boolean {
		if (!(seed.externalId || seed.identityProvider)) {
			return false;
		}
		const header = readCookieHeader();
		return (
			header !== null &&
			!sameSubject(
				readStoredRecordsFromCookieHeader(header, storageConfig, now()).subject,
				seed
			)
		);
	};

	/**
	 * The subject to start with and whether its ID is a local one, which
	 * yields to a subject another runtime stored. Records storage held keep
	 * the ID they carry. Otherwise a subject the server named is kept, then
	 * a new one. A server seed read from the cookies alone yields to the
	 * records as storage holds them, as on a load that hydrates. A seed
	 * from elsewhere, such as a backend or the app, keeps its ID.
	 */
	const startingSubject = function startingSubject(
		before: ConsentSubject | null,
		recorded: ConsentSubject | null,
		legacy: string | null
	): [subject: ConsentSubject, local: boolean, origin?: 'new' | 'legacy'] {
		const snapshot = kernel.getSnapshot();
		const { subject } = snapshot;
		if (!recorded) {
			if (before?.subjectId) {
				return [{ ...subject, ...before }, false];
			}
			if (subject?.subjectId) {
				return [subject, true];
			}
			// Records an older version stored without an ID took theirs from
			// the 3.2 `<key>-sid` copy. Keeping it with them now spares the
			// visitor a new ID on every load until they save again.
			if (
				legacy &&
				(snapshot.explicitChoice ||
					snapshot.vendorChoice ||
					snapshot.noticeDismissal)
			) {
				return [{ ...subject, subjectId: legacy }, false, 'legacy'];
			}
			return [{ ...subject, subjectId: generateSubjectId() }, true, 'new'];
		}
		if (
			subject &&
			subject.subjectId === recorded.subjectId &&
			seedBringsIdentity(subject)
		) {
			// The seed names the stored ID with a linked identity the cookies
			// do not hold, so it did not come from them: it stands, whole.
			return [subject, false];
		}
		if (
			!subject?.subjectId ||
			seedMissedClear ||
			fromCookiesAlone(subject.subjectId)
		) {
			// Hydration is deferred: take the subject it will bring, whole. A
			// seed from a consent cookie older than storage (or invalidated by
			// a cross-tab clear) yields to the subject storage agrees on,
			// linked identity included: the seed's belongs to the ID it names.
			return [recorded, false];
		}
		return [subject, false];
	};

	/**
	 * Gives the kernel a subject ID at startup, before anything binds to
	 * it (see {@link startingSubject}). An ID no stored record carries stays
	 * in memory until a save records it, so nothing is stored before the
	 * visitor acts. The ID alone records no choice.
	 */
	const startSubject = function startSubject(
		before: ConsentSubject | null,
		recorded: ConsentSubject | null,
		legacy: string | null
	): boolean {
		const snapshot = kernel.getSnapshot();
		const [subject, local, origin] = startingSubject(before, recorded, legacy);
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
		if (origin === 'new') {
			kernel.markProvisionalSubject(id);
			provisionalSubjectId = id;
		}
		if (!sameSubject(subject, snapshot.subject)) {
			kernel.hydrate({ subject });
		}
		if (origin === 'legacy') {
			rekeyRecords(kernel.getSnapshot());
		}
		return origin === 'legacy';
	};

	/**
	 * Starts from the subject another handle's queued records carry. This
	 * handle starts from those records (`withQueued`), so it takes their
	 * subject too, and the change to it: it rewrites the records under the
	 * subject it holds when its own write code lands. The owner's handle
	 * then lands only its decisions. Storage keeps the ID it held until
	 * then.
	 */
	const startQueuedSubject = function startQueuedSubject(
		owner: InternalKernel,
		id: string
	): void {
		subjectId = id;
		if (owner === kernel) {
			return;
		}
		// The owner's whole subject, linked identity included: a seed this
		// kernel started with names another ID.
		const queued = owner.getSnapshot().subject;
		if (!sameSubject(queued, kernel.getSnapshot().subject)) {
			kernel.hydrate({ subject: queued });
		}
		// The subject change is this handle's now: a later one made here
		// supersedes it before the owner's write could land it.
		handedOver.set(owner, kernel);
		// An ID the owner generated that no stored record carries yet stays
		// provisional here until one does.
		if (owner.getProvisionalSubject() === id) {
			kernel.markProvisionalSubject(id);
			provisionalSubjectId = id;
			void (async () => {
				await landing;
				writer?.flush();
				if (
					kernel.getSnapshot().subject?.subjectId === id &&
					readStoredRecordsForReconcile(storageConfig, now())
						.recordedSubjectId === id
				) {
					kernel.markProvisionalSubject(null);
					provisionalSubjectId = undefined;
				}
			})();
		}
		if (
			readStoredRecordsForReconcile(storageConfig, now()).recordedSubjectId !==
			id
		) {
			rekeyRecords(kernel.getSnapshot());
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
						if (watched.has((event as StorageEvent).key)) {
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
		// c15t 3.2 stored the subject ID before any choice. It is read once,
		// for records an older version stored without an ID, then removed.
		// Only a handle that owns the subject adopts it, and a throwaway one
		// that only reads (`keepSubject`, such as the script-loader
		// preload's) leaves the copy alone.
		const legacySubjectId = handlesSubject()
			? readLegacySubjectId(storageConfig)
			: null;
		// Whether the copy waits for the records to carry an ID before it goes.
		let keepLegacyUntilRecorded = false;
		// A kernel mounted again holds its own subject, whatever an earlier
		// handle handed it to.
		handedOver.delete(kernel);
		const before = kernel.getSnapshot().subject;
		const recorded = options.skipHydration
			? applyNewerStoredRecords()
			: recordedSubjectOf(hydrateStored());
		if (handlesSubject()) {
			const queued = queuedWrites.get(consentKey);
			const queuedSubjectId = queued?.getSnapshot().subject?.subjectId;
			if (queued && queuedSubjectId) {
				startQueuedSubject(queued, queuedSubjectId);
				// An earlier handle may have adopted the copy, and its rewrite
				// is still queued.
				keepLegacyUntilRecorded = legacySubjectId !== null;
			} else {
				keepLegacyUntilRecorded = startSubject(
					seedMissedClear ? subjectAfterClear(before) : before,
					recorded,
					legacySubjectId
				);
			}
			unsubscribers.push(kernel.subscribe(followSubjectId));
		}
		if (keepLegacyUntilRecorded) {
			// The copy is the ID's only durable home until the records carry
			// it, so it goes once the rewrite has landed. A page that unloads
			// first, or write code that never loads, keeps it for next time.
			void (async () => {
				await landing;
				writer?.flush();
				if (
					readStoredRecordsForReconcile(storageConfig, now())
						.recordedSubjectId !== null
				) {
					removeLegacySubjectId(storageConfig);
				}
			})();
		} else if (!options.keepSubject) {
			removeLegacySubjectId(storageConfig);
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
			state.noticeRecorded = false;
			state.vendorsRecorded = false;
			// The cleared records' identity is gone, and the ID stays: an ID
			// a save already under way generates is a new local one, not one
			// the server resolved.
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

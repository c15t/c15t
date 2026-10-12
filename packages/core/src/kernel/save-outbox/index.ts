/**
 * The save outbox: everything that happens to a recorded choice after
 * `commands.save()` recorded it.
 *
 * `send()` takes the payload of one recorded action and owns the rest:
 * the transport call, trimming what newer state superseded, queueing what
 * the transport could not take, replaying the queue, moving the visitor to
 * a new subject id when the backend refuses theirs, and asking for a retry
 * when the browser comes back online. The queue lives in a
 * {@link SaveOutboxStore}.
 *
 * The send path loads with the kernel. Everything that reads the stored
 * queue (validation, replay, reassignment) is in `queue.ts`, imported the
 * first time it is needed, so a visitor with nothing queued never loads it.
 * A failed save never waits for it: until it has loaded, the entry is
 * appended as is and normalized on the next read.
 *
 * Interface:
 * - Write before send. `send()` makes no transport call before the
 *   macrotask after it was called. `commands.save()` calls it once the
 *   action's commit has notified every listener, so a local writer that
 *   handed its write to a macrotask from a listener (persistence schedules
 *   `setTimeout(0)`) lands it before the request leaves: timers with the
 *   same delay run in the order they were set. A writer that cannot write
 *   by then (persistence while its write code loads) holds the request
 *   through `kernel.holdSaves()` (`hold()` here). `send()` waits for that
 *   hold first, and without a transport `save` it resolves only after it,
 *   so nothing that waits for a save's completion (a revocation reload)
 *   overtakes the write either. A writer that defers longer without holding gives up
 *   that guarantee.
 * - A save is only ever sent, queued or discarded for the part of it the
 *   current state still holds ({@link withoutSuperseded}). Once the stored
 *   records were replaced or cleared, or the visitor or the choice contract
 *   changed, nothing of it is sent or queued. This is checked again inside
 *   the queue transaction, so a clear that lands while a save waits for the
 *   store cannot be undone by it.
 * - `clear()` empties the queue and the reassignment records. The kernel
 *   calls it on `records:cleared`, so every way of clearing the visitor's
 *   records drops the saves of the subject they reset away from. Storage is
 *   emptied before the event returns, without waiting for another tab's
 *   lock, so a page that closes right after a clear leaves nothing for the
 *   next page to replay; a transaction under the lock then empties it
 *   again.
 * - Whenever a send or replay leaves something queued, the outbox calls
 *   `retryWhenOnline`. The kernel's one connectivity listener then calls
 *   `replay()` on `online`, next to its init retry, and only while the
 *   kernel is not disposed.
 * - Queue transactions never span a network call: a hung transport must
 *   not block other tabs. Two tabs may replay the same entry; the persisted
 *   `givenAt` makes the backend derive the same consent id for both.
 */

import type { OptionalConsentCategory } from '../../consent-record/types';
import {
	isConsentSaveRejection,
	isSubjectConflict,
} from '../../transports/save-rejection';
import type {
	ConsentSnapshot,
	KernelTransport,
	SavePayload,
	SaveResult,
} from '../../types';
import type { KernelRuntime } from '../runtime';
import type { EnqueueResult, QueueWorker, QueueWorkerOptions } from './queue';
import { queueTools } from './queue-tools';
import type { SaveOutboxStore } from './store';
import {
	liveSupersession,
	withoutSuperseded,
	withSubjectId,
} from './supersession';
import { warnInDevelopment } from './warn';

export type { OutboxSlot, OutboxTransaction, SaveOutboxStore } from './store';
export { createBrowserOutboxStore, createMemoryOutboxStore } from './store';

/** One recorded action, as `commands.save()` hands it to the outbox. */
export interface RecordedAction {
	/** Records generation the action landed in. */
	generation: number;
	/** The snapshot the action committed. */
	snapshot: ConsentSnapshot;
	/** Categories the action confirmed, echoed in the result. */
	confirmed: readonly OptionalConsentCategory[];
}

export interface SaveOutbox {
	/**
	 * Send one recorded action. Resolves once the transport answered and
	 * the queue was updated; never rejects. Without a transport `save`, it
	 * resolves at once as accepted.
	 */
	send: (payload: SavePayload, action: RecordedAction) => Promise<SaveResult>;
	/**
	 * Replay the queue, one entry at a time, emitting `save:replayed` for
	 * each. Overlapping calls share one run. Asks for an online retry while
	 * anything is left.
	 */
	replay: () => Promise<void>;
	/**
	 * Drop every queued save and subject reassignment: from storage before
	 * it returns, and again under the store's lock once that is granted.
	 */
	clear: () => Promise<void>;
	/**
	 * Keep requests from leaving until `until` settles: a local write that
	 * is not ready yet. Requests already sent are not held.
	 */
	hold: (until: Promise<unknown>) => void;
}

export interface SaveOutboxOptions {
	runtime: KernelRuntime;
	transport: KernelTransport | undefined;
	store: SaveOutboxStore;
	/** Called whenever something is left queued; replay once back online. */
	retryWhenOnline: () => void;
	/** Loads the queue module. Defaults to `import('./queue')`. */
	loadQueue?: () => Promise<{
		createQueueWorker: (options: QueueWorkerOptions) => QueueWorker;
	}>;
}

/**
 * Tell a developer that a save did not reach the backend. Otherwise the only
 * signal is `onError`, and a queued save looks the same as a recorded one.
 */
const SAVE_FAILED_WARNINGS = {
	queued:
		'[c15t] Consent save failed. The choice is kept in this browser and queued, and is resent on the next init or when the browser comes back online.',
	rejected:
		'[c15t] The backend refused the consent save, so it will not be resent. The choice is kept in this browser only.',
	unstored:
		'[c15t] Consent save failed, and storage refused to queue it, so it will not be resent. The choice is kept in this browser only.',
} as const;

const warnSaveFailed = function warnSaveFailed(
	outcome: keyof typeof SAVE_FAILED_WARNINGS | 'superseded',
	error?: unknown
): void {
	// A save whose records were cleared or replaced meanwhile lost nothing.
	if (outcome !== 'superseded') {
		warnInDevelopment(SAVE_FAILED_WARNINGS[outcome], error);
	}
};

/**
 * Create the save outbox of one kernel.
 */
export const createSaveOutbox = function createSaveOutbox({
	runtime,
	transport,
	store,
	retryWhenOnline,
	loadQueue = () => import('./queue'),
}: SaveOutboxOptions): SaveOutbox {
	const { batch, commit, emit, getSnapshot } = runtime;
	let worker: QueueWorker | undefined;
	// What requests wait for after the pre-send macrotask: see `hold()`.
	let held: Promise<unknown> | undefined;

	/** The queue module, loaded once; `undefined` when it cannot load. */
	const loadWorker = async function loadWorker(): Promise<
		QueueWorker | undefined
	> {
		if (!worker) {
			try {
				const { createQueueWorker } = await loadQueue();
				worker ??= createQueueWorker({ runtime, store, tools: queueTools });
			} catch {
				// Offline and never loaded: callers fall back or skip.
			}
		}
		return worker;
	};

	const hasQueued = function hasQueued(): Promise<boolean> {
		return store.transact((tx) => tx.read('saves') !== undefined);
	};

	/**
	 * Queue what `current()` still holds. Until the queue module has loaded,
	 * the entry is appended as is and the module starts loading; its next
	 * read normalizes the list. A failed save therefore settles without
	 * waiting for code, and is kept even when the network that failed it
	 * cannot deliver the module either.
	 *
	 * Nothing is queued when the records were cleared or replaced while the
	 * transaction waited for the store, or when storage refuses the write.
	 */
	const enqueue = function enqueue(
		current: () => SavePayload | null
	): Promise<EnqueueResult> {
		if (worker) {
			return worker.enqueue(current);
		}
		void loadWorker();
		return store.transact((tx) => {
			const payload = current();
			if (!payload) {
				return 'superseded';
			}
			const stored = tx.read('saves');
			return tx.write('saves', [
				...(Array.isArray(stored) ? stored : []),
				{ attempts: 0, payload, queuedAt: Date.now() },
			])
				? 'queued'
				: 'unstored';
		});
	};

	/**
	 * Drop queued saves `payload` superseded, so a later replay cannot
	 * overwrite the newer receipts with stale ones.
	 */
	const discard = async function discard(payload: SavePayload): Promise<void> {
		if (await hasQueued()) {
			await (await loadWorker())?.discard(payload);
		}
	};

	const clear = function clear(): Promise<void> {
		// At once, so the page can close before the lock is granted: a later
		// page must not replay the cleared subject's saves. Then again under
		// the lock, after any transaction that read the lists before this.
		store.clear();
		return store.transact((tx) => {
			tx.write('saves', []);
			tx.write('reassignments', []);
		});
	};

	const replay = async function replay(): Promise<void> {
		const save = transport?.save;
		if (!save || !(await hasQueued())) {
			return;
		}
		// A replay is no longer the page that made the save: it carries no
		// consent journey, so a backend never links it to this page load.
		const resend: NonNullable<KernelTransport['save']> = (payload) =>
			save(payload, { replay: true });
		if (await (await loadWorker())?.replay(resend)) {
			retryWhenOnline();
		}
	};

	// -- Send ------------------------------------------------------------------

	/**
	 * Queue a save the transport threw on, unless the backend refused it for
	 * good: that one would be refused again on every replay. Queued older
	 * saves it replaced are dropped instead, so they can't replay over the
	 * newer choice. The choice stays recorded locally either way.
	 */
	const settleThrownSave = async function settleThrownSave(
		remaining: SavePayload,
		current: () => SavePayload | null,
		error: unknown
	): Promise<void> {
		if (isConsentSaveRejection(error)) {
			warnSaveFailed('rejected', error);
			await discard(remaining);
			return;
		}
		warnSaveFailed(await enqueue(current), error);
		retryWhenOnline();
	};

	/**
	 * Take the subject id the backend returned for the newest action: only
	 * while the action's choice and subject are still the current ones.
	 */
	const adoptServerSubject = function adoptServerSubject(
		subjectId: string | undefined,
		action: ConsentSnapshot
	): void {
		const current = getSnapshot();
		if (
			!subjectId ||
			subjectId === current.subject?.subjectId ||
			current.explicitChoice !== action.explicitChoice ||
			current.subject?.subjectId !== action.subject?.subjectId
		) {
			return;
		}
		batch(() => {
			commit({ subject: { ...current.subject, subjectId } });
			emit({ snapshot: getSnapshot(), type: 'subject:resolved' });
		});
	};

	/**
	 * Transport phase of one action. The outcome only touches the queue
	 * while the action's confirmed receipts are current. Disjoint category
	 * actions remain independent. Only the newest action can map the subject
	 * returned by the server; older outcomes cannot replace its identity.
	 */
	const sendAction = async function sendAction(
		payload: SavePayload,
		action: RecordedAction,
		// False on the resend after a subject reassignment, so a backend that
		// refuses every id costs one extra request, not a loop.
		reassign: boolean
	): Promise<SaveResult> {
		const { confirmed, generation, snapshot: actionSnapshot } = action;
		const currentPayload = (): SavePayload | null => {
			const current = getSnapshot();
			if (
				runtime.getGeneration() !== generation ||
				current.user !== actionSnapshot.user ||
				current.evaluationPolicy.choice.fingerprint !==
					actionSnapshot.evaluationPolicy.choice.fingerprint
			) {
				return null;
			}
			return withoutSuperseded(
				payload,
				liveSupersession(actionSnapshot, current)
			);
		};
		// A local write that is not ready yet holds the request, and without
		// a request the save's completion, which a revocation reload waits for.
		if (held) {
			await held;
		}
		const save = transport?.save;
		if (!save) {
			return { confirmed, ok: true, subjectId: payload.subjectId };
		}
		try {
			// Write before send, and paint before send: see the module
			// interface. Nothing goes out before the next macrotask.
			await new Promise((resolve) => {
				setTimeout(resolve, 0);
			});
			const sending = currentPayload();
			if (!sending) {
				return { confirmed, ok: false };
			}
			const result = await save(sending);
			const remaining = currentPayload();
			if (!remaining) {
				return { ...result, confirmed };
			}
			if (result.ok) {
				await discard(remaining);
			} else {
				warnSaveFailed(await enqueue(currentPayload));
				retryWhenOnline();
			}
			if (result.ok && currentPayload()) {
				adoptServerSubject(result.subjectId, actionSnapshot);
			}
			return { ...result, confirmed };
		} catch (error) {
			const remaining = currentPayload();
			const queue =
				reassign && remaining && isSubjectConflict(error)
					? await loadWorker()
					: undefined;
			const subjectId =
				queue && remaining
					? await queue.reassignSubject(remaining.subjectId)
					: null;
			if (subjectId !== null) {
				// The action's snapshot under the new subject, so a canonical id
				// the resend returns is adopted like any other save's.
				return sendAction(
					withSubjectId(payload, subjectId),
					{
						...action,
						snapshot: {
							...actionSnapshot,
							subject: { ...actionSnapshot.subject, subjectId },
						},
					},
					false
				);
			}
			emit({ command: 'save', error, type: 'command:error' });
			if (remaining) {
				await settleThrownSave(remaining, currentPayload, error);
			}
			return { confirmed, ok: false };
		}
	};

	return {
		clear,
		hold(until) {
			held = Promise.allSettled([held, until]);
		},
		replay,
		send: (payload, action) => sendAction(payload, action, true),
	};
};

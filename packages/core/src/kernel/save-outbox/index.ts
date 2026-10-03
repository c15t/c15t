/**
 * The save outbox: everything that happens to a recorded choice after
 * `commands.save()` recorded it.
 *
 * `send()` takes the payload of one recorded action and owns the rest:
 * the transport call, trimming what newer state superseded, queueing what
 * the transport could not take, replaying the queue, moving the visitor to
 * a new subject id when the backend refuses theirs, and retrying when the
 * browser comes back online. The queue lives in a {@link SaveOutboxStore}.
 *
 * Interface:
 * - Write before send. `send()` makes no transport call before the
 *   macrotask after it was called. `commands.save()` calls it once the
 *   action's commit has notified every listener, so a local writer that
 *   handed its write to a macrotask from a listener (persistence schedules
 *   `setTimeout(0)`) lands it before the request leaves: timers with the
 *   same delay run in the order they were set. A writer that defers longer
 *   gives up that guarantee.
 * - A save is only ever sent, queued or discarded for the part of it the
 *   current state still holds ({@link withoutSuperseded}). Once the stored
 *   records were replaced or cleared, or the visitor or the choice contract
 *   changed, nothing of it is sent or queued. This is checked again inside
 *   the queue transaction, so a clear that lands while a save waits for the
 *   store cannot be undone by it.
 * - `clear()` empties the queue and the reassignment records. The kernel
 *   calls it on `records:cleared`, so every way of clearing the visitor's
 *   records drops the saves of the subject they reset away from.
 * - Queue transactions never span a network call: a hung transport must
 *   not block other tabs. Two tabs may replay the same entry; the persisted
 *   `givenAt` makes the backend derive the same consent id for both.
 */

import type { OptionalConsentCategory } from '../../consent-record/types';
import { generateSubjectId } from '../../libs/generate-subject-id';
import {
	isConsentSaveRejection,
	isSubjectConflict,
} from '../../transports/save-rejection';
import type {
	ConsentSnapshot,
	ConsentSubject,
	KernelTransport,
	SavePayload,
	SaveResult,
} from '../../types';
import type { KernelRuntime } from '../runtime';
import {
	isSamePendingSave,
	liveSupersession,
	MAX_REPLAY_ATTEMPTS,
	normalizePendingSaves,
	readPendingSaves,
	readReassignments,
	supersededBy,
	withoutSuperseded,
	withSubjectId,
} from './entries';
import type { PendingSaveEntry } from './entries';
import type { SaveOutboxStore } from './store';

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
	 * each. Overlapping calls share one run. Listens for `online` while
	 * anything is left.
	 */
	replay: () => Promise<void>;
	/** Drop every queued save and subject reassignment. */
	clear: () => Promise<void>;
	/** Stop replaying and remove the `online` listener. */
	dispose: () => void;
	/** Undo `dispose()`; an explicit `init()` re-arms the kernel. */
	rearm: () => void;
}

export interface SaveOutboxOptions {
	runtime: KernelRuntime;
	transport: KernelTransport | undefined;
	store: SaveOutboxStore;
}

/** `retry` keeps the entry for another attempt; the others remove it. */
type ReplayOutcome = 'saved' | 'retry' | 'rejected';

/**
 * Create the save outbox of one kernel.
 */
// oxlint-disable-next-line max-lines-per-function -- Sending, queueing, replay and reassignment share the subject claims through closures.
export const createSaveOutbox = function createSaveOutbox({
	runtime,
	transport,
	store,
}: SaveOutboxOptions): SaveOutbox {
	const { batch, commit, emit, getSnapshot } = runtime;
	// Subject ids this kernel replaced after the backend refused them as
	// another tenant's, old to the claim for the new one. A live save and a
	// replay can both hit the same refusal; this sends both to one new id
	// instead of minting two. Each claim belongs to the records generation it
	// was made in: after a clear, reusing it would tie the visitor's new
	// history to the subject they reset away from.
	const reassignedSubjects = new Map<
		string,
		{ claim: Promise<string | null>; generation: number }
	>();
	let activeReplay: Promise<boolean> | null = null;
	let disposed = false;
	let onlineListener = false;

	const currentSubjectId = () => getSnapshot().subject?.subjectId;

	// -- Queue ---------------------------------------------------------------

	/** Queue what `current()` still holds, read inside the transaction. */
	const enqueue = function enqueue(
		current: () => SavePayload | null
	): Promise<void> {
		return store.transact((tx) => {
			const payload = current();
			if (!payload) {
				return;
			}
			const now = Date.now();
			const pending = readPendingSaves(tx, now);
			pending.push({ attempts: 0, payload, queuedAt: now });
			tx.write('saves', normalizePendingSaves(pending, now));
		});
	};

	/**
	 * Drop the queued saves `payload` superseded, so a later replay cannot
	 * overwrite the newer receipts with stale ones. Queued actions for other
	 * categories keep waiting for their own replay.
	 */
	const discard = function discard(payload: SavePayload): Promise<void> {
		return store.transact((tx) => {
			const pending = readPendingSaves(tx, Date.now());
			const remaining = pending.flatMap((candidate) => {
				const kept = withoutSuperseded(
					candidate.payload,
					supersededBy(candidate.payload, payload)
				);
				return kept ? [{ ...candidate, payload: kept }] : [];
			});
			if (JSON.stringify(remaining) !== JSON.stringify(pending)) {
				tx.write('saves', remaining);
			}
		});
	};

	const clear = function clear(): Promise<void> {
		return store.transact((tx) => {
			tx.write('saves', []);
			tx.write('reassignments', []);
		});
	};

	// -- Subject reassignment --------------------------------------------------

	/**
	 * The subject id that replaces `from` in this browser, shared by every
	 * kernel on the store. The first caller records `proposed`; any later
	 * one gets the id already recorded. Two tabs refused at the same moment
	 * would otherwise each pick an id, and one of them would persist a
	 * subject the backend holds no consent for.
	 *
	 * Every queued save for `from` moves to the returned id in the same
	 * transaction, so none is replayed under the refused one. Calling it
	 * again moves saves queued under `from` since.
	 *
	 * `isCurrent` is asked inside the transaction, before anything is
	 * written. Waiting for the store can take long enough for the visitor to
	 * be cleared or switched; then nothing is recorded or moved and this
	 * resolves to `null`, so saves that no longer belong to the visitor stay
	 * where they were.
	 */
	const claimReassignment = function claimReassignment(
		from: string,
		proposed: string,
		isCurrent: () => boolean
	): Promise<string | null> {
		return store.transact((tx) => {
			if (!isCurrent()) {
				return null;
			}
			const now = Date.now();
			const reassignments = readReassignments(tx, now);
			const recorded = reassignments.find((item) => item.from === from);
			const to = recorded?.to ?? proposed;
			if (!recorded) {
				tx.write('reassignments', [...reassignments, { at: now, from, to }]);
			}

			const pending = readPendingSaves(tx, now);
			if (pending.some((entry) => entry.payload.subjectId === from)) {
				const moved = pending.map((entry) =>
					entry.payload.subjectId === from
						? { ...entry, payload: withSubjectId(entry.payload, to) }
						: entry
				);
				tx.write('saves', normalizePendingSaves(moved, now));
			}
			return to;
		});
	};

	/**
	 * A save queued under `from` after this browser had already moved the
	 * visitor off it: another tab was still on `from`, or the page reloaded
	 * onto the new subject before the replay. The recorded reassignment says
	 * where it belongs; the save follows it only when that is the visitor's
	 * subject now. A clear removes the record, so a save from before a reset
	 * is dropped rather than tied to the new history. Reading the record
	 * records nothing, so a save for a subject this browser never reassigned
	 * cannot start a new reassignment.
	 */
	const followRecordedReassignment = async function followRecordedReassignment(
		from: string
	): Promise<string | null> {
		const to = await store.transact(
			(tx) =>
				readReassignments(tx, Date.now()).find((item) => item.from === from)?.to
		);
		if (to === undefined || currentSubjectId() !== to) {
			return null;
		}
		// Moves the queued saves; the record already names `to`.
		const moved = await claimReassignment(
			from,
			to,
			() => currentSubjectId() === to
		);
		return moved === null ? null : to;
	};

	/**
	 * Give the visitor a new subject id after the backend refused `from`
	 * with `SUBJECT_CONFLICT`: on a database several tenants share, another
	 * tenant already owns it. Resending under the same id is refused every
	 * time, so without this the visitor's choices would never be recorded.
	 *
	 * The new id is claimed through the store, so every tab that hits the
	 * refusal moves to the same one, and queued saves for `from` move with
	 * it. It is committed like a subject the server resolved, so persistence
	 * writes it over the stored one. A visitor set back to `from` later moves
	 * to the same id again, unless the stored consent records were cleared in
	 * between.
	 *
	 * Resolves to `null` when `from` is no longer this visitor's subject and
	 * no reassignment of it leads to the current one: a save for a subject
	 * since replaced or cleared is not moved onto whoever holds the snapshot
	 * now.
	 */
	const reassignSubject = async function reassignSubject(
		from: string
	): Promise<string | null> {
		const generation = runtime.getGeneration();
		const cached = reassignedSubjects.get(from);
		const earlier =
			cached?.generation === generation ? cached.claim : undefined;
		if (earlier === undefined && currentSubjectId() !== from) {
			return followRecordedReassignment(from);
		}
		// Still the visitor this reassignment started for: on `from`, or
		// already moved to its replacement. The subject alone decides. The
		// records generation also advances when the same visitor's choice
		// changes (a server merge, another tab's save), and a clear or a
		// switch always moves the subject.
		const unchanged = (to?: string) => () => {
			const id = currentSubjectId();
			return id === from || (to !== undefined && id === to);
		};
		let claim = earlier;
		if (claim === undefined) {
			claim = claimReassignment(from, generateSubjectId(), unchanged());
			reassignedSubjects.set(from, { claim, generation });
		}
		const to = await claim;
		if (to === null) {
			return null;
		}
		// Moves saves queued under `from` since the first claim.
		if (
			earlier !== undefined &&
			(await claimReassignment(from, to, unchanged(to))) === null
		) {
			return null;
		}

		const current = getSnapshot().subject;
		if (current?.subjectId === to) {
			return to;
		}
		if (current?.subjectId !== from) {
			return null;
		}
		const subject: ConsentSubject = { ...current, subjectId: to };
		batch(() => {
			commit({ subject });
			emit({ snapshot: getSnapshot(), type: 'subject:resolved' });
		});
		return to;
	};

	// -- Online retry ----------------------------------------------------------

	const onOnline = function onOnline(): void {
		// oxlint-disable-next-line no-use-before-define -- Installed only after a send or replay left something queued.
		void replay();
	};

	const listenForOnline = function listenForOnline(): void {
		if (
			disposed ||
			onlineListener ||
			typeof window === 'undefined' ||
			typeof window.addEventListener !== 'function'
		) {
			return;
		}
		window.addEventListener('online', onOnline);
		onlineListener = true;
	};

	// -- Replay ----------------------------------------------------------------

	/**
	 * Replay one entry. Returns `null` when another kernel already replayed
	 * or dropped it, otherwise the replay outcome. A save the backend refused
	 * for good (a `ConsentSaveRejectedError`) leaves the queue at once
	 * instead of using up its attempts.
	 *
	 * The exception is a `SUBJECT_CONFLICT`: the subject id belongs to
	 * another tenant, not the choice. The visitor moves to a new subject,
	 * which rekeys the queue, and the entry is replayed once more under the
	 * new id. The move is recorded in `moved` so the rest of this run replays
	 * its other saves under the new id too. `moved` is `null` for the second
	 * attempt, so a backend that refuses every id cannot keep the loop going.
	 */
	const replayEntry = async function replayEntry(
		save: NonNullable<KernelTransport['save']>,
		entry: PendingSaveEntry,
		moved: Map<string, string> | null
	): Promise<{ ok: boolean; rejected?: string; subjectId: string } | null> {
		const stillQueued = await store.transact((tx) =>
			readPendingSaves(tx, Date.now()).some((candidate) =>
				isSamePendingSave(candidate, entry)
			)
		);
		if (!stillQueued) {
			return null;
		}

		let outcome: ReplayOutcome = 'retry';
		let rejected: string | undefined;
		try {
			const { ok } = await save(entry.payload);
			outcome = ok ? 'saved' : 'retry';
		} catch (error) {
			if (moved && isSubjectConflict(error)) {
				const subjectId = await reassignSubject(entry.payload.subjectId);
				if (subjectId !== null) {
					moved.set(entry.payload.subjectId, subjectId);
					// The queue already holds this entry under the new id.
					return replayEntry(
						save,
						{ ...entry, payload: withSubjectId(entry.payload, subjectId) },
						null
					);
				}
			}
			// Anything else keeps the entry for a later init or online event.
			if (isConsentSaveRejection(error)) {
				outcome = 'rejected';
				rejected = error.code;
			}
		}
		await store.transact((tx) => {
			const next: PendingSaveEntry[] = [];
			for (const candidate of readPendingSaves(tx, Date.now())) {
				if (!isSamePendingSave(candidate, entry)) {
					next.push(candidate);
					continue;
				}
				const attempts = candidate.attempts + 1;
				if (outcome === 'retry' && attempts < MAX_REPLAY_ATTEMPTS) {
					next.push({ ...candidate, attempts });
				}
			}
			tx.write('saves', next);
		});
		const { subjectId } = entry.payload;
		return rejected === undefined
			? { ok: outcome === 'saved', subjectId }
			: { ok: false, rejected, subjectId };
	};

	/** Replay every queued entry; resolves to whether any is left. */
	const runReplay = async function runReplay(
		save: NonNullable<KernelTransport['save']>
	): Promise<boolean> {
		const pending = await store.transact((tx) =>
			readPendingSaves(tx, Date.now())
		);
		// Subjects reassigned during this run. The queue has already moved
		// their saves, so the entries read above are looked up under the new
		// id rather than skipped as gone.
		const moved = new Map<string, string>();
		for (const queued of pending) {
			const to = moved.get(queued.payload.subjectId);
			const entry =
				to === undefined
					? queued
					: { ...queued, payload: withSubjectId(queued.payload, to) };
			// Preserve save order and avoid burst replays against the consent
			// endpoint.
			// oxlint-disable-next-line no-await-in-loop
			const result = await replayEntry(save, entry, moved);
			if (result !== null) {
				// The subject the save finally went out under, which differs from
				// the queued one after a reassignment.
				emit({ ...result, type: 'save:replayed' });
			}
		}
		return store.transact((tx) => readPendingSaves(tx, Date.now()).length > 0);
	};

	const runSharedReplay = async function runSharedReplay(
		save: NonNullable<KernelTransport['save']>
	): Promise<boolean> {
		try {
			return await runReplay(save);
		} finally {
			activeReplay = null;
		}
	};

	const replay = async function replay(): Promise<void> {
		const save = transport?.save;
		if (disposed || !save) {
			return;
		}
		activeReplay ??= runSharedReplay(save);
		if (await activeReplay) {
			listenForOnline();
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
			await discard(remaining);
			return;
		}
		await enqueue(current);
		listenForOnline();
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
				await enqueue(currentPayload);
				listenForOnline();
			}
			if (result.ok && currentPayload()) {
				adoptServerSubject(result.subjectId, actionSnapshot);
			}
			return { ...result, confirmed };
		} catch (error) {
			const remaining = currentPayload();
			const subjectId =
				reassign && remaining && isSubjectConflict(error)
					? await reassignSubject(remaining.subjectId)
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
		dispose() {
			disposed = true;
			if (
				onlineListener &&
				typeof window !== 'undefined' &&
				typeof window.removeEventListener === 'function'
			) {
				window.removeEventListener('online', onOnline);
			}
			onlineListener = false;
		},
		rearm() {
			disposed = false;
		},
		replay,
		send: (payload, action) => sendAction(payload, action, true),
	};
};

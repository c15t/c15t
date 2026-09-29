/**
 * Kernel runtime: the mutable snapshot cell, the staged draft and the
 * lifecycle helpers every command shares.
 *
 * - `commit()` merges a patch, re-derives dependent fields and adopts the
 *   result only when something changed, emitting `permissions:changed`
 *   when the effective permissions differ and, once `init` marked the
 *   kernel live, `surface:shown` when a prompt surface becomes visible.
 *   Subscribers receive the snapshot that commit produced, through the
 *   dispatcher shared with the event bus.
 * - `hydrate()` is the validated read-only boundary for stored records.
 * - `refresh()` re-evaluates at a supplied time so an elapsed expiry cannot
 *   hide behind a delayed or background timer.
 * - The deadline timer, the visibility listener and browser GPC detection
 *   are installed only after a lifecycle command ran, never at construction.
 */
import type { PresentedSelection } from '../policy';
import type {
	ConsentSnapshot,
	HydrationRecords,
	HydrationResult,
	KernelEvent,
	Listener,
	PromptSurface,
} from '../types';
import { createListenerSet } from './dispatch';
import type { Dispatcher, ListenerSet } from './dispatch';
import { buildNextSnapshot, isUnchangedPatch, snapshotChanged } from './patch';
import type { SnapshotPatch } from './patch';
import { mergeNewestChoice, validateHydrationRecords } from './records';
import { mergeServerPatch } from './server-records';
import { freezeSnapshot, isPromptSurface } from './snapshot';

/** Longest delay `setTimeout` honors without overflowing to zero. */
const MAX_TIMER_DELAY_MS = 2_147_483_647;

export interface KernelRuntime {
	getSnapshot: () => ConsentSnapshot;
	/**
	 * Records generation. Bumped whenever a hydration boundary replaces or
	 * clears the explicit choice or the subject, so an in-flight save can
	 * tell that its action was superseded and must not queue a replay.
	 */
	getGeneration: () => number;
	/** Fence pending record work after an explicit subject switch. */
	invalidateRecords: () => void;
	subscribe: (listener: Listener<ConsentSnapshot>) => () => void;
	emit: (event: KernelEvent) => void;
	/** Merge a patch and adopt the result when it changes anything. */
	commit: (patch: SnapshotPatch) => boolean;
	/**
	 * Deliver the notifications and events queued by `run` only after it
	 * returns, so a command's follow-up events precede any transition a
	 * listener starts and `getSnapshot()` inside `run` is its own commit.
	 */
	batch: Dispatcher['batch'];
	getDraft: () => PresentedSelection | null;
	setDraft: (draft: PresentedSelection | null) => void;
	/** Staged per-vendor grants, dropped when the choice contract changes. */
	getVendorDraft: () => Readonly<Record<string, boolean>> | null;
	setVendorDraft: (draft: Record<string, boolean> | null) => void;
	now: () => number;
	/** Whether a lifecycle command (init or hydrate) already ran. */
	isStarted: () => boolean;
	/** Mark the lifecycle started: detect the browser signal, install listeners. */
	start: () => void;
	/**
	 * Mark the kernel live in a visitor's browser: from here on, every commit
	 * that leaves a prompt surface visible stamps its first impression. A
	 * surface already visible is stamped at `at` (default: now). Hydration
	 * alone never marks the kernel live, so a server or test kernel that only
	 * applies records records no impression.
	 */
	markLive: (at?: number) => void;
	hydrate: (records: HydrationRecords) => HydrationResult;
	/**
	 * Apply server-mapped records, keeping the newest receipt per category
	 * so a delayed server read never overwrites a newer local action.
	 */
	mergeServerRecords: (records: HydrationRecords) => HydrationResult;
	refresh: (now?: number) => ConsentSnapshot;
	/** Install or re-arm the deadline timer from the current snapshot. */
	armDeadlineTimer: () => void;
	/** Stop timers and listeners. An explicit init or hydrate re-arms. */
	stopTimers: () => void;
	/** Re-enable after `dispose()`. */
	rearm: () => void;
}

export interface RuntimeOptions {
	initialSnapshot: ConsentSnapshot;
	initialDraft: PresentedSelection | null;
	emit: (event: KernelEvent) => void;
	/** Shared with the event bus so snapshots and events keep one order. */
	dispatcher: Dispatcher;
}

const detectBrowserGpc = function detectBrowserGpc(): boolean {
	if (typeof navigator === 'undefined') {
		return false;
	}
	try {
		const value = (navigator as Navigator & { globalPrivacyControl?: unknown })
			.globalPrivacyControl;
		return value === true;
	} catch {
		return false;
	}
};

const hasDocumentListeners = function hasDocumentListeners(): boolean {
	return (
		typeof document !== 'undefined' &&
		typeof document.addEventListener === 'function' &&
		typeof document.removeEventListener === 'function'
	);
};

/** Draft values bound to the choice fingerprint they were presented under. */
interface BoundDraft<Values> {
	fingerprint: string;
	values: Values;
}

export const createRuntime = function createRuntime(
	options: RuntimeOptions
): KernelRuntime {
	const { dispatcher, emit } = options;
	let snapshot = options.initialSnapshot;
	let draft: BoundDraft<PresentedSelection> | null = options.initialDraft
		? {
				fingerprint: snapshot.evaluationPolicy.choice.fingerprint,
				values: options.initialDraft,
			}
		: null;
	let vendorDraft: BoundDraft<Record<string, boolean>> | null = null;
	let started = false;
	let live = false;
	/**
	 * The surface the kernel, not the adapter, hid in the last commit: a
	 * derived `activeUI` change (a save clearing the prompt) rather than an
	 * explicit `set.activeUI`, together with the snapshot that hide produced.
	 * An adapter restoring that surface as the very next state change is not
	 * a new impression. Any other commit clears it, so a later derived
	 * re-show (an expired choice, a refresh, a re-init) counts again.
	 */
	let hiddenBySave: {
		snapshot: ConsentSnapshot;
		surface: PromptSurface;
	} | null = null;
	let disposed = false;
	let generation = 0;
	let timer: ReturnType<typeof setTimeout> | null = null;
	let visibilityInstalled = false;
	let listeners: ListenerSet<ConsentSnapshot> | undefined;

	const getSnapshot = () => snapshot;
	const now = () => Date.now();

	/**
	 * Whether the visible prompt surface still lacks its first impression
	 * time. Only a live kernel stamps impressions: a server render, a
	 * prerender seed or a hydrate-only kernel never records that a visitor
	 * saw anything.
	 */
	const impressionDue = function impressionDue(
		candidate: ConsentSnapshot
	): candidate is ConsentSnapshot & { activeUI: PromptSurface } {
		return (
			live &&
			isPromptSurface(candidate.activeUI) &&
			candidate.surfaceShownAt[candidate.activeUI] === null
		);
	};

	/**
	 * Candidate with the visible surface's first impression stamped at its
	 * evaluation time. `candidate` is an unfrozen copy owned by this commit.
	 */
	const stampImpression = function stampImpression(
		candidate: ConsentSnapshot & { activeUI: PromptSurface }
	): ConsentSnapshot {
		return {
			...candidate,
			surfaceShownAt: {
				...candidate.surfaceShownAt,
				[candidate.activeUI]: candidate.evaluatedAt,
			},
		};
	};

	/**
	 * `current` with only its first impression stamped, at `at`. An
	 * unchanged patch keeps every evaluator input and stays inside the
	 * current deadline, so the full derivation would hand back `current`
	 * under a new clock and revision. Every nested value is shared with the
	 * already-frozen `current`; only the two new objects need freezing.
	 */
	const stampCurrent = function stampCurrent(
		current: ConsentSnapshot & { activeUI: PromptSurface },
		at: number
	): ConsentSnapshot {
		return Object.freeze({
			...current,
			evaluatedAt: at,
			revision: current.revision + 1,
			surfaceShownAt: Object.freeze({
				...current.surfaceShownAt,
				[current.activeUI]: at,
			}),
		});
	};

	/**
	 * Deliver an adopted snapshot to subscribers, then its events. Runs as
	 * one batch so a listener that commits again queues behind this
	 * transition instead of overtaking it.
	 */
	const publish = function publish(
		current: ConsentSnapshot,
		adopted: ConsentSnapshot,
		shown: PromptSurface | null
	): void {
		dispatcher.batch(() => {
			if (listeners) {
				dispatcher.deliver(listeners, adopted);
			}
			if (adopted.effectivePermissions !== current.effectivePermissions) {
				emit({
					previous: current.effectivePermissions,
					snapshot: adopted,
					type: 'permissions:changed',
				});
			}
			if (shown !== null) {
				const event: Extract<KernelEvent, { type: 'surface:shown' }> = {
					shownAt: adopted.evaluatedAt,
					snapshot: adopted,
					surface: shown,
					type: 'surface:shown',
				};
				if (adopted.experiment) {
					event.experiment = adopted.experiment;
				}
				emit(event);
			}
		});
	};

	const commit = function commit(patch: SnapshotPatch): boolean {
		const current = snapshot;
		let adopted: ConsentSnapshot;
		if (isUnchangedPatch(current, patch)) {
			if (!impressionDue(current)) {
				return false;
			}
			adopted = stampCurrent(current, patch.now ?? current.evaluatedAt);
		} else {
			let next = buildNextSnapshot(current, patch);
			if (impressionDue(next)) {
				next = stampImpression(next);
			}
			if (!snapshotChanged(current, next)) {
				return false;
			}
			adopted = freezeSnapshot(next);
		}
		snapshot = adopted;
		const surface = adopted.activeUI;
		// A save derives `activeUI` to `none` in the same commit that clears
		// the prompt. An adapter that keeps its preference dialog open for the
		// save then restores `dialog` with an explicit `set.activeUI` before
		// anything else commits; the visitor never saw it close. That restore
		// is not a new impression. A surface the visitor reopens after the
		// kernel hid it for real is, and so is a surface the kernel derives
		// back into view later (an expired choice, a refresh, a re-init).
		const restoredAfterSave =
			hiddenBySave !== null &&
			hiddenBySave.snapshot === current &&
			hiddenBySave.surface === surface &&
			patch.activeUI === surface;
		hiddenBySave =
			isPromptSurface(current.activeUI) &&
			current.activeUI !== surface &&
			patch.activeUI === undefined
				? { snapshot: adopted, surface: current.activeUI }
				: null;
		const shown: PromptSurface | null =
			live &&
			isPromptSurface(surface) &&
			!restoredAfterSave &&
			(surface !== current.activeUI || current.surfaceShownAt[surface] === null)
				? surface
				: null;
		// Everything the events describe is settled before subscribers run: a
		// listener may commit again synchronously (an adapter hiding or
		// restoring a surface), and that nested commit must neither steal
		// this commit's events nor see a stale `hiddenBySave`. Deliver the
		// snapshot this commit produced, never the live cell, so later
		// listeners still observe this transition first.
		publish(current, adopted, shown);
		return true;
	};

	const clearTimer = function clearTimer(): void {
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}
	};

	const onVisibilityChange = function onVisibilityChange(): void {
		if (
			typeof document !== 'undefined' &&
			document.visibilityState !== 'hidden'
		) {
			// Re-evaluation after resume; listener callbacks reference each other.
			// oxlint-disable-next-line no-use-before-define
			refresh();
		}
	};

	const removeVisibilityListener = function removeVisibilityListener(): void {
		if (visibilityInstalled && hasDocumentListeners()) {
			document.removeEventListener('visibilitychange', onVisibilityChange);
		}
		visibilityInstalled = false;
	};

	const ensureVisibilityListener = function ensureVisibilityListener(): void {
		if (visibilityInstalled || disposed || !hasDocumentListeners()) {
			return;
		}
		document.addEventListener('visibilitychange', onVisibilityChange);
		visibilityInstalled = true;
	};

	const armDeadlineTimer = function armDeadlineTimer(): void {
		clearTimer();
		if (disposed || !started) {
			return;
		}
		const deadline = snapshot.nextDeadline;
		if (deadline === null) {
			removeVisibilityListener();
			return;
		}
		ensureVisibilityListener();
		// Whole milliseconds, never below one: a deadline still in the future
		// must not fire a zero-delay timer that re-evaluates before it passes.
		const delay = Math.min(
			Math.max(Math.ceil(deadline - now()), 1),
			MAX_TIMER_DELAY_MS
		);
		timer = setTimeout(() => {
			timer = null;
			// The timer callback re-evaluates; declared below.
			// oxlint-disable-next-line no-use-before-define
			refresh();
		}, delay);
	};

	const refresh = function refresh(at: number = now()): ConsentSnapshot {
		commit({ now: at });
		armDeadlineTimer();
		return snapshot;
	};

	const start = function start(): void {
		disposed = false;
		if (started) {
			return;
		}
		started = true;
		if (detectBrowserGpc()) {
			commit({ privacyDetected: true });
		}
	};

	const markLive = function markLive(at: number = now()): void {
		if (live) {
			return;
		}
		live = true;
		// A surface visible before init ran is first shown now; the stamp
		// records that impression once and emits `surface:shown` for it.
		// Only the stamp changes, so skip the patch checks a commit runs:
		// this sits on every first visit's init.
		const current = snapshot;
		if (!impressionDue(current)) {
			return;
		}
		snapshot = stampCurrent(current, at);
		hiddenBySave = null;
		publish(current, snapshot, current.activeUI);
	};

	const applyRecords = function applyRecords(
		records: HydrationRecords,
		mergeNewest: boolean
	): HydrationResult {
		const at = records.now ?? now();
		const validated = validateHydrationRecords(records, at);
		if (validated.ok === false) {
			return validated;
		}
		start();
		const { choice, ...rest } = validated.records;
		const patch: SnapshotPatch = mergeNewest
			? mergeServerPatch(snapshot, rest, at)
			: { ...rest, now: at };
		if (choice !== undefined) {
			patch.explicitChoice = mergeNewest
				? mergeNewestChoice(snapshot.explicitChoice, choice)
				: choice;
		}
		const before = snapshot;
		const reset = !mergeNewest && (choice === null || rest.subject === null);
		if (reset && snapshot.iab) {
			patch.iab = { ...snapshot.iab, authority: null, tcString: null };
		}
		const changed = commit(patch);
		if (
			reset ||
			snapshot.explicitChoice !== before.explicitChoice ||
			snapshot.subject !== before.subject
		) {
			generation += 1;
		}
		armDeadlineTimer();
		return { changed, ok: true };
	};

	const hydrate = function hydrate(records: HydrationRecords): HydrationResult {
		return applyRecords(records, false);
	};

	const mergeServerRecords = function mergeServerRecords(
		records: HydrationRecords
	): HydrationResult {
		return applyRecords(records, true);
	};

	const stopTimers = function stopTimers(): void {
		disposed = true;
		clearTimer();
		removeVisibilityListener();
	};

	return {
		armDeadlineTimer,
		batch: dispatcher.batch,
		commit,
		emit,
		// A draft presented under an earlier choice contract is stale once the
		// policy changed materially; it is dropped, never restamped.
		getDraft: () =>
			draft &&
			draft.fingerprint === snapshot.evaluationPolicy.choice.fingerprint
				? draft.values
				: null,
		getGeneration: () => generation,
		getSnapshot,
		getVendorDraft: () =>
			vendorDraft &&
			vendorDraft.fingerprint === snapshot.evaluationPolicy.choice.fingerprint
				? vendorDraft.values
				: null,
		hydrate,
		invalidateRecords: () => {
			generation += 1;
		},
		isStarted: () => started,
		markLive,
		mergeServerRecords,
		now,
		rearm() {
			disposed = false;
		},
		refresh,
		setDraft(next) {
			draft = next
				? {
						fingerprint: snapshot.evaluationPolicy.choice.fingerprint,
						values: next,
					}
				: null;
		},
		setVendorDraft(next) {
			vendorDraft = next
				? {
						fingerprint: snapshot.evaluationPolicy.choice.fingerprint,
						values: next,
					}
				: null;
		},
		start,
		stopTimers,
		subscribe(listener) {
			listeners ??= createListenerSet();
			return listeners.add(listener);
		},
	};
};

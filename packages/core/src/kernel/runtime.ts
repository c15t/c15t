/**
 * Kernel runtime: the mutable snapshot cell, the staged draft and the
 * lifecycle helpers every command shares.
 *
 * - `commit()` merges a patch, re-derives dependent fields and adopts the
 *   result only when something changed, emitting `permissions:changed`
 *   when the effective permissions differ.
 * - `hydrate()` is the validated read-only boundary for stored records.
 * - `refresh()` re-evaluates at a supplied time so an elapsed expiry cannot
 *   hide behind a delayed or background timer.
 * - The deadline timer, the visibility listener and the GPC directive are
 *   installed only after a lifecycle command ran, never at construction.
 */
import type { PrivacyOptOut } from '../consent-record/types';
import type { PresentedSelection } from '../policy';
import type {
	ConsentSnapshot,
	HydrationRecords,
	HydrationResult,
	KernelEvent,
	KernelTransport,
	Listener,
} from '../types';
import { buildNextSnapshot, snapshotChanged } from './patch';
import type { SnapshotPatch } from './patch';
import { mergeNewestChoice, validateHydrationRecords } from './records';
import type { ValidatedRecords } from './records';
import { freezeSnapshot } from './snapshot';

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
	/**
	 * Forward standing directives that were recorded without a server
	 * subject. Called once a subject is established (identify, accepted
	 * save). Each directive is sent once, with its original `recordedAt`.
	 */
	flushPrivacy: () => void;
	subscribe: (listener: Listener<ConsentSnapshot>) => () => void;
	emit: (event: KernelEvent) => void;
	/** Merge a patch and adopt the result when it changes anything. */
	commit: (patch: SnapshotPatch) => boolean;
	getDraft: () => PresentedSelection | null;
	setDraft: (draft: PresentedSelection | null) => void;
	now: () => number;
	/** Whether a lifecycle command (init or hydrate) already ran. */
	isStarted: () => boolean;
	/** Mark the lifecycle started: detect the browser signal, install listeners. */
	start: () => void;
	hydrate: (records: HydrationRecords) => HydrationResult;
	/**
	 * Apply server-mapped records, keeping the newest receipt per category
	 * so a delayed server read never overwrites a newer local action.
	 */
	mergeServerRecords: (records: HydrationRecords) => HydrationResult;
	refresh: (now?: number) => ConsentSnapshot;
	/** Record the standing GPC directive when a detected signal is honored. */
	reconcilePrivacy: (now: number) => void;
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
	transport: KernelTransport | undefined;
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

/**
 * Server records never remove local standing state: directives union with
 * the local list, a notice dismissal keeps the newest, and subject fields
 * fill in without dropping local identifiers.
 */
const mergeServerPatch = function mergeServerPatch(
	current: ConsentSnapshot,
	records: Omit<ValidatedRecords, 'choice'>,
	now: number
): SnapshotPatch {
	const patch: SnapshotPatch = { now };
	if (records.optOutDirectives !== undefined) {
		const merged = [...current.optOutDirectives];
		for (const directive of records.optOutDirectives) {
			const duplicate = merged.some(
				(existing) =>
					existing.source === directive.source &&
					existing.recordedAt === directive.recordedAt &&
					existing.categories.join(',') === directive.categories.join(',')
			);
			if (!duplicate) {
				merged.push(directive);
			}
		}
		patch.optOutDirectives = merged;
	}
	if (records.noticeDismissal !== undefined) {
		const local = current.noticeDismissal;
		const incoming = records.noticeDismissal;
		patch.noticeDismissal =
			incoming && (!local || incoming.dismissedAt > local.dismissedAt)
				? incoming
				: local;
	}
	if (records.subject !== undefined) {
		patch.subject = records.subject
			? { ...current.subject, ...records.subject }
			: current.subject;
	}
	return patch;
};

/** Draft values bound to the choice fingerprint they were presented under. */
interface BoundDraft {
	fingerprint: string;
	values: PresentedSelection;
}

export const createRuntime = function createRuntime(
	options: RuntimeOptions
): KernelRuntime {
	const { emit, transport } = options;
	let snapshot = options.initialSnapshot;
	let draft: BoundDraft | null = options.initialDraft
		? {
				fingerprint: snapshot.evaluationPolicy.choice.fingerprint,
				values: options.initialDraft,
			}
		: null;
	let started = false;
	let disposed = false;
	let generation = 0;
	const forwardedDirectives = new Set<string>();
	let timer: ReturnType<typeof setTimeout> | null = null;
	let visibilityInstalled = false;
	const listeners = new Set<Listener<ConsentSnapshot>>();

	const getSnapshot = () => snapshot;
	const now = () => Date.now();

	const notify = function notify(): void {
		for (const listener of listeners) {
			listener(snapshot);
		}
	};

	const commit = function commit(patch: SnapshotPatch): boolean {
		const current = snapshot;
		const next = buildNextSnapshot(current, patch);
		if (!snapshotChanged(current, next)) {
			return false;
		}
		snapshot = freezeSnapshot(next);
		notify();
		if (snapshot.effectivePermissions !== current.effectivePermissions) {
			emit({
				previous: current.effectivePermissions,
				snapshot,
				type: 'permissions:changed',
			});
		}
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

	const directiveKey = function directiveKey(directive: PrivacyOptOut): string {
		return `${directive.source}:${directive.recordedAt}:${directive.categories.join(',')}`;
	};

	const persistDirective = async function persistDirective(
		directive: PrivacyOptOut,
		subjectId: string
	): Promise<void> {
		try {
			await transport?.recordPrivacyOptOut?.(directive, subjectId);
		} catch (error) {
			emit({ command: 'recordPrivacyOptOut', error, type: 'command:error' });
		}
	};

	/**
	 * Directives stay kernel-local until a server subject exists. No consent
	 * request is made for them and no event is repeated when they are
	 * forwarded later; they keep their original `recordedAt`.
	 */
	const flushPrivacy = function flushPrivacy(): void {
		const { subjectId, user } = snapshot;
		if (!transport?.recordPrivacyOptOut || !subjectId || !user) {
			return;
		}
		for (const directive of snapshot.optOutDirectives) {
			const key = directiveKey(directive);
			if (forwardedDirectives.has(key)) {
				continue;
			}
			forwardedDirectives.add(key);
			void persistDirective(directive, subjectId);
		}
	};

	const reconcilePrivacy = function reconcilePrivacy(at: number): void {
		if (!started) {
			return;
		}
		const current = snapshot;
		const { gpc } = current.privacySignals;
		// Only a detected user-agent signal records a directive. A developer
		// override masks permissions but is not a privacy request.
		if (!(gpc.active && gpc.detected)) {
			return;
		}
		const mapping = current.policyRule.privacySignals.gpc.denyCategories;
		if (mapping.length === 0) {
			return;
		}
		const covered = new Set<string>();
		for (const directive of current.optOutDirectives) {
			for (const category of directive.categories) {
				covered.add(category);
			}
		}
		if (mapping.every((category) => covered.has(category))) {
			return;
		}
		const directive: PrivacyOptOut = {
			categories: [...mapping],
			recordedAt: at,
			source: 'gpc',
		};
		commit({
			now: at,
			optOutDirectives: [...current.optOutDirectives, directive],
		});
		emit({ directive, snapshot, type: 'privacy:opt-out' });
		flushPrivacy();
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
		const changed = commit(patch);
		if (
			snapshot.explicitChoice !== before.explicitChoice ||
			snapshot.subject !== before.subject
		) {
			generation += 1;
		}
		// Hydration applies records; it never activates a directive. A clear
		// therefore leaves the records cleared even while the live signal
		// keeps masking permissions. Activation happens when init completes
		// or when a signal is set at runtime.
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
		commit,
		emit,
		flushPrivacy,
		// A draft presented under an earlier choice contract is stale once the
		// policy changed materially; it is dropped, never restamped.
		getDraft: () =>
			draft &&
			draft.fingerprint === snapshot.evaluationPolicy.choice.fingerprint
				? draft.values
				: null,
		getGeneration: () => generation,
		getSnapshot,
		hydrate,
		isStarted: () => started,
		mergeServerRecords,
		now,
		rearm() {
			disposed = false;
		},
		reconcilePrivacy,
		refresh,
		setDraft(next) {
			draft = next
				? {
						fingerprint: snapshot.evaluationPolicy.choice.fingerprint,
						values: next,
					}
				: null;
		},
		start,
		stopTimers,
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
};

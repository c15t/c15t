/**
 * The init lifecycle: everything that starts the kernel in a browser and
 * keeps it current over time.
 *
 * - `start()` marks the lifecycle started (once: browser GPC detection) and
 *   arms the deadline timer. `init()` and `hydrate()` call it; construction
 *   never does.
 * - `init()` runs one attempt against the transport, folds the complete
 *   `/init` response into one commit, and on failure applies the safe
 *   fallback and schedules a retry with exponential backoff and jitter.
 *   Every explicit `init()` fences older attempts: a response that resolves
 *   after a newer `init()` started applies nothing. Records the response
 *   carries apply only when the records generation, subject and user are
 *   still the ones the request was made for.
 * - The deadline timer re-evaluates when `snapshot.nextDeadline` passes.
 *   The runtime calls `armDeadline()` whenever a commit moves the deadline,
 *   so writers never re-arm by hand.
 * - One `visibilitychange` listener serves both the deadline (re-evaluate
 *   on resume, since background timers are throttled) and a retry that came
 *   due while the page was hidden. One `online` listener retries init and
 *   replays the save outbox. Both are installed only while needed.
 * - `dispose()` stops retries, the timer and the listeners. An explicit
 *   `init()` re-arms everything; `hydrate()` re-arms the timer only.
 */
import { readPolicyResolutionWire } from '@c15t/schema/types';
import type { PolicyResolution } from '@c15t/schema/types';
import type { Translations } from '@c15t/translations';
import { deepMergeTranslations } from '@c15t/translations';

import type { RecordIssue } from '../consent-record/validation';
import { resolveVendors, withoutManifestVendors } from '../libs/vendors';
import { applyTranslationOverrides } from '../translations';
import type { TranslationOverrides } from '../translations';
import type {
	ConsentSnapshot,
	InitContext,
	InitResponse,
	InitResult,
	KernelConfig,
	KernelIABState,
	KernelTransport,
	KernelTranslations,
} from '../types';
import type { SnapshotPatch } from './patch';
import { validateHydrationRecords } from './record-validation';
import { foldServerRecords } from './records';
import type { KernelRuntime } from './runtime';
import type { SaveOutbox } from './save-outbox';
import { DEFAULT_IAB } from './snapshot';

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_BASE_DELAY_MS = 1000;
const DEFAULT_MAX_DELAY_MS = 30_000;
/** Longest delay `setTimeout` honors without overflowing to zero. */
const MAX_TIMER_DELAY_MS = 2_147_483_647;

interface InitRetryPolicy {
	maxAttempts: number;
	baseDelayMs: number;
	maxDelayMs: number;
}

const normalizeNonNegativeNumber = function normalizeNonNegativeNumber(
	value: number | undefined,
	fallback: number
): number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0
		? value
		: fallback;
};

const resolveInitRetryPolicy = function resolveInitRetryPolicy(
	config: KernelConfig['initRetry']
): InitRetryPolicy | null {
	if (config === false) {
		return null;
	}

	return {
		baseDelayMs: normalizeNonNegativeNumber(
			config?.baseDelayMs,
			DEFAULT_BASE_DELAY_MS
		),
		maxAttempts: Math.max(
			1,
			Math.floor(
				normalizeNonNegativeNumber(config?.maxAttempts, DEFAULT_MAX_ATTEMPTS)
			)
		),
		maxDelayMs: normalizeNonNegativeNumber(
			config?.maxDelayMs,
			DEFAULT_MAX_DELAY_MS
		),
	};
};

const getRetryDelay = function getRetryDelay(
	policy: InitRetryPolicy,
	attempt: number
): number {
	const exponentialDelay = policy.baseDelayMs * 2 ** (attempt - 1);
	const cappedDelay = Math.min(exponentialDelay, policy.maxDelayMs);
	const jitterMultiplier = 0.5 + Math.random() * 0.5;
	return Math.floor(cappedDelay * jitterMultiplier);
};

const isProduction = function isProduction(): boolean {
	const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } })
		.process?.env?.NODE_ENV;
	return nodeEnv === 'production';
};

const warnInitFailure = function warnInitFailure(
	nextRetryMs: number | null
): void {
	if (isProduction()) {
		return;
	}

	const retryMessage =
		nextRetryMs === null
			? 'No retry is scheduled.'
			: `A retry is scheduled in ${nextRetryMs} ms.`;
	console.warn(
		`[c15t] Backend/manifest init failed. The consent banner is withheld and optional categories stay denied. ${retryMessage}`
	);
};

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

const isDocumentVisible = function isDocumentVisible(): boolean {
	return (
		typeof document === 'undefined' || document.visibilityState !== 'hidden'
	);
};

/**
 * Patch that clears every policy-derived field for a transport failure
 * before the safe fallback applies. A stale permissive policy must not
 * survive a failed init.
 */
const failedResolutionPatch = function failedResolutionPatch(
	current: ConsentSnapshot,
	now: number
): SnapshotPatch {
	const patch: SnapshotPatch = {
		now,
		policySnapshotToken: null,
		resolution: { policy: null, reason: 'transport', status: 'failed' },
	};
	if (current.iab?.enabled) {
		patch.iab = { ...current.iab, enabled: false };
	}
	return patch;
};

/**
 * Merge incoming init translations over the snapshot's current ones.
 * Same-language responses deep-merge so omitted keys keep their copy; a
 * language switch replaces outright.
 */
const mergeInitTranslations = function mergeInitTranslations(
	current: Readonly<KernelTranslations> | null,
	incoming: KernelTranslations
): KernelTranslations {
	if (
		!current?.translations ||
		!incoming?.translations ||
		current.language !== incoming.language
	) {
		return incoming;
	}
	return {
		...incoming,
		translations: deepMergeTranslations(
			current.translations as Translations,
			incoming.translations as Partial<Translations>
		) as KernelTranslations['translations'],
	};
};

/**
 * The policy outcome a complete transport response carries, read through
 * the versioned policy reader. A missing contract fails safely.
 */
const readInitResolution = function readInitResolution(
	response: InitResponse
): PolicyResolution {
	if (Object.hasOwn(response, 'policyResolution')) {
		return readPolicyResolutionWire(response.policyResolution);
	}
	return { policy: null, reason: 'invalid-payload', status: 'failed' };
};

/**
 * The patch for a complete init response, plus the issues of records it
 * refused. A complete init at least finalizes the resolution and the
 * provisional flag.
 *
 * `translationOverrides` are the app's code-level messages. They apply on
 * top of the response's copy for its language, so a backend supplies the
 * base and the app's keys still win.
 */
// oxlint-disable-next-line complexity -- One pass over every response field keeps the fold order visible.
const foldInitResponse = function foldInitResponse(
	current: ConsentSnapshot,
	response: InitResponse,
	now: number,
	translationOverrides?: TranslationOverrides
): { patch: SnapshotPatch; recordIssues: RecordIssue[] | null } {
	const patch: SnapshotPatch = { now, policyPending: false };

	if (response.resolvedOverrides) {
		patch.overrides = {
			...current.overrides,
			...response.resolvedOverrides,
		};
	}
	if (response.location !== undefined) {
		patch.location = response.location;
	}
	if (response.translations !== undefined) {
		patch.translations = response.translations
			? applyTranslationOverrides(
					mergeInitTranslations(current.translations, response.translations),
					translationOverrides
				)
			: response.translations;
	}
	if (response.branding !== undefined) {
		patch.branding = response.branding;
	}
	if (response.hosting !== undefined) {
		patch.hosting = response.hosting;
	}

	const resolution = readInitResolution(response);
	patch.resolution = resolution;
	patch.policySnapshotToken =
		resolution.status === 'matched'
			? (response.policySnapshotToken ?? null)
			: null;

	// IAB passthrough: fold gvl / customVendors / cmpId into the iab slice.
	let nextIab: KernelIABState | null | undefined;
	if (
		response.gvlReference !== undefined ||
		response.gvl !== undefined ||
		response.customVendors !== undefined ||
		response.cmpId !== undefined
	) {
		const baseline = current.iab ?? DEFAULT_IAB;
		nextIab = {
			...baseline,
			cmpId: response.cmpId === undefined ? baseline.cmpId : response.cmpId,
			customVendors:
				response.customVendors === undefined
					? baseline.customVendors
					: response.customVendors,
			gvl: response.gvl === undefined ? baseline.gvl : response.gvl,
			gvlReference:
				response.gvl === undefined
					? baseline.gvlReference
					: response.gvlReference,
		};
		if (response.gvlReference !== undefined) {
			nextIab.gvl = response.gvl ?? null;
			nextIab.gvlReference = response.gvlReference;
		}
		// Server explicitly returned `gvl: null` → IAB disabled for this request.
		if (response.gvlReference) {
			nextIab.enabled = true;
		} else if (response.gvl === null) {
			nextIab.enabled = false;
		}
	}
	if (resolution.status !== 'matched') {
		const baseline = nextIab ?? current.iab;
		if (baseline?.enabled) {
			nextIab = { ...baseline, enabled: false };
		}
	}
	if (nextIab !== undefined) {
		patch.iab = nextIab;
	}

	if (response.resolvedPrivacySignals?.gpc !== undefined) {
		patch.privacyDetected = response.resolvedPrivacySignals.gpc === true;
	}

	// Backend vendor declarations join whatever the client declared in code.
	// Presentation from code wins; the backend fills the gaps.
	if (
		response.vendors !== undefined ||
		response.vendorListVersion !== undefined
	) {
		// A new backend list replaces the previous one outright, so an edit or
		// removal on the backend lands; code and script declarations survive.
		const existing = current.vendors?.declared ?? [];
		const resolved = resolveVendors({
			existing:
				response.vendors === undefined
					? existing
					: withoutManifestVendors(existing),
			manifest: response.vendors ?? [],
		});
		// A replacement list carries its own version or none: the previous
		// label described the previous list. Only a version-only response
		// keeps the current declarations under a new label.
		const listVersion =
			response.vendorListVersion ??
			(response.vendors === undefined
				? (current.vendors?.listVersion ?? null)
				: null);
		patch.vendors =
			resolved.length === 0 && listVersion === null
				? null
				: { declared: resolved, listVersion };
	}

	let recordIssues: RecordIssue[] | null = null;
	if (response.records) {
		const validated = validateHydrationRecords(response.records, now);
		if (validated.ok === true) {
			// Server receipts merge by newest confirmation per category so a
			// local action made before init resolved is never overwritten.
			Object.assign(patch, foldServerRecords(current, validated.records, now));
		} else {
			recordIssues = validated.issues;
		}
	}
	if (response.subjectId !== undefined) {
		const subject =
			patch.subject === undefined ? current.subject : patch.subject;
		patch.subject = { ...subject, subjectId: response.subjectId };
	}

	return { patch, recordIssues };
};

export interface InitLifecycleOptions {
	runtime: KernelRuntime;
	transport: KernelTransport | undefined;
	initRetry: KernelConfig['initRetry'];
	/** App message overrides applied over every init response's copy. */
	translationOverrides?: KernelConfig['translationOverrides'];
	/** Replayed after every completed init and when the browser is online. */
	outbox: Pick<SaveOutbox, 'replay'>;
}

export interface InitLifecycle {
	init: () => Promise<InitResult>;
	/**
	 * Mark the lifecycle started and arm the deadline timer. The first call
	 * reads the browser's GPC signal. Re-arms the timer after `dispose()`.
	 */
	start: () => void;
	/** Re-evaluate at `at` (default now) and re-arm the deadline timer. */
	refresh: (at?: number) => ConsentSnapshot;
	/** Install or re-arm the deadline timer from the current snapshot. */
	armDeadline: () => void;
	/** Replay the save outbox once the browser is back online. */
	retryWhenOnline: () => void;
	dispose: () => void;
}

/**
 * Create the init lifecycle of one kernel.
 */
// oxlint-disable-next-line max-lines-per-function -- Retry, timer and listener state share one closure.
export const createInitLifecycle = function createInitLifecycle({
	runtime,
	transport,
	initRetry,
	translationOverrides,
	outbox,
}: InitLifecycleOptions): InitLifecycle {
	const { getSnapshot, commit, emit } = runtime;
	const retryPolicy = resolveInitRetryPolicy(initRetry);
	let started = false;
	// Two stop flags on purpose. `dispose()` sets both. `init()` clears
	// both; `hydrate()` (through `start()`) clears only the timer's, so a
	// disposed kernel that is hydrated again keeps its deadline current but
	// does not resume retrying init or replaying saves.
	let disposed = false;
	let timerStopped = false;
	// Bumped by every explicit `init()`. An attempt that resolves after a newer
	// init started is stale: it must not apply its response, touch retry
	// state, or start a replay. `dispose()` deliberately leaves the generation
	// alone so an in-flight init still lands when React StrictMode disposes
	// and reuses the same kernel without calling init again.
	let initGeneration = 0;
	let deadlineTimer: ReturnType<typeof setTimeout> | null = null;
	let pendingRetryAttempt: number | null = null;
	let retryInFlight = false;
	let retryTimer: ReturnType<typeof setTimeout> | null = null;
	// The one visibility listener and why it is wanted.
	let visibilityInstalled = false;
	let watchDeadline = false;
	let watchRetry = false;
	let onlineInstalled = false;

	const syncVisibilityListener = function syncVisibilityListener(): void {
		const wanted = watchDeadline || watchRetry;
		if (wanted === visibilityInstalled || !hasDocumentListeners()) {
			return;
		}
		if (wanted) {
			// oxlint-disable-next-line no-use-before-define -- Listener callbacks reference each other.
			document.addEventListener('visibilitychange', onVisibilityChange);
		} else {
			// oxlint-disable-next-line no-use-before-define -- Listener callbacks reference each other.
			document.removeEventListener('visibilitychange', onVisibilityChange);
		}
		visibilityInstalled = wanted;
	};

	const watchVisibility = function watchVisibility(
		deadline: boolean,
		retry: boolean
	): void {
		watchDeadline = deadline;
		watchRetry = retry;
		syncVisibilityListener();
	};

	const clearDeadlineTimer = function clearDeadlineTimer(): void {
		if (deadlineTimer !== null) {
			clearTimeout(deadlineTimer);
			deadlineTimer = null;
		}
	};

	const armDeadline = function armDeadline(): void {
		clearDeadlineTimer();
		if (timerStopped || !started) {
			return;
		}
		const deadline = getSnapshot().nextDeadline;
		watchVisibility(deadline !== null, watchRetry);
		if (deadline === null) {
			return;
		}
		// Whole milliseconds, never below one: a deadline still in the future
		// must not fire a zero-delay timer that re-evaluates before it passes.
		const delay = Math.min(
			Math.max(Math.ceil(deadline - runtime.now()), 1),
			MAX_TIMER_DELAY_MS
		);
		deadlineTimer = setTimeout(() => {
			deadlineTimer = null;
			// oxlint-disable-next-line no-use-before-define -- The timer callback re-evaluates.
			refresh();
		}, delay);
	};

	const refresh = function refresh(
		at: number = runtime.now()
	): ConsentSnapshot {
		commit({ now: at });
		armDeadline();
		return getSnapshot();
	};

	const start = function start(): void {
		const wasIdle = !started || timerStopped;
		timerStopped = false;
		if (!started) {
			started = true;
			if (detectBrowserGpc()) {
				commit({ privacyDetected: true });
			}
		}
		if (wasIdle) {
			armDeadline();
		}
	};

	const clearRetry = function clearRetry(): void {
		if (retryTimer !== null) {
			clearTimeout(retryTimer);
			retryTimer = null;
		}
		pendingRetryAttempt = null;
		watchVisibility(watchDeadline, false);
	};

	const replaySaves = function replaySaves(): void {
		if (!disposed) {
			void outbox.replay();
		}
	};

	const complete = function complete(result: InitResult): InitResult {
		emit({ result, type: 'command:init:completed' });
		return result;
	};

	const runInitAttempt = async function runInitAttempt(
		attempt: number
	): Promise<InitResult> {
		emit({ type: 'command:init:started' });
		start();
		// One clock read: the impression stamped here and a local finalize
		// evaluate at the same instant.
		const startedAt = runtime.now();
		runtime.markLive(startedAt);

		if (!transport?.init) {
			// Finalize local init while preserving its precomputed resolution.
			runtime.announce(
				{ now: startedAt, policyPending: false },
				'init:applied'
			);
			const result = complete({ ok: true });
			replaySaves();
			return result;
		}

		const generation = initGeneration;
		const recordsGeneration = runtime.getGeneration();
		try {
			const snapshot = getSnapshot();
			const ctx: InitContext = {
				overrides: snapshot.overrides,
				user: snapshot.user,
			};
			// A visitor with a stored choice is not shown the banner, so only
			// an undecided visitor counts toward the arm.
			if (snapshot.experiment && snapshot.explicitChoice === null) {
				ctx.experiment = {
					arm: snapshot.experiment.arm,
					id: snapshot.experiment.id,
				};
			}
			const response = await transport.init(ctx);
			if (generation !== initGeneration) {
				return complete({
					error: new Error('c15t: init attempt superseded by a newer init()'),
					ok: false,
				});
			}
			const current = getSnapshot();
			const recordsAreCurrent =
				recordsGeneration === runtime.getGeneration() &&
				snapshot.subject?.subjectId === current.subject?.subjectId &&
				snapshot.user === current.user;
			// Policy can still resolve after clear or identification changes,
			// but the old request no longer owns this subject's stored records.
			const accepted = recordsAreCurrent
				? response
				: { ...response, records: undefined, subjectId: undefined };
			const folded = foldInitResponse(
				current,
				accepted,
				runtime.now(),
				translationOverrides
			);
			if (folded.recordIssues && !isProduction()) {
				console.warn(
					'[c15t] Ignored invalid server records on init.',
					folded.recordIssues
				);
			}
			runtime.announce(folded.patch, 'init:applied', snapshot.policyPending);
			clearRetry();
			const result = complete({ ok: true });
			replaySaves();
			return result;
		} catch (error) {
			if (generation !== initGeneration) {
				return complete({ error, ok: false });
			}
			emit({ command: 'init', error, type: 'command:error' });
			commit(failedResolutionPatch(getSnapshot(), runtime.now()));
			const nextRetryMs =
				retryPolicy && attempt < retryPolicy.maxAttempts && !disposed
					? getRetryDelay(retryPolicy, attempt)
					: null;
			emit({ attempt, error, nextRetryMs, type: 'init:failed' });
			warnInitFailure(nextRetryMs);
			if (nextRetryMs !== null) {
				// oxlint-disable-next-line no-use-before-define -- Retry and attempt call each other.
				scheduleRetry(attempt + 1, nextRetryMs);
			}
			return complete({ error, ok: false });
		}
	};

	const executeRetry = async function executeRetry(
		attempt: number
	): Promise<void> {
		try {
			await runInitAttempt(attempt);
		} finally {
			retryInFlight = false;
		}
	};

	const runPendingRetry = function runPendingRetry(): void {
		if (disposed || retryInFlight || pendingRetryAttempt === null) {
			return;
		}
		if (!isDocumentVisible()) {
			watchVisibility(watchDeadline, true);
			return;
		}
		const attempt = pendingRetryAttempt;
		pendingRetryAttempt = null;
		watchVisibility(watchDeadline, false);
		retryInFlight = true;
		void executeRetry(attempt);
	};

	const onVisibilityChange = function onVisibilityChange(): void {
		if (!isDocumentVisible()) {
			return;
		}
		// Background timers are throttled; re-evaluate on resume.
		if (watchDeadline) {
			refresh();
		}
		if (watchRetry) {
			runPendingRetry();
		}
	};

	const onOnline = function onOnline(): void {
		if (disposed) {
			return;
		}
		void outbox.replay();
		if (pendingRetryAttempt !== null) {
			if (retryTimer !== null) {
				clearTimeout(retryTimer);
				retryTimer = null;
			}
			runPendingRetry();
		}
	};

	const retryWhenOnline = function retryWhenOnline(): void {
		if (
			disposed ||
			onlineInstalled ||
			typeof window === 'undefined' ||
			typeof window.addEventListener !== 'function'
		) {
			return;
		}
		window.addEventListener('online', onOnline);
		onlineInstalled = true;
	};

	const scheduleRetry = function scheduleRetry(
		attempt: number,
		delayMs: number
	): void {
		if (disposed) {
			return;
		}
		if (retryTimer !== null) {
			clearTimeout(retryTimer);
		}
		pendingRetryAttempt = attempt;
		retryWhenOnline();
		retryTimer = setTimeout(() => {
			retryTimer = null;
			runPendingRetry();
		}, delayMs);
	};

	const init = function init(): Promise<InitResult> {
		if (getSnapshot().externalPermissions) {
			return Promise.resolve({ ok: true });
		}
		// An explicit init re-arms a disposed kernel. React StrictMode runs
		// effect cleanup (which disposes) and then re-mounts with the same
		// memoized kernel and calls init again; retries must work after that.
		disposed = false;
		initGeneration += 1;
		clearRetry();
		return runInitAttempt(1);
	};

	const dispose = function dispose(): void {
		if (disposed) {
			return;
		}
		disposed = true;
		timerStopped = true;
		clearRetry();
		clearDeadlineTimer();
		watchVisibility(false, false);
		if (
			onlineInstalled &&
			typeof window !== 'undefined' &&
			typeof window.removeEventListener === 'function'
		) {
			window.removeEventListener('online', onOnline);
		}
		onlineInstalled = false;
	};

	return { armDeadline, dispose, init, refresh, retryWhenOnline, start };
};

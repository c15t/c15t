/**
 * Async commands exposed at `kernel.commands.*`.
 *
 * Commands are the I/O boundary of the kernel: each one optionally
 * delegates to a transport for network I/O, but otherwise operates on
 * snapshot data only. Commands emit their lifecycle events
 * (`*:started`, `*:completed`, `command:error`).
 *
 * Only `save()` records an explicit choice, and it captures one action
 * time before any yield, network call or persistence. `dismissNotice()`
 * records the local dismissal only. `init()` folds a complete transport
 * response and installs the deadline timer.
 */

import { recordCategoryPatch } from '../consent-record/record';
import type {
	ConsentSubject,
	OptionalConsentCategory,
} from '../consent-record/types';
import { generateSubjectId } from '../libs/generate-subject-id';
import { presentedSelection, scopeSelection } from '../policy';
import type { PresentedSelection } from '../policy';
import type {
	ConsentSnapshot,
	InitContext,
	InitResult,
	KernelConfig,
	KernelIABAuthority,
	KernelTransport,
	KernelUser,
	NoticeDismissResult,
	SaveInput,
	SavePayload,
	SaveResult,
} from '../types';
import { applyInitResponse } from './apply-init-response';
import type { SnapshotPatch } from './patch';
import { createPendingSaveQueue } from './pending-saves';
import type { KernelRuntime } from './runtime';
import { selectSavePayload } from './save-selection';
import { copyIABAuthority } from './snapshot';

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_BASE_DELAY_MS = 1000;
const DEFAULT_MAX_DELAY_MS = 30_000;

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

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const createDeferredPromise = function createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
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
 * Values one save input confirms. Object input is passed through untouched
 * so the record helper validates it and reports the exact issue.
 */
export const resolveSaveSelection = function resolveSaveSelection(
	snapshot: ConsentSnapshot,
	draft: PresentedSelection | null,
	input: SaveInput | undefined
): { values: unknown; consentAction: SavePayload['consentAction'] } {
	const rule = snapshot.policyRule;
	if (input === 'all') {
		return { consentAction: 'all', values: scopeSelection(rule, true) };
	}
	if (input === 'none') {
		return { consentAction: 'necessary', values: scopeSelection(rule, false) };
	}
	if (input === undefined) {
		return {
			consentAction: 'custom',
			values: presentedSelection(rule, draft, snapshot.explicitChoice),
		};
	}
	return { consentAction: 'custom', values: input };
};

/** Subject written by a save: the stored identifiers plus the current user's. */
const saveSubject = function saveSubject(
	snapshot: ConsentSnapshot,
	subjectId: string
): ConsentSubject {
	const subject: ConsentSubject = { ...snapshot.subject, subjectId };
	if (snapshot.user?.externalId) {
		subject.externalId = snapshot.user.externalId;
		if (snapshot.user.identityProvider) {
			subject.identityProvider = snapshot.user.identityProvider;
		}
	}
	return subject;
};

const isRecord = function isRecord(
	value: unknown
): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
};

/** Validate addon metadata before the local action can mutate any state. */
const validSaveAuthority = function validSaveAuthority(
	value: unknown,
	snapshot: ConsentSnapshot,
	actionAt: number,
	now: number
): value is KernelIABAuthority {
	if (!isRecord(value)) {
		return false;
	}
	const authority = value;
	return (
		snapshot.model === 'iab' &&
		snapshot.resolution.status === 'matched' &&
		snapshot.iab?.enabled === true &&
		typeof authority.tcString === 'string' &&
		authority.tcString.length > 0 &&
		authority.choiceFingerprint ===
			snapshot.evaluationPolicy.choice.fingerprint &&
		authority.confirmedAt === actionAt &&
		typeof authority.expiresAt === 'number' &&
		Number.isSafeInteger(authority.expiresAt) &&
		authority.expiresAt > now &&
		authority.expiresAt > actionAt &&
		authority.expiresAt <=
			actionAt +
				Math.min(
					snapshot.evaluationPolicy.choice.maxAgeMs ?? 395 * 86400000,
					395 * 86400000
				) &&
		[
			authority.vendorConsents,
			authority.vendorLegitimateInterests,
			authority.purposeConsents,
			authority.purposeLegitimateInterests,
			authority.specialFeatureOptIns,
		].every(
			(map) =>
				map !== null &&
				typeof map === 'object' &&
				!Array.isArray(map) &&
				Object.values(map).every((entry) => typeof entry === 'boolean')
		)
	);
};

const applySaveAuthority = function applySaveAuthority(
	patch: SnapshotPatch,
	snapshot: ConsentSnapshot,
	authority?: KernelIABAuthority
): void {
	if (authority && snapshot.iab) {
		patch.iab = {
			...snapshot.iab,
			authority: copyIABAuthority(authority),
			tcString: authority.tcString,
		};
	}
};

/**
 * Dependencies required by `buildCommands`.
 */
export interface CommandDeps {
	runtime: KernelRuntime;
	transport: KernelTransport | undefined;
	initRetry: KernelConfig['initRetry'];
}

/**
 * Build the `kernel.commands.*` object given the kernel's runtime deps.
 */
// oxlint-disable-next-line max-lines-per-function -- Commands share retry, timer and replay state through closures.
export const buildCommands = function buildCommands(deps: CommandDeps) {
	const { runtime, transport, initRetry } = deps;
	const { getSnapshot, commit, emit } = runtime;
	const retryPolicy = resolveInitRetryPolicy(initRetry);
	const pendingSaves = transport?.save
		? createPendingSaveQueue({ emit, save: transport.save })
		: null;
	let disposed = false;
	// Bumped by every explicit `init()`. An attempt that resolves after a newer
	// init started is stale: it must not apply its response, touch retry
	// state, or start a replay. `dispose()` deliberately leaves the generation
	// alone so an in-flight init still lands when React StrictMode disposes
	// and reuses the same kernel without calling init again.
	let initGeneration = 0;
	let onlineListenerInstalled = false;
	let visibilityListenerInstalled = false;
	let pendingRetryAttempt: number | null = null;
	let retryInFlight = false;
	let retryTimer: ReturnType<typeof setTimeout> | null = null;
	// Bumped by every `identify()` so a subject read started by an earlier
	// identify cannot apply after a later one.
	let identifyGeneration = 0;

	const getBrowserWindow = function getBrowserWindow(): Window | null {
		return typeof window === 'undefined' ? null : window;
	};

	const clearRetryTimer = function clearRetryTimer(): void {
		if (retryTimer !== null) {
			clearTimeout(retryTimer);
			retryTimer = null;
		}
	};

	const removeVisibilityListener = function removeVisibilityListener(): void {
		if (
			!visibilityListenerInstalled ||
			typeof document === 'undefined' ||
			typeof document.removeEventListener !== 'function'
		) {
			return;
		}
		// oxlint-disable-next-line no-use-before-define
		document.removeEventListener('visibilitychange', onVisibilityChange);
		visibilityListenerInstalled = false;
	};

	const ensureVisibilityListener = function ensureVisibilityListener(): void {
		if (
			disposed ||
			visibilityListenerInstalled ||
			typeof document === 'undefined' ||
			typeof document.addEventListener !== 'function'
		) {
			return;
		}
		// oxlint-disable-next-line no-use-before-define
		document.addEventListener('visibilitychange', onVisibilityChange);
		visibilityListenerInstalled = true;
	};

	const isDocumentVisible = function isDocumentVisible(): boolean {
		return (
			typeof document === 'undefined' || document.visibilityState !== 'hidden'
		);
	};

	const replayPendingSaves =
		async function replayPendingSaves(): Promise<void> {
			if (disposed || !pendingSaves) {
				return;
			}
			const hasRemaining = await pendingSaves.replay();
			if (hasRemaining) {
				// oxlint-disable-next-line no-use-before-define
				ensureOnlineListener();
			}
		};

	const finishLifecycle = function finishLifecycle(
		now: number,
		activatePrivacy = true
	): void {
		if (activatePrivacy) {
			runtime.reconcilePrivacy(now);
		}
		runtime.armDeadlineTimer();
	};

	/** Finalize local init while preserving its precomputed resolution. */
	const finalizeWithoutTransport = function finalizeWithoutTransport(
		now: number
	): void {
		const patch: SnapshotPatch = { now, policyPending: false };
		if (commit(patch)) {
			emit({ snapshot: getSnapshot(), type: 'init:applied' });
		}
	};

	const runInitAttempt = async function runInitAttempt(
		attempt: number
	): Promise<InitResult> {
		emit({ type: 'command:init:started' });
		runtime.start();

		if (!transport?.init) {
			const now = runtime.now();
			finalizeWithoutTransport(now);
			finishLifecycle(now);
			const result: InitResult = { ok: true };
			emit({ result, type: 'command:init:completed' });
			void replayPendingSaves();
			return result;
		}

		const generation = initGeneration;
		const recordsGeneration = runtime.getGeneration();
		const completeSuperseded = function completeSuperseded(
			error: unknown
		): InitResult {
			const result: InitResult = { error, ok: false };
			emit({ result, type: 'command:init:completed' });
			return result;
		};

		try {
			const snapshot = getSnapshot();
			const ctx: InitContext = {
				overrides: snapshot.overrides,
				user: snapshot.user,
			};
			const response = await transport.init(ctx);
			if (generation !== initGeneration) {
				return completeSuperseded(
					new Error('c15t: init attempt superseded by a newer init()')
				);
			}
			const now = runtime.now();
			const current = getSnapshot();
			const recordsAreCurrent =
				recordsGeneration === runtime.getGeneration() &&
				snapshot.subject?.subjectId === current.subject?.subjectId &&
				snapshot.user === current.user;
			// Policy can still resolve after clear or identification changes,
			// but the old request no longer owns this subject's stored records.
			const acceptedResponse = recordsAreCurrent
				? response
				: {
						...response,
						records: undefined,
						subjectId: undefined,
					};
			const applied = applyInitResponse(current, acceptedResponse, now);
			if (applied.recordIssues && !isProduction()) {
				console.warn(
					'[c15t] Ignored invalid server records on init.',
					applied.recordIssues
				);
			}
			const changed = commit(applied.patch);
			if (changed || snapshot.policyPending) {
				emit({ snapshot: getSnapshot(), type: 'init:applied' });
			}
			finishLifecycle(now, recordsGeneration === runtime.getGeneration());
			clearRetryTimer();
			pendingRetryAttempt = null;
			removeVisibilityListener();
			const result: InitResult = { ok: true };
			emit({ result, type: 'command:init:completed' });
			void replayPendingSaves();
			return result;
		} catch (error) {
			if (generation !== initGeneration) {
				return completeSuperseded(error);
			}
			emit({ command: 'init', error, type: 'command:error' });
			const now = runtime.now();
			commit(failedResolutionPatch(getSnapshot(), now));
			finishLifecycle(now, recordsGeneration === runtime.getGeneration());
			const nextRetryMs =
				retryPolicy && attempt < retryPolicy.maxAttempts && !disposed
					? getRetryDelay(retryPolicy, attempt)
					: null;
			emit({ attempt, error, nextRetryMs, type: 'init:failed' });
			warnInitFailure(nextRetryMs);
			if (nextRetryMs !== null) {
				// oxlint-disable-next-line no-use-before-define
				scheduleRetry(attempt + 1, nextRetryMs);
			}
			const result: InitResult = { error, ok: false };
			emit({ result, type: 'command:init:completed' });
			return result;
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
			ensureVisibilityListener();
			return;
		}

		const attempt = pendingRetryAttempt;
		pendingRetryAttempt = null;
		removeVisibilityListener();
		retryInFlight = true;
		void executeRetry(attempt);
	};

	const onVisibilityChange = function onVisibilityChange(): void {
		if (isDocumentVisible()) {
			runPendingRetry();
		}
	};

	const scheduleRetry = function scheduleRetry(
		attempt: number,
		delayMs: number
	): void {
		if (disposed) {
			return;
		}
		clearRetryTimer();
		pendingRetryAttempt = attempt;
		// oxlint-disable-next-line no-use-before-define
		ensureOnlineListener();
		retryTimer = setTimeout(() => {
			retryTimer = null;
			runPendingRetry();
		}, delayMs);
	};

	const onOnline = function onOnline(): void {
		if (disposed) {
			return;
		}
		void replayPendingSaves();
		if (pendingRetryAttempt !== null) {
			clearRetryTimer();
			runPendingRetry();
		}
	};

	const ensureOnlineListener = function ensureOnlineListener(): void {
		const browserWindow = getBrowserWindow();
		if (
			disposed ||
			onlineListenerInstalled ||
			!browserWindow ||
			typeof browserWindow.addEventListener !== 'function'
		) {
			return;
		}
		browserWindow.addEventListener('online', onOnline);
		onlineListenerInstalled = true;
	};

	const loadSubjectRecord = async function loadSubjectRecord(
		subjectId: string | null,
		identifyAttempt: number
	): Promise<void> {
		if (!transport?.loadSubjectRecord || !subjectId) {
			return;
		}
		// The read is bound to the subject it was requested for and to the
		// records generation at request time. A clear, a newer identify or a
		// subject switch while it was in flight makes the result stale.
		const generation = runtime.getGeneration();
		try {
			const records = await transport.loadSubjectRecord(subjectId);
			const stale =
				identifyAttempt !== identifyGeneration ||
				runtime.getGeneration() !== generation ||
				(getSnapshot().subject?.subjectId ?? null) !== subjectId;
			if (records && !stale) {
				// Newest receipt per category wins: a local refusal made while
				// the server read was in flight is never overwritten.
				const result = runtime.mergeServerRecords(records);
				if (result.ok === false) {
					emit({
						command: 'loadSubjectRecord',
						error: new Error('c15t: server record rejected by validation'),
						type: 'command:error',
					});
				}
			}
		} catch (error) {
			emit({ command: 'loadSubjectRecord', error, type: 'command:error' });
		}
	};

	/**
	 * Transport phase of a save. The outcome only touches the replay queue
	 * while this action's confirmed receipts are current. Disjoint category
	 * actions remain independent. Only the newest action can map the subject
	 * returned by the server; older outcomes cannot replace its identity.
	 */
	const sendSave = async function sendSave(
		payload: SavePayload,
		generation: number,
		confirmed: readonly OptionalConsentCategory[],
		actionSnapshot: ConsentSnapshot
	): Promise<SaveResult> {
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
			return selectSavePayload(
				payload,
				(category) =>
					current.explicitChoice?.categories[category] ===
					actionSnapshot.explicitChoice?.categories[category]
			);
		};
		const send = transport?.save;
		if (!send) {
			return { confirmed, ok: true, subjectId: payload.subjectId };
		}
		try {
			// Yield one macrotask before the network call so the UI commit
			// from `commit()` above can paint first.
			await createDeferredPromise((resolve) => {
				setTimeout(resolve, 0);
			});
			const sending = currentPayload();
			if (!sending) {
				return { confirmed, ok: false };
			}
			const result = await send(sending);
			const remaining = currentPayload();
			if (!remaining) {
				return { ...result, confirmed };
			}
			if (result.ok) {
				await pendingSaves?.discard(remaining);
			} else {
				await pendingSaves?.enqueue(remaining);
				ensureOnlineListener();
			}
			if (!currentPayload()) {
				return { ...result, confirmed };
			}
			if (result.ok) {
				if (
					result.subjectId &&
					result.subjectId !== getSnapshot().subject?.subjectId &&
					getSnapshot().explicitChoice === actionSnapshot.explicitChoice &&
					getSnapshot().subject?.subjectId === actionSnapshot.subject?.subjectId
				) {
					commit({
						subject: { ...getSnapshot().subject, subjectId: result.subjectId },
					});
					emit({ snapshot: getSnapshot(), type: 'subject:resolved' });
				}
				// The accepted save established or confirmed the subject: standing
				// directives recorded while anonymous can be forwarded now.
				runtime.flushPrivacy();
			}
			return { ...result, confirmed };
		} catch (error) {
			emit({ command: 'save', error, type: 'command:error' });
			const remaining = currentPayload();
			if (remaining) {
				await pendingSaves?.enqueue(remaining);
				ensureOnlineListener();
			}
			return { confirmed, ok: false };
		}
	};

	const commands = {
		dismissNotice(): Promise<NoticeDismissResult> {
			const snapshot = getSnapshot();
			if (snapshot.promptRequirement.kind !== 'notice') {
				return Promise.resolve({ ok: false, reason: 'not-required' });
			}
			const actionAt = runtime.now();
			const dismissal = {
				dismissedAt: actionAt,
				fingerprint: snapshot.evaluationPolicy.notice.fingerprint,
				version: 1 as const,
			};
			commit({ noticeDismissal: dismissal, now: actionAt });
			emit({ dismissal, snapshot: getSnapshot(), type: 'notice:dismissed' });
			runtime.armDeadlineTimer();
			return Promise.resolve({ dismissal, ok: true });
		},

		async identify(user: KernelUser): Promise<void> {
			identifyGeneration += 1;
			const attempt = identifyGeneration;
			const generation = runtime.getGeneration();
			const { subject, iab } = getSnapshot();
			const subjectId = subject?.subjectId ?? null;
			const patch: SnapshotPatch = { user: { ...user } };
			if (iab) {
				patch.iab = { ...iab, authority: null, tcString: null };
			}
			commit(patch);
			emit({ snapshot: getSnapshot(), type: 'user:identified' });
			if (transport?.identify) {
				try {
					await transport.identify({ ...user }, subjectId);
				} catch (error) {
					emit({ command: 'identify', error, type: 'command:error' });
					throw error;
				}
			}
			if (
				attempt !== identifyGeneration ||
				runtime.getGeneration() !== generation ||
				(getSnapshot().subject?.subjectId ?? null) !== subjectId
			) {
				return;
			}
			// An existing subject forwards standing directives right away;
			// without one they stay pending until a save establishes it.
			runtime.flushPrivacy();
			await loadSubjectRecord(subjectId, attempt);
		},

		init(): Promise<InitResult> {
			// An explicit init re-arms a disposed kernel. React StrictMode runs
			// effect cleanup (which disposes) and then re-mounts with the same
			// memoized kernel and calls init again; retries must work after that.
			disposed = false;
			runtime.rearm();
			initGeneration += 1;
			clearRetryTimer();
			pendingRetryAttempt = null;
			removeVisibilityListener();
			return runInitAttempt(1);
		},

		async save(
			input?: SaveInput,
			context?: { actionAt?: number; iabAuthority?: KernelIABAuthority }
		): Promise<SaveResult> {
			const currentTime = runtime.now();
			const actionAt =
				context?.actionAt === undefined ? currentTime : context.actionAt;
			if (
				!Number.isSafeInteger(actionAt) ||
				actionAt < 0 ||
				actionAt > currentTime
			) {
				return {
					issues: [{ code: 'invalid-timestamp', path: 'actionAt' }],
					ok: false,
				};
			}
			if (
				context?.iabAuthority !== undefined &&
				!validSaveAuthority(
					context.iabAuthority,
					getSnapshot(),
					actionAt,
					currentTime
				)
			) {
				return { ok: false };
			}
			emit({ type: 'command:save:started' });

			const before = getSnapshot();
			// Captured once, before validation, yield, network or persistence.
			const uiSource = before.activeUI;
			const { values, consentAction } = resolveSaveSelection(
				before,
				runtime.getDraft(),
				input
			);
			const recorded = recordCategoryPatch(before.explicitChoice, values, {
				actionAt,
				now: currentTime,
				policy: before.evaluationPolicy,
			});
			if (recorded.ok === false) {
				const result: SaveResult = { issues: recorded.issues, ok: false };
				emit({ result, type: 'command:save:completed' });
				return result;
			}
			if (recorded.confirmed.length === 0) {
				// Nothing confirmed: no receipt, no choice event, no request, no write.
				const result: SaveResult = {
					confirmed: [],
					ok: true,
					subjectId: before.subject?.subjectId,
				};
				emit({ result, type: 'command:save:completed' });
				return result;
			}

			const subjectId = before.subject?.subjectId ?? generateSubjectId();
			const subject = saveSubject(before, subjectId);
			runtime.setDraft(null);
			const patch: SnapshotPatch = {
				explicitChoice: recorded.choice,
				now: currentTime,
				subject,
			};
			applySaveAuthority(patch, before, context?.iabAuthority);
			commit(patch);
			const after = getSnapshot();
			// Records generation at the moment the action landed. A hydration
			// boundary (storage clear, server record) that replaces the choice
			// afterwards supersedes this action: its outcome must not queue a
			// replay or touch the subject.
			const generation = runtime.getGeneration();
			// Exactly the confirmed keys with their recorded values, copied so a
			// caller mutating its input object cannot change the queued payload.
			const confirmedCategories: Partial<
				Record<OptionalConsentCategory, boolean>
			> = {};
			for (const category of recorded.confirmed) {
				const decision = recorded.choice.categories[category];
				if (decision) {
					confirmedCategories[category] = decision.value;
				}
			}
			emit({
				actionAt,
				confirmed: recorded.confirmed,
				snapshot: after,
				type: 'choice:recorded',
			});
			runtime.armDeadlineTimer();

			// Built once so a queued replay records when the visitor decided,
			// not when the retry ran, and derives the same backend consent id.
			const payload: SavePayload = {
				choice: recorded.choice,
				confirmed: { actionAt, categories: confirmedCategories },
				consentAction,
				consents: after.effectivePermissions,
				givenAt: actionAt,
				model: after.model,
				overrides: after.overrides,
				policySnapshotToken: after.policySnapshotToken,
				subject,
				subjectId,
				tcString: after.iab?.tcString ?? null,
				uiSource,
				user: after.user,
			};

			const result = await sendSave(
				payload,
				generation,
				recorded.confirmed,
				after
			);
			emit({ result, type: 'command:save:completed' });
			return result;
		},
	};

	const dispose = function dispose(): void {
		if (disposed) {
			return;
		}
		disposed = true;
		clearRetryTimer();
		pendingRetryAttempt = null;
		removeVisibilityListener();
		runtime.stopTimers();

		const browserWindow = getBrowserWindow();
		if (
			onlineListenerInstalled &&
			browserWindow &&
			typeof browserWindow.removeEventListener === 'function'
		) {
			browserWindow.removeEventListener('online', onOnline);
		}
		onlineListenerInstalled = false;
	};

	return { commands, dispose };
};

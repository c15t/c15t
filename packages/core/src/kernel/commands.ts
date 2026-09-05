/**
 * Async commands exposed at `kernel.commands.*`.
 *
 * Commands are the I/O boundary of the kernel: each one optionally
 * delegates to a transport for network I/O, but otherwise operates on
 * snapshot data only. Commands are responsible for emitting their
 * lifecycle events (`*:started`, `*:completed`, `command:error`).
 *
 * The save command's input ladder (`'all' | 'none' | partial | undefined`)
 * is extracted into the pure helper `resolveSavePatch` so each branch
 * can be unit-tested without standing up a full kernel.
 */

import { allConsentNames } from '../consent/consent-types';
import { generateSubjectId } from '../libs/generate-subject-id';
import { deriveActiveUI } from '../policy';
import type {
	ConsentSnapshot,
	ConsentState,
	InitContext,
	InitResult,
	KernelConfig,
	KernelEvent,
	KernelTransport,
	KernelUser,
	SavePayload,
	SaveResult,
} from '../types';
import { applyInitResponse } from './apply-init-response';
import type { SnapshotPatch } from './patch';
import { createPendingSaveQueue } from './pending-saves';

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

const warnInitFailure = function warnInitFailure(
	nextRetryMs: number | null
): void {
	const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } })
		.process?.env?.NODE_ENV;
	if (nodeEnv === 'production') {
		return;
	}

	const retryMessage =
		nextRetryMs === null
			? 'No retry is scheduled.'
			: `A retry is scheduled in ${nextRetryMs} ms.`;
	console.warn(
		`[c15t] Backend/manifest init failed. The consent banner is withheld. ${retryMessage}`
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
 * Finalize a provisional policy when the transport has no `init` method.
 * This is an explicit offline/no-transport path, so the placeholder is the
 * effective policy and can safely drive the UI.
 */
const resolveProvisionalPolicy = function resolveProvisionalPolicy(
	snapshot: ConsentSnapshot
): SnapshotPatch | null {
	if (!snapshot.policyProvisional) {
		return null;
	}
	return {
		activeUI: snapshot.hasConsented
			? 'none'
			: deriveActiveUI(snapshot.model, snapshot.policy),
		policyProvisional: false,
	};
};

/**
 * Result of resolving a `save()` input against the current snapshot.
 * The patch is what the kernel should advance through; `consentAction`
 * is the audit-log shape sent to the backend in the save payload.
 */
export interface ResolvedSave {
	patch: SnapshotPatch;
	consentAction: SavePayload['consentAction'];
}

/**
 * Pure: derive the snapshot patch and consent-action from a `save()`
 * input. Called by the save command before any transport I/O.
 *
 * Branches:
 * - `'all'` sets displayed categories to `true`; `'none'` sets displayed
 *   optional categories to `false`. Full-policy actions are recorded as
 *   `all` or `necessary`, respectively; a partial-policy scope is `custom`.
 * Categories outside the displayed scope retain their current values.
 * - object — applied as a partial consent merge; if no category
 *   changed, only metadata (subjectId / hasConsented / activeUI)
 *   is updated. Action is `custom`.
 * - `undefined` — finalize the current consents in place. Action
 *   is `custom`.
 */
export const resolveSavePatch = function resolveSavePatch(
	current: ConsentSnapshot,
	subjectId: string,
	input: Partial<ConsentState> | 'all' | 'none' | undefined,
	options?: { categories?: readonly (keyof ConsentState)[] }
): ResolvedSave {
	const policyCategories =
		current.policyCategories.length > 0
			? current.policyCategories
			: allConsentNames;
	const categories = options?.categories ?? policyCategories;
	// A partial UI action must not claim to accept or reject the whole policy.
	const coversPolicy = policyCategories.every(
		(name) => name === 'necessary' || categories.includes(name)
	);
	if (input === 'all') {
		const all: ConsentState = { ...current.consents };
		for (const name of categories) {
			all[name] = true;
		}
		all.necessary = true;
		return {
			consentAction: coversPolicy ? 'all' : 'custom',
			patch: {
				activeUI: 'none',
				consents: all,
				hasConsented: true,
				subjectId,
			},
		};
	}

	if (input === 'none') {
		const none: ConsentState = { ...current.consents };
		for (const name of categories) {
			none[name] = name === 'necessary';
		}
		none.necessary = true;
		return {
			consentAction: coversPolicy ? 'necessary' : 'custom',
			patch: {
				activeUI: 'none',
				consents: none,
				hasConsented: true,
				subjectId,
			},
		};
	}

	if (input && typeof input === 'object') {
		const next: ConsentState = { ...current.consents };
		let changed = false;
		for (const name of allConsentNames) {
			if (
				name in input &&
				typeof input[name] === 'boolean' &&
				next[name] !== input[name]
			) {
				next[name] = input[name] as boolean;
				changed = true;
			}
		}
		if (changed) {
			return {
				consentAction: 'custom',
				patch: {
					activeUI: 'none',
					consents: next,
					hasConsented: true,
					subjectId,
				},
			};
		}
		// No category changed, but save() is still an explicit consent act.
		// Advance with a fresh consent object so persistence subscribers can
		// refresh storage timestamps and policy acknowledgements.
		return {
			consentAction: 'custom',
			patch: {
				activeUI: 'none',
				consents: next,
				hasConsented: true,
				subjectId,
			},
		};
	}

	return {
		consentAction: 'custom',
		patch: { activeUI: 'none', hasConsented: true, subjectId },
	};
};

/**
 * Dependencies required by `buildCommands`. The kernel index supplies
 * a getter for the live snapshot, the `advance` function, the event
 * emitter, and the optional transport.
 */
export interface CommandDeps {
	getSnapshot: () => ConsentSnapshot;
	advance: (patch: SnapshotPatch) => void;
	emit: (event: KernelEvent) => void;
	transport: KernelTransport | undefined;
	initRetry: KernelConfig['initRetry'];
}

/**
 * Build the `kernel.commands.*` object given the kernel's runtime deps.
 */
export const buildCommands = function buildCommands(deps: CommandDeps) {
	const { getSnapshot, advance, emit, transport, initRetry } = deps;
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
		// Browser retry callbacks call each other through event listeners.
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
		// Browser retry callbacks call each other through event listeners.
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
				// Browser retry callbacks call each other through event listeners.
				// oxlint-disable-next-line no-use-before-define
				ensureOnlineListener();
			}
		};

	const runInitAttempt = async function runInitAttempt(
		attempt: number
	): Promise<InitResult> {
		emit({ type: 'command:init:started' });

		if (!transport?.init) {
			const finalize = resolveProvisionalPolicy(getSnapshot());
			if (finalize) {
				advance(finalize);
				emit({ snapshot: getSnapshot(), type: 'init:applied' });
			}
			const result: InitResult = { ok: true };
			emit({ result, type: 'command:init:completed' });
			void replayPendingSaves();
			return result;
		}

		const generation = initGeneration;
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
			const patch = applyInitResponse(getSnapshot(), response);
			if (patch) {
				advance(patch);
				emit({ snapshot: getSnapshot(), type: 'init:applied' });
			}
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
			const nextRetryMs =
				retryPolicy && attempt < retryPolicy.maxAttempts && !disposed
					? getRetryDelay(retryPolicy, attempt)
					: null;
			emit({ attempt, error, nextRetryMs, type: 'init:failed' });
			warnInitFailure(nextRetryMs);
			if (nextRetryMs !== null) {
				// Init failures schedule the next attempt through this callback.
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
		// Browser retry callbacks call each other through event listeners.
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

	const commands = {
		async identify(user: KernelUser): Promise<void> {
			const { subjectId } = getSnapshot();
			advance({ user: { ...user } });
			emit({ snapshot: getSnapshot(), type: 'user:identified' });
			if (transport?.identify) {
				try {
					await transport.identify({ ...user }, subjectId);
				} catch (error) {
					emit({ command: 'identify', error, type: 'command:error' });
					throw error;
				}
			}
		},

		init(): Promise<InitResult> {
			// An explicit init re-arms a disposed kernel. React StrictMode runs
			// effect cleanup (which disposes) and then re-mounts with the same
			// memoized kernel and calls init again; retries must work after that.
			disposed = false;
			initGeneration += 1;
			clearRetryTimer();
			pendingRetryAttempt = null;
			removeVisibilityListener();
			return runInitAttempt(1);
		},

		async save(
			input?: Partial<ConsentState> | 'all' | 'none',
			options?: { categories?: readonly (keyof ConsentState)[] }
		): Promise<SaveResult> {
			emit({ type: 'command:save:started' });

			const beforeSnapshot = getSnapshot();
			const subjectId = beforeSnapshot.subjectId ?? generateSubjectId();
			const uiSource = beforeSnapshot.activeUI;

			const { patch, consentAction } = resolveSavePatch(
				beforeSnapshot,
				subjectId,
				input,
				options
			);
			if (Object.keys(patch).length > 0) {
				advance(patch);
			}

			const after = getSnapshot();

			if (!transport?.save) {
				const result: SaveResult = { ok: true, subjectId };
				emit({ result, type: 'command:save:completed' });
				return result;
			}

			// Captured once so a queued replay records when the visitor decided,
			// not when the retry ran, and derives the same backend consent id.
			const payload: SavePayload = {
				consentAction,
				consents: after.consents,
				givenAt: Date.now(),
				model: after.model,
				overrides: after.overrides,
				policySnapshotToken: after.policySnapshotToken,
				subjectId,
				tcString: after.iab?.tcString ?? null,

				uiSource,
				user: after.user,
			};

			try {
				// Yield one macrotask before the network call so the UI commit
				// from `advance()` above can paint first — starting the fetch in
				// the click task contends with the banner-dismiss frame under
				// CPU throttle. Mirrors v2's yielded background save.
				await createDeferredPromise((resolve) => {
					setTimeout(resolve, 0);
				});
				const result = await transport.save(payload);
				if (result.ok) {
					await pendingSaves?.discard(subjectId);
				} else {
					await pendingSaves?.enqueue(payload);
					ensureOnlineListener();
				}
				if (result.subjectId && result.subjectId !== getSnapshot().subjectId) {
					advance({ subjectId: result.subjectId });
				}
				emit({ result, type: 'command:save:completed' });
				return result;
			} catch (error) {
				emit({ command: 'save', error, type: 'command:error' });
				await pendingSaves?.enqueue(payload);
				ensureOnlineListener();
				const result: SaveResult = { ok: false };
				emit({ result, type: 'command:save:completed' });
				return result;
			}
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

/**
 * A fake native core plus a render harness.
 *
 * The fake records call counts rather than verifying interactions, so the
 * tests can assert the properties that actually matter here: how often the
 * bridge crossed into native, and whether a render happened at all.
 */

import { act } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { vi } from 'vitest';

import type { NativeC15tTurboModule } from '../../native/module';
import { NATIVE_C15T_MODULE_NAME } from '../../protocol';
import type {
	ConsentSnapshot,
	TrackingAuthorization,
	TrackingPresentation,
	TrackingRequestStage,
} from '../../protocol';
import { emitNativeEvent, setNativeModule } from './react-native-stub';

// React only permits `act` when the environment says a test drives it.
(
	globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** Handshake payload the fake module reports by default. */
export const FAKE_BOOTSTRAP = {
	hasStoredSnapshot: true,
	maxSupportedProtocolVersion: 1,
	minSupportedProtocolVersion: 1,
	nativeSdkVersion: 'rn->9.9.9',
	protocolVersion: 1,
	subjectId: 'sub-1',
};

/**
 * What the fake hands back from one `requestTrackingAuthorization()` call.
 *
 * `code` makes the call reject instead, which is how an Android request and an iOS build with
 * no prompt string both look to JavaScript.
 */
export interface TrackingRequestReply {
	readonly code?: string;
	readonly message?: string;
	readonly presentation?: TrackingPresentation;
	readonly stage?: TrackingRequestStage;
	readonly status?: TrackingAuthorization;
}

/**
 * Build a snapshot with realistic defaults.
 *
 * @param overrides - Fields to replace, shallow over the defaults.
 * @returns A snapshot the client accepts.
 */
export const buildSnapshot = function buildSnapshot(
	overrides: Partial<ConsentSnapshot> = {}
): ConsentSnapshot {
	return {
		activeUI: 'banner',
		consentCategories: null,
		effectivePermissions: {
			experience: false,
			functionality: true,
			marketing: false,
			measurement: false,
			necessary: true,
		},
		error: null,
		evaluatedAt: 1_770_000_000_000,
		explicitChoice: null,
		iab: null,
		location: { countryCode: 'DE', regionCode: null },
		model: 'opt-in',
		nextDeadline: null,
		optOutDirectives: [],
		overrides: { country: 'DE', gpc: null, language: 'en', region: null },
		policyPending: false,
		policySnapshotToken: null,
		privacySignals: { gpc: { active: false, detected: false, override: null } },
		promptRequirement: { kind: 'choice', reason: 'missing' },
		ready: true,
		resolution: { fingerprint: null, policyId: null, status: 'no-match' },
		restrictions: {},
		revision: 0,
		subject: { subjectId: 'sub-1' },
		translations: null,
		...overrides,
	};
};

/**
 * The TurboModule double, with the counters the tests read.
 */
export interface FakeNativeModule extends NativeC15tTurboModule {
	/** Times `getBootstrap()` was called. */
	bootstrapCalls: number;
	/** Times `getSnapshot()` was called. */
	snapshotCalls: number;
	/** Intent strings handed to `commit()`, in order. */
	commitIntents: string[];
	/** Override strings handed to `setOverrides()`, in order. */
	overrideCalls: string[];
	/** Times `dismissNotice()` was called. */
	dismissCalls: number;
	/** Times `refresh()` was called. */
	refreshCalls: number;
	/** External ids handed to `identify()`. */
	identifyCalls: string[];
	/** Times `logout()` was called. */
	logoutCalls: number;
	/** Times `reset()` was called. */
	resetCalls: number;
	/** Times `getTrackingAuthorization()` was called. */
	trackingReadCalls: number;
	/** Times `requestTrackingAuthorization()` was called. */
	trackingRequestCalls: number;
	/** Serve a new snapshot and emit the `snapshot` event for it. */
	pushSnapshot: (snapshot: ConsentSnapshot) => void;
	/** Serve unreadable text as the next snapshot payload. */
	pushUnreadableSnapshot: (raw: string) => void;
	/** Serve a different platform tracking arm from the next read. */
	setTrackingAuthorization: (status: TrackingAuthorization) => void;
	/** Make the next tracking request reject, the way a build without the plist key does. */
	rejectTrackingRequestWith: (code: string, message: string) => void;
	/**
	 * Serve this payload from the next tracking request.
	 *
	 * `stage` and `presentation` are optional the way they are on the wire, so a test can
	 * send the shape an older binary sends and prove the reader still understands it.
	 */
	setTrackingRequestReply: (reply: TrackingRequestReply) => void;
	/**
	 * Serve these payloads, in order, from the next tracking requests.
	 *
	 * A journey that pauses for additional information asks more than once, and the whole
	 * point of those tests is that the second answer differs from the first.
	 */
	queueTrackingRequestReplies: (
		replies: readonly TrackingRequestReply[]
	) => void;
	/** Payloads handed back by `requestTrackingAuthorization()`, in order. */
	trackingRequestPayloads: string[];
	/** Replace the bootstrap payload served by the next handshake. */
	setBootstrap: (payload: unknown) => void;
	/** Make `commit()` resolve with text that is not a `CommitResult`. */
	failCommitWith: (raw: string) => void;
}

/**
 * Create a fake module and register it under the real module name.
 *
 * @param options - Snapshot and bootstrap payload to serve at first.
 * @returns The fake module, already registered.
 */
export const createFakeNativeModule = function createFakeNativeModule(
	options: {
		readonly snapshot?: ConsentSnapshot;
		readonly bootstrap?: unknown;
	} = {}
): FakeNativeModule {
	let snapshot: ConsentSnapshot | string = options.snapshot ?? buildSnapshot();
	let bootstrap: unknown = options.bootstrap ?? FAKE_BOOTSTRAP;
	let trackingStatus: TrackingAuthorization = 'unsupported';
	let trackingRequestReply: TrackingRequestReply = { status: 'unsupported' };
	const trackingRequestQueue: TrackingRequestReply[] = [];
	let commitReply = JSON.stringify({
		confirmed: [],
		ok: true,
		queued: false,
		revision: (options.snapshot ?? buildSnapshot()).revision,
		subjectId: 'sub-1',
	});

	const fake = {
		addListener: vi.fn(),
		bootstrapCalls: 0,
		commit: vi.fn((intent: string) => {
			fake.commitIntents.push(intent);

			return Promise.resolve(commitReply);
		}),
		commitIntents: [] as string[],
		dismissCalls: 0,
		dismissNotice: vi.fn(() => {
			fake.dismissCalls += 1;
		}),
		failCommitWith: (raw: string) => {
			commitReply = raw;
		},
		getBootstrap: vi.fn(() => {
			fake.bootstrapCalls += 1;

			return JSON.stringify(bootstrap);
		}),
		getSnapshot: vi.fn(() => {
			fake.snapshotCalls += 1;

			return typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot);
		}),
		getTrackingAuthorization: vi.fn(() => {
			fake.trackingReadCalls += 1;

			return JSON.stringify({ status: trackingStatus });
		}),
		identify: vi.fn((externalId: string) => {
			fake.identifyCalls.push(externalId);

			return Promise.resolve();
		}),
		identifyCalls: [] as string[],
		logout: vi.fn(() => {
			fake.logoutCalls += 1;

			return Promise.resolve();
		}),
		logoutCalls: 0,
		overrideCalls: [] as string[],
		pushSnapshot: (next: ConsentSnapshot) => {
			snapshot = next;

			emitNativeEvent('snapshot', JSON.stringify({ revision: next.revision }));
		},
		pushUnreadableSnapshot: (raw: string) => {
			snapshot = raw;

			emitNativeEvent('snapshot', JSON.stringify({ revision: 99 }));
		},
		queueTrackingRequestReplies: (replies: readonly TrackingRequestReply[]) => {
			trackingRequestQueue.push(...replies);
		},
		refresh: vi.fn(() => {
			fake.refreshCalls += 1;

			return Promise.resolve();
		}),
		refreshCalls: 0,
		rejectTrackingRequestWith: (code: string, message: string) => {
			trackingRequestReply = { code, message };
		},
		removeListeners: vi.fn(),
		requestTrackingAuthorization: vi.fn(() => {
			fake.trackingRequestCalls += 1;

			const reply = trackingRequestQueue.shift() ?? trackingRequestReply;

			if (reply.code !== undefined) {
				return Promise.reject(
					Object.assign(new Error(reply.message ?? ''), { code: reply.code })
				);
			}

			trackingStatus = reply.status ?? trackingStatus;

			// `JSON.stringify` drops the undefined keys, which is exactly the shape a
			// binary that predates a field sends, so a test can ask for either.
			const payload = JSON.stringify({
				presentation: reply.presentation,
				stage: reply.stage,
				status: trackingStatus,
			});

			fake.trackingRequestPayloads.push(payload);

			return Promise.resolve(payload);
		}),
		reset: vi.fn(() => {
			fake.resetCalls += 1;

			// A wipe installs the state a first launch boots with: no receipt, the
			// prompt owed again, optionals denied while policy is re-resolving. The
			// subject id stays and the revision moves by one, like both cores do.
			const current = typeof snapshot === 'string' ? buildSnapshot() : snapshot;

			snapshot = buildSnapshot({
				consentCategories: current.consentCategories,
				effectivePermissions: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
					necessary: true,
				},
				explicitChoice: null,
				location: current.location,
				model: current.model,
				policyPending: true,
				policySnapshotToken: null,
				promptRequirement: { kind: 'choice', reason: 'missing' },
				ready: false,
				revision: current.revision + 1,
			});

			return Promise.resolve();
		}),
		resetCalls: 0,
		setBootstrap: (payload: unknown) => {
			bootstrap = payload;
		},
		setOverrides: vi.fn((overrides: string) => {
			fake.overrideCalls.push(overrides);

			return Promise.resolve();
		}),
		setTrackingAuthorization: (status: TrackingAuthorization) => {
			trackingStatus = status;
			trackingRequestReply = { status };
		},
		setTrackingRequestReply: (reply: TrackingRequestReply) => {
			trackingRequestReply = reply;
		},
		snapshotCalls: 0,
		trackingReadCalls: 0,
		trackingRequestCalls: 0,
		trackingRequestPayloads: [] as string[],
	};

	setNativeModule(NATIVE_C15T_MODULE_NAME, fake);

	return fake as unknown as FakeNativeModule;
};

/**
 * Run a function that must throw and hand back the error.
 *
 * Vitest forbids `expect` inside a `catch`, and `toThrow(matcher)` only checks
 * one fragment at a time. Returning the error keeps assertions on custom error
 * fields readable.
 *
 * @param run - The call expected to throw.
 * @returns The thrown error.
 * @throws {Error} When the call did not throw.
 */
export const captureError = function captureError(run: () => unknown): Error {
	try {
		run();
	} catch (error) {
		return error instanceof Error ? error : new Error(String(error));
	}

	throw new Error('expected the call to throw, and it did not');
};

/**
 * Run a function that must throw and hand back its message.
 *
 * @param run - The call expected to throw.
 * @returns The thrown message.
 * @throws {Error} When the call did not throw.
 */
export const captureErrorMessage = function captureErrorMessage(
	run: () => unknown
): string {
	return captureError(run).message;
};

/**
 * Render a tree with `react-dom`, wrapped in `act`.
 *
 * Deliberately small. These tests assert render counts and native call counts,
 * not queries, so a testing library would only add a dependency.
 *
 * @param element - Tree to render.
 * @returns A handle to rerender and unmount.
 */
export const renderTree = function renderTree(
	element: ReactElement
): RenderHandle {
	const container = document.createElement('div');

	document.body.append(container);

	const root: Root = createRoot(container);

	act(() => {
		root.render(element);
	});

	return {
		container: () => container,
		rerender: (next: ReactElement) => {
			act(() => {
				root.render(next);
			});
		},
		text: () => container.textContent ?? '',
		unmount: () => {
			act(() => {
				root.unmount();
			});

			container.remove();
		},
	};
};

/** What {@link renderTree} returns. */
export interface RenderHandle {
	/**
	 * The node the tree renders into, for the rare test that has to reach a real
	 * element, such as one that dispatches a click.
	 */
	container: () => HTMLElement;
	/** Text content of the rendered tree. */
	text: () => string;
	/** Render a different element into the same root. */
	rerender: (element: ReactElement) => void;
	/** Unmount and detach the container. */
	unmount: () => void;
}

/**
 * Apply a change and let React flush the effects it triggers.
 *
 * @param mutate - The change to apply.
 */
export const flush = function flush(mutate: () => void): void {
	act(() => {
		mutate();
	});
};

/**
 * Let queued promise callbacks run, then flush React.
 *
 * @returns Resolves once React has applied the resulting updates.
 */
export const flushPromises = async function flushPromises(): Promise<void> {
	await act(async () => {
		// A macrotask boundary, not one microtask: `AccessibilityInfo` answers
		// asynchronously, and a platform read that settles outside `act` has its
		// update applied at the *next* boundary, which would land in the middle of
		// whatever the test drives next.
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 0);
		});
	});
};

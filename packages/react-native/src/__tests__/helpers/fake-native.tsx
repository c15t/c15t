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
import type { ConsentSnapshot } from '../../protocol';
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
		location: { country: 'DE', language: 'en', region: null },
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
	/** Serve a new snapshot and emit the `snapshot` event for it. */
	pushSnapshot: (snapshot: ConsentSnapshot) => void;
	/** Serve unreadable text as the next snapshot payload. */
	pushUnreadableSnapshot: (raw: string) => void;
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
		refresh: vi.fn(() => {
			fake.refreshCalls += 1;

			return Promise.resolve();
		}),
		refreshCalls: 0,
		removeListeners: vi.fn(),
		setBootstrap: (payload: unknown) => {
			bootstrap = payload;
		},
		setOverrides: vi.fn((overrides: string) => {
			fake.overrideCalls.push(overrides);

			return Promise.resolve();
		}),
		snapshotCalls: 0,
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

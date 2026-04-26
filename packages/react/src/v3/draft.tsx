'use client';

/**
 * Consent draft — local UI state for preference-center-style flows.
 *
 * The kernel's `consents` is the single source of truth for "what's
 * actually in effect" (what gates scripts, blockers, iframes). But
 * preference-center UIs need a staging layer: the user ticks checkboxes
 * to build up a draft choice, then commits via "Save" — cancel or close
 * should discard the draft without touching the kernel.
 *
 * This module provides that staging primitive:
 *
 *   <ConsentDraftProvider>     — scopes a shared draft across siblings
 *   useConsentDraft()          — read + mutate + commit the current draft
 *
 * The draft state lives in React state (shared via context when the
 * provider is used). It never writes to the kernel until the caller
 * invokes `save()`. At commit, the draft flushes through
 * `kernel.commands.save(values)` and resets itself to a fresh copy of
 * the kernel's new consents.
 */

import type { AllConsentNames } from 'c15t';
import type { ConsentState } from 'c15t/v3';
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	useSyncExternalStore,
} from 'react';
import { KernelContext } from './context';

export interface ConsentDraftHandle {
	/** Current draft values. Starts identical to the kernel's consents. */
	values: Readonly<ConsentState>;
	/** Has the draft diverged from the kernel's current consents? */
	isDirty: boolean;
	/** Update a single category in the draft. Does not touch the kernel. */
	set(category: AllConsentNames, value: boolean): void;
	/** Replace the whole draft with a partial update. */
	update(patch: Partial<ConsentState>): void;
	/** Select every category (except stays as-is for necessary). */
	acceptAll(): void;
	/** Flip every category to false except `necessary`. */
	rejectAll(): void;
	/** Commit the draft through `kernel.commands.save(values)`. */
	save(): Promise<void>;
	/** Reseed the draft from the kernel's current consents. */
	reset(): void;
}

interface DraftStore {
	getSnapshot(): Readonly<ConsentState>;
	subscribe(listener: () => void): () => void;
	setCategory(category: AllConsentNames, value: boolean): void;
	replace(patch: Partial<ConsentState>): void;
	overwrite(next: ConsentState): void;
}

function createDraftStore(initial: ConsentState): DraftStore {
	let current: ConsentState = { ...initial };
	const listeners = new Set<() => void>();
	function notify(): void {
		for (const l of listeners) l();
	}
	return {
		getSnapshot: () => current,
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		setCategory(category, value) {
			if (current[category] === value) return;
			current = { ...current, [category]: value };
			notify();
		},
		replace(patch) {
			let changed = false;
			const next = { ...current };
			for (const key of Object.keys(patch) as AllConsentNames[]) {
				const value = patch[key];
				if (typeof value === 'boolean' && next[key] !== value) {
					next[key] = value;
					changed = true;
				}
			}
			if (!changed) return;
			current = next;
			notify();
		},
		overwrite(next) {
			current = { ...next };
			notify();
		},
	};
}

/**
 * Context for a shared draft store. When provided, sibling components
 * (banner + dialog, for example) see the same draft.
 */
const DraftContext = createContext<DraftStore | null>(null);

export interface ConsentDraftProviderProps {
	children: ReactNode;
	/** Override the initial draft values. Defaults to kernel's current consents. */
	initial?: Partial<ConsentState>;
}

export function ConsentDraftProvider({
	children,
	initial,
}: ConsentDraftProviderProps) {
	const kernel = useContext(KernelContext);
	const parentStore = useContext(DraftContext);
	if (!kernel) {
		throw new Error(
			'ConsentDraftProvider: no kernel in context. Wrap with <ConsentProvider options={...}> first.'
		);
	}

	const shouldUseParentStore = Boolean(parentStore && !initial);

	// Seed the store exactly once. `initial` wins, then kernel's current consents.
	const [store] = useState(() => {
		const base = kernel.getSnapshot().consents as ConsentState;
		const seed: ConsentState = initial ? { ...base, ...initial } : base;
		return createDraftStore(seed);
	});

	// Re-seed whenever the kernel's consents change externally (e.g.
	// another tab wrote to storage and persistence hydrated). Only fires
	// when the draft is NOT dirty — otherwise the user's in-progress
	// edits win until they save or reset.
	//
	// "Dirty" here means "the user modified the draft relative to the
	// PREVIOUS kernel state". We compare the draft against the old
	// snapshot (what it was seeded from), not the new one — otherwise
	// every external kernel change would look "dirty" simply because the
	// kernel moved on.
	useEffect(() => {
		if (shouldUseParentStore) return;
		let lastKernelConsents = kernel.getSnapshot().consents as ConsentState;
		return kernel.subscribe((snap) => {
			const nextKernelConsents = snap.consents as ConsentState;
			if (nextKernelConsents === lastKernelConsents) return;
			const drafts = store.getSnapshot();
			let dirty = false;
			for (const key of Object.keys(drafts) as AllConsentNames[]) {
				if (drafts[key] !== lastKernelConsents[key]) {
					dirty = true;
					break;
				}
			}
			lastKernelConsents = nextKernelConsents;
			if (!dirty) store.overwrite(nextKernelConsents);
		});
	}, [kernel, shouldUseParentStore, store]);

	if (shouldUseParentStore) {
		return <>{children}</>;
	}

	return (
		<DraftContext.Provider value={store}>{children}</DraftContext.Provider>
	);
}

function useKernelOrThrow() {
	const kernel = useContext(KernelContext);
	if (!kernel) {
		throw new Error(
			'useConsentDraft: no kernel in context. Wrap with <ConsentProvider options={...}>.'
		);
	}
	return kernel;
}

/**
 * Read + mutate the current consent draft. When used inside a
 * `<ConsentDraftProvider>`, draft state is shared across siblings.
 * Without a provider, a fresh local draft is created per hook call.
 */
export function useConsentDraft(): ConsentDraftHandle {
	const kernel = useKernelOrThrow();
	const shared = useContext(DraftContext);

	// If no provider is in scope, create a component-local draft store.
	// This is fine for single-dialog usage.
	const [local] = useState(() =>
		createDraftStore(kernel.getSnapshot().consents as ConsentState)
	);
	const store = shared ?? local;

	const values = useSyncExternalStore(
		(listener) => store.subscribe(listener),
		() => store.getSnapshot(),
		() => store.getSnapshot()
	);

	const kernelConsents = useSyncExternalStore(
		(listener) => kernel.subscribe(listener),
		() => kernel.getSnapshot().consents as ConsentState,
		() => kernel.getSnapshot().consents as ConsentState
	);

	const isDirty = useMemo(() => {
		for (const key of Object.keys(values) as AllConsentNames[]) {
			if (values[key] !== kernelConsents[key]) return true;
		}
		return false;
	}, [values, kernelConsents]);

	const set = useCallback(
		(category: AllConsentNames, value: boolean) => {
			store.setCategory(category, value);
		},
		[store]
	);

	const update = useCallback(
		(patch: Partial<ConsentState>) => {
			store.replace(patch);
		},
		[store]
	);

	const acceptAll = useCallback(() => {
		const next: ConsentState = { ...values };
		for (const key of Object.keys(next) as AllConsentNames[]) {
			next[key] = true;
		}
		store.overwrite(next);
	}, [store, values]);

	const rejectAll = useCallback(() => {
		const next: ConsentState = { ...values };
		for (const key of Object.keys(next) as AllConsentNames[]) {
			next[key] = key === 'necessary';
		}
		store.overwrite(next);
	}, [store, values]);

	const save = useCallback(async () => {
		await kernel.commands.save(store.getSnapshot());
		// After commit, reseed the draft from the kernel's newly-current
		// consents — the commit might have been modified by policy scope.
		store.overwrite(kernel.getSnapshot().consents as ConsentState);
	}, [kernel, store]);

	const reset = useCallback(() => {
		store.overwrite(kernel.getSnapshot().consents as ConsentState);
	}, [kernel, store]);

	return {
		values,
		isDirty,
		set,
		update,
		acceptAll,
		rejectAll,
		save,
		reset,
	};
}

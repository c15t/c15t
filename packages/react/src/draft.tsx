'use client';

import type {
	AllConsentNames,
	ConsentKernel,
	ConsentSnapshot,
	ConsentState,
	SaveResult,
	SaveInput,
} from '@c15t/core';
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	useSyncExternalStore,
} from 'react';
import type { ReactNode } from 'react';

import { KernelContext, ProviderServicesContext } from './context';
import { useUIConfig } from './ui-config-context';
import { saveConsentUI } from './ui-save';

/** A local, unmasked selection, committed only by an explicit save. */
export interface ConsentDraftHandle {
	values: Readonly<ConsentState>;
	displayedCategories: readonly AllConsentNames[];
	isDirty: boolean;
	/** A material policy change requires reset and review before saving. */
	isStale: boolean;
	set: (category: AllConsentNames, value: boolean) => void;
	update: (patch: Partial<ConsentState>) => void;
	acceptAll: () => void;
	rejectAll: () => void;
	save: () => Promise<SaveResult>;
	reset: () => void;
}
interface DraftSnapshot {
	values: ConsentState;
	displayedCategories: readonly AllConsentNames[];
	isDirty: boolean;
	isStale: boolean;
}
const seed = function seed(
	snapshot: ConsentSnapshot,
	defaults?: Partial<ConsentState>
): ConsentState {
	const values: ConsentState = {
		experience: false,
		functionality: false,
		marketing: false,
		measurement: false,
		necessary: true,
	};
	for (const category of snapshot.policyRule.scope) {
		values[category] =
			snapshot.explicitChoice?.categories[category]?.value ??
			defaults?.[category] ??
			(snapshot.policyRule.model === 'opt-out' ||
				snapshot.policyRule.preselectedCategories.includes(category));
	}
	return values;
};
const createDraftStore = function createDraftStore(
	kernel: ConsentKernel,
	defaults?: Partial<ConsentState>
) {
	let revision = 0;
	let saveSequence = 0;
	let source = kernel.getSnapshot();
	let base = seed(source, defaults);
	let { fingerprint } = source.evaluationPolicy.choice;
	let current: DraftSnapshot = {
		displayedCategories: ['necessary', ...source.policyRule.scope],
		isDirty: false,
		isStale: false,
		values: base,
	};
	const listeners = new Set<() => void>();
	const publish = (next: DraftSnapshot) => {
		current = next;
		for (const listener of listeners) {
			listener();
		}
	};
	const reset = () => {
		revision += 1;
		source = kernel.getSnapshot();
		base = seed(source, defaults);
		({ fingerprint } = source.evaluationPolicy.choice);
		publish({
			displayedCategories: ['necessary', ...source.policyRule.scope],
			isDirty: false,
			isStale: false,
			values: base,
		});
	};
	const update = (patch: Partial<ConsentState>) => {
		const values = { ...current.values };
		let changed = false;
		for (const category of current.displayedCategories) {
			if (
				category !== 'necessary' &&
				typeof patch[category] === 'boolean' &&
				values[category] !== patch[category]
			) {
				values[category] = patch[category];
				changed = true;
			}
		}
		if (changed) {
			revision += 1;
			publish({
				...current,
				isDirty: current.displayedCategories.some(
					(category) => values[category] !== base[category]
				),
				values,
			});
		}
	};
	const sync = () => {
		const next = kernel.getSnapshot();
		if (
			source.explicitChoice === next.explicitChoice &&
			source.policyRule === next.policyRule &&
			source.evaluationPolicy === next.evaluationPolicy
		) {
			return;
		}
		const material = fingerprint !== next.evaluationPolicy.choice.fingerprint;
		source = next;
		if (!current.isDirty) {
			reset();
		} else if (material && !current.isStale) {
			publish({ ...current, isStale: true });
		}
	};
	return {
		acceptAll() {
			update(
				Object.fromEntries(
					current.displayedCategories.map((category) => [category, true])
				)
			);
		},
		connect() {
			sync();
			return kernel.subscribe(sync);
		},
		getSnapshot: () => current,
		rejectAll() {
			update(
				Object.fromEntries(
					current.displayedCategories.map((category) => [category, false])
				)
			);
		},
		reset,
		async save(
			input?: SaveInput,
			categories?: readonly AllConsentNames[],
			onSuccess?: () => void
		): Promise<SaveResult> {
			// Guard against changes between the render and the click as well.
			if (
				fingerprint !==
					kernel.getSnapshot().evaluationPolicy.choice.fingerprint ||
				current.isStale
			) {
				publish({ ...current, isStale: true });
				return { ok: false };
			}
			const patch: Partial<ConsentState> = {};
			const selection = new Set(categories ?? current.displayedCategories);
			for (const category of current.displayedCategories) {
				if (category !== 'necessary' && selection.has(category)) {
					patch[category] = current.values[category];
				}
			}
			saveSequence += 1;
			const sequence = saveSequence;
			const pending = kernel.commands.save(input ?? patch, { categories });
			// A clean draft can reseed synchronously from the local receipt.
			const savedRevision = revision;
			const result = await pending;
			if (
				result.ok &&
				sequence === saveSequence &&
				revision === savedRevision &&
				!current.isStale &&
				fingerprint === kernel.getSnapshot().evaluationPolicy.choice.fingerprint
			) {
				reset();
				onSuccess?.();
			}
			return result;
		},
		set(category: AllConsentNames, value: boolean) {
			update({ [category]: value });
		},
		subscribe(listener: () => void) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		update,
	};
};
type DraftStore = ReturnType<typeof createDraftStore>;
const DraftContext = createContext<DraftStore | null>(null);
const useKernel = function useKernel() {
	const kernel = useContext(KernelContext);
	if (!kernel) {
		throw new Error('Consent drafts require a ConsentProvider.');
	}
	return kernel;
};
export interface ConsentDraftProviderProps {
	children: ReactNode;
	/** Defaults apply only to categories without an explicit receipt. */
	initial?: Partial<ConsentState>;
}
export const ConsentDraftProvider = ({
	children,
	initial,
}: ConsentDraftProviderProps) => {
	const kernel = useKernel();
	const parent = useContext(DraftContext);
	const { presentation } = useUIConfig();
	const [local, setLocal] = useState(() =>
		createDraftStore(kernel, initial ?? presentation?.preferences?.defaults)
	);
	void setLocal;
	const store = parent && !initial ? parent : local;
	useEffect(() => store.connect(), [store]);
	return (
		<DraftContext.Provider value={store}>{children}</DraftContext.Provider>
	);
};
const useDraftStore = function useDraftStore() {
	const kernel = useKernel();
	const shared = useContext(DraftContext);
	const { presentation } = useUIConfig();
	const [local, setLocal] = useState(() =>
		createDraftStore(kernel, presentation?.preferences?.defaults)
	);
	void setLocal;
	const store = shared ?? local;
	useEffect(() => (shared ? undefined : store.connect()), [shared, store]);
	return store;
};

const useSaveAction = function useSaveAction(store: DraftStore) {
	const kernel = useKernel();
	const services = useContext(ProviderServicesContext);
	return useCallback(
		(input?: SaveInput) => {
			let current = false;
			return saveConsentUI(
				kernel,
				() =>
					store.save(input, services?.getConsentCategories(), () => {
						current = true;
					}),
				() => current
			);
		},
		[kernel, store, services]
	);
};

const useDraftHandle = function useDraftHandle(
	store: DraftStore
): ConsentDraftHandle {
	const snapshot = useSyncExternalStore(
		store.subscribe,
		store.getSnapshot,
		store.getSnapshot
	);
	return useMemo(
		() => ({
			...snapshot,
			acceptAll: store.acceptAll,
			rejectAll: store.rejectAll,
			reset: store.reset,
			save: store.save,
			set: store.set,
			update: store.update,
		}),
		[snapshot, store]
	);
};

/** Internal UI save path shared by stock controls and headless actions. */
export const useConsentSaveAction = function useConsentSaveAction() {
	return useSaveAction(useDraftStore());
};

/** Keep the compatibility manager selection and its save on the same draft. */
export const useConsentManagerDraft = function useConsentManagerDraft() {
	const store = useDraftStore();
	return { draft: useDraftHandle(store), save: useSaveAction(store) };
};

/** Read and edit displayed choices without replacing masked effective permissions. */
export const useConsentDraft = function useConsentDraft(): ConsentDraftHandle {
	return useDraftHandle(useDraftStore());
};

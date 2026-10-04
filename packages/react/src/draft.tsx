'use client';

import type {
	AllConsentNames,
	ConsentKernel,
	ConsentState,
	SaveResult,
} from '@c15t/core';
import { createPreferenceDraft } from '@c15t/core/preference-draft';
import type {
	PreferenceDraft,
	PreferenceDraftState,
} from '@c15t/core/preference-draft';
import {
	useContext,
	useEffect,
	useMemo,
	useState,
	useSyncExternalStore,
} from 'react';
import type { ReactNode } from 'react';

import {
	DraftContext,
	REFUSED,
	useDraftKernel,
	useKernelGuard,
} from './draft-context';
import { useResolvedPresentation } from './hooks';

/** A local, unmasked selection, committed only by an explicit save. */
export interface ConsentDraftHandle {
	values: Readonly<ConsentState>;
	displayedCategories: readonly AllConsentNames[];
	/**
	 * Granted flag per declared vendor. Seeded from the denials the gate
	 * honors, so a vendor declared `disabled` reads `true` whatever an older
	 * record says; every vendor not denied is `true`. Empty under an `iab`
	 * policy.
	 */
	vendors: Readonly<Record<string, boolean>>;
	isDirty: boolean;
	/** A policy or displayed-category change requires reset and review before saving. */
	isStale: boolean;
	set: (category: AllConsentNames, value: boolean) => void;
	update: (patch: Partial<ConsentState>) => void;
	/**
	 * Stage one vendor's grant. Recorded by the next save. Ignored for a
	 * vendor that is not declared or is declared `disabled`, since the kernel
	 * would drop the grant on save.
	 */
	setVendor: (vendorId: string, granted: boolean) => void;
	acceptAll: () => void;
	rejectAll: () => void;
	save: () => Promise<SaveResult>;
	reset: () => void;
}
type DraftStore = PreferenceDraft;

/**
 * A draft bound to the kernel in context. A provider handed a new runtime
 * changes that kernel without remounting its children, so the draft is
 * rebuilt for the new kernel and the previous one is dropped rather than
 * carried over, where its save would record into the old runtime.
 */
const useKernelDraft = function useKernelDraft(
	kernel: ConsentKernel,
	defaults: Partial<ConsentState> | undefined
): DraftStore {
	const [entry, setEntry] = useState(() => ({
		draft: createPreferenceDraft(kernel, { defaults }),
		kernel,
	}));
	useEffect(() => {
		entry.draft.setDefaults(defaults);
	}, [entry.draft, defaults]);
	if (entry.kernel === kernel) {
		return entry.draft;
	}
	// Adjusting state during render: React re-renders this component before
	// committing, so no child ever sees the draft of the previous kernel.
	const next = { draft: createPreferenceDraft(kernel, { defaults }), kernel };
	setEntry(next);
	return next.draft;
};
export interface ConsentDraftProviderProps {
	children: ReactNode;
	/** Defaults apply only to categories without an explicit receipt. */
	initial?: Partial<ConsentState>;
}

/**
 * Share one draft with every draft hook and stock control below it. The
 * preference dialog renders one, so its switches, vendor rows and save
 * button stage into and confirm the same draft.
 */
export const ConsentDraftProvider = ({
	children,
	initial,
}: ConsentDraftProviderProps) => {
	const kernel = useDraftKernel();
	const parent = useContext(DraftContext);
	const presentation = useResolvedPresentation();
	const local = useKernelDraft(
		kernel,
		initial ?? presentation?.preferences?.defaults
	);
	// Inherit an outer draft only while it belongs to this kernel. A nested
	// provider on another runtime must not save into the outer one.
	const draft = parent && !initial && parent.kernel === kernel ? parent : local;
	return (
		<DraftContext.Provider value={draft}>{children}</DraftContext.Provider>
	);
};

/** The nearest shared draft on this kernel, or one of this component's own. */
const useDraftStore = function useDraftStore(): DraftStore {
	const kernel = useDraftKernel();
	const shared = useContext(DraftContext);
	const local = useKernelDraft(
		kernel,
		useResolvedPresentation()?.preferences?.defaults
	);
	// A shared draft bound to another kernel belongs to an outer provider.
	return shared?.kernel === kernel ? shared : local;
};

const useDraftHandle = function useDraftHandle(
	draft: DraftStore
): ConsentDraftHandle {
	const state = useSyncExternalStore(
		draft.subscribe,
		draft.getState,
		draft.getState
	);
	const isCurrent = useKernelGuard(draft.kernel);
	return useMemo(() => {
		// A handle bound to another kernel is inert: staging would edit a
		// draft this component no longer shows, and saving would record into
		// the previous runtime.
		const guarded =
			<Args extends unknown[]>(method: (...args: Args) => void) =>
			(...args: Args) => {
				if (isCurrent()) {
					method(...args);
				}
			};
		return {
			...state,
			acceptAll: guarded(draft.acceptAll),
			rejectAll: guarded(draft.rejectAll),
			reset: guarded(draft.reset),
			save: () => (isCurrent() ? draft.save() : Promise.resolve(REFUSED)),
			set: guarded(draft.set),
			setVendor: guarded(draft.setVendor),
			update: guarded(draft.update),
		};
	}, [draft, isCurrent, state]);
};

/**
 * The nearest consent draft, for the stock preference rows. Pair with
 * {@link useConsentDraftSlice} so a row re-renders only when its own slice
 * changes, not on every staged edit elsewhere in the draft.
 *
 * @returns The shared draft, or a local one outside a provider.
 * @internal
 */
export const useConsentDraftStore =
	function useConsentDraftStore(): DraftStore {
		return useDraftStore();
	};

/**
 * Subscribes to one slice of a consent draft.
 *
 * @param draft - Draft from {@link useConsentDraftStore}.
 * @param selector - Picks the slice. Return a primitive or a reference the
 * draft already holds.
 * @returns The selected slice.
 * @internal
 */
export const useConsentDraftSlice = function useConsentDraftSlice<SliceType>(
	draft: DraftStore,
	selector: (state: PreferenceDraftState) => SliceType
): SliceType {
	const read = () => selector(draft.getState());
	return useSyncExternalStore(draft.subscribe, read, read);
};

/** Read and edit displayed choices without replacing masked effective permissions. */
export const useConsentDraft = function useConsentDraft(): ConsentDraftHandle {
	return useDraftHandle(useDraftStore());
};

/** The vendor slice of the consent draft, for a custom vendor control. */
export interface VendorDraftHandle {
	/** Granted flag per declared vendor. See {@link ConsentDraftHandle.vendors}. */
	vendors: Readonly<Record<string, boolean>>;
	/** Stage one vendor's grant for the next save. See {@link ConsentDraftHandle.setVendor}. */
	setVendor: (vendorId: string, granted: boolean) => void;
	/** Whether any draft value, category or vendor, differs from the record. */
	isDirty: boolean;
	/**
	 * Whether the policy or the vendor surface changed under an unsaved edit.
	 * `save` refuses a stale draft. See {@link ConsentDraftHandle.isStale}.
	 */
	isStale: boolean;
	/** Confirm the draft, categories and vendors together. */
	save: () => Promise<SaveResult>;
	/** Discard staged edits and reseed from the record. See {@link ConsentDraftHandle.reset}. */
	reset: () => void;
}

/**
 * Read and stage vendor grants on the same draft the category switches use.
 * A custom vendor toggle needs only this; the categories stay where the
 * stock widget or `useConsentDraft()` left them, and one save confirms both.
 * When the policy or the vendor list changes under a staged edit the draft
 * turns stale and `save` refuses it; `reset` reseeds it from the record.
 *
 * @returns The draft's vendor map, the setter, the dirty and stale flags,
 * the save and the reset.
 * @example
 * ```tsx
 * const { vendors, setVendor, isStale, reset, save } = useVendorDraft();
 * <Switch
 *   checked={vendors['meta-pixel'] ?? true}
 *   onCheckedChange={(on) => setVendor('meta-pixel', on)}
 * />;
 * {isStale && <button onClick={reset}>Review again</button>}
 * ```
 * @public
 */
export const useVendorDraft = function useVendorDraft(): VendorDraftHandle {
	const { isDirty, isStale, reset, save, setVendor, vendors } =
		useDraftHandle(useDraftStore());
	return useMemo(
		() => ({ isDirty, isStale, reset, save, setVendor, vendors }),
		[isDirty, isStale, reset, save, setVendor, vendors]
	);
};

'use client';

import type {
	AllConsentNames,
	ConsentKernel,
	ConsentState,
	SaveInput,
	SaveResult,
	SaveUISource,
} from '@c15t/core';
import type { PreferenceDraft } from '@c15t/core/preference-draft';
import { saveConsentSurface } from '@c15t/core/surface-actions';
import { createContext, useCallback, useContext } from 'react';

import { KernelContext, ProviderServicesContext } from './context';
import { useResolvedPresentation } from './hooks';
import { useCommittedRef } from './hooks/use-committed-ref';

/**
 * The draft a `ConsentDraftProvider` shares. Here, apart from the draft
 * module, so the banner's buttons can read it without loading the draft:
 * the draft only runs once a preference surface renders.
 */
export const DraftContext = createContext<PreferenceDraft | null>(null);

export const REFUSED: SaveResult = { ok: false };

/** The kernel in context; throws outside a provider. */
export const useDraftKernel = function useDraftKernel(): ConsentKernel {
	const kernel = useContext(KernelContext);
	if (!kernel) {
		throw new Error('Consent drafts require a ConsentProvider.');
	}
	return kernel;
};

/**
 * Whether `owner` is still the kernel this component last committed.
 *
 * A handle or save action kept across a runtime switch, by an async submit
 * or a descendant's layout effect in the switch commit, calls through this,
 * so it records nothing into the previous runtime. The committed kernel is
 * read at call time (see `useCommittedRef`). A component that only unmounts
 * keeps its last kernel, so a submit that outlives its dialog still saves.
 */
export const useKernelGuard = function useKernelGuard(
	owner: ConsentKernel
): () => boolean {
	const committedKernelRef = useCommittedRef(useDraftKernel());
	return useCallback(
		() => committedKernelRef.current === owner,
		[committedKernelRef, owner]
	);
};

/**
 * Save the preferences a surface would show without a draft: what a fresh
 * draft seeds. Loaded on demand; only a "save" outside a preference
 * surface needs it.
 */
const saveFreshDraft = async function saveFreshDraft(
	kernel: ConsentKernel,
	defaults: Partial<ConsentState> | undefined,
	categories: readonly AllConsentNames[] | undefined,
	uiSource: SaveUISource | undefined
): Promise<SaveResult> {
	const { createPreferenceDraft } = await import('@c15t/core/preference-draft');
	return createPreferenceDraft(kernel, { defaults }).save({
		categories,
		uiSource,
	});
};

/**
 * Internal UI save path shared by stock controls and headless actions.
 *
 * Inside a `ConsentDraftProvider` an omitted input saves the shared draft.
 * Bulk and explicit inputs go straight to the kernel; a bulk one also
 * discards the draft's staged edits.
 *
 * @internal
 */
export const useConsentSaveAction = function useConsentSaveAction() {
	const kernel = useDraftKernel();
	const services = useContext(ProviderServicesContext);
	const shared = useContext(DraftContext);
	// A shared draft bound to another kernel belongs to an outer provider.
	const draft = shared?.kernel === kernel ? shared : null;
	const defaults = useResolvedPresentation()?.preferences?.defaults;
	const isCurrent = useKernelGuard(kernel);
	return useCallback(
		(input?: SaveInput, uiSource?: SaveUISource): Promise<SaveResult> => {
			// Refuse before touching the previous runtime's UI state.
			if (!isCurrent()) {
				return Promise.resolve(REFUSED);
			}
			const categories = services?.getConsentCategories();
			const bulk = input === 'all' || input === 'none';
			const save = (): Promise<SaveResult> => {
				if (draft && (bulk || input === undefined)) {
					return draft.save({ categories, input, uiSource });
				}
				if (input === undefined) {
					return saveFreshDraft(kernel, defaults, categories, uiSource);
				}
				return kernel.commands.save(input, {
					...(categories !== undefined && { categories }),
					...(uiSource !== undefined && { uiSource }),
				});
			};
			// A draft save that left edits staged (made while it ran, or a
			// stale draft it refused) keeps the dialog open.
			return saveConsentSurface(
				kernel,
				save,
				() => input !== undefined || !draft?.getState().isDirty
			);
		},
		[defaults, draft, isCurrent, kernel, services]
	);
};

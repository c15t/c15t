import type { ConsentState, SaveResult } from '@c15t/core';
import { createPreferenceDraft } from '@c15t/core/preference-draft';
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';

import { useResolvedPresentation } from './experiment';
import { useConsentKernelContext } from './kernel';

/**
 * Editable, unmasked choices scoped to the categories the visitor reviewed,
 * over `@c15t/core/preference-draft`. The draft follows the record on its
 * own: values the record changes move unless the visitor staged them, and a
 * policy or vendor-list change under a staged edit makes it stale.
 *
 * The draft is part of first load in Nuxt. Moving it behind the preference
 * surfaces saved 675 B gzip but made Rolldown split `libs/has` into a file
 * of its own, and on mobile one more first-load request cost more than the
 * bytes saved.
 *
 * @returns Refs for the draft's state and its actions.
 */
export const useConsentDraft = function useConsentDraft() {
	const { kernel } = useConsentKernelContext();
	const presentation = useResolvedPresentation();
	const draft = createPreferenceDraft(kernel, {
		defaults: presentation.value?.preferences?.defaults,
	});
	const state = shallowRef(draft.getState());
	/** The form's values. A write, `v-model` included, stages through the draft. */
	const values = ref<Partial<ConsentState>>({ ...state.value.values });
	const follow = () => {
		state.value = draft.getState();
		values.value = { ...state.value.values };
	};
	// The server renders the seed; only the browser follows the kernel.
	if (typeof window !== 'undefined') {
		onScopeDispose(draft.subscribe(follow));
	}
	watch(
		values,
		(next) => {
			draft.update(next);
			state.value = draft.getState();
			// A write the draft refused (necessary, an undisplayed category)
			// snaps back to what the draft holds.
			const held = state.value.values;
			if (
				Object.entries(next).some(
					([category, value]) => value !== held[category as keyof ConsentState]
				)
			) {
				values.value = { ...held };
			}
		},
		{ deep: true, flush: 'sync' }
	);
	watch(
		() => presentation.value?.preferences?.defaults,
		(defaults) => {
			draft.setDefaults(defaults);
			follow();
		}
	);
	return {
		displayedCategories: computed(() => state.value.displayedCategories),
		/** Whether any staged value differs from the record. */
		isDirty: computed(() => state.value.isDirty),
		isStale: computed(() => state.value.isStale),
		reset() {
			draft.reset();
			follow();
		},
		/**
		 * Record `values` and the vendors the visitor moved. Resolves
		 * `{ ok: false }` without recording while `isStale` is `true`.
		 */
		async save(): Promise<SaveResult> {
			const pending = draft.save();
			follow();
			return await pending;
		},
		/**
		 * Stage one vendor's grant for the next save. Ignored for a vendor that
		 * is not declared or is declared `disabled`, since the kernel would
		 * drop the grant on save.
		 */
		setVendor(vendorId: string, granted: boolean) {
			draft.setVendor(vendorId, granted);
			follow();
		},
		values,
		vendors: computed(() => state.value.vendors),
	};
};

/** What `useConsentDraft()` returns. */
export type ConsentDraft = ReturnType<typeof useConsentDraft>;

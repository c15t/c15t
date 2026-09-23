import type { ConsentState, ConsentSnapshot, SaveResult } from '@c15t/core';
import { deniedVendorIds } from '@c15t/core';
import { computed, ref, shallowRef, watch } from 'vue';

import { useConsentConfig } from './config';
import { useConsentKernelContext } from './kernel';

/** Set an own property without going through the prototype for `__proto__`. */
const setOwn = function setOwn(
	target: Record<string, boolean>,
	key: string,
	value: boolean
): void {
	Object.defineProperty(target, key, {
		configurable: true,
		enumerable: true,
		value,
		writable: true,
	});
};

/**
 * Granted flag per declared vendor, from the denials the gate honors: a
 * stale denial for a vendor now declared `disabled` does not count, so the
 * draft never reports a vendor as off while every gate allows it. Empty
 * under an `iab` policy, where the TC string decides.
 */
const seedVendors = function seedVendors(
	snapshot: ConsentSnapshot
): Record<string, boolean> {
	const grants: Record<string, boolean> = {};
	if (snapshot.model === 'iab') {
		return grants;
	}
	const denied = deniedVendorIds(snapshot) ?? new Set<string>();
	for (const vendor of snapshot.vendors?.declared ?? []) {
		setOwn(grants, vendor.id, !denied.has(vendor.id));
	}
	return grants;
};

/** Ids a vendor switch may change: declared and not `disabled`. */
const toggleableVendorIds = function toggleableVendorIds(
	snapshot: ConsentSnapshot
): ReadonlySet<string> {
	const ids = new Set<string>();
	if (snapshot.model === 'iab') {
		return ids;
	}
	for (const vendor of snapshot.vendors?.declared ?? []) {
		if (vendor.disabled !== true) {
			ids.add(vendor.id);
		}
	}
	return ids;
};

/**
 * What the vendor rows are built from. A change here while the draft is
 * dirty means the visitor was looking at a different list, so the draft
 * goes stale the way a category change makes it stale. A declaration that
 * cannot produce a row, such as a script registering only its slug, is
 * not part of the surface: it changes nothing the visitor can see.
 */
const vendorSurface = function vendorSurface(
	snapshot: ConsentSnapshot
): string {
	if (snapshot.model === 'iab') {
		return '';
	}
	return JSON.stringify(
		(snapshot.vendors?.declared ?? [])
			.filter((vendor) => vendor.presentable)
			.map((vendor) => [vendor.id, vendor.disabled === true, vendor.category])
	);
};

/** Editable, unmasked choices scoped to the categories the visitor reviewed. */
export const useConsentDraft = function useConsentDraft(
	shouldSyncChanges: () => boolean = () => true
) {
	const { kernel, snapshot } = useConsentKernelContext();
	const config = useConsentConfig();
	const fingerprint = ref('');
	const surface = ref('');
	const displayedCategories = shallowRef<(keyof ConsentState)[]>([]);
	const values = ref<Partial<ConsentState>>({});
	/** Granted flag per declared vendor; seeded from the record, edited by the switches. */
	const vendors = ref<Record<string, boolean>>({});
	/** The vendor map as seeded, so save() knows which vendors moved. */
	const baseVendors = shallowRef<Record<string, boolean>>({});
	/** The category values as seeded, so a clean draft can be told apart. */
	const seededValues = shallowRef<Partial<ConsentState>>({});
	const categoriesFor = (current: ConsentSnapshot): (keyof ConsentState)[] => {
		const scope =
			current.evaluationPolicy.choiceScope ?? current.policyRule.scope;
		const available = new Set<keyof ConsentState>(['necessary', ...scope]);
		return [
			...new Set<keyof ConsentState>([
				'necessary',
				...(config.value.consentCategories ?? []).filter((name) =>
					available.has(name)
				),
				...scope,
			]),
		];
	};
	/**
	 * Set by this surface's own save and bulk actions: the record change
	 * they cause reseeds the draft even while it is dirty, since the edits
	 * are what was just recorded or deliberately discarded.
	 */
	const reseedPending = ref(false);
	/** The category values the record and policy imply for the displayed categories. */
	const seedValues = (
		current: ConsentSnapshot,
		categories: readonly (keyof ConsentState)[]
	): Partial<ConsentState> =>
		Object.fromEntries(
			categories.map((category) => [
				category,
				category === 'necessary' ||
					(current.explicitChoice?.categories[category]?.value ??
						config.value.presentation?.preferences?.defaults?.[category] ??
						(current.policyRule.model === 'opt-out' ||
							current.policyRule.preselectedCategories.includes(category))),
			])
		);
	const reset = () => {
		const current = snapshot.value;
		// Any reseed consumes the latch, or a later foreign change would
		// take it and discard edits made after this reseed.
		reseedPending.value = false;
		fingerprint.value = current.evaluationPolicy.choice.fingerprint;
		surface.value = vendorSurface(current);
		displayedCategories.value = categoriesFor(current);
		values.value = seedValues(current, displayedCategories.value);
		seededValues.value = { ...values.value };
		baseVendors.value = seedVendors(current);
		vendors.value = { ...baseVendors.value };
	};
	/**
	 * Follow a record another surface saved without dropping this draft's
	 * edits: untouched categories and vendors take the new baseline, moved
	 * ones keep their staged value. Otherwise the next save would write the
	 * stale untouched values back over the other surface's change.
	 */
	const mergeBaseline = () => {
		const current = snapshot.value;
		const nextValues = seedValues(current, displayedCategories.value);
		values.value = Object.fromEntries(
			displayedCategories.value.map((category) => [
				category,
				values.value[category] === seededValues.value[category]
					? nextValues[category]
					: values.value[category],
			])
		);
		seededValues.value = { ...nextValues };
		const nextVendors = seedVendors(current);
		const mergedVendors: Record<string, boolean> = {};
		for (const [id, granted] of Object.entries(nextVendors)) {
			const staged = vendors.value[id];
			setOwn(
				mergedVendors,
				id,
				staged !== undefined && staged !== baseVendors.value[id]
					? staged
					: granted
			);
		}
		vendors.value = mergedVendors;
		baseVendors.value = nextVendors;
	};
	reset();
	const isStale = computed(
		() =>
			fingerprint.value !==
				snapshot.value.evaluationPolicy.choice.fingerprint ||
			displayedCategories.value.join(',') !==
				categoriesFor(snapshot.value).join(',') ||
			surface.value !== vendorSurface(snapshot.value)
	);
	/** Whether the visitor moved anything since the last seed. */
	const isDirty = () =>
		displayedCategories.value.some(
			(category) => values.value[category] !== seededValues.value[category]
		) ||
		Object.keys(vendors.value).length !==
			Object.keys(baseVendors.value).length ||
		Object.entries(vendors.value).some(
			([id, granted]) => baseVendors.value[id] !== granted
		);
	watch(
		[
			() => snapshot.value.explicitChoice,
			() => snapshot.value.vendorChoice,
			() => snapshot.value.vendors,
			() => snapshot.value.evaluationPolicy,
		],
		(
			[choice, vendorChoice, declared, policy],
			[previousChoice, previousVendorChoice, previousDeclared, previousPolicy]
		) => {
			if (!shouldSyncChanges()) {
				// The surface that suppressed syncing owns this change and
				// reseeds when it is done, so the latch must not outlive it.
				reseedPending.value = false;
				return;
			}
			// A record saved by another surface, a vendor-only commit such as
			// a module declaring its slugs, or a policy object that changed
			// without changing the choice fingerprint reseeds a clean draft.
			// A dirty one keeps its edits, as in React and Svelte; a material
			// change makes it stale for review, and this surface's own save
			// reseeds itself on success.
			const changed =
				choice !== previousChoice ||
				vendorChoice !== previousVendorChoice ||
				declared !== previousDeclared ||
				(policy !== previousPolicy &&
					fingerprint.value === policy.choice.fingerprint);
			if (!changed) {
				return;
			}
			if (reseedPending.value || !isDirty()) {
				reseedPending.value = false;
				reset();
				return;
			}
			mergeBaseline();
		}
	);
	return {
		displayedCategories,
		isStale,
		/**
		 * Let the next record change reseed the draft even while it is
		 * dirty. Bulk actions call this before saving so a staged vendor
		 * toggle follows Accept all and Reject all instead of surviving them.
		 */
		reseedOnNextRecord() {
			reseedPending.value = true;
		},
		reset,
		async save(): Promise<SaveResult> {
			if (isStale.value) {
				return { ok: false };
			}
			const patch: Partial<ConsentState> & {
				vendors?: Record<string, boolean>;
			} = {};
			for (const category of displayedCategories.value) {
				if (category !== 'necessary') {
					patch[category] = values.value[category] ?? false;
				}
			}
			// Only the vendors the draft moved travel with the save, so an
			// untouched vendor never renews its recorded confirmation time.
			const moved: Record<string, boolean> = {};
			for (const [id, granted] of Object.entries(vendors.value)) {
				if (baseVendors.value[id] !== granted) {
					setOwn(moved, id, granted);
				}
			}
			if (Object.keys(moved).length > 0) {
				patch.vendors = moved;
			}
			// The kernel commits locally before the network call, so the
			// record change lands, and reseeds this draft, before the save
			// resolves; a rejected save changes nothing and the flag clears.
			reseedPending.value = true;
			const result = await kernel.commands.save(patch);
			reseedPending.value = false;
			return result;
		},
		/**
		 * Stage one vendor's grant for the next save. Ignored for a vendor that
		 * is not declared or is declared `disabled`, since the kernel would
		 * drop the grant on save.
		 */
		setVendor(vendorId: string, granted: boolean) {
			if (!toggleableVendorIds(snapshot.value).has(vendorId)) {
				return;
			}
			const next = { ...vendors.value };
			setOwn(next, vendorId, granted);
			vendors.value = next;
		},
		values,
		vendors,
	};
};

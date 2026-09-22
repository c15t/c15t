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
 * goes stale the way a category change makes it stale.
 */
const vendorSurface = function vendorSurface(
	snapshot: ConsentSnapshot
): string {
	if (snapshot.model === 'iab') {
		return '';
	}
	return JSON.stringify(
		(snapshot.vendors?.declared ?? []).map((vendor) => [
			vendor.id,
			vendor.presentable,
			vendor.disabled === true,
			vendor.category,
		])
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
	const reset = () => {
		const current = snapshot.value;
		fingerprint.value = current.evaluationPolicy.choice.fingerprint;
		surface.value = vendorSurface(current);
		displayedCategories.value = categoriesFor(current);
		values.value = Object.fromEntries(
			displayedCategories.value.map((category) => [
				category,
				category === 'necessary' ||
					(current.explicitChoice?.categories[category]?.value ??
						config.value.presentation?.preferences?.defaults?.[category] ??
						(current.policyRule.model === 'opt-out' ||
							current.policyRule.preselectedCategories.includes(category))),
			])
		);
		seededValues.value = { ...values.value };
		baseVendors.value = seedVendors(current);
		vendors.value = { ...baseVendors.value };
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
				return;
			}
			// A recorded choice reseeds the draft; so does a policy object that
			// changed without changing the choice fingerprint.
			if (
				choice !== previousChoice ||
				vendorChoice !== previousVendorChoice ||
				(policy !== previousPolicy &&
					fingerprint.value === policy.choice.fingerprint)
			) {
				reset();
				return;
			}
			// A vendor-only commit, such as a module declaring its slugs,
			// reseeds a clean draft so the visitor is not told the policy
			// changed; a dirty one stays and goes stale for review.
			if (declared !== previousDeclared && !isDirty()) {
				reset();
			}
		}
	);
	return {
		displayedCategories,
		isStale,
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
			return await kernel.commands.save(patch);
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

import { OPTIONAL_CONSENT_CATEGORIES } from '../consent-record/types';
import type { OptionalConsentCategory } from '../consent-record/types';
import type { SavePayload } from '../types';

/**
 * Keep surviving confirmations without renewing their receipts or action
 * time. The vendor grant map rides along untouched: it is a whole decision
 * of its own, and only a newer action that carried its own map supersedes
 * it, which the callers check.
 */
export const selectSavePayload = function selectSavePayload(
	payload: SavePayload,
	keep: (category: OptionalConsentCategory) => boolean,
	keepExemption: (category: OptionalConsentCategory) => boolean = keep
): SavePayload | null {
	const keys = OPTIONAL_CONSENT_CATEGORIES.filter((category) =>
		Object.hasOwn(payload.confirmed.categories, category)
	);
	const selected = keys.filter(keep);
	const exemptionKeys = OPTIONAL_CONSENT_CATEGORIES.filter((category) =>
		Object.hasOwn(payload.exemptionPreferences?.categories ?? {}, category)
	);
	const selectedExemptions = exemptionKeys.filter(keepExemption);
	if (
		selected.length === keys.length &&
		selectedExemptions.length === exemptionKeys.length
	) {
		return payload;
	}
	if (
		selected.length === 0 &&
		selectedExemptions.length === 0 &&
		payload.vendorChoice === undefined
	) {
		return null;
	}
	const categories: Partial<Record<OptionalConsentCategory, boolean>> = {};
	const receipts: SavePayload['choice']['categories'] = {};
	const consents = {
		experience: false,
		functionality: false,
		marketing: false,
		measurement: false,
		necessary: true,
	};
	for (const category of selected) {
		const receipt = payload.choice.categories[category];
		if (receipt) {
			categories[category] = receipt.value;
			receipts[category] = receipt;
			consents[category] = payload.consents[category];
		}
	}
	const exemptionCategories: NonNullable<
		SavePayload['exemptionPreferences']
	>['categories'] = {};
	for (const category of selectedExemptions) {
		const preference = payload.exemptionPreferences?.categories[category];
		if (preference) {
			exemptionCategories[category] = preference;
			consents[category] = payload.consents[category];
		}
	}
	return {
		...payload,
		choice: { categories: receipts, version: 3 },
		confirmed: { ...payload.confirmed, categories },
		consentAction: 'custom',
		consents,
		exemptionPreferences: selectedExemptions.length
			? { categories: exemptionCategories, version: 1 }
			: undefined,
		// A partial category action cannot replay the superseded full TC selection.
		tcString: null,
	};
};

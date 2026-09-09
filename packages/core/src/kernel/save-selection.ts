import { OPTIONAL_CONSENT_CATEGORIES } from '../consent-record/types';
import type { OptionalConsentCategory } from '../consent-record/types';
import type { SavePayload } from '../types';

/** Keep surviving confirmations without renewing their receipts or action time. */
export const selectSavePayload = function selectSavePayload(
	payload: SavePayload,
	keep: (category: OptionalConsentCategory) => boolean
): SavePayload | null {
	const keys = OPTIONAL_CONSENT_CATEGORIES.filter((category) =>
		Object.hasOwn(payload.confirmed.categories, category)
	);
	const selected = keys.filter(keep);
	if (selected.length === keys.length) {
		return payload;
	}
	if (selected.length === 0) {
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
	return {
		...payload,
		choice: { categories: receipts, version: 3 },
		confirmed: { ...payload.confirmed, categories },
		consentAction: 'custom',
		consents,
		// A partial category action cannot replay the superseded full TC selection.
		tcString: null,
	};
};

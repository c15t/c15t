import {
	type CONSENT_CATEGORY,
	type Consent,
	getConsentAvailableCategories,
	interpretStoredConsent,
} from 'c15t/v3/consent-record';
import { computed, customRef } from 'vue';
import {
	useConsentActiveUI,
	useConsentConfig,
	useConsentInit,
	useCookie,
} from '#imports';

const CONSENT_COOKIE = 'c15t:consent';

export function useStoredConsent() {
	return useCookie<Consent>(CONSENT_COOKIE, {
		default: () => ({
			policies: {},
			categories: {},
		}),
	});
}

export function useConsent() {
	const stored = useStoredConsent();
	const init = useConsentInit();

	return customRef((track, trigger) => ({
		get() {
			track();
			return stored.value.categories;
		},
		set(value) {
			stored.value.categories = value;
			if (!init.value) throw new Error('Consent init not found');
			if (!init.value.policy) throw new Error('Consent policy not found');
			if (!init.value.policyDecision)
				throw new Error('Consent policy decision not found');
			stored.value.policies[init.value.policy.id] = {
				fingerprint: init.value.policyDecision.fingerprint,
				timestamp: Date.now().toString(),
			};
			trigger();
		},
	}));
}

export function useHasConsent() {
	const stored = useStoredConsent();
	const init = useConsentInit();
	return computed(() => {
		if (!init.value) return [];
		if (!stored.value) return [];
		return interpretStoredConsent(stored.value, init.value);
	});
}

export type ConsentSaveInput = Array<CONSENT_CATEGORY> | 'all' | 'none';

export function useConsentSave() {
	const activeUI = useConsentActiveUI();
	const config = useConsentConfig();
	const consent = useConsent();
	const init = useConsentInit();

	return (categories: ConsentSaveInput) => {
		const available = getConsentAvailableCategories(
			init.value,
			config.value.consentCategories
		);
		const selected =
			categories === 'all'
				? new Set(available)
				: categories === 'none'
					? new Set<CONSENT_CATEGORY>()
					: new Set(categories);

		const next = {} as Record<CONSENT_CATEGORY, boolean>;
		for (const category of available) {
			next[category] = category === 'necessary' || selected.has(category);
		}
		consent.value = next;
		activeUI.value = null;
	};
}

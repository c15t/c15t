import type { ConsentActiveUI } from '@c15t/schema/config';
import type { InitOutput } from '@c15t/schema/types';

export const CONSENT_CATEGORIES = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
] as const;
export type CONSENT_CATEGORY = (typeof CONSENT_CATEGORIES)[number];

export function getConsentAvailableCategories(
	init: InitOutput | null | undefined,
	configuredCategories: readonly CONSENT_CATEGORY[] = CONSENT_CATEGORIES
): CONSENT_CATEGORY[] {
	const knownCategories = new Set<CONSENT_CATEGORY>(CONSENT_CATEGORIES);
	const baseSource =
		configuredCategories.length > 0 ? configuredCategories : CONSENT_CATEGORIES;
	const base = [...new Set(baseSource)].filter(
		(category): category is CONSENT_CATEGORY =>
			category !== 'necessary' && knownCategories.has(category)
	);
	const policyCategories = init?.policy?.consent?.categories ?? [];
	const policyOptional = policyCategories.filter(
		(category): category is CONSENT_CATEGORY =>
			category !== '*' &&
			(category as string) !== 'necessary' &&
			knownCategories.has(category as CONSENT_CATEGORY)
	);

	let list: CONSENT_CATEGORY[] = [...base];
	if (!policyCategories.includes('*') && policyOptional.length > 0) {
		const allowed = new Set(policyOptional);
		list = list.filter((category) => allowed.has(category));
	}

	list.unshift('necessary');
	return list;
}

/**
 * Persistent, policy-agnostic record of a subject's consent decisions.
 *
 * Only choices the subject has explicitly made are stored. The active policy is
 * never written into this record, so a single record can travel between
 * jurisdictions without silently rewriting what the user actually decided.
 */
export interface Consent {
	/**
	 * Per-policy acknowledgements, keyed by `policyId`.
	 */
	policies: Record<string, { fingerprint: string; timestamp: string }>;

	/**
	 * Categories granted or denied by the user explicitly.
	 * An absent category means "no choice yet".
	 */
	categories: {
		[key in CONSENT_CATEGORY]?: boolean;
	};
}

/**
 * Projects the subject's stored decisions onto the categories the active policy
 * actually governs, returning the categories that are effectively granted.
 */
export function interpretStoredConsent(
	consent: Consent,
	init: InitOutput,
	gpc?: boolean
): CONSENT_CATEGORY[] {
	const granted = new Set<CONSENT_CATEGORY>(['necessary']);
	for (const category of CONSENT_CATEGORIES) {
		if (category === 'necessary') continue;
		const choice = consent.categories[category];
		if (choice === false) continue;
		if (choice === true) {
			granted.add(category);
			continue;
		}
		const outOfScope =
			Boolean(init.policy?.consent?.categories?.length) &&
			!init.policy?.consent?.categories?.includes('*') &&
			!init.policy?.consent?.categories?.includes(category);
		if (outOfScope && init.policy?.consent?.scopeMode === 'strict') continue;

		// Silence: model default; GPC opts out tracking.
		const isTracking = category === 'marketing' || category === 'measurement';
		if (
			(init.policy?.model === 'opt-out' || init.policy?.model === 'none') &&
			!(gpc && init.policy?.consent?.gpc === true && isTracking)
		) {
			granted.add(category);
		}
	}
	return [...granted];
}

const MS_PER_DAY = 86_400_000;

function isPolicyAcknowledgementFresh(
	timestamp: string,
	expiryDays?: number
): boolean {
	const givenAt = Number.parseInt(timestamp, 10);
	if (!Number.isFinite(givenAt)) {
		return false;
	}

	if (typeof expiryDays !== 'number' || !Number.isFinite(expiryDays)) {
		return true;
	}

	const expiresAt = givenAt + Math.max(0, expiryDays) * MS_PER_DAY;
	return Date.now() < expiresAt;
}

function isPolicyAcknowledgementValid(
	consent: Consent,
	init: InitOutput
): boolean {
	const policyId = init.policy?.id;
	const currentFingerprint = init.policyDecision?.fingerprint;
	if (!policyId || !currentFingerprint) {
		return false;
	}

	const ack = consent.policies[policyId];
	if (!ack || ack.fingerprint !== currentFingerprint) {
		return false;
	}

	return isPolicyAcknowledgementFresh(
		ack.timestamp,
		init.policy?.consent?.expiryDays
	);
}

/**
 * Decides which consent surface, if any, must be shown for the active policy.
 */
export function deriveActiveConsentUi(
	consent: Consent,
	init: InitOutput,
	gpc?: boolean
): ConsentActiveUI {
	if (!init.policy?.ui?.mode || init.policy?.ui?.mode === 'none') return null;

	if (gpc && init.policy?.model === 'opt-out') return null;

	if (isPolicyAcknowledgementValid(consent, init)) return null;

	const uiMode = init.policy?.ui?.mode;
	if (uiMode === 'banner') return 'banner';
	if (uiMode === 'dialog') return 'manager';
	return null;
}

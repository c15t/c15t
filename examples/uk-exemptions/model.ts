/** Interactive example backed by the workspace consent kernel. */
import { createConsentKernel } from '@c15t/core';
import type { ConsentSnapshot, HydrationRecords, SaveInput } from '@c15t/core';
import { resolvePolicyRules } from '@c15t/schema/types';
import type { PolicyRule } from '@c15t/schema/types';

export type Region = 'uk' | 'eu' | 'unknown';
export interface VisitorChoices {
	advertisingConsent: boolean | null;
	statisticsConsent: boolean | null;
	statisticsObjected: boolean;
	records: HydrationRecords;
}
export interface Permissions {
	statistics: boolean;
	advertising: boolean;
	exempt: boolean;
	needsChoice: boolean;
}
export const freshChoices = (): VisitorChoices => ({
	advertisingConsent: null,
	records: {},
	statisticsConsent: null,
	statisticsObjected: false,
});
const createKernel = (
	choices: VisitorChoices,
	region: Region,
	exemptionEnabled: boolean
) => {
	const uk: PolicyRule = {
		categories: ['measurement', 'marketing'],
		id: 'uk-mixed',
		match: { countries: ['GB'] },
		model: 'opt-in',
		prompt: 'choice',
		scopeMode: 'strict',
	};
	if (exemptionEnabled) {
		uk.exemptions = {
			measurement: { kind: 'uk-statistics', revision: 'demo-1' },
		};
	}
	const countryByRegion: Record<Region, string | null> = {
		eu: 'DE',
		uk: 'GB',
		unknown: null,
	};
	const fallback: PolicyRule = {
		categories: ['measurement', 'marketing'],
		id: 'opt-in',
		match: { fallback: true, isDefault: true },
		model: 'opt-in',
		prompt: 'choice',
		scopeMode: 'strict',
	};
	return createConsentKernel({
		initialPolicyResolution: resolvePolicyRules({
			countryCode: countryByRegion[region],
			regionCode: null,
			rules: [uk, fallback],
		}),
		initialRecords: choices.records,
	});
};
const fromSnapshot = (snapshot: ConsentSnapshot): VisitorChoices => ({
	advertisingConsent:
		snapshot.explicitChoice?.categories.marketing?.value ?? null,
	records: {
		choice: snapshot.explicitChoice,
		exemptionPreferences: snapshot.exemptionPreferences,
		subject: snapshot.subject,
	},
	statisticsConsent:
		snapshot.explicitChoice?.categories.measurement?.value ?? null,
	statisticsObjected:
		snapshot.exemptionPreferences?.categories.measurement?.value === false,
});
export const evaluate = (
	choices: VisitorChoices,
	region: Region,
	exemptionEnabled: boolean
): Permissions => {
	const kernel = createKernel(choices, region, exemptionEnabled);
	const snapshot = kernel.getSnapshot();
	kernel.dispose();
	return {
		advertising: snapshot.effectivePermissions.marketing,
		exempt: snapshot.policyRule.exemptions?.measurement !== undefined,
		needsChoice: snapshot.promptRequirement.kind === 'choice',
		statistics: snapshot.effectivePermissions.measurement,
	};
};
const act = (
	choices: VisitorChoices,
	region: Region,
	exemptionEnabled: boolean,
	input: SaveInput
): VisitorChoices => {
	const kernel = createKernel(choices, region, exemptionEnabled);
	// The command commits synchronously before its transport phase. This local
	// example has no transport and sends no analytics or advertising requests.
	void kernel.commands.save(input);
	const next = fromSnapshot(kernel.getSnapshot());
	kernel.dispose();
	return next;
};
export const accept = (
	choices: VisitorChoices,
	region: Region,
	exemptionEnabled: boolean
): VisitorChoices => act(choices, region, exemptionEnabled, 'all');
export const reject = (
	choices: VisitorChoices,
	region: Region,
	exemptionEnabled: boolean
): VisitorChoices => act(choices, region, exemptionEnabled, 'none');
export const savePreferences = (
	choices: VisitorChoices,
	region: Region,
	exemptionEnabled: boolean,
	preferences: Pick<Permissions, 'statistics' | 'advertising'>
): VisitorChoices =>
	act(choices, region, exemptionEnabled, {
		marketing: preferences.advertising,
		measurement: preferences.statistics,
	});
export const readChoices = (value: unknown): VisitorChoices => {
	if (
		!value ||
		typeof value !== 'object' ||
		!('records' in value) ||
		!value.records ||
		typeof value.records !== 'object' ||
		Array.isArray(value.records)
	) {
		return freshChoices();
	}
	const kernel = createKernel(freshChoices(), 'uk', true);
	const result = kernel.hydrate(value.records as HydrationRecords);
	const choices = result.ok
		? fromSnapshot(kernel.getSnapshot())
		: freshChoices();
	kernel.dispose();
	return choices;
};

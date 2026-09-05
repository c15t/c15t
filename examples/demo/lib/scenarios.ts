/**
 * Single source of truth for the demo's policy scenarios.
 *
 * Every scenario pairs a location with a policy pack so the demo can show
 * how c15t resolves policies by geography. The same definitions drive:
 *
 * - The client demo in offline mode (`offline({ policyRules })`)
 * - The self-host backend route (`lib/demo-c15t-instance.ts`)
 * - The c15t CLI config (`c15t-backend.config.ts`)
 */

import type { Translations } from '@c15t/translations';
import { baseTranslations } from '@c15t/translations/all';
import { policyRulePresets } from 'c15t';
import type { ConsentPresentation, PolicyRule } from 'c15t';

export const DEMO_POLICY_SNAPSHOT_KEY =
	process.env.C15T_POLICY_SNAPSHOT_KEY ?? 'demo-policy-snapshot-key';

export const DEFAULT_SCENARIO_ID = 'preset-europe-opt-in';

/** Header the self-host route reads to know which scenario to serve. */
export const DEMO_SCENARIO_HEADER = 'x-c15t-demo-example';

// ---------------------------------------------------------------------------
// IAB TCF demo configuration (shared between client and self-host backend)
// ---------------------------------------------------------------------------

/**
 * CMP ID used across the demo. 10 is a placeholder registration — fine for
 * demos; production deployments need their own CMP ID from IAB Europe.
 */
export const DEMO_CMP_ID = 10;

/** Keep the GVL payload small-ish by scoping to the first 250 vendors. */
export const DEMO_IAB_VENDOR_IDS = Array.from(
	{ length: 250 },
	(_, index) => index + 1
);

export const DEMO_CUSTOM_VENDORS = [
	{
		cookieMaxAgeSeconds: 31536000,
		dataCategories: [1, 2],
		id: 'demo-analytics',
		name: 'Demo Analytics',
		privacyPolicyUrl: 'https://example.com/privacy',
		purposes: [1, 8],
		usesCookies: true,
		usesNonCookieAccess: false,
	},
];

// ---------------------------------------------------------------------------
// i18n message profiles
// ---------------------------------------------------------------------------

type I18nMessageProfiles = Record<
	string,
	{
		fallbackLanguage?: string;
		translations: Record<string, Partial<Translations>>;
	}
>;

/** Languages offered by the demo's language picker. */
export const DEMO_LANGUAGES = ['en', 'fr', 'de', 'es', 'pt'] as const;

/**
 * Builds a message profile containing every picker language. Each language
 * starts from the full pack that ships with `@c15t/translations` (so all
 * surfaces — banner, dialog, IAB UI — stay translated), with demo-specific
 * copy layered on top only where a profile customizes it. This also means
 * switching to any picker language works in every scenario instead of
 * silently falling back to English.
 */
const profile = function profile(
	overrides: Partial<
		Record<(typeof DEMO_LANGUAGES)[number], Partial<Translations>>
	> = {}
): { translations: Record<string, Partial<Translations>> } {
	return {
		translations: Object.fromEntries(
			DEMO_LANGUAGES.map((language) => [
				language,
				{ ...baseTranslations[language], ...overrides[language] },
			])
		),
	};
};

// oxlint-disable-next-line sort-keys -- Preserve declaration order, interface shape, and public compatibility.
export const demoI18nMessages: I18nMessageProfiles = {
	// Stock c15t translations, used by the shipped policy-pack presets.
	default: profile(),
	eu: profile({
		de: {
			cookieBanner: {
				description:
					'Optionale Cookies werden nur mit deiner Einwilligung verwendet.',
				title: 'GDPR-Einwilligung',
			},
		},
		en: {
			cookieBanner: {
				description:
					'We only use optional cookies with your consent. You can change settings anytime.',
				title: 'EU GDPR Consent',
			},
		},
		fr: {
			cookieBanner: {
				description:
					'Nous utilisons uniquement des cookies facultatifs avec votre consentement.',
				title: 'Consentement RGPD',
			},
		},
	}),
	fr: profile({
		de: {
			cookieBanner: {
				description:
					'Sie konnen IAB-Zwecke akzeptieren, ablehnen oder individuell anpassen.',
				title: 'Datenschutzeinstellungen (IAB)',
			},
		},
		en: {
			cookieBanner: {
				description:
					'You can accept, reject, or customize IAB purposes for advertising and measurement.',
				title: 'France IAB Preferences',
			},
		},
		fr: {
			cookieBanner: {
				description:
					'Vous pouvez accepter, refuser ou personnaliser les finalités IAB.',
				title: 'Paramètres de confidentialité (IAB)',
			},
		},
	}),
	caSales: profile({
		en: {
			common: {
				...baseTranslations.en.common,
				acceptAll: 'Accept All',
				customize: 'Customize',
				rejectAll: 'Do not sell/share my personal information',
			},
			cookieBanner: {
				description:
					'You can allow all optional uses, or opt out of the sale and sharing of your personal information.',
				title: 'Your California privacy choices',
			},
		},
	}),
};

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

export interface DemoScenario {
	id: string;
	label: string;
	group: 'preset' | 'custom';
	/** Country the scenario simulates (ISO 3166-1 alpha-2). */
	country: string;
	/** Optional region the scenario simulates (e.g. CA for California). */
	region?: string;
	description: string;
	policy: PolicyRule;
	presentation?: ConsentPresentation;
}

const worldFallbackPolicy = policyRulePresets.worldOptOutNoPrompt();

export const demoScenarios: DemoScenario[] = [
	// ── Built-in presets ──────────────────────────────────────────────────
	{
		country: 'GB',
		description: 'Shipped preset for Europe + UK opt-in banners.',
		group: 'preset',
		id: 'preset-europe-opt-in',
		label: 'Europe Opt-In',
		policy: policyRulePresets.europeOptIn(),
	},
	{
		country: 'FR',
		description: 'Shipped preset for IAB TCF 2.3 across Europe.',
		group: 'preset',
		id: 'preset-europe-iab',
		label: 'Europe IAB',
		policy: policyRulePresets.europeIab(),
	},
	{
		country: 'US',
		description: 'Shipped preset for a compact California opt-in banner.',
		group: 'preset',
		id: 'preset-california-opt-in',
		label: 'California Opt-In',
		policy: policyRulePresets.californiaOptIn(),
		region: 'CA',
	},
	{
		country: 'US',
		description: 'Shipped preset for California opt-out with no banner.',
		group: 'preset',
		id: 'preset-california-opt-out',
		label: 'California Opt-Out',
		policy: policyRulePresets.californiaOptOut(),
		region: 'CA',
	},
	{
		country: 'CA',
		description: 'Shipped preset for Quebec opt-in requirements.',
		group: 'preset',
		id: 'preset-quebec-opt-in',
		label: 'Quebec Opt-In',
		policy: policyRulePresets.quebecOptIn(),
		region: 'QC',
	},
	{
		country: 'AU',
		description:
			'Explicit global opt-out default with no first-layer prompt and persistent preferences.',
		group: 'custom',
		id: 'preset-world-no-banner',
		label: 'World No Banner',
		policy: worldFallbackPolicy,
	},

	// ── Custom examples ───────────────────────────────────────────────────
	{
		country: 'FR',
		description:
			'Country-level IAB TCF policy with custom banner copy (the "fr" message profile) in English, French, and German.',
		group: 'custom',
		id: 'custom-fr-iab',
		label: 'France IAB',
		policy: {
			categories: ['*'],
			i18n: { messageProfile: 'fr' },
			id: 'fr_iab',
			match: { countries: ['FR'] },
			model: 'iab',
			prompt: 'choice',
			proof: {
				storeIp: true,
				storeLanguage: true,
				storeUserAgent: true,
			},
			validity: { choiceDays: 180 },
		},
	},
	{
		country: 'DE',
		description:
			'Strict opt-in with specific categories, compact split-row actions, and custom GDPR copy (the "eu" message profile).',
		group: 'custom',
		id: 'custom-de-strict',
		label: 'Germany Strict',
		policy: {
			categories: ['necessary', 'functionality', 'measurement'],
			i18n: { messageProfile: 'eu' },
			id: 'de_strict',
			match: { countries: ['DE'] },
			model: 'opt-in',
			prompt: 'choice',
			proof: {
				storeIp: true,
				storeLanguage: true,
				storeUserAgent: true,
			},
			scopeMode: 'strict',
			validity: { choiceDays: 365 },
		},
		presentation: {
			preferences: {
				direction: 'row',
				layout: [['reject', 'accept'], 'save'],
				primaryActions: ['accept', 'reject', 'save'],
				uiProfile: 'compact',
			},
			prompt: {
				direction: 'row',
				layout: [['reject', 'accept'], 'customize'],
				primaryActions: ['accept', 'reject', 'customize'],
				uiProfile: 'compact',
			},
		},
	},
	{
		country: 'ES',
		description:
			'Editorial layout with customize on its own row and accept/reject grouped underneath.',
		group: 'custom',
		id: 'custom-es-split-stack',
		label: 'Spain Split-Stack',
		policy: {
			categories: ['necessary', 'measurement', 'marketing'],
			i18n: { messageProfile: 'default' },
			id: 'es_split_stack',
			match: { countries: ['ES'] },
			model: 'opt-in',
			prompt: 'choice',
			proof: {
				storeIp: false,
				storeLanguage: true,
				storeUserAgent: true,
			},
			validity: { choiceDays: 180 },
		},
		presentation: {
			preferences: {
				direction: 'column',
				layout: ['save', ['reject', 'accept']],
				primaryActions: ['accept', 'reject'],
				uiProfile: 'balanced',
			},
			prompt: {
				direction: 'column',
				layout: ['customize', ['reject', 'accept']],
				primaryActions: ['accept', 'reject'],
				uiProfile: 'balanced',
			},
		},
	},
	{
		country: 'BR',
		description:
			'Opt-out choice prompt with accept, reject, and customize actions and a permissive scope.',
		group: 'custom',
		id: 'custom-br-growth',
		label: 'Brazil Opt-Out',
		policy: {
			categories: ['necessary', 'functionality', 'measurement', 'marketing'],
			i18n: { messageProfile: 'default' },
			id: 'br_growth',
			match: { countries: ['BR'] },
			model: 'opt-out',
			prompt: 'choice',
			proof: {
				storeIp: false,
				storeLanguage: true,
				storeUserAgent: false,
			},
			scopeMode: 'permissive',
			validity: { choiceDays: 120 },
		},
		presentation: {
			preferences: {
				direction: 'row',
				layout: [['accept', 'reject'], 'save'],
				primaryActions: ['accept', 'reject'],
				uiProfile: 'balanced',
			},
			prompt: {
				direction: 'row',
				layout: [['accept', 'reject'], 'customize'],
				primaryActions: ['accept', 'reject'],
				uiProfile: 'balanced',
			},
		},
	},
	{
		country: 'US',
		description:
			'Two equally prominent actions: Accept All plus a custom "Do not sell/share" opt-out label (the "caSales" message profile).',
		group: 'custom',
		id: 'custom-ca-do-not-sell',
		label: 'California CTA',
		policy: {
			actions: ['accept', 'reject'],
			categories: ['necessary', 'functionality', 'measurement', 'marketing'],
			i18n: { messageProfile: 'caSales' },
			id: 'ca_do_not_sell',
			match: { regions: [{ country: 'US', region: 'CA' }] },
			model: 'opt-in',
			privacySignals: { gpc: { denyCategories: ['marketing'] } },
			prompt: 'choice',
			proof: {
				storeIp: true,
				storeLanguage: true,
				storeUserAgent: true,
			},
			scopeMode: 'permissive',
			validity: { choiceDays: 365 },
		},
		presentation: {
			preferences: {
				direction: 'column',
				layout: ['accept', 'reject', 'save'],
				primaryActions: ['accept', 'reject'],
				uiProfile: 'compact',
			},
			prompt: {
				direction: 'column',
				layout: ['accept', 'reject'],
				primaryActions: ['accept', 'reject'],
				uiProfile: 'compact',
			},
		},
		region: 'CA',
	},
];

export const getScenarioById = function getScenarioById(
	id: string | null | undefined
): DemoScenario {
	return (
		demoScenarios.find((scenario) => scenario.id === id) ??
		(demoScenarios.find(
			(scenario) => scenario.id === DEFAULT_SCENARIO_ID
		) as DemoScenario)
	);
};

/**
 * Policy packs for one scenario: the scenario's policy plus the world
 * no-banner fallback (unless the scenario itself is the default fallback).
 */
export const getScenarioPolicyRules = function getScenarioPolicyRules(
	id: string
): PolicyRule[] {
	const scenario = getScenarioById(id);

	if (scenario.policy.match?.isDefault) {
		return [scenario.policy];
	}

	return [scenario.policy, worldFallbackPolicy];
};

/**
 * Every demo policy, used by the CLI backend config.
 *
 * Custom scenarios come first: within a matcher type, first match wins by
 * array order, so the country-specific customs (FR/DE/ES) must be resolved
 * before the broad Europe presets that also match those countries — and
 * likewise `custom-ca-do-not-sell` before the California presets.
 */
export const demoPolicies: PolicyRule[] = [...demoScenarios]
	.sort((a, b) => {
		if (a.group === b.group) {
			return 0;
		}
		return a.group === 'custom' ? -1 : 1;
	})
	.map((scenario) => scenario.policy);

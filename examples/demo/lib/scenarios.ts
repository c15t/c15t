/**
 * Single source of truth for the demo's policy scenarios.
 *
 * Every scenario pairs a location with a policy pack so the demo can show
 * how c15t resolves policies by geography. The same definitions drive:
 *
 * - The client demo in offline mode (`offlinePolicy.policyPacks`)
 * - The self-host backend route (`lib/demo-c15t-instance.ts`)
 * - The c15t CLI config (`c15t-backend.config.ts`)
 */

import type { Translations } from '@c15t/translations';
import { baseTranslations } from '@c15t/translations/all';
import { type PolicyConfig, policyPackPresets } from 'c15t';

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
		id: 'demo-analytics',
		name: 'Demo Analytics',
		privacyPolicyUrl: 'https://example.com/privacy',
		purposes: [1, 8],
		dataCategories: [1, 2],
		usesCookies: true,
		cookieMaxAgeSeconds: 31536000,
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

/**
 * Layers demo-specific copy on top of the full language pack that ships with
 * `@c15t/translations`, so every surface (banner, dialog, IAB UI) stays
 * translated even when a profile only customizes the banner copy.
 */
function withBase(
	language: keyof typeof baseTranslations,
	overrides: Partial<Translations> = {}
): Partial<Translations> {
	return { ...baseTranslations[language], ...overrides };
}

export const demoI18nMessages: I18nMessageProfiles = {
	default: {
		translations: {
			en: withBase('en'),
			es: withBase('es', {
				cookieBanner: {
					title: 'Tus opciones de privacidad',
					description:
						'Usamos cookies para mejorar el sitio. Puedes aceptar o ajustar tu configuracion en cualquier momento.',
				},
			}),
			pt: withBase('pt', {
				cookieBanner: {
					title: 'As suas escolhas de privacidade',
					description:
						'Usamos cookies para melhorar o site. Pode aceitar ou ajustar as suas definicoes a qualquer momento.',
				},
			}),
		},
	},
	eu: {
		translations: {
			en: withBase('en', {
				cookieBanner: {
					title: 'EU GDPR Consent',
					description:
						'We only use optional cookies with your consent. You can change settings anytime.',
				},
			}),
			de: withBase('de', {
				cookieBanner: {
					title: 'GDPR-Einwilligung',
					description:
						'Optionale Cookies werden nur mit deiner Einwilligung verwendet.',
				},
			}),
			fr: withBase('fr', {
				cookieBanner: {
					title: 'Consentement RGPD',
					description:
						'Nous utilisons uniquement des cookies facultatifs avec votre consentement.',
				},
			}),
		},
	},
	fr: {
		translations: {
			en: withBase('en', {
				cookieBanner: {
					title: 'France IAB Preferences',
					description:
						'You can accept, reject, or customize IAB purposes for advertising and measurement.',
				},
			}),
			fr: withBase('fr', {
				cookieBanner: {
					title: 'Paramètres de confidentialité (IAB)',
					description:
						'Vous pouvez accepter, refuser ou personnaliser les finalités IAB.',
				},
			}),
			de: withBase('de', {
				cookieBanner: {
					title: 'Datenschutzeinstellungen (IAB)',
					description:
						'Sie konnen IAB-Zwecke akzeptieren, ablehnen oder individuell anpassen.',
				},
			}),
		},
	},
	caSales: {
		translations: {
			en: withBase('en', {
				cookieBanner: {
					title: 'Your California privacy choices',
					description:
						'You can allow all optional uses, or opt out of the sale and sharing of your personal information.',
				},
				common: {
					...baseTranslations.en.common,
					acceptAll: 'Accept All',
					rejectAll: 'Do not sell/share my personal information',
					customize: 'Customize',
				},
			}),
		},
	},
};

/** Languages available for a given message profile, sorted. */
export function getProfileLanguages(profile?: string): string[] {
	const activeProfile = profile ?? 'default';
	return Object.keys(
		demoI18nMessages[activeProfile]?.translations ?? {}
	).sort();
}

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
	policy: PolicyConfig;
}

const worldFallbackPolicy = policyPackPresets.worldNoBanner();

export const demoScenarios: DemoScenario[] = [
	// ── Built-in presets ──────────────────────────────────────────────────
	{
		id: 'preset-europe-opt-in',
		label: 'Europe Opt-In',
		group: 'preset',
		country: 'GB',
		description: 'Shipped preset for Europe + UK opt-in banners.',
		policy: {
			...policyPackPresets.europeOptIn(),
			i18n: { messageProfile: 'eu' },
		},
	},
	{
		id: 'preset-europe-iab',
		label: 'Europe IAB',
		group: 'preset',
		country: 'FR',
		description: 'Shipped preset for IAB TCF 2.3 across Europe.',
		policy: {
			...policyPackPresets.europeIab(),
			i18n: { messageProfile: 'fr' },
		},
	},
	{
		id: 'preset-california-opt-in',
		label: 'California Opt-In',
		group: 'preset',
		country: 'US',
		region: 'CA',
		description: 'Shipped preset for a compact California opt-in banner.',
		policy: policyPackPresets.californiaOptIn(),
	},
	{
		id: 'preset-california-opt-out',
		label: 'California Opt-Out',
		group: 'preset',
		country: 'US',
		region: 'CA',
		description: 'Shipped preset for California opt-out with no banner.',
		policy: policyPackPresets.californiaOptOut(),
	},
	{
		id: 'preset-quebec-opt-in',
		label: 'Quebec Opt-In',
		group: 'preset',
		country: 'CA',
		region: 'QC',
		description: 'Shipped preset for Quebec opt-in requirements.',
		policy: policyPackPresets.quebecOptIn(),
	},
	{
		id: 'preset-world-no-banner',
		label: 'World No Banner',
		group: 'preset',
		country: 'AU',
		description: 'Shipped preset for the no-banner rest-of-world fallback.',
		policy: worldFallbackPolicy,
	},

	// ── Custom examples ───────────────────────────────────────────────────
	{
		id: 'custom-fr-iab',
		label: 'France IAB',
		group: 'custom',
		country: 'FR',
		description:
			'Country-level IAB TCF policy that takes priority over the EU preset for France.',
		policy: {
			id: 'fr_iab',
			match: { countries: ['FR'] },
			i18n: { messageProfile: 'fr' },
			consent: {
				model: 'iab',
				expiryDays: 180,
				categories: ['*'],
			},
			proof: {
				storeIp: true,
				storeUserAgent: true,
				storeLanguage: true,
			},
		},
	},
	{
		id: 'custom-de-strict',
		label: 'Germany Strict',
		group: 'custom',
		country: 'DE',
		description:
			'Strict opt-in with specific categories and compact split-row actions.',
		policy: {
			id: 'de_strict',
			match: { countries: ['DE'] },
			i18n: { messageProfile: 'eu' },
			consent: {
				model: 'opt-in',
				expiryDays: 365,
				scopeMode: 'strict',
				categories: ['necessary', 'functionality', 'measurement'],
			},
			ui: {
				mode: 'banner',
				banner: {
					allowedActions: ['reject', 'accept', 'customize'],
					layout: [['reject', 'accept'], 'customize'],
					direction: 'row',
					primaryActions: ['accept', 'customize'],
					uiProfile: 'compact',
				},
				dialog: {
					allowedActions: ['reject', 'accept', 'customize'],
					layout: [['reject', 'accept'], 'customize'],
					direction: 'row',
					primaryActions: ['accept', 'customize'],
					uiProfile: 'compact',
				},
			},
			proof: {
				storeIp: true,
				storeUserAgent: true,
				storeLanguage: true,
			},
		},
	},
	{
		id: 'custom-es-split-stack',
		label: 'Spain Split-Stack',
		group: 'custom',
		country: 'ES',
		description:
			'Editorial layout with customize on its own row and accept/reject grouped underneath.',
		policy: {
			id: 'es_split_stack',
			match: { countries: ['ES'] },
			i18n: { messageProfile: 'default' },
			consent: {
				model: 'opt-in',
				expiryDays: 180,
				categories: ['necessary', 'measurement', 'marketing'],
			},
			ui: {
				mode: 'banner',
				banner: {
					allowedActions: ['reject', 'accept', 'customize'],
					layout: ['customize', ['reject', 'accept']],
					direction: 'column',
					primaryActions: ['accept'],
					uiProfile: 'balanced',
				},
				dialog: {
					allowedActions: ['reject', 'accept', 'customize'],
					layout: ['customize', ['reject', 'accept']],
					direction: 'column',
					primaryActions: ['accept'],
					uiProfile: 'balanced',
				},
			},
			proof: {
				storeIp: false,
				storeUserAgent: true,
				storeLanguage: true,
			},
		},
	},
	{
		id: 'custom-br-growth',
		label: 'Brazil Opt-Out',
		group: 'custom',
		country: 'BR',
		description:
			'Softer opt-out experience with accept + customize actions and a permissive scope.',
		policy: {
			id: 'br_growth',
			match: { countries: ['BR'] },
			i18n: { messageProfile: 'default' },
			consent: {
				model: 'opt-out',
				expiryDays: 120,
				scopeMode: 'permissive',
				categories: ['necessary', 'functionality', 'measurement', 'marketing'],
			},
			ui: {
				mode: 'banner',
				banner: {
					allowedActions: ['accept', 'customize'],
					layout: [['accept'], 'customize'],
					direction: 'row',
					primaryActions: ['accept'],
					uiProfile: 'balanced',
				},
				dialog: {
					allowedActions: ['accept', 'customize'],
					layout: [['accept'], 'customize'],
					direction: 'row',
					primaryActions: ['accept'],
					uiProfile: 'balanced',
				},
			},
			proof: {
				storeIp: false,
				storeUserAgent: false,
				storeLanguage: true,
			},
		},
	},
	{
		id: 'custom-ca-do-not-sell',
		label: 'California CTA',
		group: 'custom',
		country: 'US',
		region: 'CA',
		description:
			'Two actions only: Accept All as the primary CTA plus a "Do not sell/share" opt-out.',
		policy: {
			id: 'ca_do_not_sell',
			match: { regions: [{ country: 'US', region: 'CA' }] },
			i18n: { messageProfile: 'caSales' },
			consent: {
				model: 'opt-in',
				expiryDays: 365,
				gpc: true,
				scopeMode: 'permissive',
				categories: ['necessary', 'functionality', 'measurement', 'marketing'],
			},
			ui: {
				mode: 'banner',
				banner: {
					allowedActions: ['accept', 'reject'],
					layout: ['accept', 'reject'],
					direction: 'column',
					primaryActions: ['accept'],
					uiProfile: 'compact',
				},
				dialog: {
					allowedActions: ['accept', 'reject'],
					layout: ['accept', 'reject'],
					direction: 'column',
					primaryActions: ['accept'],
					uiProfile: 'compact',
				},
			},
			proof: {
				storeIp: true,
				storeUserAgent: true,
				storeLanguage: true,
			},
		},
	},
];

export function getScenarioById(id: string | null | undefined): DemoScenario {
	return (
		demoScenarios.find((scenario) => scenario.id === id) ??
		(demoScenarios.find(
			(scenario) => scenario.id === DEFAULT_SCENARIO_ID
		) as DemoScenario)
	);
}

/**
 * Policy packs for one scenario: the scenario's policy plus the world
 * no-banner fallback (unless the scenario itself is the default fallback).
 */
export function getScenarioPolicyPacks(id: string): PolicyConfig[] {
	const scenario = getScenarioById(id);

	if (scenario.policy.match?.isDefault) {
		return [scenario.policy];
	}

	return [scenario.policy, worldFallbackPolicy];
}

/** Every demo policy, used by the CLI backend config. */
export const demoPolicies: PolicyConfig[] = demoScenarios.map(
	(scenario) => scenario.policy
);

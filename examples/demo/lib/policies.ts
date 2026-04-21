import { policyPackPresets } from '@c15t/backend';
import type { PolicyConfig } from '@c15t/backend/types';
import { policyPackPresets as test } from '@c15t/react';
import type { Translations } from '@c15t/translations';
import { translations } from '@c15t/translations/en';

export const DEMO_POLICY_SNAPSHOT_KEY =
	process.env.C15T_POLICY_SNAPSHOT_KEY ?? 'demo-policy-snapshot-key';

export const DEFAULT_DEMO_POLICY_EXAMPLE = 'preset-europe-opt-in';

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

export const demoI18nMessages: I18nMessageProfiles = {
	default: {
		translations: {
			en: translations,
			es: {
				cookieBanner: {
					title: 'Tus opciones de privacidad',
					description:
						'Usamos cookies para mejorar el sitio. Puedes aceptar o ajustar tu configuracion en cualquier momento.',
				},
			},
			pt: {
				cookieBanner: {
					title: 'As suas escolhas de privacidade',
					description:
						'Usamos cookies para melhorar o site. Pode aceitar ou ajustar as suas definicoes a qualquer momento.',
				},
			},
		},
	},
	eu: {
		translations: {
			en: {
				cookieBanner: {
					title: 'EU GDPR Consent',
					description:
						'We only use optional cookies with your consent. You can change settings anytime.',
				},
			},
			de: {
				cookieBanner: {
					title: 'GDPR-Einwilligung',
					description:
						'Optionale Cookies werden nur mit deiner Einwilligung verwendet.',
				},
			},
			fr: {
				cookieBanner: {
					title: 'Consentement RGPD',
					description:
						'Nous utilisons uniquement des cookies facultatifs avec votre consentement.',
				},
			},
		},
	},
	fr: {
		translations: {
			en: {
				cookieBanner: {
					title: 'France IAB Preferences',
					description:
						'You can accept, reject, or customize IAB purposes for advertising and measurement.',
				},
			},
			fr: {
				cookieBanner: {
					title: 'Paramètres de confidentialité (IAB)',
					description:
						'Vous pouvez accepter, refuser ou personnaliser les finalités IAB.',
				},
			},
			de: {
				cookieBanner: {
					title: 'Datenschutzeinstellungen (IAB)',
					description:
						'Sie konnen IAB-Zwecke akzeptieren, ablehnen oder individuell anpassen.',
				},
			},
		},
	},
	caSales: {
		translations: {
			en: {
				cookieBanner: {
					title: 'Your California privacy choices',
					description:
						'You can allow all optional uses, or opt out of the sale and sharing of your personal information.',
				},
				common: {
					acceptAll: 'Accept All',
					rejectAll: 'Do not sell/share my personal information',
					customize: 'Customize',
				},
			},
		},
	},
};

// ---------------------------------------------------------------------------
// Demo policy pack
//
// Uses the built-in presets for the common cases, plus two custom policies
// to show what customization looks like beyond presets.
// ---------------------------------------------------------------------------

const customDemoPolicies = {
	// ── Custom: France IAB ────────────────────────────────────────────────
	// Shows IAB TCF support with a country-level override that takes
	// priority over the preset EU opt-in for France specifically.
	'custom-fr-iab': {
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

	// ── Custom: Germany strict opt-in ─────────────────────────────────────
	// Shows a tighter config than the preset: strict scope, specific
	// categories, compact UI profile with customize as the primary action.
	'custom-de-strict': {
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

	// ── Custom: Spain split-stack opt-in ──────────────────────────────────
	// Shows a more editorial layout with customize on its own row and
	// accept/reject grouped underneath.
	'custom-es-split-stack': {
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

	// ── Custom: Brazil growth opt-out ─────────────────────────────────────
	// Shows a softer opt-out experience with just accept/customize actions
	// and a more permissive scope.
	'custom-br-growth': {
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

	// ── Custom: California no-customize CTA ───────────────────────────────
	// Shows a more opinionated California banner with two actions only:
	// Accept All as the primary CTA, and a "Do not sell/share" opt-out.
	'custom-ca-do-not-sell': {
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
} satisfies Record<string, PolicyConfig>;

const presetDemoPolicies = {
	'preset-europe-opt-in': {
		...policyPackPresets.europeOptIn(),
		i18n: { messageProfile: 'eu' },
	},
	'preset-europe-iab': {
		...policyPackPresets.europeIab(),
		i18n: { messageProfile: 'fr' },
	},
	'preset-california-opt-in': policyPackPresets.californiaOptIn(),
	'preset-california-opt-out': policyPackPresets.californiaOptOut(),
	'preset-quebec-opt-in': policyPackPresets.quebecOptIn(),
	'preset-world-no-banner': policyPackPresets.worldNoBanner(),
} satisfies Record<string, PolicyConfig>;

const worldFallbackPolicy = policyPackPresets.worldNoBanner();

export function getDemoPolicies(
	example = DEFAULT_DEMO_POLICY_EXAMPLE
): PolicyConfig[] {
	let selectedPolicy: PolicyConfig;

	if (Object.hasOwn(customDemoPolicies, example)) {
		selectedPolicy =
			customDemoPolicies[example as keyof typeof customDemoPolicies];
	} else if (Object.hasOwn(presetDemoPolicies, example)) {
		selectedPolicy =
			presetDemoPolicies[example as keyof typeof presetDemoPolicies];
	} else {
		selectedPolicy = customDemoPolicies[DEFAULT_DEMO_POLICY_EXAMPLE];
	}

	if (selectedPolicy.match?.isDefault) {
		return [selectedPolicy];
	}

	return [selectedPolicy, worldFallbackPolicy];
}

export const demoPolicies: PolicyConfig[] = [
	...Object.values(customDemoPolicies),
	...Object.values(presetDemoPolicies),
];

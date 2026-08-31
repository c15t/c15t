import { policyPackPresets } from '@c15t/backend';
import type { PolicyConfig } from '@c15t/schema/types';
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
	caSales: {
		translations: {
			en: {
				common: {
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
		},
	},
	default: {
		translations: {
			en: translations,
			es: {
				cookieBanner: {
					description:
						'Usamos cookies para mejorar el sitio. Puedes aceptar o ajustar tu configuracion en cualquier momento.',
					title: 'Tus opciones de privacidad',
				},
			},
			pt: {
				cookieBanner: {
					description:
						'Usamos cookies para melhorar o site. Pode aceitar ou ajustar as suas definicoes a qualquer momento.',
					title: 'As suas escolhas de privacidade',
				},
			},
		},
	},
	eu: {
		translations: {
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
		},
	},
	fr: {
		translations: {
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
		},
	},
};

// ---------------------------------------------------------------------------
// Demo policy pack
//
// Uses the built-in presets for the common cases, plus two custom policies
// to show what customization looks like beyond presets.
// ---------------------------------------------------------------------------

// oxlint-disable-next-line sort-keys -- Preserve declaration order, interface shape, and public compatibility.
const customDemoPolicies = {
	// ── Custom: France IAB ────────────────────────────────────────────────
	// Shows IAB TCF support with a country-level override that takes
	// priority over the preset EU opt-in for France specifically.
	'custom-fr-iab': {
		consent: {
			categories: ['*'],
			expiryDays: 180,
			model: 'iab',
		},
		i18n: { messageProfile: 'fr' },
		id: 'fr_iab',
		match: { countries: ['FR'] },
		proof: {
			storeIp: true,
			storeLanguage: true,
			storeUserAgent: true,
		},
	},

	// ── Custom: Germany strict opt-in ─────────────────────────────────────
	// Shows a tighter config than the preset: strict scope, specific
	// categories, compact UI profile with customize as the primary action.
	'custom-de-strict': {
		consent: {
			categories: ['necessary', 'functionality', 'measurement'],
			expiryDays: 365,
			model: 'opt-in',
			scopeMode: 'strict',
		},
		i18n: { messageProfile: 'eu' },
		id: 'de_strict',
		match: { countries: ['DE'] },
		proof: {
			storeIp: true,
			storeLanguage: true,
			storeUserAgent: true,
		},
		ui: {
			banner: {
				allowedActions: ['reject', 'accept', 'customize'],
				direction: 'row',
				layout: [['reject', 'accept'], 'customize'],
				primaryActions: ['accept', 'customize'],
				uiProfile: 'compact',
			},
			dialog: {
				allowedActions: ['reject', 'accept', 'customize'],
				direction: 'row',
				layout: [['reject', 'accept'], 'customize'],
				primaryActions: ['accept', 'customize'],
				uiProfile: 'compact',
			},
			mode: 'banner',
		},
	},

	// ── Custom: Spain split-stack opt-in ──────────────────────────────────
	// Shows a more editorial layout with customize on its own row and
	// accept/reject grouped underneath.
	'custom-es-split-stack': {
		consent: {
			categories: ['necessary', 'measurement', 'marketing'],
			expiryDays: 180,
			model: 'opt-in',
		},
		i18n: { messageProfile: 'default' },
		id: 'es_split_stack',
		match: { countries: ['ES'] },
		proof: {
			storeIp: false,
			storeLanguage: true,
			storeUserAgent: true,
		},
		ui: {
			banner: {
				allowedActions: ['reject', 'accept', 'customize'],
				direction: 'column',
				layout: ['customize', ['reject', 'accept']],
				primaryActions: ['accept'],
				uiProfile: 'balanced',
			},
			dialog: {
				allowedActions: ['reject', 'accept', 'customize'],
				direction: 'column',
				layout: ['customize', ['reject', 'accept']],
				primaryActions: ['accept'],
				uiProfile: 'balanced',
			},
			mode: 'banner',
		},
	},

	// ── Custom: Brazil growth opt-out ─────────────────────────────────────
	// Shows a softer opt-out experience with just accept/customize actions
	// and a more permissive scope.
	'custom-br-growth': {
		consent: {
			categories: ['necessary', 'functionality', 'measurement', 'marketing'],
			expiryDays: 120,
			model: 'opt-out',
			scopeMode: 'permissive',
		},
		i18n: { messageProfile: 'default' },
		id: 'br_growth',
		match: { countries: ['BR'] },
		proof: {
			storeIp: false,
			storeLanguage: true,
			storeUserAgent: false,
		},
		ui: {
			banner: {
				allowedActions: ['accept', 'customize'],
				direction: 'row',
				layout: [['accept'], 'customize'],
				primaryActions: ['accept'],
				uiProfile: 'balanced',
			},
			dialog: {
				allowedActions: ['accept', 'customize'],
				direction: 'row',
				layout: [['accept'], 'customize'],
				primaryActions: ['accept'],
				uiProfile: 'balanced',
			},
			mode: 'banner',
		},
	},

	// ── Custom: California no-customize CTA ───────────────────────────────
	// Shows a more opinionated California banner with two actions only:
	// Accept All as the primary CTA, and a "Do not sell/share" opt-out.
	'custom-ca-do-not-sell': {
		consent: {
			categories: ['necessary', 'functionality', 'measurement', 'marketing'],
			expiryDays: 365,
			gpc: true,
			model: 'opt-in',
			scopeMode: 'permissive',
		},
		i18n: { messageProfile: 'caSales' },
		id: 'ca_do_not_sell',
		match: { regions: [{ country: 'US', region: 'CA' }] },
		proof: {
			storeIp: true,
			storeLanguage: true,
			storeUserAgent: true,
		},
		ui: {
			banner: {
				allowedActions: ['accept', 'reject'],
				direction: 'column',
				layout: ['accept', 'reject'],
				primaryActions: ['accept'],
				uiProfile: 'compact',
			},
			dialog: {
				allowedActions: ['accept', 'reject'],
				direction: 'column',
				layout: ['accept', 'reject'],
				primaryActions: ['accept'],
				uiProfile: 'compact',
			},
			mode: 'banner',
		},
	},
} satisfies Record<string, PolicyConfig>;

const presetDemoPolicies = {
	'preset-california-opt-in': policyPackPresets.californiaOptIn(),
	'preset-california-opt-out': policyPackPresets.californiaOptOut(),
	'preset-europe-iab': {
		...policyPackPresets.europeIab(),
		i18n: { messageProfile: 'fr' },
	},
	'preset-europe-opt-in': {
		...policyPackPresets.europeOptIn(),
		i18n: { messageProfile: 'eu' },
	},
	'preset-quebec-opt-in': policyPackPresets.quebecOptIn(),
	'preset-world-no-banner': policyPackPresets.worldNoBanner(),
} satisfies Record<string, PolicyConfig>;

const worldFallbackPolicy = policyPackPresets.worldNoBanner();

export const getDemoPolicies = function getDemoPolicies(
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
};

export const demoPolicies: PolicyConfig[] = [
	...Object.values(customDemoPolicies),
	...Object.values(presetDemoPolicies),
];

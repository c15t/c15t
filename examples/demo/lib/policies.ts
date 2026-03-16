import {
	inspectPolicies,
	policyMatchers,
	policyPackPresets,
} from '@c15t/backend';
import type { PolicyConfig } from '@c15t/backend/types';
import type { Translations } from '@c15t/translations';
import { translations } from '@c15t/translations/en';

export const DEMO_POLICY_SNAPSHOT_KEY =
	process.env.C15T_POLICY_SNAPSHOT_KEY ?? 'demo-policy-snapshot-key';

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
};

// ---------------------------------------------------------------------------
// Demo policy pack
//
// Uses the built-in presets for the common cases, plus two custom policies
// to show what customization looks like beyond presets.
// ---------------------------------------------------------------------------

export const demoPolicies: PolicyConfig[] = [
	// ── Custom: France IAB ────────────────────────────────────────────────
	// Shows IAB TCF support with a country-level override that takes
	// priority over the preset EU opt-in for France specifically.
	{
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
	{
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
				primaryAction: 'customize',
				uiProfile: 'compact',
			},
			dialog: {
				allowedActions: ['reject', 'accept', 'customize'],
				primaryAction: 'customize',
				uiProfile: 'compact',
			},
		},
		proof: {
			storeIp: true,
			storeUserAgent: true,
			storeLanguage: true,
		},
	},

	// ── Presets ────────────────────────────────────────────────────────────
	{
		...policyPackPresets.europeOptIn(),
		i18n: { messageProfile: 'eu' },
	},
	policyPackPresets.californiaOptOut(),
	policyPackPresets.worldNoBanner(),
];

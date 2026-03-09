import { inspectPolicies, policyMatchers } from '@c15t/backend';
import type { Translations } from '@c15t/translations';

type I18nMessageProfiles = Record<
	string,
	Record<string, Partial<Translations>>
>;
type PolicyConfig = Parameters<typeof inspectPolicies>[0][number];

export const DEMO_POLICY_SNAPSHOT_KEY =
	process.env.C15T_POLICY_SNAPSHOT_KEY ?? 'demo-policy-snapshot-key';

export const demoI18nMessages: I18nMessageProfiles = {
	default: {
		en: {
			cookieBanner: {
				title: 'Privacy settings',
				description:
					'This default policy does not require a consent banner for this region.',
			},
		},
	},
	us_country: {
		en: {
			cookieBanner: {
				title: 'US Privacy Choices',
				description:
					'You can fine-tune optional data uses in your settings at any time.',
			},
		},
	},
	us_ca: {
		en: {
			cookieBanner: {
				title: 'Hey California, your call',
				description:
					'You decide what is okay. Accept all or reject optional cookies any time.',
			},
		},
		es: {
			cookieBanner: {
				title: 'Hola California, tu decides',
				description:
					'Tu eliges. Puedes aceptar todo o rechazar cookies opcionales cuando quieras.',
			},
		},
	},
	us_fl: {
		en: {
			cookieBanner: {
				title: 'Florida Preferences',
				description:
					'No banner is shown for this region. Preferences are handled silently.',
			},
		},
	},
	eu_gdpr: {
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
	},
	uk: {
		en: {
			cookieBanner: {
				title: 'UK Privacy Choices',
				description:
					'Choose your privacy settings. Functionality is preselected on first visit, the banner locks page scroll, reject stays hidden, and customize is emphasized.',
			},
		},
	},
	jp_restricted: {
		en: {
			cookieBanner: {
				title: 'Japan Data Choices (Restricted)',
				description:
					'This demo policy only allows necessary + measurement categories.',
			},
		},
		ja: {
			cookieBanner: {
				title: '日本向けデータ設定（制限あり）',
				description: 'このデモポリシーでは必須と計測カテゴリのみ利用できます。',
			},
		},
	},
	fr: {
		fr: {
			cookieBanner: {
				title: 'Parametres de confidentialite (IAB)',
				description:
					'Vous pouvez accepter, refuser ou personnaliser les finalites IAB.',
			},
		},
	},
	br_opt_out: {
		en: {
			cookieBanner: {
				title: 'Brazil Opt-Out Policy',
				description:
					'Optional categories are enabled by default, and users can opt out in settings.',
			},
		},
		pt: {
			cookieBanner: {
				title: 'Politica de Privacidade do Brasil',
				description:
					'Categorias opcionais sao ativadas por padrao; usuarios podem desativar nas configuracoes.',
			},
		},
	},
};

export const demoPolicies: PolicyConfig[] = [
	{
		id: 'policy_us_country',
		name: 'US Country Baseline',
		match: {
			countries: ['US'],
		},
		i18n: {
			messageProfile: 'us_country',
		},
		consent: {
			model: 'opt-out',
			expiryDays: 180,
			scopeMode: 'strict',
			categories: ['necessary', 'functionality', 'measurement', 'marketing'],
		},
		ui: {
			mode: 'dialog',
			dialog: {
				allowedActions: ['customize'],
				primaryAction: 'customize',
				actionOrder: ['customize'],
				actionLayout: 'split',
				uiProfile: 'balanced',
			},
		},
		proof: {
			storeIp: false,
			storeUserAgent: true,
			storeLanguage: false,
		},
	},
	{
		id: 'policy_us_ca',
		name: 'US California',
		match: {
			regions: [{ country: 'US', region: 'CA' }],
		},
		i18n: {
			messageProfile: 'us_ca',
		},
		consent: {
			model: 'opt-in',
			expiryDays: 365,
			scopeMode: 'strict',
			categories: ['necessary', 'measurement', 'marketing'],
		},
		ui: {
			mode: 'banner',
			banner: {
				allowedActions: ['accept', 'reject'],
				primaryAction: 'accept',
				actionOrder: ['accept', 'reject'],
				actionLayout: 'split',
				uiProfile: 'balanced',
			},
			dialog: {
				allowedActions: ['reject', 'accept', 'customize'],
				primaryAction: 'accept',
				actionOrder: ['reject', 'accept', 'customize'],
				actionLayout: 'inline',
				uiProfile: 'balanced',
			},
		},
		proof: {
			storeIp: true,
			storeUserAgent: true,
			storeLanguage: true,
		},
	},
	{
		id: 'policy_us_fl',
		name: 'US Florida',
		match: {
			regions: [{ country: 'US', region: 'FL' }],
		},
		i18n: {
			messageProfile: 'us_fl',
		},
		consent: {
			model: 'none',
		},
		ui: {
			mode: 'none',
		},
		proof: {
			storeIp: false,
			storeUserAgent: true,
			storeLanguage: false,
		},
	},
	{
		id: 'policy_uk',
		name: 'United Kingdom',
		match: policyMatchers.uk(),
		i18n: {
			messageProfile: 'uk',
		},
		consent: {
			model: 'opt-in',
			expiryDays: 365,
			categories: ['necessary', 'experience', 'measurement'],
			preselectedCategories: ['functionality'],
		},
		ui: {
			mode: 'banner',
			banner: {
				allowedActions: ['accept', 'customize'],
				primaryAction: 'accept',
				actionOrder: ['accept', 'customize'],
				actionLayout: 'inline',
				uiProfile: 'balanced',
				scrollLock: false,
			},
			dialog: {
				allowedActions: ['reject', 'accept', 'customize'],
				primaryAction: 'customize',
				actionOrder: ['customize', 'reject', 'accept'],
				actionLayout: 'inline',
				uiProfile: 'compact',
				scrollLock: true,
			},
		},
		proof: {
			storeIp: true,
			storeUserAgent: true,
			storeLanguage: true,
		},
	},
	{
		id: 'policy_jp_restricted',
		name: 'Japan Restricted Purposes Demo',
		match: {
			countries: ['JP'],
		},
		i18n: {
			messageProfile: 'jp_restricted',
		},
		consent: {
			model: 'opt-in',
			expiryDays: 90,
			scopeMode: 'unmanaged',
			categories: ['necessary', 'measurement'],
		},
		ui: {
			mode: 'banner',
			banner: {
				allowedActions: ['reject', 'accept', 'customize'],
				primaryAction: 'customize',
				actionOrder: ['reject', 'accept', 'customize'],
				actionLayout: 'split',
				uiProfile: 'compact',
			},
			dialog: {
				allowedActions: ['reject', 'accept', 'customize'],
				primaryAction: 'customize',
				actionOrder: ['reject', 'accept', 'customize'],
				actionLayout: 'split',
				uiProfile: 'compact',
			},
		},
		proof: {
			storeIp: true,
			storeUserAgent: true,
			storeLanguage: true,
		},
	},
	{
		id: 'policy_br_opt_out',
		name: 'Brazil Opt-Out (Strict Scope)',
		match: {
			countries: ['BR'],
		},
		i18n: {
			messageProfile: 'br_opt_out',
		},
		consent: {
			model: 'opt-out',
			expiryDays: 120,
			scopeMode: 'strict',
			categories: ['necessary', 'measurement'],
		},
		ui: {
			mode: 'dialog',
			dialog: {
				allowedActions: ['accept', 'reject', 'customize'],
				primaryAction: 'reject',
				actionOrder: ['reject', 'accept', 'customize'],
				actionLayout: 'inline',
				uiProfile: 'strict',
			},
		},
		proof: {
			storeIp: false,
			storeUserAgent: false,
			storeLanguage: true,
		},
	},
	{
		id: 'policy_fr',
		name: 'France',
		match: {
			countries: ['FR'],
		},
		i18n: {
			messageProfile: 'fr',
		},
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
	{
		id: 'policy_de_opt_in',
		name: 'Germany Opt-In UI Demo',
		match: {
			countries: ['DE'],
		},
		i18n: {
			messageProfile: 'eu_gdpr',
		},
		consent: {
			model: 'opt-in',
			expiryDays: 365,
			scopeMode: 'strict',
			categories: ['necessary', 'functionality', 'experience', 'measurement'],
		},
		ui: {
			mode: 'banner',
			banner: {
				allowedActions: ['reject', 'accept', 'customize'],
				primaryAction: 'customize',
				actionOrder: ['reject', 'accept', 'customize'],
				actionLayout: 'split',
				uiProfile: 'compact',
			},
			dialog: {
				allowedActions: ['reject', 'accept', 'customize'],
				primaryAction: 'customize',
				actionOrder: ['reject', 'accept', 'customize'],
				actionLayout: 'split',
				uiProfile: 'compact',
			},
		},
		proof: {
			storeIp: true,
			storeUserAgent: true,
			storeLanguage: true,
		},
	},
	{
		id: 'policy_eu_gdpr',
		name: 'EU GDPR',
		match: policyMatchers.iab(),
		i18n: {
			messageProfile: 'eu_gdpr',
		},
		consent: {
			model: 'iab',
			expiryDays: 365,
			categories: ['*'],
		},
		proof: {
			storeIp: true,
			storeUserAgent: true,
			storeLanguage: true,
		},
	},
	{
		id: 'policy_default_silent',
		name: 'Default (No Banner)',
		match: {
			isDefault: true,
		},
		consent: {
			model: 'none',
		},
		ui: {
			mode: 'none',
		},
		proof: {
			storeIp: false,
			storeUserAgent: true,
			storeLanguage: false,
		},
	},
];

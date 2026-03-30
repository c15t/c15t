import type { PolicyConfig } from './policy-runtime';

const DEFAULT_PROFILE = 'default';
const SUPPORTED_BASE_LANGUAGES = new Set([
	'bg',
	'cs',
	'cy',
	'da',
	'de',
	'el',
	'en',
	'es',
	'et',
	'fi',
	'fr',
	'ga',
	'he',
	'hr',
	'hu',
	'id',
	'is',
	'it',
	'lb',
	'lt',
	'lv',
	'mt',
	'nb',
	'nl',
	'nn',
	'pl',
	'pt',
	'rm',
	'ro',
	'sk',
	'sl',
	'sv',
	'zh',
]);

export interface PolicyI18nMessageProfileLike {
	fallbackLanguage?: string;
	translations: Record<string, unknown>;
}

export interface PolicyI18nValidationOptions {
	customTranslations?: Record<string, unknown>;
	i18n?: {
		defaultProfile?: string;
		messages?: Record<string, PolicyI18nMessageProfileLike>;
	};
	policies?: PolicyConfig[];
}

export interface PolicyI18nValidationResult {
	profiles: string[];
	errors: string[];
	warnings: string[];
}

function normalizeLanguage(
	value: string | null | undefined
): string | undefined {
	if (!value) {
		return undefined;
	}

	const normalized = value.split(',')[0]?.split(';')[0]?.trim().toLowerCase();
	if (!normalized) {
		return undefined;
	}

	return normalized.split('-')[0] ?? undefined;
}

function normalizeProfiles(
	input: PolicyI18nValidationOptions
): Record<string, PolicyI18nMessageProfileLike> {
	const profiles = input.i18n?.messages;
	if (profiles && Object.keys(profiles).length > 0) {
		return profiles;
	}

	if (
		input.customTranslations &&
		Object.keys(input.customTranslations).length > 0
	) {
		return {
			[DEFAULT_PROFILE]: {
				translations: input.customTranslations,
			},
		};
	}

	return {};
}

function resolveFallbackLanguage(input: {
	profile?: PolicyI18nMessageProfileLike;
}): string {
	const configuredFallbackLanguage =
		normalizeLanguage(input.profile?.fallbackLanguage) ?? 'en';
	const profileLanguages = Object.keys(
		input.profile?.translations ?? {}
	).sort();

	if (profileLanguages.includes(configuredFallbackLanguage)) {
		return configuredFallbackLanguage;
	}

	if (profileLanguages.includes('en')) {
		return 'en';
	}

	return profileLanguages[0] ?? configuredFallbackLanguage;
}

function resolveActiveProfile(input: {
	profiles: Record<string, PolicyI18nMessageProfileLike>;
	defaultProfile: string;
	policyProfile?: string;
}): string {
	const requestedProfile = input.policyProfile ?? input.defaultProfile;
	return input.profiles[requestedProfile]
		? requestedProfile
		: input.defaultProfile;
}

export function validatePolicyI18nConfig(
	options: PolicyI18nValidationOptions
): PolicyI18nValidationResult {
	const profiles = normalizeProfiles(options);
	const profileNames = Object.keys(profiles).sort();
	const defaultProfile = options.i18n?.defaultProfile ?? DEFAULT_PROFILE;
	const errors: string[] = [];
	const warnings: string[] = [];

	if (
		options.customTranslations &&
		Object.keys(options.customTranslations).length > 0
	) {
		warnings.push(
			'`customTranslations` is deprecated. Migrate to `i18n.messages`.'
		);
	}

	if (profileNames.length > 0 && !profiles[defaultProfile]) {
		warnings.push(
			`Default i18n profile '${defaultProfile}' is not configured. Fallbacks may skip expected default profile behavior.`
		);
	}

	for (const policy of options.policies ?? []) {
		if (!policy.i18n) {
			continue;
		}

		const profile = resolveActiveProfile({
			profiles,
			defaultProfile,
			policyProfile: policy.i18n.messageProfile,
		});
		const language = normalizeLanguage(policy.i18n.language);

		if (policy.i18n.messageProfile && !profiles[policy.i18n.messageProfile]) {
			errors.push(
				`Policy '${policy.id}' references missing i18n profile '${policy.i18n.messageProfile}'.`
			);
		}

		const activeProfile = profiles[profile];
		const hasProfileTranslations =
			!!activeProfile &&
			Object.keys(activeProfile.translations ?? {}).length > 0;

		if (policy.i18n.messageProfile && !hasProfileTranslations) {
			errors.push(
				`Policy '${policy.id}' references i18n profile '${policy.i18n.messageProfile}' with no configured translations.`
			);
		}

		if (!policy.i18n.messageProfile && !policy.i18n.language) {
			warnings.push(
				`Policy '${policy.id}' defines i18n without language or messageProfile. Runtime will use request language + default profile.`
			);
		}

		if (!language) {
			continue;
		}

		const fallbackLanguage =
			profileNames.length > 0
				? resolveFallbackLanguage({ profile: activeProfile })
				: 'en';
		const hasProfileLanguage =
			!!activeProfile?.translations[language] ||
			!!activeProfile?.translations[fallbackLanguage];
		const hasBaseLanguage =
			profileNames.length === 0 && SUPPORTED_BASE_LANGUAGES.has(language);

		if (!hasProfileLanguage && !hasBaseLanguage) {
			errors.push(
				`Policy '${policy.id}' i18n language '${language}' has no configured translation in profile '${profile}', and no configured fallback exists.`
			);
		}
	}

	return {
		profiles: profileNames,
		errors,
		warnings,
	};
}

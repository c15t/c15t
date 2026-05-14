import type { PolicyConfig } from './policy-runtime';
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
export declare function validatePolicyI18nConfig(
	options: PolicyI18nValidationOptions
): PolicyI18nValidationResult;

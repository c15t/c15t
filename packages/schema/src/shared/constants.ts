/**
 * Available branding options for the consent banner
 * This is a runtime-safe constant that can be imported without Zod
 */
export const brandingValues = ['c15t', 'consent', 'none'] as const;

/**
 * Jurisdiction codes representing different privacy regulations
 * This is a runtime-safe constant that can be imported without Zod
 */
export const jurisdictionCodes = [
	'UK_GDPR',
	'GDPR',
	'CH',
	'BR',
	'PIPEDA',
	'AU',
	'APPI',
	'PIPA',
	'CCPA',
	'NONE',
] as const;

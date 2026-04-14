/**
 * Available branding options for the consent banner
 * "consent" is kept as a deprecated alias for "inth"
 * This is a runtime-safe constant that can be imported without Zod
 */
export const brandingValues = ['c15t', 'inth', 'consent', 'none'] as const;

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
	'QC_LAW25',
	'AU',
	'APPI',
	'PIPA',
	'CCPA',
	'NONE',
] as const;

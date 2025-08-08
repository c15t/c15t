import { z } from 'zod';

export const JurisdictionMessages = {
	GDPR: 'GDPR or equivalent regulations require a cookie banner.',
	CH: 'Switzerland requires similar data protection measures.',
	BR: "Brazil's LGPD requires consent for cookies.",
	PIPEDA: 'PIPEDA requires consent for data collection.',
	AU: "Australia's Privacy Act mandates transparency about data collection.",
	APPI: "Japan's APPI requires consent for data collection.",
	PIPA: "South Korea's PIPA requires consent for data collection.",
	NONE: 'No specific requirements',
} as const;

export type JurisdictionCode = keyof typeof JurisdictionMessages;

export const JurisdictionCodeSchema = z.enum([
	'GDPR',
	'CH',
	'BR',
	'PIPEDA',
	'AU',
	'APPI',
	'PIPA',
	'NONE',
]);

export const JurisdictionInfoSchema = z.object({
	code: JurisdictionCodeSchema,
	message: z.string(),
});

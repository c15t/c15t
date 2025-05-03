// packages/orpc/src/contracts/consent/show-banner.contract.ts
import { oc } from '@orpc/contract';
import { z } from 'zod';

/**
 * Contract for the show-consent-banner endpoint
 * Determines if a consent banner should be shown based on user's location
 */

// Jurisdiction codes supported by the API
const JurisdictionCodeSchema = z.enum([
	'GDPR',
	'CH',
	'BR',
	'PIPEDA',
	'AU',
	'APPI',
	'PIPA',
	'NONE',
]);

// Output schema matching the ShowConsentBannerResponse interface
export const showConsentBannerContract = oc
	// Empty input since this is a GET endpoint using only headers
	.input(z.object({}).strict())
	.output(
		z.object({
			showConsentBanner: z.boolean(),
			jurisdiction: z.object({
				code: JurisdictionCodeSchema,
				message: z.string(),
			}),
			location: z.object({
				countryCode: z.string().nullable(),
				regionCode: z.string().nullable(),
			}),
		})
	);

// packages/orpc/src/contracts/consent/show-banner.contract.ts
import { oc } from '@orpc/contract';
import { z } from 'zod';

import { JurisdictionInfoSchema } from '../shared/jurisdiction.schema';

export const showConsentBannerContract = oc
	.route({
		method: 'GET',
		path: '/show-consent-banner',
		description: `Determines if a user should see a consent banner based on their location and applicable privacy regulations.
This endpoint performs the following checks:

1. Detects the user's location using various header information:
   - Cloudflare country headers
   - Vercel IP country headers
   - AWS CloudFront headers
   - Custom country code headers

2. Determines the applicable jurisdiction based on the location:
   - GDPR (EU/EEA/UK)
   - Swiss Data Protection Act
   - LGPD (Brazil)
   - PIPEDA (Canada)
   - Australian Privacy Principles
   - APPI (Japan)
   - PIPA (South Korea)

3. Returns detailed information about:
   - Whether to show the consent banner
   - The applicable jurisdiction and its requirements
   - The user's detected location (country and region)

Use this endpoint to implement geo-targeted consent banners and ensure compliance with regional privacy regulations.`,
		tags: ['cookie-banner'],
	})
	// .input(z.union([z.undefined(), z.object({}), z.null()]))
	.output(
		z.object({
			showConsentBanner: z.boolean(),
			jurisdiction: JurisdictionInfoSchema,
			location: z.object({
				countryCode: z.string().nullable(),
				regionCode: z.string().nullable(),
			}),
		})
	);

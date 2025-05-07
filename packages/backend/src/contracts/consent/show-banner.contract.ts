// packages/orpc/src/contracts/consent/show-banner.contract.ts
import { oc } from '@orpc/contract';
import { z } from 'zod';

import { JurisdictionInfoSchema } from '../shared/jurisdiction.schema';

export const showConsentBannerContract = oc
	.route({ method: 'GET', path: '/show-consent-banner' })
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

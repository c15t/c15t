import { initOutputSchema, type JurisdictionCode } from '@c15t/schema';
import { oc } from '@orpc/contract';

export type { JurisdictionCode };

export const initContract = oc
	.route({
		method: 'GET',
		path: '/init',
		description: `Initializes the consent manager and returns the initial state.
    
    - The jurisdiction of the user (Optional - Defaults to GDPR if Geo-Location is disabled)
    - The location of the user  (Optional - Defaults to null if Geo-Location is disabled)
    - The translations of the consent manager (Based of the accept-language header)
    - The branding of the consent manager 
    
Use this endpoint to implement geo-targeted consent banners and ensure compliance with regional privacy regulations.`,
		tags: ['cookie-banner'],
	})
	.output(initOutputSchema);

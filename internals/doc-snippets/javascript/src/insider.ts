// #region docs:insider-scripts title="src/consent-scripts.ts"
import { insiderTag } from '@c15t/integrations/insider';

export const scripts = [
	insiderTag({
		pageType: {
			type: 'category',
			value: { breadcrumb: ['Clothing', 'Dresses'] },
		},
		partnerId: 'YOUR_PARTNER_ID',
		partnerName: 'yourpartner',
	}),
];
// #endregion docs:insider-scripts

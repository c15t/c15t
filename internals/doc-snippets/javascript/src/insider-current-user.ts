// #region docs:insider-current-user title="src/consent-scripts.ts"
import { insiderTag } from '@c15t/integrations/insider';
import type { InsiderPageType } from '@c15t/integrations/insider';

export const createInsiderScripts = function createInsiderScripts(
	currentUser: Record<string, unknown>,
	currency: string,
	guardedPage: InsiderPageType
) {
	return [
		insiderTag({
			currency,
			pageType: guardedPage,
			partnerId: 'YOUR_PARTNER_ID',
			partnerName: 'yourpartner',
			user: currentUser,
		}),
	];
};
// #endregion docs:insider-current-user

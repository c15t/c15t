// #region docs:activecampaign-configuration title="src/consent-scripts.ts"
import { activeCampaignTracking } from '@c15t/integrations/activecampaign';

export const scripts = [
	activeCampaignTracking({ accountId: 'YOUR_ACCOUNT_ID' }),
];
// #endregion docs:activecampaign-configuration

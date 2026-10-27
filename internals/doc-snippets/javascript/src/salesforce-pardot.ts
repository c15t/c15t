// #region docs:salesforce-pardot-configuration title="src/consent-scripts.ts"
import { pardotTracking } from '@c15t/integrations/salesforce-pardot';

export const scripts = [
	pardotTracking({
		piAId: '123456',
		piCId: '654321',
		piDomain: 'pi.pardot.com',
	}),
];
// #endregion docs:salesforce-pardot-configuration

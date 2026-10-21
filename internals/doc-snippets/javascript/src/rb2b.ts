// #region docs:rb2b-scripts title="src/consent-scripts.ts"
import { rb2b } from '@c15t/integrations/rb2b';

export const scripts = [rb2b({ accountKey: 'YOUR_RB2B_KEY' })];
// #endregion docs:rb2b-scripts

// #region docs:rb2b-document-navigation title="src/navigation.ts"
export const goToPricing = function goToPricing(): void {
	window.location.assign('/pricing');
};
// #endregion docs:rb2b-document-navigation

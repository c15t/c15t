// #region docs:slim-bar title="src/cookie-banner.tsx"
import { ConsentBanner } from 'c15t/react';

import './slim-bar.css';

/**
 * One line of copy and the policy's buttons in a single row. The compound
 * parts keep the policy's actions, so a required Reject button stays.
 */
export const CookieBanner = () => (
	<ConsentBanner.Root variant="bar">
		<ConsentBanner.Card className="slim-bar">
			<ConsentBanner.Description className="slim-bar__text" />
			<ConsentBanner.PolicyActions />
		</ConsentBanner.Card>
	</ConsentBanner.Root>
);
// #endregion docs:slim-bar

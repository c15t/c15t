// #region docs:slim-bar title="src/cookie-banner.tsx"
import { ConsentBanner } from 'c15t/react';

import './slim-bar.css';

/**
 * The title, copy and the policy's buttons in a single row. The compound
 * parts keep the policy's actions, so a required Reject button stays.
 */
export const CookieBanner = () => (
	<ConsentBanner.Root variant="bar">
		<ConsentBanner.Card className="slim-bar">
			<ConsentBanner.Header className="slim-bar__text">
				<ConsentBanner.Title />
				<ConsentBanner.Description />
			</ConsentBanner.Header>
			<ConsentBanner.PolicyActions />
		</ConsentBanner.Card>
	</ConsentBanner.Root>
);
// #endregion docs:slim-bar

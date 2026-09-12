'use client';

import { ConsentBanner } from 'c15t/next';

/** Keep policy-defined copy and actions when changing the banner's markup. */
export const CustomBanner = () => (
	<ConsentBanner.Root>
		<ConsentBanner.Card className="custom-banner">
			<ConsentBanner.Header>
				<p className="eyebrow">Your visit, your choices</p>
				<ConsentBanner.Title />
				<ConsentBanner.Description />
			</ConsentBanner.Header>
			<ConsentBanner.PolicyActions />
		</ConsentBanner.Card>
	</ConsentBanner.Root>
);

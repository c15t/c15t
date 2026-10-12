/**
 * The IAB TCF preference centre, on its own chunk.
 *
 * The TCF surface is the biggest thing either dialog can render — vendor
 * lists, purposes, stacks — and only a site that configured IAB ever shows
 * it. Keeping it in its own island means the preference-centre chunk that
 * every other site downloads does not carry it.
 */

import { ConsentDraftProvider } from '@c15t/react';
import { IABConsentDialog } from '@c15t/react/iab';

/** Props the dialog island passes down. */
export interface IABDialogSurfaceProps {
	/** Which preference-centre tab to open on. */
	tab?: 'purposes' | 'vendors';
}

const IABDialogSurface = ({ tab }: IABDialogSurfaceProps) => (
	<ConsentDraftProvider>
		<IABConsentDialog initialTab={tab} />
	</ConsentDraftProvider>
);

export default IABDialogSurface;

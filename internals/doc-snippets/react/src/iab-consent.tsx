// #region docs:iab-consent
import {
	IABProvider,
	IABConsentBanner,
	IABConsentDialog,
} from 'c15t/react/iab';

export const IABConsent = ({ cmpId }: { cmpId: number }) => (
	<IABProvider cmpId={cmpId}>
		<IABConsentBanner />
		<IABConsentDialog />
	</IABProvider>
);
// #endregion docs:iab-consent

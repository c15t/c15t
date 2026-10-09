// #region docs:iab-consent title="src/components/iab-consent.tsx"
import {
	IABConsentBanner,
	IABConsentDialog,
	IABProvider,
} from 'c15t/react/iab';
import { useModel } from 'c15t/tanstack-start';

export const IABConsent = ({ cmpId }: { cmpId: number }) => {
	const model = useModel();
	if (model !== 'iab') {
		return null;
	}
	return (
		<IABProvider cmpId={cmpId}>
			<IABConsentBanner />
			<IABConsentDialog />
		</IABProvider>
	);
};
// #endregion docs:iab-consent

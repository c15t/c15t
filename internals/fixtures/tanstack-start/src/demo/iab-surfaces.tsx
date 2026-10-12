import {
	IABConsentBanner,
	IABConsentDialog,
	IABProvider,
} from 'c15t/react/iab';
import { useModel } from 'c15t/tanstack-start';

/**
 * IAB TCF banner and dialog for visitors the self-hosted demo backend
 * resolves to its IAB policy (`?country=DE` in the region preview). The
 * stock banner stays closed under the `iab` model.
 */
export const IabSurfaces = ({ cmpId }: { cmpId: number }) => {
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

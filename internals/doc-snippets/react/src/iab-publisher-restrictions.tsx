// #region docs:iab-publisher-restrictions title="src/iab-consent.tsx"
import {
	IABProvider,
	IABConsentBanner,
	IABConsentDialog,
} from 'c15t/react/iab';

const publisherRestrictions = [
	// Vendors 10 and 755 may not use purpose 4.
	{ purposeId: 4, restrictionType: 0 as const, vendorIds: [10, 755] },
	// Vendor 755 must use legitimate interest for purpose 7.
	{ purposeId: 7, restrictionType: 2 as const, vendorIds: [755] },
];

export const IABConsent = ({ cmpId }: { cmpId: number }) => (
	<IABProvider
		cmpId={cmpId}
		publisherRestrictions={publisherRestrictions}
	>
		<IABConsentBanner />
		<IABConsentDialog />
	</IABProvider>
);
// #endregion docs:iab-publisher-restrictions

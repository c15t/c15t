import {
	ConsentManagerDialog,
	ConsentManagerProvider,
	ConsentManagerWidget,
	CookieBanner,
	type CookieBannerProps,
	type TrackingBlockerConfig,
	useConsentManager,
} from '@c15t/react';

const trackingBlockerConfig: TrackingBlockerConfig = {
	disableAutomaticBlocking: true,
	domainConsentMap: {
		'google-analytics.com': 'measurement',
		'facebook.com': 'marketing',
	},
};

const options = {
	mode: 'c15t',
	ignoreGeoLocation: true,
	react: {
		theme: theme,
		colorScheme: 'dark',
		disableAnimation: true,
	},
	gdprTypes: ['necessary', 'marketing'],
	trackingBlockerConfig,
	translations: {
		defaultLanguage: 'en',
		disableAutoLanguageSwitch: true,
		translations: {
			en: {
				cookieBanner: {
					title: 'Title',
				},
			},
		},
	},
};

const consentStore = {
	initialGDPRTypes: ['necessary'],
};

const bannerProps: CookieBannerProps = {};

export function App() {
	const {
		showPopup,
		setShowPopup,
		isPrivacyDialogOpen,
		setIsPrivacyDialogOpen,
	} = useConsentManager();

	if (showPopup && !isPrivacyDialogOpen) {
		setShowPopup(true, true);
	}

	const localConfig = { trackingBlockerConfig };
	const inherited = options.trackingBlockerConfig;
	void localConfig;
	void inherited;
	void setIsPrivacyDialogOpen;
	void bannerProps;
	void consentStore;

	return (
		<ConsentManagerProvider options={options}>
			<CookieBanner />
			<ConsentManagerDialog />
			<ConsentManagerWidget />
		</ConsentManagerProvider>
	);
}

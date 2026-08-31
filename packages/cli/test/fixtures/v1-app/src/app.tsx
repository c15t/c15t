import {
	ConsentManagerDialog,
	ConsentManagerProvider,
	ConsentManagerWidget,
	CookieBanner,
	useConsentManager,
} from '@c15t/react';
import type { CookieBannerProps, TrackingBlockerConfig } from '@c15t/react';

const trackingBlockerConfig: TrackingBlockerConfig = {
	disableAutomaticBlocking: true,
	domainConsentMap: {
		'facebook.com': 'marketing',
		'google-analytics.com': 'measurement',
	},
};

const options = {
	gdprTypes: ['necessary', 'marketing'],
	ignoreGeoLocation: true,
	mode: 'c15t',
	react: {
		colorScheme: 'dark',
		disableAnimation: true,
		theme,
	},
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

export const App = () => {
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
};

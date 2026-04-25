'use client';

export {
	IABConsentBanner,
	type IABConsentBannerProps,
} from './components/iab-consent-banner';
export {
	IABConsentDialog,
	type IABConsentDialogProps,
} from './components/iab-consent-dialog';
export type { CreateIABOptions, IABHandle } from './iab-context';
export {
	IABProvider,
	type IABProviderProps,
	type ReactIABState,
	useIAB,
} from './iab-context';

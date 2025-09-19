export type {
	ConsentManagerInterface,
	ConsentManagerOptions,
	ConsentManagerProviderProps,
} from '@c15t/react/headless';

export {
	ConsentManagerProvider as ClientConsentManagerProvider,
	configureConsentManager,
	defaultTranslationConfig,
	detectBrowserLanguage,
	mergeTranslationConfigs,
	prepareTranslationConfig,
	useColorScheme,
	useConsentManager,
	useFocusTrap,
	useTranslations,
} from '@c15t/react/headless';

export { ConsentManagerCallbacks } from './components/callbacks';
export { ConsentManagerProvider } from './components/consent-manager-provider';

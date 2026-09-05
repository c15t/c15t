/**
 * Ordinary (non-IAB) React path: provider, hosted mode, banner, dialog,
 * consent hooks and the script loader hook. The import-boundary metrics
 * assert this entry pulls in no IAB, devtools, or all-locale modules.
 */
export {
	ConsentBanner,
	ConsentDialog,
	ConsentProvider,
	hosted,
	useConsent,
	useSaveConsents,
	useScriptLoader,
} from '@c15t/react';

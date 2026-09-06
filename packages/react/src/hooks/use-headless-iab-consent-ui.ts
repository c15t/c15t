'use client';

import { resolveIABBannerSummary } from '@c15t/iab/headless';
import type {
	HeadlessIABBannerAction,
	HeadlessIABDialogAction,
	HeadlessIABPreferenceTab,
} from '@c15t/iab/headless';
import { useCallback, useMemo } from 'react';

import { useIABConsentManager } from './use-iab-consent-manager';

export type {
	HeadlessIABBannerAction,
	HeadlessIABDialogAction,
	HeadlessIABPreferenceTab,
};

export interface HeadlessIABBannerState {
	isVisible: boolean;
	isReady: boolean;
	vendorCount: number;
	displayItems: string[];
	remainingCount: number;
	scrollLock?: boolean;
}

export interface HeadlessIABDialogState {
	isVisible: boolean;
	isLoading: boolean;
	activeTab: HeadlessIABPreferenceTab;
	scrollLock?: boolean;
}

export interface UseHeadlessIABConsentUIResult {
	activeUI: ReturnType<typeof useIABConsentManager>['activeUI'];
	model: ReturnType<typeof useIABConsentManager>['model'];
	iab: ReturnType<typeof useIABConsentManager>['iab'];
	isIABEnabled: boolean;
	banner: HeadlessIABBannerState;
	dialog: HeadlessIABDialogState;
	openBanner: (options?: { force?: boolean }) => void;
	openDialog: (options?: { tab?: HeadlessIABPreferenceTab }) => void;
	openPurposesDialog: () => void;
	openVendorsDialog: () => void;
	closeUI: () => void;
	acceptAll: () => Promise<void> | void;
	rejectAll: () => Promise<void> | void;
	savePreferences: () => Promise<void> | void;
	performBannerAction: (
		action: HeadlessIABBannerAction
	) => Promise<void> | void;
	performDialogAction: (
		action: HeadlessIABDialogAction
	) => Promise<void> | void;
}

export const useHeadlessIABConsentUI =
	function useHeadlessIABConsentUI(): UseHeadlessIABConsentUIResult {
		const {
			activeUI,
			model,
			iab,
			policyBanner: { scrollLock: policyBannerScrollLock },
			policyDialog: { scrollLock: policyDialogScrollLock },
			setActiveUI,
		} = useIABConsentManager();
		const isIABEnabled = Boolean(iab?.config.enabled);

		const bannerSummary = useMemo(() => resolveIABBannerSummary(iab), [iab]);

		const openBanner = useCallback<UseHeadlessIABConsentUIResult['openBanner']>(
			(options) => {
				setActiveUI('banner', options);
			},
			[setActiveUI]
		);

		const openDialog = useCallback<UseHeadlessIABConsentUIResult['openDialog']>(
			(options) => {
				if (options?.tab) {
					iab?.setPreferenceCenterTab(options.tab);
				}
				setActiveUI('dialog');
			},
			[iab, setActiveUI]
		);

		const openPurposesDialog = useCallback(() => {
			openDialog({ tab: 'purposes' });
		}, [openDialog]);

		const openVendorsDialog = useCallback(() => {
			openDialog({ tab: 'vendors' });
		}, [openDialog]);

		const closeUI = useCallback(() => {
			setActiveUI('none');
		}, [setActiveUI]);

		const acceptAll = useCallback<
			UseHeadlessIABConsentUIResult['acceptAll']
		>(() => {
			if (!iab) {
				return;
			}
			iab.acceptAll();
			const savePromise = iab.save();
			setActiveUI('none');
			return savePromise;
		}, [iab, setActiveUI]);

		const rejectAll = useCallback<
			UseHeadlessIABConsentUIResult['rejectAll']
		>(() => {
			if (!iab) {
				return;
			}
			iab.rejectAll();
			const savePromise = iab.save();
			setActiveUI('none');
			return savePromise;
		}, [iab, setActiveUI]);

		const savePreferences = useCallback<
			UseHeadlessIABConsentUIResult['savePreferences']
		>(() => {
			if (!iab) {
				return;
			}
			const savePromise = iab.save();
			setActiveUI('none');
			return savePromise;
		}, [iab, setActiveUI]);

		const performBannerAction = useCallback<
			UseHeadlessIABConsentUIResult['performBannerAction']
		>(
			(action) => {
				switch (action) {
					case 'accept':
						return acceptAll();
					case 'reject':
						return rejectAll();
					case 'customize':
						return openPurposesDialog();
					default:
						return undefined;
				}
			},
			[acceptAll, openPurposesDialog, rejectAll]
		);

		const performDialogAction = useCallback<
			UseHeadlessIABConsentUIResult['performDialogAction']
		>(
			(action) => {
				switch (action) {
					case 'accept':
						return acceptAll();
					case 'reject':
						return rejectAll();
					case 'customize':
						return savePreferences();
					default:
						return undefined;
				}
			},
			[acceptAll, rejectAll, savePreferences]
		);

		return {
			acceptAll,
			activeUI,
			banner: {
				...bannerSummary,
				isVisible: activeUI === 'banner' && model === 'iab' && isIABEnabled,
				scrollLock: policyBannerScrollLock,
			},
			closeUI,
			dialog: {
				activeTab: iab?.preferenceCenterTab ?? 'purposes',
				isLoading: Boolean(iab?.isLoadingGVL || !iab?.gvl),
				isVisible: activeUI === 'dialog' && model === 'iab' && isIABEnabled,
				scrollLock: policyDialogScrollLock,
			},
			iab,
			isIABEnabled,
			model,
			openBanner,
			openDialog,
			openPurposesDialog,
			openVendorsDialog,
			performBannerAction,
			performDialogAction,
			rejectAll,
			savePreferences,
		};
	};

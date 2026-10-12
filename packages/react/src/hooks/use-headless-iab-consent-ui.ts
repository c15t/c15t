'use client';

import { saveIABConsentSurface } from '@c15t/core/surface-actions';
import { resolveIABBannerSummary } from '@c15t/iab/headless';
import type {
	HeadlessIABBannerAction,
	HeadlessIABDialogAction,
	HeadlessIABPreferenceTab,
} from '@c15t/iab/headless';
import { useCallback, useMemo } from 'react';

import { useKernel } from '../kernel-selector';
import { useIABConsentManager } from './use-iab-manager';

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

		const kernel = useKernel();
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

		// The surface closes in the click task and comes back if the CMP
		// recorded nothing; see `saveIABConsentSurface`. Closing it with
		// `setActiveUI('none')` instead would bring the banner back from the
		// dialog while the TC string is still encoding.
		const saveChoice = useCallback(
			async (selection?: 'accept' | 'reject'): Promise<void> => {
				if (!iab) {
					return;
				}
				if (selection === 'accept') {
					iab.acceptAll();
				} else if (selection === 'reject') {
					iab.rejectAll();
				}
				await saveIABConsentSurface(kernel, iab.save);
			},
			[iab, kernel]
		);

		const acceptAll = useCallback<UseHeadlessIABConsentUIResult['acceptAll']>(
			() => saveChoice('accept'),
			[saveChoice]
		);

		const rejectAll = useCallback<UseHeadlessIABConsentUIResult['rejectAll']>(
			() => saveChoice('reject'),
			[saveChoice]
		);

		const savePreferences = useCallback<
			UseHeadlessIABConsentUIResult['savePreferences']
		>(() => saveChoice(), [saveChoice]);

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

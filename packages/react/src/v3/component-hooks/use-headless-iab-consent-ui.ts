'use client';

import { resolveIABBannerSummary } from '@c15t/iab/v3/headless';
import { useCallback, useMemo } from 'react';

import { useIAB } from '../iab-context';
import { useConsentManager } from './use-consent-manager';

export const useHeadlessIABConsentUI = function useHeadlessIABConsentUI() {
	const iab = useIAB();
	const { activeUI, policyBanner, policyDialog, setActiveUI } =
		useConsentManager();

	const banner = useMemo(() => resolveIABBannerSummary(iab), [iab]);

	const openVendorsDialog = useCallback(() => {
		iab?.setPreferenceCenterTab('vendors');
		setActiveUI('dialog');
	}, [iab, setActiveUI]);

	const closeUI = useCallback(() => setActiveUI('none'), [setActiveUI]);
	const openDialog = useCallback(
		(options?: { tab?: 'purposes' | 'vendors' }) => {
			if (options?.tab) {
				iab?.setPreferenceCenterTab(options.tab);
			}
			setActiveUI('dialog');
		},
		[iab, setActiveUI]
	);

	const performBannerAction = useCallback(
		async (action: 'accept' | 'reject' | 'customize') => {
			if (action === 'accept') {
				iab?.acceptAll();
				await iab?.save();
				closeUI();
				return;
			}
			if (action === 'reject') {
				iab?.rejectAll();
				await iab?.save();
				closeUI();
				return;
			}
			openDialog();
		},
		[closeUI, iab, openDialog]
	);

	const performDialogAction = useCallback(
		async (action: 'accept' | 'reject' | 'customize') => {
			if (action === 'accept') {
				iab?.acceptAll();
				await iab?.save();
				closeUI();
				return;
			}
			if (action === 'reject') {
				iab?.rejectAll();
				await iab?.save();
				closeUI();
				return;
			}
			await iab?.save();
			closeUI();
		},
		[closeUI, iab]
	);

	return {
		activeUI,
		banner: {
			...banner,
			scrollLock: policyBanner.scrollLock,
		},
		closeUI,
		dialog: {
			isReady: Boolean(iab?.gvl),
			scrollLock: policyDialog.scrollLock,
		},
		iab,
		openDialog,
		openVendorsDialog,
		performBannerAction,
		performDialogAction,
	};
};

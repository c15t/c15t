'use client';

import { resolveIABBannerSummary } from '@c15t/iab/headless';
import { useCallback, useContext, useMemo } from 'react';

import { KernelContext } from '../context';
import { useIAB } from '../iab-context';
import { saveIABConsentUI } from '../ui-save';
import { useConsentManager } from './use-manager';

export const useHeadlessIABConsentUI = function useHeadlessIABConsentUI() {
	const iab = useIAB();
	const kernel = useContext(KernelContext);
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

	// The surface closes in the click task; see `saveIABConsentUI`.
	const saveChoice = useCallback(
		async (selection?: 'accept' | 'reject') => {
			if (!iab) {
				return;
			}
			if (selection === 'accept') {
				iab.acceptAll();
			} else if (selection === 'reject') {
				iab.rejectAll();
			}
			await (kernel ? saveIABConsentUI(kernel, iab.save) : iab.save());
		},
		[iab, kernel]
	);

	const performBannerAction = useCallback(
		async (action: 'accept' | 'reject' | 'customize') => {
			if (action === 'customize') {
				openDialog();
				return;
			}
			await saveChoice(action);
		},
		[openDialog, saveChoice]
	);

	const performDialogAction = useCallback(
		(action: 'accept' | 'reject' | 'customize') =>
			saveChoice(action === 'customize' ? undefined : action),
		[saveChoice]
	);

	return {
		activeUI,
		banner: {
			...banner,
			scrollLock: policyBanner.scrollLock,
		},
		closeUI,
		dialog: {
			isReady: Boolean(iab?.gvl || iab?.gvlReference),
			scrollLock: policyDialog.scrollLock,
		},
		iab,
		openDialog,
		openVendorsDialog,
		performBannerAction,
		performDialogAction,
	};
};

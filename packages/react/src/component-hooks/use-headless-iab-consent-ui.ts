'use client';

import { resolveIABBannerSummary } from '@c15t/iab/headless';
import { useCallback, useMemo } from 'react';

import {
	useActiveUI,
	usePreferencesPresentation,
	usePromptPresentation,
	useSetActiveUI,
} from '../hooks';
import { useIAB } from '../iab-context';

export const useHeadlessIABConsentUI = function useHeadlessIABConsentUI() {
	const iab = useIAB();
	const activeUI = useActiveUI() ?? 'none';
	const policyBanner = usePromptPresentation();
	const policyDialog = usePreferencesPresentation();
	const setActiveUI = useSetActiveUI();

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
				return;
			}
			if (action === 'reject') {
				iab?.rejectAll();
				await iab?.save();
				return;
			}
			openDialog();
		},
		[iab, openDialog]
	);

	const performDialogAction = useCallback(
		async (action: 'accept' | 'reject' | 'customize') => {
			if (action === 'accept') {
				iab?.acceptAll();
				await iab?.save();
				return;
			}
			if (action === 'reject') {
				iab?.rejectAll();
				await iab?.save();
				return;
			}
			await iab?.save();
		},
		[iab]
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

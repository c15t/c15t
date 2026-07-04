'use client';

import { useCallback, useMemo } from 'react';
import { useIAB } from '../iab-context';
import { useConsentManager } from './use-consent-manager';

export function useHeadlessIABConsentUI() {
	const iab = useIAB();
	const { activeUI, policyBanner, policyDialog, setActiveUI } =
		useConsentManager();

	const vendorCount = iab?.gvl ? Object.keys(iab.gvl.vendors ?? {}).length : 0;
	const displayItems = useMemo(() => {
		if (!iab?.gvl) return [];
		return Object.values(iab.gvl.purposes ?? {})
			.slice(0, 3)
			.map((purpose) => purpose.name);
	}, [iab?.gvl]);

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
		iab,
		activeUI,
		banner: {
			isReady: Boolean(iab?.gvl),
			vendorCount,
			displayItems,
			remainingCount: Math.max(0, displayItems.length - 3),
			scrollLock: policyBanner.scrollLock,
		},
		dialog: {
			isReady: Boolean(iab?.gvl),
			scrollLock: policyDialog.scrollLock,
		},
		closeUI,
		openDialog,
		openVendorsDialog,
		performBannerAction,
		performDialogAction,
	};
}

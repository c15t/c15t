'use client';

import { useCallback, useMemo } from 'react';
import { useConsentManager } from './use-consent-manager';

const MAX_BANNER_DISPLAY_ITEMS = 5;
const STANDALONE_PURPOSE_ID = 1;

export type HeadlessIABPreferenceTab = 'purposes' | 'vendors';
export type HeadlessIABBannerAction = 'accept' | 'reject' | 'customize';
export type HeadlessIABDialogAction = 'accept' | 'reject' | 'customize';

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
	activeUI: ReturnType<typeof useConsentManager>['activeUI'];
	model: ReturnType<typeof useConsentManager>['model'];
	iab: ReturnType<typeof useConsentManager>['iab'];
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

function resolveIABBannerSummary(
	iab: ReturnType<typeof useConsentManager>['iab']
): Omit<HeadlessIABBannerState, 'isVisible' | 'scrollLock'> {
	if (!iab?.gvl) {
		return {
			isReady: false,
			vendorCount: 0,
			displayItems: [],
			remainingCount: 0,
		};
	}

	const gvl = iab.gvl;
	const vendorCount =
		Object.keys(gvl.vendors).length + (iab.nonIABVendors?.length ?? 0);

	const purposesWithVendors = Object.entries(gvl.purposes)
		.filter(([id]) =>
			Object.values(gvl.vendors).some(
				(vendor) =>
					vendor.purposes?.includes(Number(id)) ||
					vendor.legIntPurposes?.includes(Number(id))
			)
		)
		.map(([id, purpose]) => ({ id: Number(id), name: purpose.name }));

	const standalonePurpose = purposesWithVendors.find(
		(purpose) => purpose.id === STANDALONE_PURPOSE_ID
	);
	const otherPurposes = purposesWithVendors.filter(
		(purpose) => purpose.id !== STANDALONE_PURPOSE_ID
	);
	const otherPurposeIds = new Set(otherPurposes.map((purpose) => purpose.id));

	const stackScores: Array<{
		name: string;
		coveredPurposeIds: number[];
		score: number;
	}> = [];

	for (const stack of Object.values(gvl.stacks || {})) {
		const coveredPurposeIds = stack.purposes.filter((purposeId) =>
			otherPurposeIds.has(purposeId)
		);
		if (coveredPurposeIds.length >= 2) {
			stackScores.push({
				name: stack.name,
				coveredPurposeIds,
				score: coveredPurposeIds.length,
			});
		}
	}

	stackScores.sort((a, b) => b.score - a.score);

	const selectedStacks: string[] = [];
	const assignedPurposeIds = new Set<number>();
	for (const { name, coveredPurposeIds } of stackScores) {
		const unassignedPurposes = coveredPurposeIds.filter(
			(purposeId) => !assignedPurposeIds.has(purposeId)
		);
		if (unassignedPurposes.length >= 2) {
			selectedStacks.push(name);
			for (const purposeId of unassignedPurposes) {
				assignedPurposeIds.add(purposeId);
			}
		}
	}

	const uncoveredPurposes = otherPurposes.filter(
		(purpose) => !assignedPurposeIds.has(purpose.id)
	);

	const specialFeaturesWithVendors = Object.entries(gvl.specialFeatures || {})
		.filter(([id]) =>
			Object.values(gvl.vendors).some((vendor) =>
				vendor.specialFeatures?.includes(Number(id))
			)
		)
		.map(([, feature]) => feature.name);

	const items: string[] = [];
	if (standalonePurpose) {
		items.push(standalonePurpose.name);
	}
	for (const stackName of selectedStacks) {
		items.push(stackName);
	}
	for (const purpose of uncoveredPurposes) {
		items.push(purpose.name);
	}
	for (const featureName of specialFeaturesWithVendors) {
		items.push(featureName);
	}

	return {
		isReady: true,
		vendorCount,
		displayItems: items.slice(0, MAX_BANNER_DISPLAY_ITEMS),
		remainingCount: Math.max(0, items.length - MAX_BANNER_DISPLAY_ITEMS),
	};
}

export function useHeadlessIABConsentUI(): UseHeadlessIABConsentUIResult {
	const {
		activeUI,
		model,
		iab,
		policyBanner: { scrollLock: policyBannerScrollLock },
		policyDialog: { scrollLock: policyDialogScrollLock },
		setActiveUI,
	} = useConsentManager();
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
			}
		},
		[acceptAll, rejectAll, savePreferences]
	);

	return {
		activeUI,
		model,
		iab,
		isIABEnabled,
		banner: {
			...bannerSummary,
			isVisible: activeUI === 'banner' && model === 'iab' && isIABEnabled,
			scrollLock: policyBannerScrollLock,
		},
		dialog: {
			isVisible: activeUI === 'dialog' && model === 'iab' && isIABEnabled,
			isLoading: Boolean(iab?.isLoadingGVL || !iab?.gvl),
			activeTab: iab?.preferenceCenterTab ?? 'purposes',
			scrollLock: policyDialogScrollLock,
		},
		openBanner,
		openDialog,
		openPurposesDialog,
		openVendorsDialog,
		closeUI,
		acceptAll,
		rejectAll,
		savePreferences,
		performBannerAction,
		performDialogAction,
	};
}

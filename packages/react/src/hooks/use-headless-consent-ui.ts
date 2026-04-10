'use client';

import {
	hasPolicyHints,
	type PolicyUiAction,
	type PolicyUiActionDirection,
	type PolicyUiActionGroup,
	type PolicyUiProfile,
	type PolicyUiSurfaceConfig,
	resolvePolicyActionGroups,
	resolvePolicyAllowedActions,
	resolvePolicyDirection,
	resolvePolicyOrderedActions,
	resolvePolicyPrimaryActions,
	shouldFillPolicyActions,
} from '@c15t/ui/utils';
import { useCallback, useMemo } from 'react';
import { useConsentManager } from './use-consent-manager';

export type HeadlessConsentSurface = 'banner' | 'dialog';
export type HeadlessConsentSurfaceAction = PolicyUiAction;
export type HeadlessConsentWriteAction = 'accept' | 'reject';
export type HeadlessConsentBannerAction = HeadlessConsentSurfaceAction;
export type HeadlessConsentDialogAction = HeadlessConsentSurfaceAction;

export interface HeadlessConsentSurfaceState<
	TAction extends string = HeadlessConsentSurfaceAction,
> {
	allowedActions: TAction[];
	orderedActions: TAction[];
	actionGroups: TAction[][];
	primaryActions: TAction[];
	layout?: PolicyUiActionGroup[];
	direction: PolicyUiActionDirection;
	uiProfile?: PolicyUiProfile;
	scrollLock?: boolean;
	hasPolicyHints: boolean;
	shouldFillActions: boolean;
	isVisible: boolean;
}

export type HeadlessConsentBannerState =
	HeadlessConsentSurfaceState<HeadlessConsentBannerAction>;
export type HeadlessConsentDialogState =
	HeadlessConsentSurfaceState<HeadlessConsentDialogAction>;

export interface UseHeadlessConsentUIResult {
	activeUI: ReturnType<typeof useConsentManager>['activeUI'];
	banner: HeadlessConsentBannerState;
	dialog: HeadlessConsentDialogState;
	openBanner: (options?: { force?: boolean }) => void;
	openDialog: () => void;
	closeUI: () => void;
	performAction: (
		action: HeadlessConsentWriteAction,
		options: {
			surface: HeadlessConsentSurface;
			uiSource?: string;
		}
	) => Promise<void>;
	performBannerAction: (
		action: HeadlessConsentWriteAction,
		options?: { uiSource?: string }
	) => Promise<void>;
	performDialogAction: (
		action: HeadlessConsentWriteAction,
		options?: { uiSource?: string }
	) => Promise<void>;
	saveCustomPreferences: (options?: { uiSource?: string }) => Promise<void>;
}

const DEFAULT_UI_SOURCE_BY_SURFACE: Record<HeadlessConsentSurface, string> = {
	banner: 'banner',
	dialog: 'dialog',
};

export function useHeadlessConsentUI(): UseHeadlessConsentUIResult {
	const {
		activeUI,
		policyBanner: {
			allowedActions: policyBannerAllowedActions,
			primaryActions: policyBannerPrimaryActions,
			layout: policyBannerLayout,
			direction: policyBannerDirection,
			uiProfile: policyBannerUiProfile,
			scrollLock: policyBannerScrollLock,
		},
		policyDialog: {
			allowedActions: policyDialogAllowedActions,
			primaryActions: policyDialogPrimaryActions,
			layout: policyDialogLayout,
			direction: policyDialogDirection,
			uiProfile: policyDialogUiProfile,
			scrollLock: policyDialogScrollLock,
		},
		saveConsents,
		setActiveUI,
	} = useConsentManager();

	const bannerPolicyHints = useMemo<PolicyUiSurfaceConfig>(
		() => ({
			allowedActions: policyBannerAllowedActions,
			primaryActions: policyBannerPrimaryActions,
			layout: policyBannerLayout,
			direction: policyBannerDirection,
			uiProfile: policyBannerUiProfile,
			scrollLock: policyBannerScrollLock,
		}),
		[
			policyBannerAllowedActions,
			policyBannerDirection,
			policyBannerLayout,
			policyBannerPrimaryActions,
			policyBannerUiProfile,
			policyBannerScrollLock,
		]
	);

	const dialogPolicyHints = useMemo<PolicyUiSurfaceConfig>(
		() => ({
			allowedActions: policyDialogAllowedActions,
			primaryActions: policyDialogPrimaryActions,
			layout: policyDialogLayout,
			direction: policyDialogDirection,
			uiProfile: policyDialogUiProfile,
			scrollLock: policyDialogScrollLock,
		}),
		[
			policyDialogAllowedActions,
			policyDialogDirection,
			policyDialogLayout,
			policyDialogPrimaryActions,
			policyDialogUiProfile,
			policyDialogScrollLock,
		]
	);

	const banner = useMemo<HeadlessConsentBannerState>(() => {
		const allowedActions = resolvePolicyAllowedActions({
			allowedActions: policyBannerAllowedActions,
		});
		const actionGroups = resolvePolicyActionGroups({
			allowedActions,
			layout: policyBannerLayout,
		});
		const orderedActions = resolvePolicyOrderedActions({
			allowedActions,
			layout: policyBannerLayout,
		});
		const direction = resolvePolicyDirection(policyBannerDirection);

		return {
			allowedActions,
			orderedActions,
			actionGroups,
			primaryActions: resolvePolicyPrimaryActions({
				orderedActions,
				primaryActions: policyBannerPrimaryActions,
			}),
			layout: policyBannerLayout,
			direction,
			uiProfile: policyBannerUiProfile,
			scrollLock: policyBannerScrollLock,
			hasPolicyHints: hasPolicyHints(bannerPolicyHints),
			shouldFillActions: shouldFillPolicyActions({
				uiProfile: policyBannerUiProfile,
				actionGroups,
				direction,
			}),
			isVisible: activeUI === 'banner',
		};
	}, [
		activeUI,
		policyBannerAllowedActions,
		policyBannerDirection,
		policyBannerLayout,
		policyBannerPrimaryActions,
		policyBannerUiProfile,
		policyBannerScrollLock,
		bannerPolicyHints,
	]);

	const dialog = useMemo<HeadlessConsentDialogState>(() => {
		const allowedActions = resolvePolicyAllowedActions({
			allowedActions: policyDialogAllowedActions,
		});
		const actionGroups = resolvePolicyActionGroups({
			allowedActions,
			layout: policyDialogLayout,
		});
		const orderedActions = resolvePolicyOrderedActions({
			allowedActions,
			layout: policyDialogLayout,
		});
		const direction = resolvePolicyDirection(policyDialogDirection);

		return {
			allowedActions,
			orderedActions,
			actionGroups,
			primaryActions: resolvePolicyPrimaryActions({
				orderedActions,
				primaryActions: policyDialogPrimaryActions,
			}),
			layout: policyDialogLayout,
			direction,
			uiProfile: policyDialogUiProfile,
			scrollLock: policyDialogScrollLock,
			hasPolicyHints: hasPolicyHints(dialogPolicyHints),
			shouldFillActions: shouldFillPolicyActions({
				uiProfile: policyDialogUiProfile,
				actionGroups,
				direction,
			}),
			isVisible: activeUI === 'dialog',
		};
	}, [
		activeUI,
		policyDialogAllowedActions,
		policyDialogDirection,
		policyDialogLayout,
		policyDialogPrimaryActions,
		policyDialogUiProfile,
		policyDialogScrollLock,
		dialogPolicyHints,
	]);

	const performAction = useCallback<
		UseHeadlessConsentUIResult['performAction']
	>(
		async (action, options) => {
			const uiSource =
				options.uiSource ?? DEFAULT_UI_SOURCE_BY_SURFACE[options.surface];

			switch (action) {
				case 'accept':
					await saveConsents('all', { uiSource });
					return;
				case 'reject':
					await saveConsents('necessary', { uiSource });
					return;
			}
		},
		[saveConsents]
	);

	const performBannerAction = useCallback<
		UseHeadlessConsentUIResult['performBannerAction']
	>(
		(action, options) =>
			performAction(action, {
				surface: 'banner',
				uiSource: options?.uiSource,
			}),
		[performAction]
	);

	const performDialogAction = useCallback<
		UseHeadlessConsentUIResult['performDialogAction']
	>(
		(action, options) =>
			performAction(action, {
				surface: 'dialog',
				uiSource: options?.uiSource,
			}),
		[performAction]
	);

	const saveCustomPreferences = useCallback<
		UseHeadlessConsentUIResult['saveCustomPreferences']
	>(
		async (options) => {
			await saveConsents('custom', {
				uiSource: options?.uiSource ?? DEFAULT_UI_SOURCE_BY_SURFACE.dialog,
			});
		},
		[saveConsents]
	);

	const openBanner = useCallback<UseHeadlessConsentUIResult['openBanner']>(
		(options) => {
			setActiveUI('banner', options);
		},
		[setActiveUI]
	);

	const openDialog = useCallback(() => {
		setActiveUI('dialog');
	}, [setActiveUI]);

	const closeUI = useCallback(() => {
		setActiveUI('none');
	}, [setActiveUI]);

	return {
		activeUI,
		banner,
		dialog,
		openBanner,
		openDialog,
		closeUI,
		performAction,
		performBannerAction,
		performDialogAction,
		saveCustomPreferences,
	};
}

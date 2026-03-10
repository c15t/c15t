'use client';

import { useCallback, useMemo } from 'react';
import {
	hasPolicyHints,
	type PolicyUiAction,
	type PolicyUiActionLayout,
	type PolicyUiProfile,
	type PolicyUiSurfaceConfig,
	resolvePolicyActionGroups,
	resolvePolicyActionOrder,
	resolvePolicyPrimaryAction,
	shouldFillPolicyActions,
} from '~/components/shared/libs/policy-actions';
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
	primaryAction?: TAction;
	actionLayout?: PolicyUiActionLayout;
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
			primaryAction: policyBannerPrimaryAction,
			actionOrder: policyBannerActionOrder,
			actionLayout: policyBannerActionLayout,
			uiProfile: policyBannerUiProfile,
			scrollLock: policyBannerScrollLock,
		},
		policyDialog: {
			allowedActions: policyDialogAllowedActions,
			primaryAction: policyDialogPrimaryAction,
			actionOrder: policyDialogActionOrder,
			actionLayout: policyDialogActionLayout,
			uiProfile: policyDialogUiProfile,
			scrollLock: policyDialogScrollLock,
		},
		saveConsents,
		setActiveUI,
	} = useConsentManager();

	const bannerPolicyHints = useMemo<PolicyUiSurfaceConfig>(
		() => ({
			allowedActions: policyBannerAllowedActions,
			primaryAction: policyBannerPrimaryAction,
			actionOrder: policyBannerActionOrder,
			actionLayout: policyBannerActionLayout,
			uiProfile: policyBannerUiProfile,
			scrollLock: policyBannerScrollLock,
		}),
		[
			policyBannerActionLayout,
			policyBannerActionOrder,
			policyBannerAllowedActions,
			policyBannerPrimaryAction,
			policyBannerUiProfile,
			policyBannerScrollLock,
		]
	);

	const dialogPolicyHints = useMemo<PolicyUiSurfaceConfig>(
		() => ({
			allowedActions: policyDialogAllowedActions,
			primaryAction: policyDialogPrimaryAction,
			actionOrder: policyDialogActionOrder,
			actionLayout: policyDialogActionLayout,
			uiProfile: policyDialogUiProfile,
			scrollLock: policyDialogScrollLock,
		}),
		[
			policyDialogActionLayout,
			policyDialogActionOrder,
			policyDialogAllowedActions,
			policyDialogPrimaryAction,
			policyDialogUiProfile,
			policyDialogScrollLock,
		]
	);

	const banner = useMemo<HeadlessConsentBannerState>(() => {
		const allowedActions = resolvePolicyActionOrder({
			allowedActions: policyBannerAllowedActions,
		});
		const orderedActions = resolvePolicyActionOrder({
			allowedActions,
			actionOrder: policyBannerActionOrder,
		});

		const actionGroups = resolvePolicyActionGroups({
			orderedActions,
			layout: policyBannerActionLayout ?? 'split',
		});

		return {
			allowedActions,
			orderedActions,
			actionGroups,
			primaryAction: resolvePolicyPrimaryAction({
				orderedActions,
				primaryAction: policyBannerPrimaryAction,
			}),
			actionLayout: policyBannerActionLayout,
			uiProfile: policyBannerUiProfile,
			scrollLock: policyBannerScrollLock,
			hasPolicyHints: hasPolicyHints(bannerPolicyHints),
			shouldFillActions: shouldFillPolicyActions({
				uiProfile: policyBannerUiProfile,
				actionGroups,
			}),
			isVisible: activeUI === 'banner',
		};
	}, [
		activeUI,
		policyBannerActionLayout,
		policyBannerActionOrder,
		policyBannerAllowedActions,
		policyBannerPrimaryAction,
		policyBannerUiProfile,
		policyBannerScrollLock,
		bannerPolicyHints,
	]);

	const dialog = useMemo<HeadlessConsentDialogState>(() => {
		const allowedActions = resolvePolicyActionOrder({
			allowedActions: policyDialogAllowedActions,
		});
		const orderedActions = resolvePolicyActionOrder({
			allowedActions,
			actionOrder: policyDialogActionOrder,
		});

		const actionGroups = resolvePolicyActionGroups({
			orderedActions,
			layout: policyDialogActionLayout ?? 'split',
		});

		return {
			allowedActions,
			orderedActions,
			actionGroups,
			primaryAction: resolvePolicyPrimaryAction({
				orderedActions,
				primaryAction: policyDialogPrimaryAction,
			}),
			actionLayout: policyDialogActionLayout,
			uiProfile: policyDialogUiProfile,
			scrollLock: policyDialogScrollLock,
			hasPolicyHints: hasPolicyHints(dialogPolicyHints),
			shouldFillActions: shouldFillPolicyActions({
				uiProfile: policyDialogUiProfile,
				actionGroups,
			}),
			isVisible: activeUI === 'dialog',
		};
	}, [
		activeUI,
		policyDialogActionLayout,
		policyDialogActionOrder,
		policyDialogAllowedActions,
		policyDialogPrimaryAction,
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

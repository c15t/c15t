'use client';

import {
	hasPolicyHints,
	resolvePolicyActionGroups,
	resolvePolicyAllowedActions,
	resolvePolicyDirection,
	resolvePolicyOrderedActions,
	resolvePolicyPrimaryActions,
	shouldFillPolicyActions,
} from '@c15t/ui/utils';
import type {
	PolicyUiAction,
	PolicyUiActionDirection,
	PolicyUiActionGroup,
	PolicyUiProfile,
	PolicyUiSurfaceConfig,
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

export const useHeadlessConsentUI =
	function useHeadlessConsentUI(): UseHeadlessConsentUIResult {
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
				direction: policyBannerDirection,
				layout: policyBannerLayout,
				primaryActions: policyBannerPrimaryActions,
				scrollLock: policyBannerScrollLock,
				uiProfile: policyBannerUiProfile,
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
				direction: policyDialogDirection,
				layout: policyDialogLayout,
				primaryActions: policyDialogPrimaryActions,
				scrollLock: policyDialogScrollLock,
				uiProfile: policyDialogUiProfile,
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
				actionGroups,
				allowedActions,
				direction,
				hasPolicyHints: hasPolicyHints(bannerPolicyHints),
				isVisible: activeUI === 'banner',
				layout: policyBannerLayout,
				orderedActions,
				primaryActions: resolvePolicyPrimaryActions({
					orderedActions,
					primaryActions: policyBannerPrimaryActions,
				}),
				scrollLock: policyBannerScrollLock,
				shouldFillActions: shouldFillPolicyActions({
					actionGroups,
					direction,

					uiProfile: policyBannerUiProfile,
				}),
				uiProfile: policyBannerUiProfile,
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
				actionGroups,
				allowedActions,
				direction,
				hasPolicyHints: hasPolicyHints(dialogPolicyHints),
				isVisible: activeUI === 'dialog',
				layout: policyDialogLayout,
				orderedActions,
				primaryActions: resolvePolicyPrimaryActions({
					orderedActions,
					primaryActions: policyDialogPrimaryActions,
				}),
				scrollLock: policyDialogScrollLock,
				shouldFillActions: shouldFillPolicyActions({
					actionGroups,
					direction,

					uiProfile: policyDialogUiProfile,
				}),
				uiProfile: policyDialogUiProfile,
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

				// oxlint-disable-next-line default-case -- Preserve established branch order and control flow.
				switch (action) {
					case 'accept':
						await saveConsents('all', { uiSource });
						return;
					case 'reject':
						await saveConsents('necessary', { uiSource });
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
			closeUI,
			dialog,
			openBanner,
			openDialog,
			performAction,
			performBannerAction,
			performDialogAction,
			saveCustomPreferences,
		};
	};

'use client';

import { useCallback, useMemo } from 'react';
import {
	type PolicyAction,
	type PolicyActionLayout,
	type PolicyUiProfile,
	resolvePolicyActionGroups,
	resolvePolicyActionOrder,
	resolvePolicyPrimaryAction,
	shouldFillPolicyActions,
} from '~/components/shared/libs/policy-actions';
import { useConsentManager } from './use-consent-manager';

export type HeadlessConsentSurface = 'banner' | 'dialog';

export interface HeadlessConsentSurfaceState {
	allowedActions: PolicyAction[];
	orderedActions: PolicyAction[];
	actionGroups: PolicyAction[][];
	primaryAction: PolicyAction | null;
	actionLayout: PolicyActionLayout | null;
	uiProfile: PolicyUiProfile | null;
	hasPolicyHints: boolean;
	shouldFillActions: boolean;
	isVisible: boolean;
}

export interface UseHeadlessConsentUIResult {
	activeUI: ReturnType<typeof useConsentManager>['activeUI'];
	banner: HeadlessConsentSurfaceState;
	dialog: HeadlessConsentSurfaceState;
	openBanner: (options?: { force?: boolean }) => void;
	openDialog: () => void;
	closeUI: () => void;
	performAction: (
		action: PolicyAction,
		options: {
			surface: HeadlessConsentSurface;
			uiSource?: string;
		}
	) => Promise<void>;
	performBannerAction: (
		action: PolicyAction,
		options?: { uiSource?: string }
	) => Promise<void>;
	performDialogAction: (
		action: PolicyAction,
		options?: { uiSource?: string }
	) => Promise<void>;
}

const DEFAULT_UI_SOURCE_BY_SURFACE: Record<HeadlessConsentSurface, string> = {
	banner: 'banner',
	dialog: 'dialog',
};

export function useHeadlessConsentUI(): UseHeadlessConsentUIResult {
	const {
		activeUI,
		policyBannerAllowedActions,
		policyBannerPrimaryAction,
		policyBannerActionOrder,
		policyBannerActionLayout,
		policyBannerUiProfile,
		policyDialogAllowedActions,
		policyDialogPrimaryAction,
		policyDialogActionOrder,
		policyDialogActionLayout,
		policyDialogUiProfile,
		saveConsents,
		setActiveUI,
	} = useConsentManager();

	const banner = useMemo<HeadlessConsentSurfaceState>(() => {
		const allowedActions = resolvePolicyActionOrder({
			allowedActions: policyBannerAllowedActions,
			actionOrder: null,
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
			hasPolicyHints: Boolean(
				policyBannerAllowedActions ||
					policyBannerActionOrder ||
					policyBannerActionLayout ||
					policyBannerPrimaryAction ||
					policyBannerUiProfile
			),
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
	]);

	const dialog = useMemo<HeadlessConsentSurfaceState>(() => {
		const allowedActions = resolvePolicyActionOrder({
			allowedActions: policyDialogAllowedActions,
			actionOrder: null,
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
			hasPolicyHints: Boolean(
				policyDialogAllowedActions ||
					policyDialogActionOrder ||
					policyDialogActionLayout ||
					policyDialogPrimaryAction ||
					policyDialogUiProfile
			),
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
				case 'customize':
					if (options.surface === 'banner') {
						setActiveUI('dialog');
						return;
					}
					await saveConsents('custom', { uiSource });
					return;
			}
		},
		[saveConsents, setActiveUI]
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
	};
}

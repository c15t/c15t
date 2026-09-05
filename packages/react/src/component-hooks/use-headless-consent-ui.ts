'use client';

import {
	DEFAULT_POLICY_ACTION_LAYOUT,
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

import {
	useActiveUI,
	usePolicyBanner,
	usePolicyDialog,
	useSaveConsents,
	useSetActiveUI,
} from '../hooks';

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

const resolveSurfaceState = function resolveSurfaceState(
	activeUI: string,
	surface: HeadlessConsentSurface,
	policy: PolicyUiSurfaceConfig
): HeadlessConsentSurfaceState {
	const allowedActions = resolvePolicyAllowedActions({
		allowedActions: policy.allowedActions,
	});
	// A policy that ships no UI hints still gets the standard grouping —
	// reject and accept together, customize on its own — rather than one
	// undifferentiated row. Both surfaces read it from here, so the banner
	// and the preference centre cannot drift apart.
	const layout =
		(policy.layout?.length ?? 0) > 0
			? policy.layout
			: DEFAULT_POLICY_ACTION_LAYOUT;
	const actionGroups = resolvePolicyActionGroups({
		allowedActions,
		layout,
	});
	const orderedActions = resolvePolicyOrderedActions({
		allowedActions,
		layout,
	});
	const direction = resolvePolicyDirection(policy.direction);

	return {
		actionGroups,
		allowedActions,
		direction,
		hasPolicyHints: hasPolicyHints(policy),
		isVisible: activeUI === surface,
		layout: policy.layout,
		orderedActions,
		primaryActions: resolvePolicyPrimaryActions({
			orderedActions,
			primaryActions: policy.primaryActions,
		}),
		scrollLock: policy.scrollLock,
		shouldFillActions: shouldFillPolicyActions({
			actionGroups,
			direction,

			uiProfile: policy.uiProfile,
		}),
		uiProfile: policy.uiProfile,
	};
};

const EMPTY_POLICY_SURFACE: PolicyUiSurfaceConfig = {};

export const useHeadlessConsentUI = function useHeadlessConsentUI() {
	const activeUI = useActiveUI() ?? 'none';
	const policyBanner = usePolicyBanner() ?? EMPTY_POLICY_SURFACE;
	const policyDialog = usePolicyDialog() ?? EMPTY_POLICY_SURFACE;
	const saveConsents = useSaveConsents();
	const setActiveUI = useSetActiveUI();

	const banner = useMemo(
		() => resolveSurfaceState(activeUI, 'banner', policyBanner),
		[activeUI, policyBanner]
	);
	const dialog = useMemo(
		() => resolveSurfaceState(activeUI, 'dialog', policyDialog),
		[activeUI, policyDialog]
	);

	const openBanner = useCallback(() => setActiveUI('banner'), [setActiveUI]);
	const openDialog = useCallback(() => setActiveUI('dialog'), [setActiveUI]);
	const closeUI = useCallback(() => setActiveUI('none'), [setActiveUI]);

	const performAction = useCallback(
		async (action: HeadlessConsentWriteAction | 'customize') => {
			if (action === 'accept') {
				await saveConsents('all');
				return;
			}
			if (action === 'reject') {
				await saveConsents('none');
				return;
			}
			setActiveUI('dialog');
		},
		[saveConsents, setActiveUI]
	);

	return {
		activeUI,
		banner,
		closeUI,
		dialog,
		openBanner,
		openDialog,
		performAction,
		performBannerAction: performAction,
		performDialogAction: performAction,
		saveCustomPreferences: () => saveConsents(),
	};
};

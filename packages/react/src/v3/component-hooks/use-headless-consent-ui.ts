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

function resolveSurfaceState(
	activeUI: string,
	surface: HeadlessConsentSurface,
	policy: PolicyUiSurfaceConfig
): HeadlessConsentSurfaceState {
	const allowedActions = resolvePolicyAllowedActions({
		allowedActions: policy.allowedActions,
	});
	const actionGroups = resolvePolicyActionGroups({
		allowedActions,
		layout: policy.layout,
	});
	const orderedActions = resolvePolicyOrderedActions({
		allowedActions,
		layout: policy.layout,
	});
	const direction = resolvePolicyDirection(policy.direction);

	return {
		allowedActions,
		orderedActions,
		actionGroups,
		primaryActions: resolvePolicyPrimaryActions({
			orderedActions,
			primaryActions: policy.primaryActions,
		}),
		layout: policy.layout,
		direction,
		uiProfile: policy.uiProfile,
		scrollLock: policy.scrollLock,
		hasPolicyHints: hasPolicyHints(policy),
		shouldFillActions: shouldFillPolicyActions({
			uiProfile: policy.uiProfile,
			actionGroups,
			direction,
		}),
		isVisible: activeUI === surface,
	};
}

const EMPTY_POLICY_SURFACE: PolicyUiSurfaceConfig = {};

export function useHeadlessConsentUI() {
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
		dialog,
		openBanner,
		openDialog,
		closeUI,
		performAction,
		performBannerAction: performAction,
		performDialogAction: performAction,
		saveCustomPreferences: () => saveConsents(),
	};
}

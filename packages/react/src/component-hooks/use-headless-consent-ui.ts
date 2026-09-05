'use client';

import { resolveConsentPresentation } from '@c15t/core';
import type {
	ConsentPresentation,
	PresentationAction,
	ResolvedConsentPresentation,
} from '@c15t/core';
import { useCallback, useEffect, useMemo } from 'react';

import { useConsentDraft } from '../draft';
import {
	useActiveUI,
	useDismissNotice,
	usePolicyRule,
	useSaveConsents,
	useSetActiveUI,
} from '../hooks';
import { useUIConfig } from '../ui-config-context';

export type HeadlessConsentSurface = 'banner' | 'dialog';
export type HeadlessConsentSurfaceAction = PresentationAction;
export type HeadlessConsentWriteAction = 'accept' | 'reject' | 'save';
export type HeadlessConsentBannerAction = PresentationAction;
export type HeadlessConsentDialogAction = PresentationAction;

export interface HeadlessConsentSurfaceState<
	Action extends string = PresentationAction,
> extends Omit<
	ResolvedConsentPresentation,
	'allowedActions' | 'orderedActions' | 'actionGroups' | 'primaryActions'
> {
	allowedActions: Action[];
	orderedActions: Action[];
	actionGroups: Action[][];
	primaryActions: Action[];
	isVisible: boolean;
}
export type HeadlessConsentBannerState = HeadlessConsentSurfaceState;
export type HeadlessConsentDialogState = HeadlessConsentSurfaceState;

/** Resolve required controls with optional component-level presentation. */
export const useHeadlessConsentUI = function useHeadlessConsentUI(
	overrides?: ConsentPresentation
) {
	const activeUI = useActiveUI();
	const policy = usePolicyRule();
	const { presentation } = useUIConfig();
	const saveConsents = useSaveConsents();
	const dismissNotice = useDismissNotice();
	const setActiveUI = useSetActiveUI();
	const { save: saveDraft } = useConsentDraft();
	const banner = useMemo(
		() => ({
			...resolveConsentPresentation({
				override: overrides?.prompt,
				policy,
				presentation,
				surface: 'prompt',
			}),
			isVisible: activeUI === 'banner',
		}),
		[policy, presentation, overrides?.prompt, activeUI]
	);
	const dialog = useMemo(
		() => ({
			...resolveConsentPresentation({
				override: overrides?.preferences,
				policy,
				presentation,
				surface: 'preferences',
			}),
			isVisible: activeUI === 'dialog',
		}),
		[policy, presentation, overrides?.preferences, activeUI]
	);
	useEffect(() => {
		if (
			(globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env
				?.NODE_ENV === 'production'
		) {
			return;
		}
		for (const diagnostic of [...banner.diagnostics, ...dialog.diagnostics]) {
			console.warn(
				`c15t presentation: ${diagnostic.message}`,
				diagnostic.actions
			);
		}
	}, [banner.diagnostics, dialog.diagnostics]);
	const openBanner = useCallback(() => setActiveUI('banner'), [setActiveUI]);
	const openDialog = useCallback(() => setActiveUI('dialog'), [setActiveUI]);
	const closeUI = useCallback(() => setActiveUI('none'), [setActiveUI]);
	const performAction = useCallback(
		(action: PresentationAction) => {
			switch (action) {
				case 'accept':
					return saveConsents('all');
				case 'reject':
					return saveConsents('none');
				case 'save':
					return saveDraft();
				case 'dismiss':
					return dismissNotice();
				case 'customize':
					return setActiveUI('dialog');
				default:
					return undefined;
			}
		},
		[saveConsents, saveDraft, dismissNotice, setActiveUI]
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
		saveCustomPreferences: saveDraft,
	};
};

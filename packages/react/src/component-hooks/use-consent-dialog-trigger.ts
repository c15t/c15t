'use client';

import { useCallback } from 'react';

import { useActiveUI, usePromptRequirement, useSetActiveUI } from '../hooks';

/**
 * When a trigger surface is visible.
 *
 * - `always` renders whenever the preference center is closed.
 * - `after-prompt` renders only once no prompt is owed: after a choice is
 *   saved or a notice is dismissed, and again when a policy change asks
 *   for a new prompt is answered.
 * - `never` hides the surface so the host can open the dialog itself.
 */
export type ConsentDialogTriggerVisibility =
	| 'always'
	| 'after-prompt'
	| 'never';
export interface UseConsentDialogTriggerOptions {
	showWhen?: ConsentDialogTriggerVisibility;
	onClick?: () => void;
}
export interface UseConsentDialogTriggerResult {
	isVisible: boolean;
	openDialog: () => void;
}

/** Persistent preferences access does not depend on a choice or prompt. */
export const useConsentDialogTrigger = function useConsentDialogTrigger(
	options: UseConsentDialogTriggerOptions = {}
): UseConsentDialogTriggerResult {
	const { showWhen = 'always', onClick } = options;
	const setActiveUI = useSetActiveUI();
	const activeUI = useActiveUI();
	const promptRequirement = usePromptRequirement();
	const openDialog = useCallback(() => {
		onClick?.();
		setActiveUI('dialog');
	}, [onClick, setActiveUI]);
	const promptSettled =
		showWhen !== 'after-prompt' || promptRequirement.kind === 'none';
	return {
		isVisible: showWhen !== 'never' && activeUI !== 'dialog' && promptSettled,
		openDialog,
	};
};

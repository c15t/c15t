'use client';

import { useCallback } from 'react';

import { useActiveUI, useSetActiveUI } from '../hooks';

export type ConsentDialogTriggerVisibility = 'always' | 'never';
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
	const openDialog = useCallback(() => {
		onClick?.();
		setActiveUI('dialog');
	}, [onClick, setActiveUI]);
	return {
		isVisible: showWhen !== 'never' && activeUI !== 'dialog',
		openDialog,
	};
};

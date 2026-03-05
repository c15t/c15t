'use client';

import { useCallback, useMemo } from 'react';
import { useConsentManager } from './use-consent-manager';

export type ConsentDialogTriggerVisibility =
	| 'always'
	| 'after-consent'
	| 'never';

export interface UseConsentDialogTriggerOptions {
	showWhen?: ConsentDialogTriggerVisibility;
	onClick?: () => void;
}

export interface UseConsentDialogTriggerResult {
	isVisible: boolean;
	openDialog: () => void;
}

export function useConsentDialogTrigger(
	options: UseConsentDialogTriggerOptions = {}
): UseConsentDialogTriggerResult {
	const { showWhen = 'after-consent', onClick } = options;
	const { activeUI, hasConsented, setActiveUI } = useConsentManager();

	const shouldShow = useMemo(() => {
		if (showWhen === 'never') {
			return false;
		}
		if (showWhen === 'after-consent') {
			return hasConsented();
		}
		return true;
	}, [hasConsented, showWhen]);

	const openDialog = useCallback(() => {
		onClick?.();
		setActiveUI('dialog');
	}, [onClick, setActiveUI]);

	return {
		isVisible: shouldShow && activeUI === 'none',
		openDialog,
	};
}

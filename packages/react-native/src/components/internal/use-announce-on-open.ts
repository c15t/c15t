/**
 * Announce a surface when it appears.
 *
 * A consent sheet can cover the app without the reader knowing, so the title is
 * announced once per open rather than on every re-render underneath it.
 */

import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Announce one message each time a surface opens.
 *
 * @param open - Whether the surface is open.
 * @param message - What to announce; nothing when empty.
 */
export const useAnnounceOnOpen = function useAnnounceOnOpen(
	open: boolean,
	message: string
): void {
	useEffect(() => {
		if (!open || message === '') {
			return;
		}

		AccessibilityInfo.announceForAccessibility(message);
	}, [message, open]);
};

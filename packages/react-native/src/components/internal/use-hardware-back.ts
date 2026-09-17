/**
 * The Android exit for an open surface.
 *
 * iOS has no hardware back, so subscribing there would register a listener that
 * can only ever swallow a gesture that does not exist.
 */

import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';

/**
 * Close a surface on a hardware back press while it is open.
 *
 * @param active - Whether the surface is open.
 * @param onRequestClose - Handler invoked by the back press.
 */
export const useHardwareBack = function useHardwareBack(
	active: boolean,
	onRequestClose?: (() => void) | undefined
): void {
	useEffect(() => {
		if (!active || Platform.OS !== 'android' || onRequestClose === undefined) {
			return;
		}

		const subscription = BackHandler.addEventListener(
			'hardwareBackPress',
			() => {
				onRequestClose();

				// Handled: the app must not background itself behind the sheet.
				return true;
			}
		);

		return () => {
			subscription.remove();
		};
	}, [active, onRequestClose]);
};

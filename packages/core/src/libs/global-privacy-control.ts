/**
 * Utility helpers for detecting Global Privacy Control (GPC) signals.
 *
 * @remarks
 * GPC is a browser-level signal that indicates a user's preference to opt out
 * of the sale or sharing of their personal data (e.g. CCPA/CPRA).
 *
 * This helper is intentionally conservative and only checks for the presence
 * of the client-side `navigator.globalPrivacyControl` flag.
 *
 * @see https://globalprivacycontrol.org/ for the GPC specification.
 *
 * @internal
 */
export const hasGlobalPrivacyControlSignal =
	function hasGlobalPrivacyControlSignal(): boolean {
		if (typeof window === 'undefined') {
			return false;
		}

		try {
			const navigatorWithGPC = window.navigator as Navigator & {
				globalPrivacyControl?: unknown;
			};

			const value = navigatorWithGPC.globalPrivacyControl;

			return value === true;
		} catch {
			// If anything goes wrong while reading the signal, fail closed
			return false;
		}
	};

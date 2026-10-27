import { observeBannerElement } from '@c15t/core';
import type { ConsentKernel } from '@c15t/core';

interface BannerObservation {
	kernel: ConsentKernel;
	language?: string;
	policyFingerprint?: string;
}

/** Observe the actual card and replace stale policy/language bindings. @internal */
export const observeBanner = function observeBanner(
	element: HTMLElement,
	input: BannerObservation
) {
	const install = (value: BannerObservation) => {
		const fingerprint = value.policyFingerprint;
		if (!fingerprint) {
			return () => {
				// No authoritative policy means no display evidence.
			};
		}
		return observeBannerElement(element, (isVisible) =>
			value.kernel.reportBannerRendered?.({
				isVisible,
				language: value.language,
				policyFingerprint: fingerprint,
			})
		);
	};
	let stop = install(input);
	return {
		destroy() {
			stop();
		},
		update(value: BannerObservation) {
			stop();
			stop = install(value);
		},
	};
};

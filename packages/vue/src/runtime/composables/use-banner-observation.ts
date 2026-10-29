import { observationPolicyFingerprint, observeBannerElement } from '@c15t/core';
import { watchEffect } from 'vue';
import type { Ref } from 'vue';

import { useConsentKernel, useConsentSnapshot } from './kernel';

/** Observe the mounted banner after Vue has applied its DOM update. @internal */
export const useBannerObservation = function useBannerObservation(
	element: Ref<HTMLElement | null>,
	enabled: () => boolean
): void {
	const kernel = useConsentKernel();
	const snapshot = useConsentSnapshot();
	watchEffect(
		(onCleanup) => {
			const card = element.value;
			const fingerprint = observationPolicyFingerprint(
				snapshot.value.resolution
			);
			const language = snapshot.value.translations?.language;
			if (!card || !enabled() || !fingerprint) {
				return;
			}
			onCleanup(
				observeBannerElement(card, (isVisible) => {
					kernel.reportBannerRendered?.({
						isVisible,
						language,
						policyFingerprint: fingerprint,
					});
				})
			);
		},
		{ flush: 'post' }
	);
};

import { observeBannerElement, observationPolicyFingerprint } from '@c15t/core';
import { useEffect } from 'react';
import type { RefObject } from 'react';

import { useKernel, useKernelSelector } from '../kernel-selector';

/** Report only a mounted, intersecting banner under the currently resolved policy. @internal */
export const useBannerObservation = function useBannerObservation(
	element: RefObject<Element | null>,
	enabled: boolean
): void {
	const kernel = useKernel();
	const active = useKernelSelector((snapshot) => snapshot.activeUI);
	const resolution = useKernelSelector((snapshot) => snapshot.resolution);
	const language = useKernelSelector(
		(snapshot) => snapshot.translations?.language
	);
	const fingerprint = observationPolicyFingerprint(resolution);
	useEffect(() => {
		if (!enabled || active !== 'banner' || !element.current || !fingerprint) {
			return;
		}
		return observeBannerElement(element.current, (isVisible) =>
			kernel.reportBannerRendered?.({
				isVisible,
				language,
				policyFingerprint: fingerprint,
			})
		);
	}, [active, enabled, element, kernel, language, fingerprint]);
};

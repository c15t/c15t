/**
 * The platform's reduce-motion preference, live.
 *
 * `AccessibilityInfo` answers asynchronously, so the first render behaves as if
 * motion were allowed. That ordering is deliberate: a sheet that starts hidden
 * and has no animation to reveal it with is a sheet the user never sees.
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether the device currently asks for reduced motion.
 *
 * @returns `true` once the platform reports `reduceMotionEnabled`.
 */
export const useReducedMotion = function useReducedMotion(): boolean {
	const [reduced, setReduced] = useState(false);

	useEffect(() => {
		let active = true;

		void (async () => {
			const enabled = await AccessibilityInfo.isReduceMotionEnabled();

			// Only the affirmative is a change: the state starts at "motion is
			// allowed", and scheduling a render to store the value already there
			// costs the surface a whole extra pass on mount.
			if (active && enabled) {
				setReduced(true);
			}
		})();

		const subscription = AccessibilityInfo.addEventListener(
			'reduceMotionChanged',
			(enabled: boolean) => {
				setReduced((current) => (current === enabled ? current : enabled));
			}
		);

		return () => {
			active = false;
			subscription.remove();
		};
	}, []);

	return reduced;
};

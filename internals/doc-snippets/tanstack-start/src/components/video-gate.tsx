// #region docs:headless-consent-gate
import { useConsentGate } from 'c15t/tanstack-start/headless';
import type { ReactNode } from 'react';

export const VideoGate = ({ children }: { children: ReactNode }) => {
	const { state, title, actionLabel, policyBlockedMessage, requestConsent } =
		useConsentGate('marketing');

	if (state === 'granted') {
		return children;
	}
	if (state === 'pending') {
		return null;
	}
	if (state === 'policy-blocked') {
		return <p>{policyBlockedMessage}</p>;
	}
	return (
		<div>
			<p>{title}</p>
			<button
				type="button"
				onClick={requestConsent}
			>
				{actionLabel}
			</button>
		</div>
	);
};
// #endregion docs:headless-consent-gate

import {
	COMPAT_HOSTED_CONFIG,
	COMPAT_TRACKER_RULES,
} from '@c15t/next-compat-shared/config';
import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import { SiblingBeacon } from '@c15t/next-compat-shared/sibling-beacon';
import { resolveConsent } from '@c15t/nextjs/server';
import type { ReactNode } from 'react';

/**
 * The documented streaming layout with a network-blocker rule, plus a
 * tracker call from a component rendered next to the root.
 */
const NetworkBlockerLayout = ({ children }: { children: ReactNode }) => {
	const state = resolveConsent({ config: COMPAT_HOSTED_CONFIG });

	return (
		<>
			<SiblingBeacon />
			<ConsentShell
				styles={false}
				networkBlocker={{ rules: COMPAT_TRACKER_RULES }}
				scenario="network-blocker"
				state={state}
			>
				{children}
			</ConsentShell>
		</>
	);
};

export default NetworkBlockerLayout;

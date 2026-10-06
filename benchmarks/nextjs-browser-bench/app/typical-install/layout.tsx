import { resolveConsent } from '@c15t/nextjs/server';
import type { ReactNode } from 'react';

import { TypicalInstallConsent } from '../_bench/typical-install';
import { typicalInstallConfig } from '../_bench/typical-install-config';

/**
 * The Next.js quickstart's root layout: consent resolves from the cached
 * manifest without being awaited, so the page streams while it settles.
 */
const TypicalInstallLayout = ({ children }: { children: ReactNode }) => {
	const state = resolveConsent({ config: typicalInstallConfig });

	return (
		<TypicalInstallConsent state={state}>{children}</TypicalInstallConsent>
	);
};

export default TypicalInstallLayout;

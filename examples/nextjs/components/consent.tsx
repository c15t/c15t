'use client';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogTrigger,
	ConsentRoot,
} from 'c15t/next';
import type { ConsentRootProps } from 'c15t/next';
import { ConsentDevTools } from 'c15t/next/devtools';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { consentConfig } from '../c15t.config';
import { scripts } from '../lib/scripts';
import { brandTheme } from '../lib/theme';
import { CustomBanner } from './custom-banner';
import { Demo } from './demo';

export type BannerDesign = 'default' | 'branded' | 'custom';

/** One root for each router, with a shared gallery and client-only scripts. */
export const Consent = ({
	state,
	children,
}: {
	state: ConsentRootProps['state'];
	children: ReactNode;
}) => {
	const [design, setDesign] = useState<BannerDesign>('default');
	const [showTrigger, setShowTrigger] = useState(false);

	return (
		<ConsentRoot
			state={state}
			config={consentConfig}
			scripts={scripts}
			persistence={false}
			options={{ theme: design === 'default' ? undefined : brandTheme }}
		>
			<Demo
				design={design}
				onDesignChange={setDesign}
				showTrigger={showTrigger}
				onTriggerChange={setShowTrigger}
			>
				{children}
			</Demo>
			{design === 'custom' ? <CustomBanner /> : <ConsentBanner />}
			<ConsentDialog />
			{showTrigger && <ConsentDialogTrigger />}
			<ConsentDevTools position="bottom-right" />
		</ConsentRoot>
	);
};

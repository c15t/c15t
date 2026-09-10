'use client';

import {
	ConsentBanner,
	ConsentBoundary,
	ConsentDialog,
	ConsentDialogTrigger,
} from 'c15t/next';
import type { ConsentBoundaryProps } from 'c15t/next';
import { ConsentDevTools } from 'c15t/next/devtools';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { consentConfig } from '../c15t.config';
import { scripts } from '../lib/scripts';
import { brandTheme } from '../lib/theme';
import { CustomBanner } from './custom-banner';
import { Demo } from './demo';

export type BannerDesign = 'default' | 'branded' | 'custom';

/** One boundary for each router, with a shared gallery and client-only scripts. */
export const Consent = ({
	config,
	children,
}: {
	config: ConsentBoundaryProps['config'];
	children: ReactNode;
}) => {
	const [design, setDesign] = useState<BannerDesign>('default');
	const [showTrigger, setShowTrigger] = useState(false);

	return (
		<ConsentBoundary
			config={config}
			consent={consentConfig}
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
		</ConsentBoundary>
	);
};

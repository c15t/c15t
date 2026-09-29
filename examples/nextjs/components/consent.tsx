'use client';

import type { ExperimentReportEvent } from 'c15t';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogTrigger,
	ConsentRoot,
} from 'c15t/next';
import type { ConsentRootProps } from 'c15t/next';
import { ConsentDevTools } from 'c15t/next/devtools';
import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { consentConfig } from '../c15t.config';
import { bannerExperiment } from '../lib/experiment';
import type { ExperimentArm } from '../lib/experiment';
import { scripts } from '../lib/scripts';
import { brandTheme } from '../lib/theme';
import { CustomBanner } from './custom-banner';
import { Demo } from './demo';

export type BannerDesign = 'default' | 'branded' | 'custom';

/** One root for each router, with a shared gallery and client-only scripts. */
export const Consent = ({
	state,
	children,
	experiment: experimentEnabled = false,
	experimentVariant,
}: {
	state: ConsentRootProps['state'];
	children: ReactNode;
	/** Run the banner-shape experiment. */
	experiment?: boolean;
	/** The arm the server resolved; omit it for built-in assignment. */
	experimentVariant?: ExperimentArm;
}) => {
	const [design, setDesign] = useState<BannerDesign>('default');
	const [showTrigger, setShowTrigger] = useState(false);
	const [experimentEvents, setExperimentEvents] = useState<
		ExperimentReportEvent[]
	>([]);
	const report = useCallback((event: ExperimentReportEvent) => {
		setExperimentEvents((previous) => [...previous, event]);
	}, []);
	const experiment = useMemo(
		() =>
			experimentEnabled
				? bannerExperiment(experimentVariant, report)
				: undefined,
		[experimentEnabled, experimentVariant, report]
	);

	return (
		<ConsentRoot
			state={state}
			config={consentConfig}
			scripts={scripts}
			persistence={false}
			options={{
				experiment,
				theme: design === 'default' ? undefined : brandTheme,
			}}
		>
			<Demo
				design={design}
				onDesignChange={setDesign}
				showTrigger={showTrigger}
				onTriggerChange={setShowTrigger}
				experimentEvents={experiment ? experimentEvents : null}
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

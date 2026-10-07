'use client';

import { ConsentBanner, ConsentDialog, ConsentRoot, offline } from 'c15t/next';
import type { ReactNode } from 'react';

import { callbacks } from '@/lib/consent-callbacks';
import { brandTheme } from '@/lib/consent-theme';
import { bannerArmFromFlag, bannerExperiment } from '@/lib/experiment';

// Runs without a backend: the policy ships with c15t and choices stay in
// this browser. In production, swap this line for your project's backend,
// which also counts impressions and choices per arm for you:
// const mode = hosted({ url: 'https://your-project.inth.app' });
const mode = offline();

export const Consent = ({ children }: { children: ReactNode }) => (
	<ConsentRoot
		state={{}}
		options={{
			callbacks,
			// What the banner asks about. In a real shop the analytics and ad
			// scripts you pass as `scripts` declare these for you.
			consentCategories: ['measurement', 'marketing'],
			// The flag's arm, or none so c15t picks one by `split` and keeps
			// it for this visitor.
			experiment: { ...bannerExperiment, arm: bannerArmFromFlag() },
			mode,
			theme: brandTheme,
		}}
	>
		{children}
		<ConsentBanner />
		<ConsentDialog />
	</ConsentRoot>
);

'use client';

import { ConsentBanner, ConsentDialog, ConsentRoot, offline } from 'c15t/next';
import type { ConsentProviderCallbacks } from 'c15t/next';
import type { ReactNode } from 'react';

import { track } from '@/lib/analytics';
import { brandTheme } from '@/lib/consent-theme';
import { bannerArmFromFlag, bannerExperiment } from '@/lib/experiment';

// Runs without a backend: the policy ships with c15t and choices stay in
// this browser. In production, swap this line for your project's backend,
// which also counts impressions and choices per arm for you:
// const mode = hosted({ url: 'https://your-project.inth.app' });
const mode = offline();

// Report each banner impression and each choice with the arm it ran under.
// `experiment` is undefined for a visitor outside the test, such as a
// returning visitor who opens Privacy settings from the footer.
const callbacks = {
	onChoiceRecorded: ({
		consentAction,
		experiment,
		timeToDecisionMs,
		uiSource,
	}) => {
		if (!experiment) {
			return;
		}
		track('consent_choice_made', {
			arm: experiment.arm,
			assigned_by: experiment.assignedBy,
			consent_action: consentAction,
			experiment_id: experiment.id,
			surface: uiSource,
			time_to_decision_ms: timeToDecisionMs,
		});
	},
	onSurfaceShown: ({ experiment, surface }) => {
		if (!experiment) {
			return;
		}
		track('consent_banner_shown', {
			arm: experiment.arm,
			assigned_by: experiment.assignedBy,
			experiment_id: experiment.id,
			surface,
		});
	},
} satisfies ConsentProviderCallbacks;

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

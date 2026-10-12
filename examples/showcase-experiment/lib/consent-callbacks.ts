import type { ConsentProviderCallbacks } from 'c15t/next';

import { track } from './analytics';

// Report each banner impression and each choice with the arm it ran under.
// `experiment` is undefined for a visitor outside the test, such as a
// returning visitor who opens Privacy settings from the footer.
export const callbacks = {
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
		if (!experiment || surface !== 'banner') {
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

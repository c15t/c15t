// #region docs:experiment-consent title="src/consent.tsx"
import { defineExperiment } from 'c15t';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentProvider,
	hosted,
} from 'c15t/react';
import type { ConsentProviderCallbacks } from 'c15t/react';
import type { ReactNode } from 'react';

import { scripts } from './scripts';

import 'c15t/react/styles.css';

const mode = hosted({ url: 'https://your-project.inth.app' });

// `control` is the stock banner. `wall` blocks the page until the visitor
// chooses.
const bannerExperiment = defineExperiment({
	arms: { wall: { prompt: { variant: 'wall' } } },
	id: 'banner-shape',
});

const pushToDataLayer = (event: Record<string, unknown>) => {
	const page = window as Window & { dataLayer?: unknown[] };
	page.dataLayer ??= [];
	page.dataLayer.push(event);
};

// Forward each impression and choice made under an arm to your analytics.
const callbacks = {
	onChoiceRecorded: ({ consentAction, experiment }) => {
		if (experiment) {
			pushToDataLayer({
				arm: experiment.arm,
				consent_action: consentAction,
				event: 'c15t_choice_recorded',
				experiment_id: experiment.id,
			});
		}
	},
	onSurfaceShown: ({ experiment, surface }) => {
		if (experiment) {
			pushToDataLayer({
				arm: experiment.arm,
				event: 'c15t_surface_shown',
				experiment_id: experiment.id,
				surface,
			});
		}
	},
} satisfies ConsentProviderCallbacks;

export const Consent = ({
	arm,
	children,
}: {
	/**
	 * The arm your flag provider resolved. Omit it to let c15t pick, or pass
	 * `off` to leave this visitor out of the experiment.
	 */
	arm?: 'control' | 'wall' | 'off';
	children: ReactNode;
}) => (
	<ConsentProvider
		options={{
			callbacks,
			experiment: arm === 'off' ? undefined : { ...bannerExperiment, arm },
			mode,
			scripts,
		}}
	>
		{children}
		<ConsentBanner />
		<ConsentDialog />
		<footer>
			<ConsentDialogLink>Privacy settings</ConsentDialogLink>
		</footer>
	</ConsentProvider>
);
// #endregion docs:experiment-consent

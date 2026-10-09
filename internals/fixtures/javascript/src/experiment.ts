/**
 * Demo only: the `/experiment/` page. `main.ts` with the banner-shape
 * experiment: `control` is the default banner and `wall` blocks the page
 * until the visitor chooses. c15t picks the arm; `?arm=wall` sets it the
 * way a flag provider would.
 */
import { hosted, init } from '@c15t/browser';
import type {
	ConsentExperiment,
	OnChoiceRecordedPayload,
	OnSurfaceShownPayload,
} from 'c15t';

import { scripts } from './scripts';
import { testBackend } from './test-backend';

const element = function element<Kind extends HTMLElement>(
	selector: string
): Kind {
	const node = document.querySelector<Kind>(selector);
	if (!node) {
		throw new Error(`Missing ${selector}`);
	}
	return node;
};
const armReadout = element<HTMLElement>('#experiment-arm');
const eventLog = element<HTMLElement>('#experiment-events');

const bannerExperiment: ConsentExperiment<'wall'> = {
	arms: { wall: { prompt: { variant: 'wall' } } },
	id: 'banner-shape',
};
// `arm` comes from your flag provider. Omit it to let c15t pick.
const arm = new URLSearchParams(location.search).get('arm');
const experiment: ConsentExperiment<'wall'> =
	arm === null
		? bannerExperiment
		: { ...bannerExperiment, arm: arm === 'wall' ? 'wall' : 'control' };

const pushToDataLayer = function pushToDataLayer(
	event: Record<string, unknown>
): void {
	const page = window as Window & { dataLayer?: unknown[] };
	page.dataLayer ??= [];
	page.dataLayer.push(event);
};

// Impressions and choices made under the arm go to the in-page log and to
// `window.dataLayer` for GTM.
const logExperimentEvent = function logExperimentEvent(text: string): void {
	const item = document.createElement('li');
	item.textContent = text;
	eventLog.append(item);
};

const consent = init({
	callbacks: {
		onChoiceRecorded: (payload: OnChoiceRecordedPayload) => {
			if (!payload.experiment) {
				return;
			}
			pushToDataLayer({
				arm: payload.experiment.arm,
				consent_action: payload.consentAction,
				event: 'c15t_choice_recorded',
				experiment_id: payload.experiment.id,
			});
			logExperimentEvent(
				`c15t_choice_recorded · ${payload.experiment.arm} · ${payload.consentAction}`
			);
		},
		onSurfaceShown: (payload: OnSurfaceShownPayload) => {
			if (!payload.experiment) {
				return;
			}
			pushToDataLayer({
				arm: payload.experiment.arm,
				event: 'c15t_surface_shown',
				experiment_id: payload.experiment.id,
				surface: payload.surface,
			});
			logExperimentEvent(
				`c15t_surface_shown · ${payload.experiment.arm} · ${payload.surface}`
			);
		},
	},
	experiment,
	mode: hosted({
		backendURL: 'https://your-project.inth.app',
		...testBackend('backendURL'),
	}),
	scripts,
});

const renderArm = function renderArm(): void {
	const assignment = consent.kernel.getSnapshot().experiment;
	armReadout.textContent = assignment
		? `${assignment.id} · ${assignment.arm} · ${assignment.assignedBy}`
		: 'assigning…';
};
renderArm();
consent.kernel.subscribe(renderArm);

document
	.querySelector('#privacy-settings')
	?.addEventListener('click', () => consent.openDialog());

if (import.meta.env.DEV) {
	const { mountDevTools } = await import('@c15t/browser/devtools');
	mountDevTools(consent, { defaultTab: 'scripts' });
}

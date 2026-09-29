import { createDevTools } from '@c15t/dev-tools';
import {
	applyExperimentAssignment,
	assignExperimentVariant,
	createConsentKernel,
	createExperimentReporting,
	createHostedTransport,
	resolveConsentPresentation,
} from 'c15t';
import type {
	ConsentExperiment,
	ConsentSnapshot,
	ConsentState,
	PresentationAction,
} from 'c15t';
import { createPersistence } from 'c15t/modules/persistence';
import { createScriptLoader } from 'c15t/modules/script-loader';

import { scripts } from './scripts';

import './style.css';

const backendURL = import.meta.env.VITE_C15T_BACKEND_URL;
if (!backendURL) {
	throw new Error('Set VITE_C15T_BACKEND_URL to your Inth endpoint');
}
const kernel = createConsentKernel({
	transport: createHostedTransport({ backendURL }),
});
const persistence = createPersistence({ kernel });
const loader = createScriptLoader({ kernel, scripts });
const devtools = createDevTools({ kernel });

// The raw kernel has no `experiment` option; the runtime adapters build it
// from these same helpers. `?experiment=1` picks the arm here, `&arm=wall`
// forces it the way a flag provider would.
const search = new URLSearchParams(location.search);
const arm = search.get('arm');
const experiment: ConsentExperiment | undefined =
	search.get('experiment') === '1'
		? {
				id: 'banner-shape',
				variant: arm === 'wall' || arm === 'floating' ? arm : undefined,
				variants: {
					floating: {},
					wall: { prompt: { variant: 'wall' } },
				},
			}
		: undefined;
const experimentKey = function experimentKey(): string {
	const stored = localStorage.getItem('example-experiment-key');
	if (stored) {
		return stored;
	}
	const key = crypto.randomUUID();
	localStorage.setItem('example-experiment-key', key);
	return key;
};
// Recorded on the kernel so `surface:shown`, `choice:recorded` and
// `notice:dismissed` carry it.
const assignment = experiment
	? assignExperimentVariant(experiment, experimentKey())
	: null;
kernel.set.experiment(assignment);
const presentation = applyExperimentAssignment(
	undefined,
	experiment,
	assignment
);

const element = function element<Kind extends HTMLElement>(
	selector: string
): Kind {
	const node = document.querySelector<Kind>(selector);
	if (!node) {
		throw new Error(`Missing ${selector}`);
	}
	return node;
};
const page = element<HTMLElement>('main');
const backdrop = element<HTMLElement>('#consent-backdrop');
const prompt = element<HTMLElement>('#consent-prompt');
const dialog = element<HTMLDialogElement>('#preferences');
const fields = element<HTMLElement>('#categories');
const video = element<HTMLElement>('#video');
const placeholder = element<HTMLElement>('#video-placeholder');
const status = element<HTMLElement>('#consent-status');
const actions = element<HTMLElement>('#prompt-actions');
const preferencesActions = element<HTMLElement>('#preferences-actions');
const experimentPanel = element<HTMLElement>('#experiment');
const experimentEvents = element<HTMLElement>('#experiment-events');
if (assignment) {
	experimentPanel.hidden = false;
	element<HTMLElement>('#experiment-arm').textContent =
		`${assignment.id} · ${assignment.variant} · ${assignment.assignedBy}`;
}
// Impressions and choices go to `window.dataLayer` and the in-page log.
const stopReporting = createExperimentReporting({
	kernel,
	reportTo: assignment
		? [
				'dataLayer',
				(event) => {
					const item = document.createElement('li');
					const action =
						event.name === 'c15t_choice_recorded'
							? ` · ${event.consentAction}`
							: '';
					const timing =
						event.name !== 'c15t_surface_shown' &&
						event.timeToDecisionMs !== undefined
							? ` · ${event.timeToDecisionMs} ms`
							: '';
					item.textContent =
						`${event.name} · ${event.variant} · ${event.surface}` +
						`${action}${timing}`;
					experimentEvents.append(item);
				},
			]
		: undefined,
});
const label: Record<PresentationAction, string> = {
	accept: 'Accept all',
	customize: 'Choose cookies',
	dismiss: 'OK',
	reject: 'Reject optional',
	save: 'Save preferences',
};
let latest = kernel.getSnapshot();

const perform = async function perform(action: PresentationAction) {
	if (action === 'customize') {
		kernel.set.activeUI('dialog');
	} else if (action === 'dismiss') {
		await kernel.commands.dismissNotice();
	} else {
		let choice: Partial<ConsentState> | 'all' | 'none' =
			action === 'accept' ? 'all' : 'none';
		if (action === 'save') {
			choice = {};
			for (const input of fields.querySelectorAll<HTMLInputElement>('input')) {
				const category = latest.policyRule.scope.find(
					(name) => name === input.name
				);
				if (category) {
					choice[category] = input.checked;
				}
			}
		}
		kernel.set.activeUI('none');
		const result = await kernel.commands.save(choice);
		status.textContent = result.ok
			? 'Your preferences are saved.'
			: 'Saved in this browser. Backend delivery will retry.';
	}
};

const renderActions = function renderActions(
	container: HTMLElement,
	surface: 'prompt' | 'preferences',
	snapshot: ConsentSnapshot
) {
	const resolved = resolveConsentPresentation({
		policy: snapshot.policyRule,
		presentation,
		surface,
	});
	if (surface === 'prompt') {
		prompt.dataset.variant = resolved.variant;
	}
	const buttons = resolved.orderedActions.map((action) => {
		const button = document.createElement('button');
		button.type = 'button';
		button.textContent = label[action];
		button.addEventListener('click', () => {
			void perform(action);
		});
		return button;
	});
	if (surface === 'prompt') {
		for (const right of resolved.rights) {
			const button = document.createElement('button');
			button.type = 'button';
			button.textContent =
				right === 'opt-out'
					? 'Do not sell or share my data'
					: 'Privacy settings';
			button.addEventListener('click', () => kernel.set.activeUI('dialog'));
			buttons.push(button);
		}
	}
	container.replaceChildren(...buttons);
};

/**
 * The `wall` arm blocks the page: a backdrop covers it, the content behind
 * is inert to pointer, keyboard and assistive technology, and focus moves
 * into the prompt when it opens.
 */
let walled = false;
const renderWall = function renderWall() {
	const wall = !prompt.hidden && prompt.dataset.variant === 'wall';
	backdrop.hidden = !wall;
	page.inert = wall;
	if (wall) {
		prompt.setAttribute('role', 'dialog');
		prompt.setAttribute('aria-modal', 'true');
	} else {
		prompt.removeAttribute('role');
		prompt.removeAttribute('aria-modal');
	}
	if (wall && !walled) {
		prompt.querySelector<HTMLButtonElement>('button')?.focus();
	}
	walled = wall;
};

const render = function render(snapshot: ConsentSnapshot) {
	latest = snapshot;
	const ready =
		!snapshot.policyPending && snapshot.resolution.status === 'matched';
	prompt.hidden = !ready || snapshot.activeUI !== 'banner';
	renderActions(actions, 'prompt', snapshot);
	renderActions(preferencesActions, 'preferences', snapshot);
	renderWall();
	element<HTMLElement>('#prompt-title').textContent =
		snapshot.promptRequirement.kind === 'notice'
			? 'Your privacy choices'
			: 'Choose your cookies';
	const dialogOpen = ready && snapshot.activeUI === 'dialog';
	if (dialogOpen && !dialog.open) {
		fields.replaceChildren(
			...snapshot.policyRule.scope.map((category) => {
				const row = document.createElement('label');
				const input = document.createElement('input');
				input.type = 'checkbox';
				input.name = category;
				input.checked = snapshot.effectivePermissions[category] ?? false;
				row.append(input, ` ${category[0]?.toUpperCase()}${category.slice(1)}`);
				return row;
			})
		);
		dialog.showModal();
	} else if (!dialogOpen && dialog.open) {
		dialog.close();
	}
	const allowed = ready && snapshot.effectivePermissions.measurement;
	placeholder.hidden = Boolean(allowed);
	if (allowed && !video.querySelector('iframe')) {
		const frame = document.createElement('iframe');
		frame.title = 'YouTube video';
		frame.src =
			'https://www.youtube-nocookie.com/embed/czTksCF6X8Y?playsinline=1';
		frame.allow = 'encrypted-media; picture-in-picture';
		frame.allowFullscreen = true;
		video.append(frame);
	} else if (!allowed) {
		video.querySelector('iframe')?.remove();
	}
	element<HTMLElement>('#posthog-status').textContent = snapshot
		.effectivePermissions.measurement
		? 'measurement allowed'
		: 'waiting for measurement';
	element<HTMLElement>('#x-status').textContent = snapshot.effectivePermissions
		.marketing
		? 'marketing allowed'
		: 'waiting for marketing';
};

for (const trigger of document.querySelectorAll<HTMLButtonElement>(
	'[data-open-preferences]'
)) {
	trigger.addEventListener('click', () => kernel.set.activeUI('dialog'));
}
dialog.addEventListener('cancel', () => kernel.set.activeUI('none'));
element<HTMLButtonElement>('#close-preferences').addEventListener('click', () =>
	kernel.set.activeUI('none')
);
document.documentElement.dataset.design =
	new URLSearchParams(location.search).get('design') ?? 'default';
const unsubscribe = kernel.subscribe(render);
render(kernel.getSnapshot());
try {
	await kernel.commands.init();
} catch {
	status.textContent =
		'Consent could not load. Check the backend endpoint and allowed origin.';
}
window.addEventListener('pagehide', (event) => {
	// Cached documents resume with the same runtime when Back restores them.
	if (event.persisted) {
		return;
	}
	unsubscribe();
	stopReporting();
	devtools.destroy();
	loader.dispose();
	persistence.dispose();
	kernel.dispose();
});

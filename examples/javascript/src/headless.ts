import { resolveConsentPresentation } from 'c15t';
import type { ConsentSnapshot, ConsentState, PresentationAction } from 'c15t';

import { runtime } from './consent-runtime';

const { kernel } = runtime;

const element = function element<Kind extends HTMLElement>(
	selector: string
): Kind {
	const node = document.querySelector<Kind>(selector);
	if (!node) {
		throw new Error(`Missing ${selector}`);
	}
	return node;
};
const prompt = element<HTMLElement>('#consent-prompt');
const dialog = element<HTMLDialogElement>('#preferences');
const fields = element<HTMLElement>('#categories');
const video = element<HTMLElement>('#video');
const placeholder = element<HTMLElement>('#video-placeholder');
const status = element<HTMLElement>('#consent-status');
const actions = element<HTMLElement>('#prompt-actions');
const preferencesActions = element<HTMLElement>('#preferences-actions');
let latest = kernel.getSnapshot();

// #region docs:actions title="src/consent-ui.ts"
const label: Record<PresentationAction, string> = {
	accept: 'Accept all',
	customize: 'Choose cookies',
	dismiss: 'OK',
	reject: 'Reject optional',
	save: 'Save preferences',
};

// Each button is a visitor action. Only these calls record a choice.
const perform = async function perform(action: PresentationAction) {
	if (action === 'customize') {
		kernel.set.activeUI('dialog');
		return;
	}
	if (action === 'dismiss') {
		await kernel.commands.dismissNotice();
		return;
	}
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
};

// The policy decides which actions each surface offers, and in what order.
const renderActions = function renderActions(
	container: HTMLElement,
	surface: 'prompt' | 'preferences',
	snapshot: ConsentSnapshot
) {
	const presentation = resolveConsentPresentation({
		policy: snapshot.policyRule,
		surface,
	});
	const buttons = presentation.orderedActions.map((action) => {
		const button = document.createElement('button');
		button.type = 'button';
		button.textContent = label[action];
		button.addEventListener('click', () => {
			void perform(action);
		});
		return button;
	});
	if (surface === 'prompt') {
		for (const right of presentation.rights) {
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
// #endregion docs:actions

const render = function render(snapshot: ConsentSnapshot) {
	latest = snapshot;
	const ready =
		!snapshot.policyPending && snapshot.resolution.status === 'matched';
	prompt.hidden = !ready || snapshot.activeUI !== 'banner';
	renderActions(actions, 'prompt', snapshot);
	renderActions(preferencesActions, 'preferences', snapshot);
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

// #region docs:lifecycle title="src/consent-ui.ts"
const unsubscribe = kernel.subscribe(render);
const stopErrors = kernel.events.on('command:error', ({ command }) => {
	if (command === 'init') {
		status.textContent =
			'Consent could not load. Check the backend endpoint and allowed origin.';
	}
});
render(kernel.getSnapshot());
// Reads stored choices, resolves the policy and starts script loading.
runtime.start();

window.addEventListener('pagehide', (event) => {
	// Back and Forward restore a cached page with the same runtime.
	if (event.persisted) {
		return;
	}
	unsubscribe();
	stopErrors();
	runtime.dispose();
});
// #endregion docs:lifecycle

// #region docs:runtime-devtools title="src/consent-ui.ts"
if (import.meta.env.DEV) {
	const { createDevTools } = await import('@c15t/dev-tools');
	const tools = createDevTools({ kernel });
	import.meta.hot?.dispose(() => tools.destroy());
}
// #endregion docs:runtime-devtools

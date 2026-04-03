/**
 * Vanilla JS consent dialog with category toggles.
 *
 * Renders as a modal overlay with:
 * - Header (title + description)
 * - Category accordion with switches
 * - Footer buttons (policy-driven layout)
 */

import type { ConsentRuntimeResult } from 'c15t';
import {
	resolvePolicyActionGroups,
	resolvePolicyAllowedActions,
	resolvePolicyPrimaryActions,
} from 'c15t';
import { createAccordion } from './accordion';
import { createSwitch } from './switch';

type ConsentStore = ConsentRuntimeResult['consentStore'];

export interface DialogTranslations {
	title: string;
	description: string;
	acceptAll: string;
	rejectAll: string;
	save: string;
}

const DEFAULT_TRANSLATIONS: DialogTranslations = {
	title: 'Privacy Settings',
	description:
		'Customize your privacy settings here. You can choose which types of cookies and tracking technologies you allow.',
	acceptAll: 'Accept All',
	rejectAll: 'Reject All',
	save: 'Save Settings',
};

/**
 * Creates the consent dialog DOM and returns the root element + control functions.
 */
export function createDialog(store: ConsentStore): {
	element: HTMLElement;
	destroy: () => void;
} {
	const state = store.getState();
	const translations = extractDialogTranslations(state);
	const t = { ...DEFAULT_TRANSLATIONS, ...translations };

	// Initialize selectedConsents to current saved state
	const categories = state.consentTypes ?? [];
	for (const cat of categories) {
		state.setSelectedConsent(
			cat.name as Parameters<typeof state.setSelectedConsent>[0],
			state.consents[cat.name as keyof typeof state.consents] ?? false
		);
	}

	// ─── Overlay ──────────────────────────────────────────────────────────
	const overlay = document.createElement('div');
	overlay.setAttribute(
		'style',
		`
		position: fixed; inset: 0; z-index: 10000;
		background: var(--c15t-overlay, rgba(0,0,0,0.5));
		animation: c15t-fade-in var(--c15t-duration-fast, 150ms);
	`
			.replace(/\s+/g, ' ')
			.trim()
	);

	// ─── Dialog card ──────────────────────────────────────────────────────
	const card = document.createElement('div');
	card.setAttribute('role', 'dialog');
	card.setAttribute('aria-modal', 'true');
	card.setAttribute('aria-label', t.title);
	card.setAttribute(
		'style',
		`
		position: fixed; top: 50%; left: 50%;
		transform: translate(-50%, -50%);
		z-index: 10001;
		width: calc(100% - 2rem); max-width: 520px; max-height: calc(100vh - 4rem);
		background: var(--c15t-surface, #fff);
		border: 1px solid var(--c15t-border, #e5e5e5);
		border-radius: var(--c15t-radius-xl, 1rem);
		box-shadow: var(--c15t-shadow-lg);
		font-family: var(--c15t-font-family, system-ui, -apple-system, sans-serif);
		font-size: var(--c15t-font-size-sm, 0.875rem);
		color: var(--c15t-text, #1a1a1a);
		display: flex; flex-direction: column;
		overflow: hidden;
		animation: c15t-scale-in var(--c15t-duration-normal, 250ms) var(--c15t-easing, ease);
	`
			.replace(/\s+/g, ' ')
			.trim()
	);

	// ─── Header ───────────────────────────────────────────────────────────
	const header = document.createElement('div');
	header.setAttribute(
		'style',
		'padding: var(--c15t-space-lg, 1.5rem); padding-bottom: var(--c15t-space-sm, 0.5rem);'
	);

	const title = document.createElement('h2');
	title.textContent = t.title;
	title.setAttribute(
		'style',
		`
		margin: 0 0 var(--c15t-space-sm, 0.5rem) 0;
		font-size: var(--c15t-font-size-base, 1rem);
		font-weight: var(--c15t-font-weight-semibold, 600);
		line-height: var(--c15t-line-height-tight, 1.25);
	`
			.replace(/\s+/g, ' ')
			.trim()
	);

	const desc = document.createElement('p');
	desc.textContent = t.description;
	desc.setAttribute('style', 'margin: 0; color: var(--c15t-text-muted, #666);');

	header.append(title, desc);

	// ─── Content (accordion) ──────────────────────────────────────────────
	const content = document.createElement('div');
	content.setAttribute(
		'style',
		`
		flex: 1; overflow-y: auto;
		padding: 0 var(--c15t-space-lg, 1.5rem);
		border-top: 1px solid var(--c15t-border, #e5e5e5);
		border-bottom: 1px solid var(--c15t-border, #e5e5e5);
	`
			.replace(/\s+/g, ' ')
			.trim()
	);

	const accordion = createAccordion({ multiple: true });

	for (const cat of categories) {
		const itemEl = document.createElement('div');
		itemEl.setAttribute(
			'style',
			'border-bottom: 1px solid var(--c15t-border, #e5e5e5);'
		);

		// Trigger row
		const trigger = document.createElement('div');
		trigger.setAttribute(
			'style',
			`
			display: flex; align-items: center; gap: var(--c15t-space-sm, 0.5rem);
			padding: var(--c15t-space-md, 1rem) 0;
			cursor: pointer; user-select: none;
		`
				.replace(/\s+/g, ' ')
				.trim()
		);

		const arrow = document.createElement('span');
		arrow.setAttribute('data-accordion-arrow', '');
		arrow.textContent = '+';
		arrow.setAttribute(
			'style',
			`
			width: 1.25rem; height: 1.25rem;
			display: flex; align-items: center; justify-content: center;
			font-size: 1rem; font-weight: bold;
			color: var(--c15t-text-muted, #666);
			flex-shrink: 0;
		`
				.replace(/\s+/g, ' ')
				.trim()
		);

		const label = document.createElement('span');
		label.textContent = cat.title ?? cat.name;
		label.setAttribute(
			'style',
			`
			flex: 1; font-weight: var(--c15t-font-weight-medium, 500);
		`
				.replace(/\s+/g, ' ')
				.trim()
		);

		const isNecessary = cat.name === 'necessary';
		const switchEl = createSwitch({
			checked:
				state.selectedConsents[
					cat.name as keyof typeof state.selectedConsents
				] ?? isNecessary,
			disabled: isNecessary || cat.disabled,
			onChange: (checked) => {
				state.setSelectedConsent(
					cat.name as Parameters<typeof state.setSelectedConsent>[0],
					checked
				);
			},
		});

		trigger.append(arrow, label, switchEl);

		// Content panel
		const panel = document.createElement('div');
		panel.setAttribute(
			'style',
			'padding: 0 0 var(--c15t-space-md, 1rem) 1.75rem; color: var(--c15t-text-muted, #666);'
		);
		panel.textContent = cat.description ?? '';

		itemEl.append(trigger, panel);
		content.appendChild(itemEl);

		accordion.addItem({
			id: cat.name,
			trigger,
			content: panel,
		});
	}

	// ─── Footer (buttons) ─────────────────────────────────────────────────
	const footer = document.createElement('div');
	footer.setAttribute(
		'style',
		`
		display: flex; flex-wrap: wrap; gap: var(--c15t-space-sm, 0.5rem);
		padding: var(--c15t-space-md, 1rem) var(--c15t-space-lg, 1.5rem);
		background: var(--c15t-surface-hover, #fafafa);
	`
			.replace(/\s+/g, ' ')
			.trim()
	);

	// Resolve policy-driven button layout
	const policyDialog = state.policyDialog;
	const allowedActions = resolvePolicyAllowedActions({
		allowedActions: policyDialog?.allowedActions,
	});
	const actionGroups = resolvePolicyActionGroups({
		allowedActions,
		layout: policyDialog?.layout,
	});
	const primaryActions = resolvePolicyPrimaryActions({
		orderedActions: allowedActions,
		primaryActions: policyDialog?.primaryActions,
	});

	const actionLabels: Record<string, string> = {
		accept: t.acceptAll,
		reject: t.rejectAll,
		customize: t.save,
	};

	for (const group of actionGroups) {
		const groupEl = document.createElement('div');
		groupEl.setAttribute(
			'style',
			'display: flex; gap: var(--c15t-space-sm, 0.5rem); flex: 1;'
		);

		for (const action of group) {
			const isPrimary = primaryActions.includes(action);
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.textContent = actionLabels[action] ?? action;
			btn.setAttribute(
				'style',
				`
				flex: 1;
				padding: var(--c15t-space-sm, 0.5rem) var(--c15t-space-md, 1rem);
				border-radius: var(--c15t-radius-sm, 0.375rem);
				font-family: inherit;
				font-size: var(--c15t-font-size-sm, 0.875rem);
				font-weight: var(--c15t-font-weight-medium, 500);
				cursor: pointer;
				line-height: var(--c15t-line-height-tight, 1.25);
				transition: opacity var(--c15t-duration-fast, 150ms);
				${
					isPrimary
						? 'background: var(--c15t-primary, #4361ee); color: var(--c15t-text-on-primary, #fff); border: none;'
						: 'background: var(--c15t-surface, #fff); color: var(--c15t-text, #1a1a1a); border: 1px solid var(--c15t-border, #e5e5e5);'
				}
			`
					.replace(/\s+/g, ' ')
					.trim()
			);

			btn.addEventListener('click', () => {
				if (action === 'accept') {
					store.getState().saveConsents('all');
				} else if (action === 'reject') {
					store.getState().saveConsents('necessary');
				} else if (action === 'customize') {
					store.getState().saveConsents('custom');
				}
			});

			groupEl.appendChild(btn);
		}

		footer.appendChild(groupEl);
	}

	// ─── Assemble ─────────────────────────────────────────────────────────
	card.append(header, content, footer);

	const root = document.createElement('div');
	root.id = 'c15t-dialog-root';
	root.append(overlay, card);

	// Close on overlay click
	overlay.addEventListener('click', () => {
		store.getState().setActiveUI('none');
	});

	// Close on Escape
	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			store.getState().setActiveUI('none');
		}
	};
	document.addEventListener('keydown', onKeyDown);

	// Scroll lock
	const originalOverflow = document.body.style.overflow;
	document.body.style.overflow = 'hidden';

	// Focus trap: focus the card
	requestAnimationFrame(() => {
		const firstButton = card.querySelector('button');
		if (firstButton) firstButton.focus();
	});

	// Inject dialog animations
	injectDialogAnimations();

	function destroy() {
		document.removeEventListener('keydown', onKeyDown);
		document.body.style.overflow = originalOverflow;
		root.remove();
	}

	return { element: root, destroy };
}

function extractDialogTranslations(
	state: ReturnType<ConsentRuntimeResult['consentStore']['getState']>
) {
	const t = state.translationConfig;
	if (!t?.translations) return undefined;

	const translations = t.translations as Record<
		string,
		Record<string, string> | undefined
	>;
	return {
		title: translations.consentManagerDialog?.title,
		description: translations.consentManagerDialog?.description,
		acceptAll: translations.common?.acceptAll,
		rejectAll: translations.common?.rejectAll,
		save: translations.common?.save,
	};
}

let dialogAnimationsInjected = false;
function injectDialogAnimations() {
	if (dialogAnimationsInjected) return;
	dialogAnimationsInjected = true;

	const style = document.createElement('style');
	style.textContent = `
@keyframes c15t-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes c15t-fade-out-dialog {
  from { opacity: 1; }
  to { opacity: 0; }
}
@keyframes c15t-scale-in {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
	`.trim();
	document.head.appendChild(style);
}

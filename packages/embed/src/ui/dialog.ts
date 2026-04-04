/**
 * Vanilla JS consent dialog matching the React ConsentDialog 1:1.
 *
 * Uses the same CSS class names and DOM structure as the React component,
 * with the CSS from @c15t/ui inlined as a <style> tag.
 */

import type { ConsentRuntimeResult } from 'c15t';
import {
	resolvePolicyActionGroups,
	resolvePolicyAllowedActions,
	resolvePolicyPrimaryActions,
} from 'c15t';

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
 * Creates the consent dialog DOM matching the React ConsentDialog structure.
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

	// Inject CSS
	injectDialogCSS();

	// Track open accordion items
	const openItems = new Set<string>();

	// ─── Root dialog ──────────────────────────────────────────────────────
	const root = document.createElement('dialog');
	root.className = 'c15t-dialog-root c15t-dialogVisible';
	root.setAttribute('aria-labelledby', 'consent-dialog-title');
	root.tabIndex = -1;
	root.dir = 'ltr';
	root.dataset.testid = 'consent-dialog-root';
	root.setAttribute('open', '');

	// ─── Overlay ──────────────────────────────────────────────────────────
	const overlay = document.createElement('div');
	overlay.className = 'c15t-dialog-overlay c15t-overlayVisible';

	// ─── Container ────────────────────────────────────────────────────────
	const container = document.createElement('div');
	container.className = 'c15t-dialog-container c15t-contentVisible';

	// ─── Card ─────────────────────────────────────────────────────────────
	const card = document.createElement('div');
	card.className = 'c15t-dialog-card';
	card.dataset.testid = 'consent-dialog-card';

	// ─── Header ───────────────────────────────────────────────────────────
	const header = document.createElement('div');
	header.className = 'c15t-dialog-header';
	header.dataset.testid = 'consent-dialog-header';

	const title = document.createElement('div');
	title.className = 'c15t-dialog-title';
	title.id = 'consent-dialog-title';
	title.dataset.testid = 'consent-dialog-title';
	title.textContent = t.title;

	const desc = document.createElement('div');
	desc.className = 'c15t-dialog-description';
	desc.dataset.testid = 'consent-dialog-description';
	desc.textContent = t.description;

	header.append(title, desc);

	// ─── Content (accordion) ──────────────────────────────────────────────
	const content = document.createElement('div');
	content.className = 'c15t-dialog-content';
	content.dataset.testid = 'consent-dialog-content';

	const widget = document.createElement('div');
	widget.className = 'c15t-widget';

	const accordionList = document.createElement('div');
	accordionList.className = 'c15t-accordionList';

	for (const cat of categories) {
		const isNecessary = cat.name === 'necessary';
		const isOpen = openItems.has(cat.name);

		// Accordion item
		const item = document.createElement('div');
		item.className = 'c15t-accordionItem';
		item.dataset.testid = `consent-widget-accordion-item-${cat.name}`;
		item.dataset.state = isOpen ? 'open' : 'closed';

		// Trigger wrapper (grid: 1fr auto)
		const trigger = document.createElement('div');
		trigger.className = 'c15t-accordionTrigger';
		trigger.dataset.testid = `consent-widget-accordion-trigger-${cat.name}`;

		// Trigger inner (button)
		const triggerInner = document.createElement('button');
		triggerInner.type = 'button';
		triggerInner.className = 'c15t-accordionTriggerInner';
		triggerInner.dataset.testid = `consent-widget-accordion-trigger-inner-${cat.name}`;
		triggerInner.setAttribute('aria-expanded', String(isOpen));

		// Arrow
		const arrow = document.createElement('div');
		arrow.className = 'c15t-accordionArrow';
		arrow.dataset.testid = `consent-widget-accordion-arrow-${cat.name}`;
		arrow.innerHTML =
			'<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

		// Title
		const headerEl = document.createElement('header');
		const titleH3 = document.createElement('h3');
		titleH3.className = 'c15t-accordionTitle';
		titleH3.textContent = cat.title ?? cat.name;
		headerEl.appendChild(titleH3);

		triggerInner.append(arrow, headerEl);

		// Switch
		const switchContainer = document.createElement('div');
		switchContainer.className = 'c15t-switch';
		switchContainer.dataset.slot = 'preference-item-control';

		const switchBtn = document.createElement('button');
		switchBtn.type = 'button';
		switchBtn.setAttribute('role', 'switch');
		const isChecked =
			state.selectedConsents[cat.name as keyof typeof state.selectedConsents] ??
			isNecessary;
		switchBtn.setAttribute('aria-checked', String(isChecked));
		switchBtn.className = `c15t-switch-root ${isChecked ? 'c15t-switch-checked' : ''}`;
		switchBtn.dataset.testid = `consent-widget-switch-${cat.name}`;
		switchBtn.disabled = isNecessary || (cat.disabled ?? false);

		const switchThumb = document.createElement('span');
		switchThumb.className = 'c15t-switch-thumb';
		switchBtn.appendChild(switchThumb);

		// Switch click handler
		switchBtn.addEventListener('click', () => {
			if (switchBtn.disabled) return;
			const newChecked = switchBtn.getAttribute('aria-checked') !== 'true';
			switchBtn.setAttribute('aria-checked', String(newChecked));
			switchBtn.classList.toggle('c15t-switch-checked', newChecked);
			state.setSelectedConsent(
				cat.name as Parameters<typeof state.setSelectedConsent>[0],
				newChecked
			);
		});

		switchContainer.appendChild(switchBtn);
		trigger.append(triggerInner, switchContainer);

		// Accordion content
		const accordionContent = document.createElement('div');
		accordionContent.className = 'c15t-accordionContent';
		accordionContent.dataset.testid = `consent-widget-accordion-content-${cat.name}`;
		accordionContent.dataset.state = isOpen ? 'open' : 'closed';

		const viewport = document.createElement('div');
		viewport.dataset.slot = 'preference-item-content-viewport';
		const descDiv = document.createElement('div');
		descDiv.textContent = cat.description ?? '';
		viewport.appendChild(descDiv);
		accordionContent.appendChild(viewport);

		// Set initial collapsed state
		if (!isOpen) {
			accordionContent.style.display = 'none';
			accordionContent.style.height = '0';
			accordionContent.style.overflow = 'hidden';
		}

		// Toggle accordion on trigger click
		triggerInner.addEventListener('click', () => {
			const wasOpen = openItems.has(cat.name);
			if (wasOpen) {
				openItems.delete(cat.name);
			} else {
				openItems.add(cat.name);
			}
			const nowOpen = openItems.has(cat.name);

			item.dataset.state = nowOpen ? 'open' : 'closed';
			accordionContent.dataset.state = nowOpen ? 'open' : 'closed';
			triggerInner.setAttribute('aria-expanded', String(nowOpen));

			if (nowOpen) {
				accordionContent.style.display = 'block';
				accordionContent.style.height = 'auto';
				accordionContent.style.overflow = 'visible';
			} else {
				accordionContent.style.display = 'none';
				accordionContent.style.height = '0';
				accordionContent.style.overflow = 'hidden';
			}
		});

		item.append(trigger, accordionContent);
		accordionList.appendChild(item);
	}

	widget.appendChild(accordionList);

	// ─── Widget footer (buttons) ──────────────────────────────────────────
	const widgetFooter = document.createElement('div');
	widgetFooter.className = 'c15t-widget-footer';

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
		groupEl.className = 'c15t-widget-footerGroup';

		for (const action of group) {
			const isPrimary = primaryActions.includes(action);
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.textContent = actionLabels[action] ?? action;
			btn.className = isPrimary
				? 'c15t-button c15t-button-small c15t-button-primary-filled'
				: 'c15t-button c15t-button-small c15t-button-neutral-stroke';

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

		widgetFooter.appendChild(groupEl);
	}

	widget.appendChild(widgetFooter);
	content.appendChild(widget);

	// ─── Dialog footer (branding) ─────────────────────────────────────────
	const dialogFooter = document.createElement('div');
	dialogFooter.className = 'c15t-dialog-footer';
	dialogFooter.dataset.testid = 'consent-dialog-footer';

	// ─── Assemble ─────────────────────────────────────────────────────────
	card.append(header, content, dialogFooter);
	container.appendChild(card);
	root.append(overlay, container);

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

	// Focus the first button in the dialog
	requestAnimationFrame(() => {
		const firstBtn = card.querySelector('button');
		if (firstBtn) firstBtn.focus();
	});

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

	const result: Record<string, string> = {};
	if (translations.consentManagerDialog?.title)
		result.title = translations.consentManagerDialog.title;
	if (translations.consentManagerDialog?.description)
		result.description = translations.consentManagerDialog.description;
	if (translations.common?.acceptAll)
		result.acceptAll = translations.common.acceptAll;
	if (translations.common?.rejectAll)
		result.rejectAll = translations.common.rejectAll;
	if (translations.common?.save) result.save = translations.common.save;

	return Object.keys(result).length > 0 ? result : undefined;
}

// ─── CSS injection ────────────────────────────────────────────────────────────

let dialogCSSInjected = false;

function injectDialogCSS(): void {
	if (dialogCSSInjected) return;
	dialogCSSInjected = true;

	const style = document.createElement('style');
	style.id = 'c15t-embed-dialog-css';
	style.textContent = DIALOG_CSS;
	document.head.appendChild(style);
}

/**
 * CSS matching @c15t/ui consent-dialog.module.css + consent-widget.module.css.
 */
const DIALOG_CSS = `
/* ── Dialog root ── */
.c15t-dialog-root {
  box-sizing: border-box;
  isolation: isolate;
  font-family: var(--c15t-font-family, system-ui, -apple-system, sans-serif);
  line-height: var(--c15t-line-height-tight, 1.25);
  -webkit-text-size-adjust: 100%;
  tab-size: 4;
  margin: 0;
  padding: 1rem;
  border: 0;
  background: none;
  position: fixed;
  inset: 0;
  z-index: 999999999;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: var(--c15t-radius-lg, 0.75rem);
  background-color: transparent;
  width: 100%;
  height: 100%;
}
@media (min-width: 640px) {
  .c15t-dialog-root { padding: 1.5rem; width: auto; }
}

.c15t-dialogVisible { opacity: 1; transition: opacity 200ms ease-out; }
.c15t-dialogHidden { opacity: 0; transition: opacity 200ms ease-out; }

/* ── Overlay ── */
.c15t-dialog-overlay {
  position: fixed;
  inset: 0;
  background-color: var(--c15t-overlay, rgba(0,0,0,0.5));
  z-index: 999999998;
}

/* ── Container ── */
.c15t-dialog-container {
  width: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
}
.c15t-contentVisible {
  opacity: 1;
  transform: scale(1);
  transition: opacity 200ms ease-out, transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.c15t-contentHidden {
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 200ms ease-out, transform 200ms ease-out;
}

/* ── Card ── */
.c15t-dialog-card {
  box-sizing: border-box;
  width: min(100%, 28rem);
  max-height: 100%;
  margin: 0 auto;
  border-radius: var(--c15t-radius-lg, 0.75rem);
  border: 1px solid var(--c15t-border, #e5e5e5);
  background-color: var(--c15t-surface, #fff);
  color: var(--c15t-text, #1a1a1a);
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ── */
.c15t-dialog-header {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  padding: 1.5rem;
  gap: 0.25rem;
}
.c15t-dialog-header > * + * { margin-top: 0.25rem; }

.c15t-dialog-title {
  font-weight: 600;
  font-size: var(--c15t-font-size-sm, 0.875rem);
  line-height: 1;
  letter-spacing: -0.025em;
}

.c15t-dialog-description {
  color: var(--c15t-text-muted, #666);
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
}

/* ── Content ── */
.c15t-dialog-content {
  padding: 1.5rem;
  padding-top: 0;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

/* ── Dialog footer ── */
.c15t-dialog-footer {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 14px;
  padding-top: 1rem;
  padding-bottom: 1rem;
  border-top: 1px solid var(--c15t-border, #e5e5e5);
}
.c15t-dialog-footer:empty { display: none; border-top: none; }

/* ── Widget ── */
.c15t-widget {
  font-family: var(--c15t-font-family, system-ui, -apple-system, sans-serif);
  line-height: 1.15;
  -webkit-font-smoothing: antialiased;
}

/* ── Accordion ── */
.c15t-accordionList {
  display: grid;
  gap: 0.75rem;
}

.c15t-accordionItem {
  border-radius: var(--c15t-radius-md, 0.5rem);
  border: 1px solid var(--c15t-border, #e5e5e5);
  background-color: var(--c15t-surface, #fff);
  padding: 0;
  position: relative;
  overflow: visible;
}

.c15t-accordionTrigger {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
  box-sizing: border-box;
  padding: 0.5rem;
  border-radius: var(--c15t-radius-md, 0.5rem);
  color: var(--c15t-text, #1a1a1a);
  background-color: transparent;
  transition: background-color 200ms var(--c15t-easing, ease);
}
.c15t-accordionTrigger:hover {
  background-color: var(--c15t-surface-hover, #fafafa);
}

.c15t-accordionTriggerInner {
  appearance: none;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex: 1 1 auto;
  align-self: stretch;
  min-width: 0;
  min-height: 1.5rem;
  font-size: var(--c15t-font-size-sm, 0.875rem);
  line-height: var(--c15t-line-height-tight, 1.25);
  position: relative;
  border-radius: var(--c15t-radius-md, 0.5rem);
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  text-align: left;
  color: inherit;
  cursor: pointer;
  font-family: inherit;
}
.c15t-accordionTriggerInner:focus-visible { outline: none; }
.c15t-accordionItem:has(.c15t-accordionTriggerInner:focus-visible) {
  outline: 2px solid var(--c15t-primary, hsl(228, 100%, 60%));
  outline-offset: -1px;
}

.c15t-accordionArrow {
  color: hsl(0, 0%, 64%);
  width: 1.25rem;
  height: 1.25rem;
  transition: transform 200ms var(--c15t-easing, ease);
  display: flex;
  align-items: center;
  justify-content: center;
}
.c15t-accordionItem[data-state="open"] .c15t-accordionArrow {
  transform: rotate(180deg);
}

.c15t-accordionTitle {
  margin: 0;
  font: inherit;
  font-weight: inherit;
  line-height: inherit;
  letter-spacing: inherit;
  color: inherit;
}

.c15t-accordionContent {
  padding: 0;
  color: hsl(0, 0%, 36%);
  font-size: 0.875rem;
  line-height: 1.5;
}
.c15t-accordionContent > [data-slot="preference-item-content-viewport"] {
  padding-top: 0;
  padding-inline-end: 0.5rem;
  padding-inline-start: 1.5rem;
}
.c15t-accordionContent[data-state="open"] > [data-slot="preference-item-content-viewport"] {
  padding-bottom: 0.5rem;
}
.c15t-accordionContent[data-state="closed"] > [data-slot="preference-item-content-viewport"] {
  padding-bottom: 0;
}

/* ── Switch ── */
.c15t-switch {
  align-self: center;
  cursor: pointer;
  flex-shrink: 0;
  position: relative;
  top: -1px;
}

.c15t-switch-root {
  position: relative;
  display: inline-flex;
  width: 36px;
  height: 20px;
  border: 0;
  padding: 0;
  border-radius: 10px;
  background: var(--c15t-switch-track, hsl(0, 0%, 85%));
  cursor: pointer;
  transition: background var(--c15t-duration-fast, 150ms);
  appearance: none;
}
.c15t-switch-root:disabled { opacity: 0.5; cursor: not-allowed; }
.c15t-switch-root.c15t-switch-checked {
  background: var(--c15t-switch-track-active, hsl(228, 100%, 60%));
}

.c15t-switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--c15t-switch-thumb, #fff);
  transition: left var(--c15t-duration-fast, 150ms);
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.c15t-switch-checked .c15t-switch-thumb {
  left: 18px;
}

/* ── Widget footer ── */
.c15t-widget-footer {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem 0 0 0;
}
@media (max-width: 640px) {
  .c15t-widget-footer { flex-direction: column; }
  .c15t-widget-footerGroup { width: 100%; }
  .c15t-widget-footerGroup button { width: 100%; }
}
@media (min-width: 640px) {
  .c15t-widget-footer { flex-direction: row; }
}

.c15t-widget-footerGroup {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 1rem;
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .c15t-dialogVisible, .c15t-dialogHidden,
  .c15t-contentVisible, .c15t-contentHidden { transition: none; }
  .c15t-accordionTrigger, .c15t-accordionArrow { transition: none; }
}
`.trim();

/**
 * Vanilla JS consent dialog using the same CSS from @c15t/ui.
 *
 * Imports the compiled CSS module class names and CSS from @c15t/ui dist,
 * ensuring pixel-perfect visual parity with the React ConsentDialog.
 */

import {
	resolvePolicyActionGroups,
	resolvePolicyAllowedActions,
	resolvePolicyPrimaryActions,
} from 'c15t/policy-actions';
import type { ConsentRuntimeResult } from 'c15t/runtime';
// @ts-expect-error - direct source path import for tree-shaking
import { setupFocusTrap, setupScrollLock } from '../../../ui/src/utils/dom';
import {
	buttonStyles,
	dialogStyles,
	injectC15tCSS,
	switchStyles,
	widgetStyles,
} from './styles';

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
 * Creates the consent dialog DOM using CSS classes from @c15t/ui.
 */
export function createDialog(store: ConsentStore): {
	element: HTMLElement;
	destroy: () => void;
} {
	const state = store.getState();
	const translations = extractDialogTranslations(state);
	const t = { ...DEFAULT_TRANSLATIONS, ...translations };
	const d = dialogStyles;
	const w = widgetStyles;
	const b = buttonStyles;
	const sw = switchStyles;

	// Inject the shared CSS from @c15t/ui
	injectC15tCSS();

	// Initialize selectedConsents to current saved state
	const categories = state.consentTypes ?? [];
	for (const cat of categories) {
		state.setSelectedConsent(
			cat.name as Parameters<typeof state.setSelectedConsent>[0],
			state.consents[cat.name as keyof typeof state.consents] ?? false
		);
	}

	// Track open accordion items
	const openItems = new Set<string>();

	// ─── Root dialog ──────────────────────────────────────────────────────
	const root = document.createElement('dialog');
	root.className = `${d.root} ${d.dialogVisible}`;
	root.setAttribute('aria-labelledby', 'consent-dialog-title');
	root.tabIndex = -1;
	root.dir = 'ltr';
	root.dataset.testid = 'consent-dialog-root';
	root.setAttribute('open', '');

	// ─── Overlay ──────────────────────────────────────────────────────────
	// The dialog root is position:fixed, so the overlay uses position:absolute
	// within it (not fixed, which would escape the dialog's stacking context)
	const overlay = document.createElement('div');
	overlay.className = `${d.overlay} ${d.overlayVisible}`;
	overlay.style.position = 'absolute';
	overlay.style.zIndex = '0';

	// ─── Container ────────────────────────────────────────────────────────
	const container = document.createElement('div');
	container.className = `${d.container} ${d.contentVisible}`;
	container.style.position = 'relative';
	container.style.zIndex = '999999999';

	// ─── Card ─────────────────────────────────────────────────────────────
	const card = document.createElement('div');
	card.className = d.card;
	card.dataset.testid = 'consent-dialog-card';

	// ─── Header ───────────────────────────────────────────────────────────
	const header = document.createElement('div');
	header.className = d.header;
	header.dataset.testid = 'consent-dialog-header';

	const title = document.createElement('div');
	title.className = d.title;
	title.id = 'consent-dialog-title';
	title.dataset.testid = 'consent-dialog-title';
	title.textContent = t.title;

	const desc = document.createElement('div');
	desc.className = d.description;
	desc.dataset.testid = 'consent-dialog-description';
	desc.textContent = t.description;

	header.append(title, desc);

	// ─── Content (accordion) ──────────────────────────────────────────────
	const content = document.createElement('div');
	content.className = d.content;
	content.dataset.testid = 'consent-dialog-content';

	const widget = document.createElement('div');
	widget.className = w.widget;

	const accordionList = document.createElement('div');
	accordionList.className = w.accordionList;

	for (const cat of categories) {
		const isNecessary = cat.name === 'necessary';
		const isOpen = openItems.has(cat.name);

		// Accordion item
		const item = document.createElement('div');
		item.className = w.accordionItem;
		item.dataset.testid = `consent-widget-accordion-item-${cat.name}`;
		item.dataset.state = isOpen ? 'open' : 'closed';

		// Trigger wrapper
		const trigger = document.createElement('div');
		trigger.className = w.accordionTrigger;
		trigger.dataset.testid = `consent-widget-accordion-trigger-${cat.name}`;

		// Trigger inner (button)
		const triggerInner = document.createElement('button');
		triggerInner.type = 'button';
		triggerInner.className = w.accordionTriggerInner;
		triggerInner.dataset.testid = `consent-widget-accordion-trigger-inner-${cat.name}`;
		triggerInner.setAttribute('aria-expanded', String(isOpen));

		// Arrow
		const arrow = document.createElement('div');
		arrow.className = w.accordionArrow;
		arrow.dataset.testid = `consent-widget-accordion-arrow-${cat.name}`;
		arrow.innerHTML =
			'<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

		// Title
		const headerEl = document.createElement('header');
		const titleH3 = document.createElement('h3');
		titleH3.className = w.accordionTitle;
		titleH3.textContent =
			cat.title ?? cat.name.charAt(0).toUpperCase() + cat.name.slice(1);
		headerEl.appendChild(titleH3);

		triggerInner.append(arrow, headerEl);

		// Switch
		const switchContainer = document.createElement('div');
		switchContainer.className = w.switch;
		switchContainer.dataset.slot = 'preference-item-control';

		const isDisabled = isNecessary || (cat.disabled ?? false);
		const switchBtn = document.createElement('button');
		switchBtn.type = 'button';
		switchBtn.setAttribute('role', 'switch');
		const isChecked =
			state.selectedConsents[cat.name as keyof typeof state.selectedConsents] ??
			isNecessary;
		switchBtn.setAttribute('aria-checked', String(isChecked));
		switchBtn.className = `${sw.root}${isDisabled ? ` ${sw.rootSmall || ''}` : ''}`;
		// Ensure box-sizing so padding doesn't expand the button beyond its set dimensions
		switchBtn.style.boxSizing = 'border-box';
		switchBtn.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
		switchBtn.dataset.testid = `consent-widget-switch-${cat.name}`;
		if (isDisabled) switchBtn.dataset.disabled = '';

		// Structure: root > track > thumb (matches @c15t/ui switch)
		const switchTrack = document.createElement('span');
		switchTrack.className = `${sw.track}${isDisabled ? ` ${sw.trackDisabled}` : ''}`;

		const switchThumb = document.createElement('span');
		switchThumb.className = `${sw.thumb}${isDisabled ? ` ${sw.thumbDisabled}` : ''}`;

		switchTrack.appendChild(switchThumb);
		switchBtn.appendChild(switchTrack);

		// Update switch visual state via data-state attribute
		const updateSwitchState = (checked: boolean) => {
			switchBtn.setAttribute('aria-checked', String(checked));
			if (checked) {
				switchBtn.dataset.state = 'checked';
			} else {
				delete switchBtn.dataset.state;
			}
		};
		updateSwitchState(isChecked);

		switchBtn.addEventListener('click', () => {
			if (isDisabled) return;
			const newChecked = switchBtn.getAttribute('aria-checked') !== 'true';
			updateSwitchState(newChecked);
			state.setSelectedConsent(
				cat.name as Parameters<typeof state.setSelectedConsent>[0],
				newChecked
			);
		});

		switchContainer.appendChild(switchBtn);
		trigger.append(triggerInner, switchContainer);

		// Accordion content
		const accordionContent = document.createElement('div');
		accordionContent.className = w.accordionContent;
		accordionContent.dataset.testid = `consent-widget-accordion-content-${cat.name}`;
		accordionContent.dataset.state = isOpen ? 'open' : 'closed';

		const viewport = document.createElement('div');
		viewport.dataset.slot = 'preference-item-content-viewport';
		const descDiv = document.createElement('div');
		descDiv.textContent = cat.description ?? '';
		viewport.appendChild(descDiv);
		accordionContent.appendChild(viewport);

		if (!isOpen) {
			accordionContent.style.display = 'none';
			accordionContent.style.height = '0';
			accordionContent.style.overflow = 'hidden';
		}

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
	widgetFooter.className = w.footer;
	// The widget CSS has both a sibling margin (1.5rem from .widget > ~ selector)
	// and a footer padding-top (1.5rem). Zero the padding to avoid double-spacing.
	widgetFooter.style.paddingTop = '0';

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
		groupEl.className = w.footerGroup;

		for (const action of group) {
			const isPrimary = primaryActions.includes(action);
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.textContent = actionLabels[action] ?? action;
			btn.className = isPrimary
				? `${b.button} ${b.buttonSmall} ${b.buttonPrimaryFilled}`
				: `${b.button} ${b.buttonSmall} ${b.buttonNeutralStroke}`;

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
	dialogFooter.className = d.footer;
	dialogFooter.dataset.testid = 'consent-dialog-footer';

	const branding = state.branding;
	if (branding && branding !== 'none') {
		const refParam = `?ref=${window.location.hostname}`;
		const brandLink = document.createElement('a');
		brandLink.dir = 'ltr';
		brandLink.className = d.branding;
		brandLink.href =
			branding === 'consent'
				? `https://consent.io${refParam}`
				: `https://c15t.com${refParam}`;
		brandLink.target = '_blank';
		brandLink.rel = 'noopener noreferrer';

		brandLink.appendChild(document.createTextNode('Secured by '));

		if (branding === 'consent') {
			brandLink.insertAdjacentHTML(
				'beforeend',
				`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 97" fill="none" class="${d.brandingConsent}" aria-label="Consent"><path fill="currentColor" fill-rule="evenodd" d="M53.179 70.787c6.17 0 11.172-5.002 11.172-11.172 0-4.009-2.111-7.524-5.283-9.495a23.87 23.87 0 0 1 8.817-1.677c13.217 0 23.93 10.714 23.93 23.93s-10.713 23.93-23.93 23.93c-13.216 0-23.93-10.714-23.93-23.93 0-1.924.227-3.795.656-5.588a11.148 11.148 0 0 0 8.568 4.002Z" clip-rule="evenodd"/><path fill="currentColor" fill-rule="evenodd" d="M.618 74.716a68.453 68.453 0 0 1-.098-3.654c0-37.205 30.16-67.365 67.365-67.365s67.365 30.16 67.365 67.365c0 1.226-.032 2.444-.097 3.654h-21.927c.041-.776.061-1.557.061-2.343 0-24.531-19.887-44.418-44.418-44.418-24.532 0-44.418 19.887-44.418 44.418 0 .786.02 1.567.06 2.343H.618Z" clip-rule="evenodd"/></svg>`
			);
		} else {
			brandLink.insertAdjacentHTML(
				'beforeend',
				`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 408 149" class="${d.brandingC15T}" aria-label="c15t"><path fill="currentColor" fill-rule="evenodd" d="M74.133 14.042c-5.58 0-10.105 4.524-10.105 10.104 0 5.581 4.524 10.105 10.105 10.105 5.58 0 10.105-4.524 10.105-10.105 0-5.58-4.524-10.104-10.105-10.104ZM50.556 24.146C50.556 11.125 61.112.57 74.133.57 87.154.57 97.71 11.125 97.71 24.146c0 13.022-10.556 23.578-23.577 23.578-4.06 0-7.88-1.027-11.216-2.834L44.354 63.453a23.424 23.424 0 0 1 1.858 4.48h55.843c2.899-9.74 11.921-16.841 22.601-16.841 13.022 0 23.578 10.556 23.578 23.577 0 13.022-10.556 23.578-23.578 23.578-10.68 0-19.702-7.102-22.601-16.841H46.211a23.455 23.455 0 0 1-2.628 5.798l18.015 18.015a23.473 23.473 0 0 1 12.535-3.604c13.021 0 23.577 10.556 23.577 23.577 0 13.022-10.556 23.577-23.577 23.577-13.021 0-23.577-10.555-23.577-23.577 0-3.506.765-6.833 2.138-9.824l-19.26-19.26a23.49 23.49 0 0 1-9.823 2.139C10.588 98.247.032 87.69.032 74.669c0-13.021 10.556-23.577 23.577-23.577 4.061 0 7.882 1.026 11.217 2.834L53.39 35.364a23.473 23.473 0 0 1-2.834-11.218Zm63.996 50.523v.023c.012 5.57 4.531 10.082 10.104 10.082 5.581 0 10.105-4.524 10.105-10.105 0-5.58-4.524-10.104-10.105-10.104-5.573 0-10.092 4.511-10.104 10.082v.022ZM23.61 64.565c-5.58 0-10.104 4.524-10.104 10.104 0 5.58 4.524 10.105 10.104 10.105 5.581 0 10.105-4.524 10.105-10.105 0-5.58-4.524-10.104-10.105-10.104Zm40.418 60.627c0-5.581 4.524-10.104 10.105-10.104 5.58 0 10.105 4.523 10.105 10.104 0 5.581-4.524 10.105-10.105 10.105-5.58 0-10.105-4.524-10.105-10.105Z" clip-rule="evenodd"/><path fill="currentColor" d="M213.869 86.31c0-18.48 14.64-32.04 32.88-32.04 9 0 17.28 3 24.24 10.44l-8.88 9.24c-4.08-4.2-8.88-6.6-15.36-6.6-10.56 0-18.6 8.04-18.6 18.96 0 10.92 8.04 18.959 18.6 18.959 6.48 0 11.28-2.4 15.36-6.6l8.88 9.24c-6.96 7.44-15.24 10.44-24.24 10.44-18.24 0-32.88-13.56-32.88-32.04Zm70.372-39.72h-11.88V33.03h26.88v83.639h-15v-70.08Zm23.468 54.599 12.24-6.96c2.88 6.12 9.24 10.2 16.44 10.2 10.2 0 17.04-6.36 17.04-15.84s-6.48-15.84-16.2-15.84c-4.68 0-9.48 1.44-12.48 4.32l-10.8-2.88 7.8-41.16h40.56v13.56h-29.28l-3 15.12c2.52-1.08 5.52-1.56 8.76-1.56 17.76 0 29.52 11.28 29.52 28.32 0 17.76-12.72 29.64-31.92 29.64-12.6 0-23.52-6.84-28.68-16.92Zm72.386-31.92h-7.8V56.19h7.8V33.03h14.4v23.16h13.08v13.08h-13.08v47.4h-14.4v-47.4Z"/></svg>`
			);
		}

		dialogFooter.appendChild(brandLink);
	}

	// ─── Assemble ─────────────────────────────────────────────────────────
	card.append(header, content, dialogFooter);
	container.appendChild(card);
	root.append(overlay, container);

	// Close on overlay click (but not when clicking inside the card)
	overlay.addEventListener('click', () => {
		store.getState().setActiveUI('none');
	});
	card.addEventListener('click', (e) => {
		e.stopPropagation();
	});
	container.addEventListener('click', (e) => {
		e.stopPropagation();
	});

	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			store.getState().setActiveUI('none');
		}
	};
	document.addEventListener('keydown', onKeyDown);

	// Scroll lock with scrollbar width compensation
	const cleanupScrollLock = setupScrollLock();

	// Focus trap within the dialog card
	const cleanupFocusTrap = setupFocusTrap(card);

	function destroy() {
		document.removeEventListener('keydown', onKeyDown);
		cleanupFocusTrap();
		cleanupScrollLock();
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

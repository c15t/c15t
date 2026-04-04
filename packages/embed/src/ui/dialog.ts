/**
 * Vanilla JS consent dialog using the same CSS from @c15t/ui.
 *
 * Imports the compiled CSS module class names and CSS from @c15t/ui dist,
 * ensuring pixel-perfect visual parity with the React ConsentDialog.
 */

import type { ConsentRuntimeResult } from 'c15t';
import {
	resolvePolicyActionGroups,
	resolvePolicyAllowedActions,
	resolvePolicyPrimaryActions,
} from 'c15t';
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
	const overlay = document.createElement('div');
	overlay.className = `${d.overlay} ${d.overlayVisible}`;

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
		titleH3.textContent = cat.title ?? cat.name;
		headerEl.appendChild(titleH3);

		triggerInner.append(arrow, headerEl);

		// Switch
		const switchContainer = document.createElement('div');
		switchContainer.className = w.switch;
		switchContainer.dataset.slot = 'preference-item-control';

		const switchBtn = document.createElement('button');
		switchBtn.type = 'button';
		switchBtn.setAttribute('role', 'switch');
		const isChecked =
			state.selectedConsents[cat.name as keyof typeof state.selectedConsents] ??
			isNecessary;
		switchBtn.setAttribute('aria-checked', String(isChecked));
		switchBtn.className = sw.root;
		switchBtn.dataset.testid = `consent-widget-switch-${cat.name}`;
		switchBtn.disabled = isNecessary || (cat.disabled ?? false);

		const switchThumb = document.createElement('span');
		switchThumb.className = sw.thumb;
		switchBtn.appendChild(switchThumb);

		// Update switch visual state
		const updateSwitchState = (checked: boolean) => {
			switchBtn.setAttribute('aria-checked', String(checked));
			// The CSS uses data attributes for state — we toggle a class
			if (checked) {
				switchBtn.dataset.state = 'checked';
			} else {
				delete switchBtn.dataset.state;
			}
		};
		updateSwitchState(isChecked);

		switchBtn.addEventListener('click', () => {
			if (switchBtn.disabled) return;
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

	// ─── Dialog footer ────────────────────────────────────────────────────
	const dialogFooter = document.createElement('div');
	dialogFooter.className = d.footer;
	dialogFooter.dataset.testid = 'consent-dialog-footer';

	// ─── Assemble ─────────────────────────────────────────────────────────
	card.append(header, content, dialogFooter);
	container.appendChild(card);
	root.append(overlay, container);

	// Close on overlay click
	overlay.addEventListener('click', () => {
		store.getState().setActiveUI('none');
	});

	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			store.getState().setActiveUI('none');
		}
	};
	document.addEventListener('keydown', onKeyDown);

	const originalOverflow = document.body.style.overflow;
	document.body.style.overflow = 'hidden';

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

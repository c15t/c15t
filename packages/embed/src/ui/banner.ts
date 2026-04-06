/**
 * Vanilla JS consent banner using the same CSS from @c15t/ui.
 *
 * Policy-driven: reads policyBanner from the store to determine which
 * buttons to show, their order, grouping, and which is primary.
 * Falls back to the default layout [['reject', 'accept'], 'customize']
 * when no policy hints are present.
 */

import {
	hasPolicyHints,
	resolvePolicyActionGroups,
	resolvePolicyAllowedActions,
	resolvePolicyDirection,
	resolvePolicyPrimaryActions,
	resolvePolicyUiProfile,
	shouldFillPolicyActions,
} from 'c15t/policy-actions';
import type { ConsentRuntimeResult } from 'c15t/runtime';
import {
	bannerStyles,
	buttonStyles,
	injectC15tCSS,
	legalLinksStyles,
} from './styles';

type ConsentStore = ConsentRuntimeResult['consentStore'];

export interface BannerTranslations {
	title: string;
	description: string;
	acceptAll: string;
	rejectAll: string;
	customize: string;
}

const DEFAULT_TRANSLATIONS: BannerTranslations = {
	title: 'We value your privacy',
	description:
		'This site uses cookies to improve your browsing experience, analyze site traffic, and show personalized content.',
	acceptAll: 'Accept All',
	rejectAll: 'Reject All',
	customize: 'Customize',
};

const DEFAULT_LAYOUT = [['reject', 'accept'], 'customize'] as const;

const ACTION_LABELS: Record<string, keyof BannerTranslations> = {
	accept: 'acceptAll',
	reject: 'rejectAll',
	customize: 'customize',
};

/**
 * Creates the consent banner DOM using CSS classes from @c15t/ui.
 * Reads policy hints from the store for button layout.
 */
export function createBanner(
	store: ConsentStore,
	translations?: Partial<BannerTranslations>
): HTMLElement {
	const state = store.getState();
	const t = { ...DEFAULT_TRANSLATIONS, ...translations };
	const s = bannerStyles;
	const b = buttonStyles;

	// Inject the shared CSS from @c15t/ui
	injectC15tCSS();

	// ─── Resolve policy-driven layout ─────────────────────────────────────
	const policyBanner = state.policyBanner;
	const allowedActions = resolvePolicyAllowedActions({
		allowedActions: policyBanner?.allowedActions,
	});
	const usePolicy = hasPolicyHints(policyBanner);
	const actionGroups = resolvePolicyActionGroups({
		allowedActions,
		layout: usePolicy ? policyBanner?.layout : DEFAULT_LAYOUT,
	});
	const orderedActions = actionGroups.flat();
	const primaryActions = resolvePolicyPrimaryActions({
		orderedActions,
		primaryActions: policyBanner?.primaryActions,
	});
	const direction = resolvePolicyDirection(policyBanner?.direction);
	const uiProfile = resolvePolicyUiProfile(policyBanner?.uiProfile);
	const fillActions = shouldFillPolicyActions({
		uiProfile,
		actionGroups,
		direction,
	});

	// ─── Root — matches ConsentBannerRoot ──────────────────────────────────
	const root = document.createElement('div');
	root.className = `${s.root} ${s.bottomLeft} ${s.bannerVisible}`;
	root.dataset.testid = 'consent-banner-root';
	root.dir = 'ltr';

	// ─── Card — matches ConsentBannerCard ──────────────────────────────────
	const card = document.createElement('div');
	card.className = s.card;
	card.setAttribute('role', 'dialog');
	card.setAttribute('aria-label', t.title);
	card.setAttribute('aria-modal', 'true');
	card.tabIndex = 0;
	card.dataset.testid = 'consent-banner-card';
	card.dataset.state = 'open';

	// ─── Header ────────────────────────────────────────────────────────────
	const header = document.createElement('div');
	header.className = s.header;
	header.dataset.testid = 'consent-banner-header';

	const title = document.createElement('div');
	title.className = s.title;
	title.dataset.testid = 'consent-banner-title';
	title.textContent = t.title;

	const description = document.createElement('div');
	description.className = s.description;
	description.dataset.testid = 'consent-banner-description';
	description.textContent = t.description;

	// Legal links
	const legalLinks = state.legalLinks;
	if (legalLinks) {
		const linksContainer = document.createElement('span');
		linksContainer.className = legalLinksStyles.legalLinks ?? '';
		for (const [key, link] of Object.entries(legalLinks)) {
			if (!link?.href) continue;
			const space = document.createTextNode(' ');
			const a = document.createElement('a');
			a.href = link.href;
			a.textContent = link.label ?? key;
			a.className = legalLinksStyles.legalLink ?? '';
			a.dataset.testid = `consent-banner-legal-link-${key}`;
			if (link.target) a.target = link.target;
			if (link.rel) a.rel = link.rel;
			linksContainer.append(space, a);
		}
		description.appendChild(linksContainer);
	}

	header.append(title, description);

	// ─── Footer (policy-driven) ────────────────────────────────────────────
	const footerClasses = [s.footer];
	if (fillActions && s.footerFill) footerClasses.push(s.footerFill);
	if (direction === 'column' && s.footerColumn)
		footerClasses.push(s.footerColumn);

	const footer = document.createElement('div');
	footer.className = footerClasses.join(' ');
	footer.dataset.testid = 'consent-banner-footer';

	for (const group of actionGroups) {
		if (group.length > 1) {
			// Grouped buttons (e.g. [reject, accept])
			const subGroupClasses = [s.footerSubGroup];
			if (fillActions && s.footerSubGroupFill)
				subGroupClasses.push(s.footerSubGroupFill);
			if (direction === 'column' && s.footerSubGroupColumn)
				subGroupClasses.push(s.footerSubGroupColumn);

			const subGroup = document.createElement('div');
			subGroup.className = subGroupClasses.join(' ');
			subGroup.dataset.testid = 'consent-banner-footer-sub-group';

			for (const action of group) {
				const btn = createActionButton(
					action,
					t,
					primaryActions.includes(action),
					fillActions,
					store
				);
				subGroup.appendChild(btn);
			}
			footer.appendChild(subGroup);
		} else {
			// Single button
			const action = group[0];
			const btn = createActionButton(
				action,
				t,
				primaryActions.includes(action),
				fillActions,
				store
			);
			footer.appendChild(btn);
		}
	}

	// ─── Assemble ──────────────────────────────────────────────────────────
	card.append(header, footer);
	root.appendChild(card);

	return root;
}

function createActionButton(
	action: string,
	translations: BannerTranslations,
	isPrimary: boolean,
	fillAction: boolean,
	store: ConsentStore
): HTMLButtonElement {
	const b = buttonStyles;
	const s = bannerStyles;
	const btn = document.createElement('button');
	btn.type = 'button';

	const labelKey = ACTION_LABELS[action];
	btn.textContent = labelKey ? translations[labelKey] : action;
	btn.dataset.testid = `consent-banner-${action}-button`;

	const variant = isPrimary ? 'primary-filled' : 'neutral-stroke';
	const variantClass =
		variant === 'primary-filled'
			? b.buttonPrimaryFilled
			: b.buttonNeutralStroke;

	const classes = [b.button, b.buttonSmall, variantClass];
	if (fillAction && s.actionButtonFill) classes.push(s.actionButtonFill);

	// Add component-specific class
	const componentClass =
		action === 'reject'
			? s.rejectButton
			: action === 'accept'
				? s.acceptButton
				: action === 'customize'
					? s.customizeButton
					: undefined;
	if (componentClass) classes.push(componentClass);

	btn.className = classes.join(' ');

	btn.addEventListener('click', () => {
		const state = store.getState();
		if (action === 'accept') {
			state.saveConsents('all');
		} else if (action === 'reject') {
			state.saveConsents('necessary');
		} else if (action === 'customize') {
			state.setActiveUI('dialog');
		}
	});

	return btn;
}

/**
 * Animate the banner out, then remove it.
 */
export function animateBannerOut(
	root: HTMLElement,
	onComplete: () => void
): void {
	const s = bannerStyles;
	root.classList.remove(s.bannerVisible);
	root.classList.add(s.bannerHidden);
	setTimeout(onComplete, 200);
}

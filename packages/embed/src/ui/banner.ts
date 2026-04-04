/**
 * Vanilla JS consent banner using the same CSS from @c15t/ui.
 *
 * Imports the compiled CSS module class names and CSS from @c15t/ui dist,
 * ensuring pixel-perfect visual parity with the React ConsentBanner.
 */

import { bannerStyles, buttonStyles, injectC15tCSS } from './styles';

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

export interface BannerActions {
	onAcceptAll: () => void;
	onRejectAll: () => void;
	onCustomize: () => void;
}

/**
 * Creates the consent banner DOM using CSS classes from @c15t/ui.
 */
export function createBanner(
	actions: BannerActions,
	translations?: Partial<BannerTranslations>
): HTMLElement {
	const t = { ...DEFAULT_TRANSLATIONS, ...translations };
	const s = bannerStyles;
	const b = buttonStyles;

	// Inject the shared CSS from @c15t/ui
	injectC15tCSS();

	// Root — matches ConsentBannerRoot
	const root = document.createElement('div');
	root.className = `${s.root} ${s.bottomLeft} ${s.bannerVisible}`;
	root.dataset.testid = 'consent-banner-root';
	root.dir = 'ltr';

	// Card — matches ConsentBannerCard
	const card = document.createElement('div');
	card.className = s.card;
	card.setAttribute('role', 'dialog');
	card.setAttribute('aria-label', 'Consent Banner');
	card.setAttribute('aria-modal', 'true');
	card.tabIndex = 0;
	card.dataset.testid = 'consent-banner-card';
	card.dataset.state = 'open';

	// Header
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

	header.append(title, description);

	// Footer
	const footer = document.createElement('div');
	footer.className = s.footer;
	footer.dataset.testid = 'consent-banner-footer';

	// Button sub-group (reject + accept)
	const subGroup = document.createElement('div');
	subGroup.className = s.footerSubGroup;
	subGroup.dataset.testid = 'consent-banner-footer-sub-group';

	const rejectBtn = createConsentButton(
		t.rejectAll,
		'neutral-stroke',
		'consent-banner-reject-button',
		actions.onRejectAll
	);
	rejectBtn.classList.add(s.rejectButton);

	const acceptBtn = createConsentButton(
		t.acceptAll,
		'primary-filled',
		'consent-banner-accept-button',
		actions.onAcceptAll
	);
	acceptBtn.classList.add(s.acceptButton);

	subGroup.append(rejectBtn, acceptBtn);

	// Customize button
	const customizeBtn = createConsentButton(
		t.customize,
		'neutral-ghost',
		'consent-banner-customize-button',
		actions.onCustomize
	);
	customizeBtn.classList.add(s.customizeButton);

	footer.append(subGroup, customizeBtn);

	// Assemble
	card.append(header, footer);
	root.appendChild(card);

	return root;
}

function createConsentButton(
	label: string,
	variant: 'primary-filled' | 'neutral-stroke' | 'neutral-ghost',
	testId: string,
	onClick: () => void
): HTMLButtonElement {
	const b = buttonStyles;
	const btn = document.createElement('button');
	btn.type = 'button';
	btn.textContent = label;
	btn.dataset.testid = testId;

	// Use the exact CSS module class names from @c15t/ui
	const variantClass =
		variant === 'primary-filled'
			? b.buttonPrimaryFilled
			: variant === 'neutral-stroke'
				? b.buttonNeutralStroke
				: b.buttonNeutralGhost;

	btn.className = `${b.button} ${b.buttonSmall} ${variantClass}`;

	btn.addEventListener('click', onClick);
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

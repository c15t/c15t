/**
 * Vanilla JS consent banner matching the React ConsentBanner 1:1.
 *
 * Uses the same CSS class names and DOM structure as the React component,
 * with the CSS from @c15t/ui inlined as a <style> tag.
 */

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
		'We use cookies and similar technologies to help personalize content, tailor and measure ads, and provide a better experience. By clicking "Accept All", you consent to this use.',
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
 * Creates the consent banner DOM matching the React ConsentBanner structure.
 * Returns the root element — caller handles attaching to the document.
 */
export function createBanner(
	actions: BannerActions,
	translations?: Partial<BannerTranslations>
): HTMLElement {
	const t = { ...DEFAULT_TRANSLATIONS, ...translations };

	// Inject banner CSS if not already present
	injectBannerCSS();

	// Root — matches ConsentBannerRoot
	const root = document.createElement('div');
	root.className = 'c15t-root c15t-bottomLeft c15t-bannerVisible';
	root.dataset.testid = 'consent-banner-root';
	root.dir = 'ltr';

	// Card — matches ConsentBannerCard
	const card = document.createElement('div');
	card.className = 'c15t-card';
	card.setAttribute('role', 'dialog');
	card.setAttribute('aria-label', 'Consent Banner');
	card.setAttribute('aria-modal', 'true');
	card.tabIndex = 0;
	card.dataset.testid = 'consent-banner-card';
	card.dataset.state = 'open';

	// Header
	const header = document.createElement('div');
	header.className = 'c15t-header';
	header.dataset.testid = 'consent-banner-header';

	const title = document.createElement('div');
	title.className = 'c15t-title';
	title.dataset.testid = 'consent-banner-title';
	title.textContent = t.title;

	const description = document.createElement('div');
	description.className = 'c15t-description';
	description.dataset.testid = 'consent-banner-description';
	description.textContent = t.description;

	header.append(title, description);

	// Footer
	const footer = document.createElement('div');
	footer.className = 'c15t-footer';
	footer.dataset.testid = 'consent-banner-footer';

	// Button sub-group (reject + accept)
	const subGroup = document.createElement('div');
	subGroup.className = 'c15t-footerSubGroup';
	subGroup.dataset.testid = 'consent-banner-footer-sub-group';

	const rejectBtn = createConsentButton(
		t.rejectAll,
		'neutral',
		'consent-banner-reject-button',
		actions.onRejectAll
	);
	rejectBtn.classList.add('c15t-rejectButton');

	const acceptBtn = createConsentButton(
		t.acceptAll,
		'primary',
		'consent-banner-accept-button',
		actions.onAcceptAll
	);
	acceptBtn.classList.add('c15t-acceptButton');

	subGroup.append(rejectBtn, acceptBtn);

	// Customize button (standalone)
	const customizeBtn = createConsentButton(
		t.customize,
		'ghost',
		'consent-banner-customize-button',
		actions.onCustomize
	);
	customizeBtn.classList.add('c15t-customizeButton');

	footer.append(subGroup, customizeBtn);

	// Assemble
	card.append(header, footer);
	root.appendChild(card);

	return root;
}

function createConsentButton(
	label: string,
	variant: 'primary' | 'neutral' | 'ghost',
	testId: string,
	onClick: () => void
): HTMLButtonElement {
	const btn = document.createElement('button');
	btn.type = 'button';
	btn.textContent = label;
	btn.dataset.testid = testId;

	// Button classes matching @c15t/ui button variants
	const variantClasses: Record<string, string> = {
		primary: 'c15t-button c15t-button-small c15t-button-primary-filled',
		neutral: 'c15t-button c15t-button-small c15t-button-neutral-stroke',
		ghost: 'c15t-button c15t-button-small c15t-button-neutral-ghost',
	};
	btn.className = variantClasses[variant] ?? variantClasses.neutral;

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
	root.classList.remove('c15t-bannerVisible');
	root.classList.add('c15t-bannerHidden');
	setTimeout(onComplete, 200);
}

// ─── CSS injection ────────────────────────────────────────────────────────────

let cssInjected = false;

function injectBannerCSS(): void {
	if (cssInjected) return;
	cssInjected = true;

	const style = document.createElement('style');
	style.id = 'c15t-embed-banner-css';
	style.textContent = BANNER_CSS;
	document.head.appendChild(style);
}

/**
 * CSS matching @c15t/ui consent-banner.module.css + button.module.css.
 * Uses c15t- prefixed class names to avoid conflicts with page styles.
 */
const BANNER_CSS = `
/* ── Theme variables ── */
:root {
  --c15t-font-family: system-ui, -apple-system, sans-serif;
  --c15t-font-size-sm: 0.875rem;
  --c15t-font-weight-medium: 500;
  --c15t-line-height-normal: 1.5;
  --c15t-line-height-tight: 1.25;
  --c15t-duration-fast: 150ms;
  --c15t-easing: cubic-bezier(0.4, 0, 0.2, 1);
  --c15t-radius-sm: 0.375rem;
  --c15t-radius-md: 0.5rem;
  --c15t-radius-lg: 0.75rem;
  --c15t-shadow-sm: 0 1px 2px 0 rgba(0,0,0,0.05);
  --c15t-shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1);
  --c15t-primary: hsl(228, 100%, 60%);
  --c15t-primary-hover: hsl(228, 100%, 55%);
  --c15t-surface: hsl(0, 0%, 100%);
  --c15t-surface-hover: hsl(0, 0%, 98%);
  --c15t-border: hsl(0, 0%, 90%);
  --c15t-text: hsl(0, 0%, 10%);
  --c15t-text-muted: hsl(0, 0%, 40%);
  --c15t-text-on-primary: hsl(0, 0%, 100%);
  --c15t-overlay: hsla(0, 0%, 0%, 0.5);
  --c15t-switch-track: hsl(0, 0%, 85%);
  --c15t-switch-track-active: hsl(228, 100%, 60%);
  --c15t-switch-thumb: hsl(0, 0%, 100%);
}

@media (prefers-color-scheme: dark) {
  :root {
    --c15t-primary: hsl(228, 100%, 70%);
    --c15t-primary-hover: hsl(228, 100%, 65%);
    --c15t-surface: hsl(0, 0%, 7%);
    --c15t-surface-hover: hsl(0, 0%, 10%);
    --c15t-border: hsl(0, 0%, 20%);
    --c15t-text: hsl(0, 0%, 93%);
    --c15t-text-muted: hsl(0, 0%, 60%);
    --c15t-overlay: hsla(0, 0%, 0%, 0.7);
    --c15t-switch-track: hsl(0, 0%, 25%);
    --c15t-switch-track-active: hsl(228, 100%, 70%);
    --c15t-switch-thumb: hsl(0, 0%, 93%);
    --c15t-shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -4px rgba(0,0,0,0.3);
  }
}

/* ── Banner layout (matches consent-banner.module.css) ── */
.c15t-root {
  padding: 1rem;
  flex-direction: column;
  width: 100%;
  display: flex;
  z-index: 999999998;
  position: fixed;
  font-family: var(--c15t-font-family);
  line-height: var(--c15t-line-height-normal);
  -webkit-text-size-adjust: 100%;
  -webkit-font-smoothing: antialiased;
  tab-size: 4;
}
@media (min-width: 640px) {
  .c15t-root { padding: 1.5rem; width: auto; }
}
.c15t-bottomLeft { left: 0; bottom: 0; }
.c15t-bottomRight { right: 0; bottom: 0; }

.c15t-bannerVisible {
  opacity: 1;
  transform: translateY(0);
  transition: opacity var(--c15t-duration-fast) var(--c15t-easing),
    transform var(--c15t-duration-fast) cubic-bezier(0.34, 1.56, 0.64, 1);
}
.c15t-bannerHidden {
  opacity: 0;
  transform: translateY(50px);
  transition: opacity var(--c15t-duration-fast) var(--c15t-easing),
    transform var(--c15t-duration-fast) var(--c15t-easing);
}

.c15t-card {
  position: relative;
  width: min(100%, 440px);
  border-radius: var(--c15t-radius-lg);
  border: 1px solid var(--c15t-border);
  background-color: var(--c15t-surface);
  box-shadow: var(--c15t-shadow-lg);
  overflow: hidden;
}
.c15t-card:focus { outline: none; }
.c15t-card > :not([hidden]) ~ :not([hidden]) {
  border-top: 1px solid var(--c15t-border);
}

@keyframes c15t-enter {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes c15t-exit {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.95); }
}
.c15t-card[data-state="open"] { animation: c15t-enter var(--c15t-duration-fast) var(--c15t-easing); }
.c15t-card[data-state="closed"] { animation: c15t-exit var(--c15t-duration-fast) var(--c15t-easing); }

.c15t-header {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  color: var(--c15t-text);
}
@media (min-width: 640px) { .c15t-header { padding: 1.5rem; } }
.c15t-header > :not([hidden]) ~ :not([hidden]) {
  margin-top: 0.5rem;
}

.c15t-title {
  font-size: 1rem;
  line-height: 1.5rem;
  letter-spacing: -0.011em;
  font-weight: 500;
  color: var(--c15t-text);
}
.c15t-description {
  font-size: 0.875rem;
  line-height: 1.25rem;
  letter-spacing: -0.006em;
  font-weight: 400;
  color: var(--c15t-text-muted);
}

.c15t-footer {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background-color: var(--c15t-surface-hover);
}
@media (min-width: 640px) { .c15t-footer { flex-direction: row; } }

.c15t-footerSubGroup {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 1rem;
}
.c15t-footerSubGroup button { flex-grow: 1; }

.c15t-rejectButton, .c15t-acceptButton, .c15t-customizeButton { width: 100%; }
@media (min-width: 640px) {
  .c15t-rejectButton, .c15t-acceptButton, .c15t-customizeButton { width: auto; }
}

/* ── Button styles (matches button.module.css) ── */
.c15t-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: var(--c15t-radius-md);
  font-weight: var(--c15t-font-weight-medium);
  transition: opacity var(--c15t-duration-fast) var(--c15t-easing), transform var(--c15t-duration-fast) var(--c15t-easing);
  cursor: pointer;
  border: 1px solid var(--c15t-border);
  font-size: var(--c15t-font-size-sm);
  line-height: var(--c15t-line-height-tight);
  color: var(--c15t-text);
  font-family: var(--c15t-font-family);
  touch-action: manipulation;
}
.c15t-button:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--c15t-primary); }
.c15t-button:active:not(:disabled) { transform: scale(0.97); }

.c15t-button-small { padding: 0.5rem 0.75rem; }

.c15t-button-primary-filled {
  background-color: var(--c15t-primary);
  color: var(--c15t-surface);
  border-color: transparent;
}
.c15t-button-primary-filled:hover:not(:disabled) {
  background-color: var(--c15t-primary-hover);
}

.c15t-button-neutral-stroke {
  background-color: var(--c15t-surface);
  color: var(--c15t-text-muted);
  box-shadow: var(--c15t-shadow-sm), inset 0 0 0 1px var(--c15t-surface-hover);
}
.c15t-button-neutral-stroke:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--c15t-text) 10%, transparent);
}

.c15t-button-neutral-ghost {
  background-color: transparent;
  color: var(--c15t-text-muted);
  border-color: transparent;
  box-shadow: none;
}
.c15t-button-neutral-ghost:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--c15t-text) 10%, transparent);
}

/* ── Overlay ── */
.c15t-overlay {
  position: fixed;
  inset: 0;
  background-color: var(--c15t-overlay);
  z-index: 999999997;
}
.c15t-overlayVisible { opacity: 1; transition: opacity var(--c15t-duration-fast) var(--c15t-easing); }
.c15t-overlayHidden { opacity: 0; transition: opacity var(--c15t-duration-fast) var(--c15t-easing); }

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .c15t-bannerVisible, .c15t-bannerHidden, .c15t-overlayVisible, .c15t-overlayHidden { transition: none; }
  .c15t-card[data-state="open"], .c15t-card[data-state="closed"] { animation: none; }
}
`.trim();

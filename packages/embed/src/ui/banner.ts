/**
 * Vanilla JS consent banner for the embed script.
 *
 * Builds the same DOM structure as the React ConsentBanner component,
 * using inline styles that match the @c15t/ui CSS module design tokens.
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
 * Creates and returns a consent banner DOM element.
 * Does NOT attach it to the document — the renderer handles show/hide.
 */
export function createBanner(
	actions: BannerActions,
	translations?: Partial<BannerTranslations>
): HTMLElement {
	const t = { ...DEFAULT_TRANSLATIONS, ...translations };

	const root = el('div', {
		role: 'dialog',
		'aria-label': t.title,
		'aria-modal': 'false',
		style: `
			position: fixed;
			bottom: var(--c15t-space-lg, 1.5rem);
			left: var(--c15t-space-lg, 1.5rem);
			z-index: 9999;
			max-width: 440px;
			width: calc(100% - 3rem);
			font-family: var(--c15t-font-family, system-ui, -apple-system, sans-serif);
			font-size: var(--c15t-font-size-sm, 0.875rem);
			line-height: var(--c15t-line-height-normal, 1.5);
			color: var(--c15t-text, #1a1a1a);
			background: var(--c15t-surface, #fff);
			border: 1px solid var(--c15t-border, #e5e5e5);
			border-radius: var(--c15t-radius-lg, 0.75rem);
			box-shadow: var(--c15t-shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1));
			overflow: hidden;
			animation: c15t-slide-up var(--c15t-duration-normal, 250ms) var(--c15t-easing, ease);
		`,
	});

	// Header
	const header = el('div', {
		style: `padding: var(--c15t-space-lg, 1.5rem); padding-bottom: var(--c15t-space-sm, 0.5rem);`,
	});

	const title = el('h2', {
		style: `
			margin: 0 0 var(--c15t-space-sm, 0.5rem) 0;
			font-size: var(--c15t-font-size-base, 1rem);
			font-weight: var(--c15t-font-weight-semibold, 600);
			color: var(--c15t-text, #1a1a1a);
			line-height: var(--c15t-line-height-tight, 1.25);
		`,
	});
	title.textContent = t.title;

	const description = el('p', {
		style: `
			margin: 0;
			color: var(--c15t-text-muted, #666);
			font-size: var(--c15t-font-size-sm, 0.875rem);
		`,
	});
	description.textContent = t.description;

	header.append(title, description);

	// Footer with buttons
	const footer = el('div', {
		style: `
			display: flex;
			flex-wrap: wrap;
			gap: var(--c15t-space-sm, 0.5rem);
			padding: var(--c15t-space-md, 1rem) var(--c15t-space-lg, 1.5rem);
			background: var(--c15t-surface-hover, #fafafa);
			border-top: 1px solid var(--c15t-border, #e5e5e5);
		`,
	});

	const buttonGroup = el('div', {
		style: `display: flex; gap: var(--c15t-space-sm, 0.5rem); flex: 1; min-width: 0;`,
	});

	const rejectBtn = createButton(t.rejectAll, 'neutral', actions.onRejectAll);
	const acceptBtn = createButton(t.acceptAll, 'primary', actions.onAcceptAll);
	const customizeBtn = createButton(t.customize, 'ghost', actions.onCustomize);

	buttonGroup.append(rejectBtn, acceptBtn);
	footer.append(buttonGroup, customizeBtn);

	root.append(header, footer);

	// Inject animation keyframes
	injectAnimations();

	return root;
}

function createButton(
	label: string,
	variant: 'primary' | 'neutral' | 'ghost',
	onClick: () => void
): HTMLButtonElement {
	const styles: Record<string, string> = {
		primary: `
			background: var(--c15t-primary, #4361ee);
			color: var(--c15t-text-on-primary, #fff);
			border: none;
			flex: 1;
		`,
		neutral: `
			background: var(--c15t-surface, #fff);
			color: var(--c15t-text, #1a1a1a);
			border: 1px solid var(--c15t-border, #e5e5e5);
			flex: 1;
		`,
		ghost: `
			background: transparent;
			color: var(--c15t-text-muted, #666);
			border: none;
			width: 100%;
			font-size: var(--c15t-font-size-sm, 0.8125rem);
		`,
	};

	const btn = document.createElement('button');
	btn.type = 'button';
	btn.textContent = label;
	btn.setAttribute(
		'style',
		`
		padding: var(--c15t-space-sm, 0.5rem) var(--c15t-space-md, 1rem);
		border-radius: var(--c15t-radius-sm, 0.375rem);
		font-family: inherit;
		font-size: var(--c15t-font-size-sm, 0.875rem);
		font-weight: var(--c15t-font-weight-medium, 500);
		cursor: pointer;
		transition: opacity var(--c15t-duration-fast, 150ms);
		line-height: var(--c15t-line-height-tight, 1.25);
		${styles[variant]}
	`
	);

	btn.addEventListener('click', onClick);

	return btn;
}

function el(tag: string, attrs: Record<string, string>): HTMLElement {
	const element = document.createElement(tag);
	for (const [key, value] of Object.entries(attrs)) {
		if (key === 'style') {
			element.setAttribute('style', value.replace(/\s+/g, ' ').trim());
		} else {
			element.setAttribute(key, value);
		}
	}
	return element;
}

let animationsInjected = false;
function injectAnimations(): void {
	if (animationsInjected) return;
	animationsInjected = true;

	const style = document.createElement('style');
	style.textContent = `
@keyframes c15t-slide-up {
  from { opacity: 0; transform: translateY(1rem); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes c15t-fade-out {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(1rem); }
}
	`.trim();
	document.head.appendChild(style);
}

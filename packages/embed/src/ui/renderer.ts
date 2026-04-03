/**
 * UI Renderer — orchestrates consent banner/dialog visibility
 * by subscribing to the Zustand vanilla store.
 */

import type { ConsentRuntimeResult } from 'c15t';
import { createBanner } from './banner';
import { createDialog } from './dialog';
import { injectThemeCSS } from './theme';

type ConsentStore = ConsentRuntimeResult['consentStore'];

let bannerEl: HTMLElement | null = null;
let dialogInstance: { element: HTMLElement; destroy: () => void } | null = null;
let containerEl: HTMLElement | null = null;

function getContainer(): HTMLElement {
	if (!containerEl) {
		containerEl = document.createElement('div');
		containerEl.id = 'c15t-embed-root';
		document.body.appendChild(containerEl);
	}
	return containerEl;
}

function showBanner(store: ConsentStore): void {
	if (bannerEl) return;

	const state = store.getState();
	const translations = extractTranslations(state);

	bannerEl = createBanner(
		{
			onAcceptAll: () => {
				store.getState().saveConsents('all');
			},
			onRejectAll: () => {
				store.getState().saveConsents('necessary');
			},
			onCustomize: () => {
				store.getState().setActiveUI('dialog');
			},
		},
		translations
	);

	getContainer().appendChild(bannerEl);
}

function hideBanner(): void {
	if (!bannerEl) return;

	bannerEl.style.animation =
		'c15t-fade-out var(--c15t-duration-fast, 150ms) var(--c15t-easing, ease) forwards';

	const el = bannerEl;
	bannerEl = null;

	setTimeout(() => {
		el.remove();
	}, 200);
}

function showDialog(store: ConsentStore): void {
	if (dialogInstance) return;

	dialogInstance = createDialog(store);
	document.body.appendChild(dialogInstance.element);
}

function hideDialog(): void {
	if (!dialogInstance) return;

	dialogInstance.destroy();
	dialogInstance = null;
}

function extractTranslations(state: ReturnType<ConsentStore['getState']>) {
	const t = state.translationConfig;
	if (!t?.translations) return undefined;

	const translations = t.translations as Record<
		string,
		Record<string, string> | undefined
	>;

	// Only include defined values — undefined would override defaults in the banner
	const result: Record<string, string> = {};
	if (translations.cookieBanner?.title)
		result.title = translations.cookieBanner.title;
	if (translations.cookieBanner?.description)
		result.description = translations.cookieBanner.description;
	if (translations.common?.acceptAll)
		result.acceptAll = translations.common.acceptAll;
	if (translations.common?.rejectAll)
		result.rejectAll = translations.common.rejectAll;
	if (translations.common?.customize)
		result.customize = translations.common.customize;

	return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Creates the UI renderer that subscribes to the consent store
 * and shows/hides the banner/dialog based on `activeUI` state.
 */
export function createUIRenderer(store: ConsentStore): void {
	injectThemeCSS();

	store.subscribe((state) => {
		switch (state.activeUI) {
			case 'banner':
				hideDialog();
				showBanner(store);
				break;

			case 'dialog':
				hideBanner();
				showDialog(store);
				break;

			case 'none':
				hideBanner();
				hideDialog();
				break;
		}
	});

	// Check initial state
	const initialState = store.getState();
	if (initialState.activeUI === 'banner') {
		showBanner(store);
	} else if (initialState.activeUI === 'dialog') {
		showDialog(store);
	}
}

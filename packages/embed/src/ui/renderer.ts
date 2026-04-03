/**
 * UI Renderer — orchestrates consent banner/dialog visibility
 * by subscribing to the Zustand vanilla store.
 */

import type { ConsentRuntimeResult } from 'c15t';
import { animateBannerOut, createBanner } from './banner';
import { createDialog } from './dialog';

type ConsentStore = ConsentRuntimeResult['consentStore'];

let bannerEl: HTMLElement | null = null;
let dialogInstance: { element: HTMLElement; destroy: () => void } | null = null;

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

	document.body.appendChild(bannerEl);
}

function hideBanner(): void {
	if (!bannerEl) return;

	const el = bannerEl;
	bannerEl = null;

	animateBannerOut(el, () => el.remove());
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

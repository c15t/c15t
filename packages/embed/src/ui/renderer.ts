/**
 * UI Renderer — orchestrates consent banner/dialog visibility
 * by subscribing to the Zustand vanilla store.
 */

import type { ConsentRuntimeResult } from 'c15t';
import { createBanner } from './banner';
import { injectThemeCSS } from './theme';

type ConsentStore = ConsentRuntimeResult['consentStore'];

let bannerEl: HTMLElement | null = null;
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
	if (bannerEl) return; // Already showing

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

	// Animate out
	bannerEl.style.animation =
		'c15t-fade-out var(--c15t-duration-fast, 150ms) var(--c15t-easing, ease) forwards';

	const el = bannerEl;
	bannerEl = null;

	setTimeout(() => {
		el.remove();
	}, 200);
}

function extractTranslations(state: ReturnType<ConsentStore['getState']>) {
	const t = state.translationConfig;
	if (!t?.translations) return undefined;

	const translations = t.translations as Record<
		string,
		Record<string, string> | undefined
	>;
	return {
		title: translations.cookieBanner?.title,
		description: translations.cookieBanner?.description,
		acceptAll: translations.common?.acceptAll,
		rejectAll: translations.common?.rejectAll,
		customize: translations.common?.customize,
	};
}

/**
 * Creates the UI renderer that subscribes to the consent store
 * and shows/hides the banner based on `activeUI` state.
 */
export function createUIRenderer(store: ConsentStore): void {
	// Inject theme CSS variables
	injectThemeCSS();

	// Subscribe to store changes
	store.subscribe((state) => {
		switch (state.activeUI) {
			case 'banner':
				showBanner(store);
				break;

			case 'dialog':
				// TODO: Phase 5 — show dialog with category toggles
				hideBanner();
				break;

			case 'none':
				hideBanner();
				break;
		}
	});

	// Check initial state — if banner should be shown immediately
	const initialState = store.getState();
	if (initialState.activeUI === 'banner') {
		showBanner(store);
	}
}

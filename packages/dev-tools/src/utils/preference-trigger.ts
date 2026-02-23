/**
 * Preference Trigger Utilities
 * Functions for detecting and interacting with the PreferenceCenterTrigger
 */

/**
 * Selectors used to find preference trigger elements
 */
const PREFERENCE_TRIGGER_SELECTORS = [
	'[data-c15t-trigger]',
	'[aria-label*="privacy settings" i]',
	'[aria-label*="preference" i]',
].join(', ');

const PREVIOUS_DISPLAY_ATTR = 'data-c15t-devtools-prev-display';

/**
 * Detects if a preference center trigger element exists in the DOM
 */
export function detectPreferenceTrigger(): boolean {
	const triggers = document.querySelectorAll(PREFERENCE_TRIGGER_SELECTORS);
	return triggers.length > 0;
}

/**
 * Gets all preference trigger elements in the DOM
 */
export function getPreferenceTriggerElements(): NodeListOf<HTMLElement> {
	return document.querySelectorAll(
		PREFERENCE_TRIGGER_SELECTORS
	) as NodeListOf<HTMLElement>;
}

/**
 * Sets the visibility of all preference trigger elements
 */
export function setPreferenceTriggerVisibility(visible: boolean): void {
	const elements = getPreferenceTriggerElements();
	for (const el of elements) {
		if (visible) {
			const previousDisplay = el.getAttribute(PREVIOUS_DISPLAY_ATTR);
			if (previousDisplay === null) {
				el.style.removeProperty('display');
			} else {
				el.style.display = previousDisplay;
				el.removeAttribute(PREVIOUS_DISPLAY_ATTR);
			}
			continue;
		}

		if (!el.hasAttribute(PREVIOUS_DISPLAY_ATTR)) {
			el.setAttribute(PREVIOUS_DISPLAY_ATTR, el.style.display);
		}
		el.style.display = 'none';
	}
}

/**
 * Gets the preference center opener function from the c15t store
 * Returns null if the store is not available or doesn't have the required method
 */
export function getPreferenceCenterOpener(
	namespace = 'c15tStore'
): (() => void) | null {
	const win = window as unknown as Record<string, unknown>;
	const store = win[namespace] as
		| Record<string, (...args: unknown[]) => unknown>
		| undefined;

	if (store && typeof store.getState === 'function') {
		const state = store.getState() as Record<string, unknown>;
		if (typeof state.setActiveUI === 'function') {
			return () => {
				(state.setActiveUI as (ui: string) => void)('dialog');
			};
		}
	}

	return null;
}

/**
 * Opens the preference center if available
 * @returns true if the preference center was opened, false otherwise
 */
export function openPreferenceCenter(namespace = 'c15tStore'): boolean {
	const opener = getPreferenceCenterOpener(namespace);
	if (opener) {
		opener();
		return true;
	}
	return false;
}

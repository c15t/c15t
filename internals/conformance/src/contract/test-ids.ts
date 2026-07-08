/**
 * Canonical data-testid contract. Every test-id emitted by prebuilt UI in any
 * framework (@c15t/react, @c15t/svelte, @c15t/vue, @c15t/solid) MUST appear in
 * this file. The `testid-lint` rule enforces this at build time.
 *
 * Naming rules:
 * - kebab-case only
 * - prefix by component family: `consent-banner-*`, `consent-dialog-*`,
 *   `consent-widget-*`, `iab-consent-banner-*`, `iab-consent-dialog-*`,
 *   `frame-*`, `branding-*`
 * - interpolated test-ids use a suffix token documented in PATTERNS below
 */

export const TEST_IDS = {
	consentBanner: {
		root: 'consent-banner-root',
		card: 'consent-banner-card',
		overlay: 'consent-banner-overlay',
		header: 'consent-banner-header',
		title: 'consent-banner-title',
		description: 'consent-banner-description',
		footer: 'consent-banner-footer',
		footerSubGroup: 'consent-banner-footer-sub-group',
		branding: 'consent-banner-branding',
		acceptButton: 'consent-banner-accept-button',
		rejectButton: 'consent-banner-reject-button',
		customizeButton: 'consent-banner-customize-button',
	},
	consentDialog: {
		root: 'consent-dialog-root',
		card: 'consent-dialog-card',
		overlay: 'consent-dialog-overlay',
		header: 'consent-dialog-header',
		title: 'consent-dialog-title',
		description: 'consent-dialog-description',
		content: 'consent-dialog-content',
		footer: 'consent-dialog-footer',
		branding: 'consent-dialog-branding',
		link: 'consent-dialog-link',
		trigger: 'consent-dialog-trigger',
		// Vue reusable legal-links wrapper; React exposes per-link ids only.
		legalLinks: 'consent-legal-links',
	},
	consentWidget: {
		root: 'consent-widget-root',
		branding: 'consent-widget-branding',
		accordion: 'consent-widget-accordion',
		footer: 'consent-widget-footer',
		footerSubGroup: 'consent-widget-footer-sub-group',
		rejectButton: 'consent-widget-reject-button',
		footerAcceptAllButton: 'consent-widget-footer-accept-all-button',
		/** React v3 widget variant of the accept action. */
		footerAcceptButton: 'consent-widget-footer-accept-button',
		footerCustomizeButton: 'consent-widget-footer-customize-button',
		footerSaveButton: 'consent-widget-footer-save-button',
	},
	consentManager: {
		root: 'consent-manager-root',
		accordion: 'consent-manager-accordion',
		footer: 'consent-manager-footer',
	},
	/** Standalone consent atoms rendered by the Vue kernel components. */
	consentAtoms: {
		actions: 'consent-actions',
		description: 'consent-description',
		legalLinks: 'consent-legal-links',
		link: 'consent-link',
		switch: 'consent-switch',
		tag: 'consent-tag',
	},
	iabConsentBanner: {
		root: 'iab-consent-banner-root',
		card: 'iab-consent-banner-card',
		overlay: 'iab-consent-banner-overlay',
		header: 'iab-consent-banner-header',
		footer: 'iab-consent-banner-footer',
		branding: 'iab-consent-banner-branding',
		acceptButton: 'iab-consent-banner-accept-button',
		rejectButton: 'iab-consent-banner-reject-button',
		customizeButton: 'iab-consent-banner-customize-button',
		// Opens the IAB dialog on the vendors tab; Vue-only surface affordance.
		partnersLink: 'iab-consent-banner-partners-link',
	},
	iabConsentDialog: {
		root: 'iab-consent-dialog-root',
		card: 'iab-consent-dialog-card',
		overlay: 'iab-consent-dialog-overlay',
		branding: 'iab-consent-dialog-branding',
		// Close affordance rendered by the Vue IAB dialog card.
		closeButton: 'iab-consent-dialog-close',
	},
	vuePrimitive: {
		// Generic Vue wrapper around rendered policy action buttons.
		actions: 'consent-actions',
		// Generic Vue switch story/IAB switch id; consent-widget switches use patterned ids.
		switch: 'consent-switch',
	},
	frame: {
		placeholder: 'frame-placeholder',
		openDialog: 'frame-open-dialog',
	},
	branding: {
		icon: 'branding-icon',
		link: 'branding-link',
	},
	consentPreferencesAnchor: 'consent-preferences-anchor',
} as const;

/**
 * Patterns for interpolated test-ids (variable suffixes).
 * testid-lint treats a matching prefix as valid; each capture group must be a
 * kebab-case identifier ([a-z][a-z0-9-]*).
 */
export const TEST_ID_PATTERNS = [
	/^consent-banner-legal-link-(privacyPolicy|cookiePolicy|termsOfService)$/,
	/^consent-dialog-legal-link-(privacyPolicy|cookiePolicy|termsOfService)$/,
	/^consent-widget-accordion-item-[a-z][a-z0-9-]*$/,
	/^consent-widget-accordion-trigger-[a-z][a-z0-9-]*$/,
	/^consent-widget-accordion-arrow-[a-z][a-z0-9-]*$/,
	/^consent-widget-accordion-content-[a-z][a-z0-9-]*$/,
	/^consent-widget-switch-[a-z][a-z0-9-]*$/,
	/^stack-item-[a-z0-9][a-z0-9-]*$/,
	/^purpose-item-[a-z0-9][a-z0-9-]*$/,
	/^vendor-[a-z0-9][a-z0-9-]*$/,
] as const;

/**
 * Flat list of every literal test-id. Computed at module load for lint lookup.
 */
function flatten(value: unknown, out: Set<string>): void {
	if (typeof value === 'string') {
		out.add(value);
		return;
	}
	if (value && typeof value === 'object') {
		for (const v of Object.values(value)) flatten(v, out);
	}
}

const allIds = new Set<string>();
flatten(TEST_IDS, allIds);

export const ALL_TEST_IDS: ReadonlySet<string> = allIds;

/**
 * Returns true if `id` matches a canonical constant or an interpolated pattern.
 * Used by the static lint.
 */
export function isCanonicalTestId(id: string): boolean {
	if (ALL_TEST_IDS.has(id)) return true;
	return TEST_ID_PATTERNS.some((re) => re.test(id));
}

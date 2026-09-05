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
	branding: {
		icon: 'branding-icon',
		link: 'branding-link',
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
	consentBanner: {
		acceptButton: 'consent-banner-accept-button',
		branding: 'consent-banner-branding',
		card: 'consent-banner-card',
		customizeButton: 'consent-banner-customize-button',
		description: 'consent-banner-description',
		footer: 'consent-banner-footer',
		footerSubGroup: 'consent-banner-footer-sub-group',
		header: 'consent-banner-header',
		overlay: 'consent-banner-overlay',
		rejectButton: 'consent-banner-reject-button',
		root: 'consent-banner-root',
		title: 'consent-banner-title',
	},
	consentDialog: {
		branding: 'consent-dialog-branding',
		card: 'consent-dialog-card',
		content: 'consent-dialog-content',
		description: 'consent-dialog-description',
		footer: 'consent-dialog-footer',
		header: 'consent-dialog-header',
		// Vue reusable legal-links wrapper; React exposes per-link ids only.
		legalLinks: 'consent-legal-links',

		link: 'consent-dialog-link',
		overlay: 'consent-dialog-overlay',
		root: 'consent-dialog-root',
		title: 'consent-dialog-title',
		trigger: 'consent-dialog-trigger',
	},
	consentManager: {
		accordion: 'consent-manager-accordion',
		footer: 'consent-manager-footer',
		root: 'consent-manager-root',
	},
	consentPreferencesAnchor: 'consent-preferences-anchor',
	consentWidget: {
		accordion: 'consent-widget-accordion',
		branding: 'consent-widget-branding',
		footer: 'consent-widget-footer',
		footerAcceptAllButton: 'consent-widget-footer-accept-all-button',
		/** React v3 widget variant of the accept action. */
		footerAcceptButton: 'consent-widget-footer-accept-button',
		footerCustomizeButton: 'consent-widget-footer-customize-button',
		footerSaveButton: 'consent-widget-footer-save-button',
		footerSubGroup: 'consent-widget-footer-sub-group',
		rejectButton: 'consent-widget-reject-button',
		root: 'consent-widget-root',
	},
	frame: {
		openDialog: 'frame-open-dialog',
		placeholder: 'frame-placeholder',
	},
	iabConsentBanner: {
		acceptButton: 'iab-consent-banner-accept-button',
		branding: 'iab-consent-banner-branding',
		card: 'iab-consent-banner-card',
		customizeButton: 'iab-consent-banner-customize-button',
		footer: 'iab-consent-banner-footer',
		header: 'iab-consent-banner-header',
		overlay: 'iab-consent-banner-overlay',
		// Opens the IAB dialog on the vendors tab; Vue-only surface affordance.
		partnersLink: 'iab-consent-banner-partners-link',

		rejectButton: 'iab-consent-banner-reject-button',
		root: 'iab-consent-banner-root',
	},
	iabConsentDialog: {
		branding: 'iab-consent-dialog-branding',
		card: 'iab-consent-dialog-card',
		// Close affordance rendered by the Vue IAB dialog card.
		closeButton: 'iab-consent-dialog-close',

		overlay: 'iab-consent-dialog-overlay',
		root: 'iab-consent-dialog-root',
	},
	vuePrimitive: {
		// Generic Vue wrapper around rendered policy action buttons.
		actions: 'consent-actions',
		// Generic Vue switch story/IAB switch id; consent-widget switches use patterned ids.
		switch: 'consent-switch',
	},
} as const;

/**
 * Patterns for interpolated test-ids (variable suffixes).
 * testid-lint treats a matching prefix as valid; each capture group must be a
 * kebab-case identifier ([a-z][a-z0-9-]*).
 */
export const TEST_ID_PATTERNS = [
	/^consent-banner-legal-link-(?:privacyPolicy|cookiePolicy|termsOfService)$/u,
	/^consent-dialog-legal-link-(?:privacyPolicy|cookiePolicy|termsOfService)$/u,
	/^consent-widget-accordion-item-[a-z][a-z0-9-]*$/u,
	/^consent-widget-accordion-trigger-[a-z][a-z0-9-]*$/u,
	/^consent-widget-accordion-arrow-[a-z][a-z0-9-]*$/u,
	/^consent-widget-accordion-content-[a-z][a-z0-9-]*$/u,
	/^consent-widget-switch-[a-z][a-z0-9-]*$/u,
	/^stack-item-[a-z0-9][a-z0-9-]*$/u,
	/^purpose-item-[a-z0-9][a-z0-9-]*$/u,
	// A GVL numbers purposes, special purposes, features and special
	// features independently, so `1` names four different rows. The
	// display model in `@c15t/iab/headless` namespaces them; these are the
	// three namespaces `purpose-item-*` does not already cover.
	/^special-purpose-item-[a-z0-9][a-z0-9-]*$/u,
	/^special-feature-item-[a-z0-9][a-z0-9-]*$/u,
	/^feature-item-[a-z0-9][a-z0-9-]*$/u,
	/^vendor-[a-z0-9][a-z0-9-]*$/u,
] as const;

/**
 * Flat list of every literal test-id. Computed at module load for lint lookup.
 */
const flatten = function flatten(value: unknown, out: Set<string>): void {
	if (typeof value === 'string') {
		out.add(value);
		return;
	}
	if (value && typeof value === 'object') {
		for (const v of Object.values(value)) {
			flatten(v, out);
		}
	}
};

const allIds = new Set<string>();
flatten(TEST_IDS, allIds);

export const ALL_TEST_IDS: ReadonlySet<string> = allIds;

/**
 * Returns true if `id` matches a canonical constant or an interpolated pattern.
 * Used by the static lint.
 */
export const isCanonicalTestId = function isCanonicalTestId(
	id: string
): boolean {
	if (ALL_TEST_IDS.has(id)) {
		return true;
	}
	return TEST_ID_PATTERNS.some((re) => re.test(id));
};

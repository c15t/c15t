import type { AllThemeKeys, ComponentSlots } from '@c15t/ui/theme';

/**
 * The `theme.slots` keys the stock UI renders, the same keys `@c15t/ui`
 * and `@c15t/svelte` read. Each names one element, which also carries the
 * key as a CSS part so page CSS can reach it through `::part()`.
 */
export type BrowserSlotKey = Extract<
	AllThemeKeys,
	| 'consentBanner'
	| 'consentBannerCard'
	| 'consentBannerHeader'
	| 'consentBannerTitle'
	| 'consentBannerDescription'
	| 'consentBannerFooter'
	| 'consentBannerFooterSubGroup'
	| 'consentBannerRightLink'
	| 'consentBannerTag'
	| 'consentBannerOverlay'
	| 'consentDialog'
	| 'consentDialogCard'
	| 'consentDialogHeader'
	| 'consentDialogTitle'
	| 'consentDialogDescription'
	| 'consentDialogContent'
	| 'consentDialogTag'
	| 'consentDialogOverlay'
	| 'consentDialogTrigger'
	| 'consentDialogTriggerIcon'
	| 'consentWidget'
	| 'consentWidgetAccordion'
	| 'consentWidgetFooter'
	| 'consentWidgetFooterSubGroup'
	| 'consentWidgetTag'
	| 'iabConsentBanner'
	| 'iabConsentBannerCard'
	| 'iabConsentBannerHeader'
	| 'iabConsentBannerFooter'
	| 'iabConsentBannerTag'
	| 'iabConsentBannerOverlay'
	| 'iabConsentDialog'
	| 'iabConsentDialogCard'
	| 'iabConsentDialogHeader'
	| 'iabConsentDialogFooter'
	| 'iabConsentDialogTag'
	| 'iabConsentDialogOverlay'
	| 'buttonPrimary'
	| 'buttonSecondary'
	| 'toggle'
>;

/**
 * Marks an element as a slot and applies the theme's overrides for it.
 * Passes `null` through, for parts that may not render.
 */
export type SlotApplier = <ElementType extends HTMLElement | null>(
	element: ElementType,
	key: BrowserSlotKey
) => ElementType;

const toCSSProperty = function toCSSProperty(name: string): string {
	if (name.startsWith('--') || name.includes('-')) {
		return name;
	}
	const kebab = name.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
	// `msTransform` has no leading capital but still takes a vendor dash.
	return kebab.startsWith('ms-') ? `-${kebab}` : kebab;
};

/**
 * Build the function surfaces call on each slotted element.
 *
 * The element gets the slot key in its `part` attribute, the slot's
 * classes after the stock ones, and the slot's `style` inline. A slot with
 * `noStyle: true` replaces the stock classes of that element instead.
 * Slot classes stay when the mount's `noStyle` drops the stock ones, the
 * way `resolveStyles` in `@c15t/ui` keeps overrides.
 *
 * @param slots - The theme's `slots`.
 * @returns The applier.
 */
export const createSlotApplier = function createSlotApplier(
	slots: ComponentSlots | undefined
): SlotApplier {
	return (element, key) => {
		if (!element) {
			return element;
		}
		// `part` is a token list, like `class`; applying twice is a no-op.
		const parts = element.getAttribute('part')?.split(/\s+/u) ?? [];
		if (!parts.includes(key)) {
			element.setAttribute('part', [...parts, key].filter(Boolean).join(' '));
		}
		const value = slots?.[key];
		if (!value) {
			return element;
		}
		const { className, noStyle, style } =
			typeof value === 'string' ? { className: value } : value;
		if (noStyle) {
			element.removeAttribute('class');
		}
		const names = className?.split(/\s+/u).filter(Boolean) ?? [];
		if (names.length > 0) {
			element.classList.add(...names);
		}
		for (const [name, declared] of Object.entries(style ?? {})) {
			if (declared !== undefined && declared !== null && declared !== '') {
				element.style.setProperty(toCSSProperty(name), String(declared));
			}
		}
		return element;
	};
};

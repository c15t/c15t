/**
 * `theme.slots` for the React and Vue dialog islands.
 *
 * The Astro banner and the Svelte island read `theme.slots` (keys such as
 * `consentDialogCard`). React and Vue style the same parts through their
 * `components` option instead (`dialog.card`), so the adapters translate
 * one into the other rather than asking a site to configure both.
 */

import type { ConsentComponentSlotKey } from '@c15t/schema/config';
import type { AllThemeKeys, Theme } from '@c15t/ui/theme';

/**
 * The `components` slot for each `theme.slots` key with an equivalent.
 * `frame` and `consentDialogFooter` have none: the islands render no frame,
 * and the stock dialog's footer is the widget's (`consentWidgetFooter`).
 */
export const THEME_SLOT_COMPONENT_KEYS = {
	buttonPrimary: 'button.primary',
	buttonSecondary: 'button.secondary',
	consentBanner: 'banner.root',
	consentBannerCard: 'banner.card',
	consentBannerDescription: 'description.banner',
	consentBannerFooter: 'banner.footer',
	consentBannerFooterSubGroup: 'banner.actionGroup',
	consentBannerHeader: 'banner.header',
	consentBannerOverlay: 'banner.overlay',
	consentBannerRightLink: 'banner.rightLink',
	consentBannerRights: 'banner.rights',
	consentBannerTag: 'tag.banner',
	consentBannerTitle: 'banner.title',
	consentDialog: 'dialog.container',
	consentDialogCard: 'dialog.card',
	consentDialogContent: 'dialog.content',
	consentDialogDescription: 'description.dialog',
	consentDialogHeader: 'dialog.header',
	consentDialogOverlay: 'dialog.overlay',
	consentDialogTag: 'tag.dialog',
	consentDialogTitle: 'dialog.title',
	consentDialogTrigger: 'trigger.root',
	consentDialogTriggerIcon: 'trigger.icon',
	consentDialogTriggerToolbar: 'trigger.toolbar',
	consentDialogTriggerToolbarIcon: 'trigger.toolbarIcon',
	consentDialogTriggerToolbarItem: 'trigger.toolbarItem',
	consentWidget: 'manager.root',
	consentWidgetAccordion: 'accordion.root',
	consentWidgetFooter: 'manager.footer',
	consentWidgetFooterSubGroup: 'manager.actionGroup',
	consentWidgetTag: 'tag.manager',
	iabConsentBanner: 'iab-banner.root',
	iabConsentBannerCard: 'iab-banner.card',
	iabConsentBannerFooter: 'iab-banner.footer',
	iabConsentBannerHeader: 'iab-banner.header',
	iabConsentBannerOverlay: 'iab-banner.overlay',
	iabConsentBannerTag: 'tag.iab-banner',
	iabConsentDialog: 'iab-dialog.root',
	iabConsentDialogCard: 'iab-dialog.card',
	iabConsentDialogFooter: 'iab-dialog.footer',
	iabConsentDialogHeader: 'iab-dialog.header',
	iabConsentDialogOverlay: 'iab-dialog.overlay',
	iabConsentDialogTag: 'tag.iab-dialog',
	toggle: 'switch.root',
} as const satisfies Partial<Record<AllThemeKeys, ConsentComponentSlotKey>>;

/** Attributes one `components` slot binds. */
export type SlotAttributes = Record<string, unknown>;

/** A `components` map, grouped the way `ConsentComponentSlots` is. */
export type ComponentSlotMap = Record<string, Record<string, SlotAttributes>>;

/**
 * Translate `theme.slots` into a `components` map.
 *
 * Each slot's classes and `style` become the attributes the framework
 * binds: `className` for React, `class` for Vue. A slot's `noStyle` flag
 * has no `components` equivalent and is dropped: the slot's classes still
 * apply, on top of the stock ones.
 *
 * @param theme - The integration's `theme`.
 * @param classAttribute - The attribute the framework reads classes from.
 * @returns The map, or `undefined` when the theme has no slots.
 */
export const themeSlotsToComponents = function themeSlotsToComponents(
	theme: Theme | undefined,
	classAttribute: 'className' | 'class'
): ComponentSlotMap | undefined {
	const slots = theme?.slots;
	if (!slots) {
		return undefined;
	}
	const components: ComponentSlotMap = {};
	for (const [key, target] of Object.entries(THEME_SLOT_COMPONENT_KEYS)) {
		const value = slots[key as keyof typeof THEME_SLOT_COMPONENT_KEYS];
		if (!value) {
			continue;
		}
		const { className, style } =
			typeof value === 'string'
				? { className: value, style: undefined }
				: value;
		const attributes: SlotAttributes = {};
		if (className) {
			attributes[classAttribute] = className;
		}
		if (style && Object.keys(style).length > 0) {
			attributes.style = style;
		}
		const [group, slot] = target.split('.') as [string, string];
		components[group] = { ...components[group], [slot]: attributes };
	}
	return components;
};

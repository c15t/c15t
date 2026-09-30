import type { AllThemeKeys, SlotStyle } from '../theme/types';

/**
 * The `components` slot that styles the same part as each `theme.slots`
 * key.
 *
 * The script tag, Svelte and Astro read `theme.slots` (keys such as
 * `consentDialogCard`). React and Vue style the same parts through their
 * `components` option (`dialog.card`), and translate `theme.slots` into it
 * with {@link applyThemeSlots}, so a theme's slots style the same parts in
 * every adapter. Every slot key has an entry, so a new slot cannot ship
 * without one.
 *
 * @internal
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
} as const satisfies Record<AllThemeKeys, `${string}.${string}`>;

/** The attributes one `components` slot binds. */
export type ComponentSlotAttributes = Record<string, unknown>;

/** A `components` map, grouped the way `ConsentComponentSlots` is. */
export type ComponentSlotMap = Record<
	string,
	Record<string, ComponentSlotAttributes | undefined> | undefined
>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Put one slot's attributes from `theme.slots` under the ones `components`
 * sets for the same part. Classes from both apply, theme first. Inline
 * styles merge, with `components` winning per property. Any other attribute
 * set in `components` replaces the theme's.
 */
const mergeSlot = function mergeSlot(
	fromTheme: ComponentSlotAttributes,
	explicit: ComponentSlotAttributes | undefined,
	classAttribute: 'className' | 'class'
): ComponentSlotAttributes {
	if (!explicit) {
		return fromTheme;
	}
	const merged: ComponentSlotAttributes = { ...fromTheme, ...explicit };
	const themeClass = fromTheme[classAttribute];
	const explicitClass = explicit[classAttribute];
	if (themeClass && explicitClass) {
		merged[classAttribute] =
			typeof explicitClass === 'string'
				? `${String(themeClass)} ${explicitClass}`
				: // Vue binds arrays and objects as classes too.
					[themeClass, explicitClass];
	}
	const themeStyle = fromTheme.style;
	const explicitStyle = explicit.style;
	if (themeStyle && explicitStyle) {
		merged.style = isPlainObject(explicitStyle)
			? { ...(themeStyle as Record<string, unknown>), ...explicitStyle }
			: // Vue binds style strings and arrays too.
				[themeStyle, explicitStyle];
	}
	return merged;
};

/**
 * Translate `theme.slots` into a `components` map and merge it under the
 * map a React or Vue app passes itself.
 *
 * Each slot's classes and `style` become the attributes the framework
 * binds: `className` for React, `class` for Vue. A slot's `noStyle` flag
 * has no `components` equivalent and is dropped: the slot's classes still
 * apply, on top of the stock ones.
 *
 * @param slots - The theme's `slots`.
 * @param components - The app's own `components` map, which wins where both
 * set the same attribute.
 * @param classAttribute - The attribute the framework reads classes from.
 * @returns The merged map, or `components` unchanged when the theme has no
 * slots.
 *
 * @internal
 * @example
 * ```ts
 * applyThemeSlots(
 * 	{ consentBannerCard: 'rounded-none' },
 * 	{ banner: { card: { 'data-brand': 'on' } } },
 * 	'className'
 * );
 * // { banner: { card: { className: 'rounded-none', 'data-brand': 'on' } } }
 * ```
 */
export const applyThemeSlots = function applyThemeSlots<
	Components extends object,
>(
	slots: Partial<Record<AllThemeKeys, SlotStyle>> | undefined,
	components: Components | undefined,
	classAttribute: 'className' | 'class'
): Components | undefined {
	if (!slots) {
		return components;
	}
	const merged: ComponentSlotMap = { ...(components as ComponentSlotMap) };
	let applied = false;
	for (const [key, target] of Object.entries(THEME_SLOT_COMPONENT_KEYS)) {
		const value = slots[key as AllThemeKeys];
		if (!value) {
			continue;
		}
		const { className, style } =
			typeof value === 'string'
				? { className: value, style: undefined }
				: value;
		const attributes: ComponentSlotAttributes = {};
		if (className) {
			attributes[classAttribute] = className;
		}
		if (style && Object.keys(style).length > 0) {
			attributes.style = style;
		}
		if (Object.keys(attributes).length === 0) {
			continue;
		}
		const [group, slot] = target.split('.') as [string, string];
		const groupSlots = { ...merged[group] };
		groupSlots[slot] = mergeSlot(attributes, groupSlots[slot], classAttribute);
		merged[group] = groupSlots;
		applied = true;
	}
	return applied ? (merged as Components) : components;
};

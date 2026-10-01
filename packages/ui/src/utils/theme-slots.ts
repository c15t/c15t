import type { AllThemeKeys, CSSProperties, SlotStyle } from '../theme/types';

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
	consentGate: 'consent-gate.root',
	consentGateButton: 'consent-gate.button',
	consentGateTitle: 'consent-gate.title',
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
 * styles merge, with `components` winning per property. `noStyle` from
 * either side applies, as in `resolveStyles`. Any other attribute set in
 * `components` replaces the theme's.
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
	if (fromTheme.noStyle === true || explicit.noStyle === true) {
		merged.noStyle = true;
	}
	const themeClass = fromTheme[classAttribute];
	const explicitClass = explicit[classAttribute];
	if (themeClass && explicitClass) {
		// Vue binds arrays and objects as classes too, so a non-string class
		// keeps both values in an array.
		merged[classAttribute] =
			typeof explicitClass === 'string'
				? `${String(themeClass)} ${explicitClass}`
				: [themeClass, explicitClass];
	}
	const themeStyle = fromTheme.style;
	const explicitStyle = explicit.style;
	if (themeStyle && explicitStyle) {
		// Vue binds style strings and arrays too, so a style that is not a
		// plain object keeps both values in an array.
		merged.style = isPlainObject(explicitStyle)
			? { ...(themeStyle as Record<string, unknown>), ...explicitStyle }
			: [themeStyle, explicitStyle];
	}
	return merged;
};

/**
 * Properties whose numeric values take no unit, in kebab-case without a
 * vendor prefix. Mirrors React's `isUnitlessNumber` list, so a slot style
 * renders the same declaration in every adapter.
 */
const UNITLESS_PROPERTIES = new Set([
	'animation-iteration-count',
	'aspect-ratio',
	'border-image-outset',
	'border-image-slice',
	'border-image-width',
	'box-flex',
	'box-flex-group',
	'box-ordinal-group',
	'column-count',
	'columns',
	'fill-opacity',
	'flex',
	'flex-grow',
	'flex-negative',
	'flex-order',
	'flex-positive',
	'flex-shrink',
	'flood-opacity',
	'font-weight',
	'grid-area',
	'grid-column',
	'grid-column-end',
	'grid-column-span',
	'grid-column-start',
	'grid-row',
	'grid-row-end',
	'grid-row-span',
	'grid-row-start',
	'line-clamp',
	'line-height',
	'opacity',
	'order',
	'orphans',
	'scale',
	'stop-opacity',
	'stroke-dasharray',
	'stroke-dashoffset',
	'stroke-miterlimit',
	'stroke-opacity',
	'stroke-width',
	'tab-size',
	'widows',
	'z-index',
	'zoom',
]);

/**
 * Turn a style key into a CSS property name.
 *
 * camelCase keys, the form React and Vue styles use, become kebab-case
 * (`backgroundColor` to `background-color`, `WebkitMask` to
 * `-webkit-mask`, `msFlex` to `-ms-flex`). Custom properties (`--brand`)
 * and keys that already contain a dash are kept as written.
 *
 * @param name - The style key.
 * @returns The CSS property name.
 * @internal
 */
export const toCSSPropertyName = function toCSSPropertyName(
	name: string
): string {
	if (name.includes('-')) {
		return name;
	}
	return name
		.replace(/^ms(?=[A-Z])/u, '-ms')
		.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
};

/**
 * Turn a style value into the text a CSS declaration takes.
 *
 * A number gets `px` unless the property is unitless (`opacity`,
 * `zIndex`, `flexGrow`, `lineHeight`, ...) or a custom property, and `0`
 * stays `0`, the way React writes numeric styles. Strings pass through.
 *
 * @param name - The style key, camelCase or kebab-case.
 * @param value - The declared value.
 * @returns The CSS value.
 * @internal
 *
 * @example
 * ```ts
 * toCSSValue('padding', 8); // '8px'
 * toCSSValue('zIndex', 10); // '10'
 * ```
 */
export const toCSSValue = function toCSSValue(
	name: string,
	value: string | number
): string {
	if (typeof value !== 'number' || value === 0 || name.startsWith('--')) {
		return String(value);
	}
	const property = toCSSPropertyName(name).replace(
		/^-(?:webkit|moz|ms|o)-/u,
		''
	);
	return UNITLESS_PROPERTIES.has(property) ? String(value) : `${value}px`;
};

/**
 * A slot style with numeric values written as CSS text, so `{ padding: 8 }`
 * reaches the element as `8px` in adapters that pass style objects through
 * unchanged, such as Vue. React renders either form the same way.
 */
const withCSSLengths = function withCSSLengths(
	style: CSSProperties
): CSSProperties {
	return Object.fromEntries(
		Object.entries(style).map(([name, value]) => [
			name,
			typeof value === 'number' ? toCSSValue(name, value) : value,
		])
	);
};

/**
 * Translate `theme.slots` into a `components` map and merge it under the
 * map a React or Vue app passes itself.
 *
 * Each slot's classes and `style` become the attributes the framework
 * binds: `className` for React, `class` for Vue. A slot's `noStyle: true`
 * sets `noStyle: true` on the part, which drops that part's stock classes
 * and keeps the slot's, as in the other adapters. A `noStyle` set on the
 * part in `components` stays: either side turns it on.
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
		const { className, noStyle, style } =
			typeof value === 'string' ? { className: value } : value;
		const attributes: ComponentSlotAttributes = {};
		if (className) {
			attributes[classAttribute] = className;
		}
		if (style && Object.keys(style).length > 0) {
			attributes.style = withCSSLengths(style);
		}
		if (noStyle) {
			attributes.noStyle = true;
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

/**
 * The declarations a style object sets, as CSS property and value pairs.
 * Empty values (`undefined`, `null`, `''`) are dropped.
 *
 * @param style - A slot or component style object.
 * @returns `[property, value]` pairs, ready for `style.setProperty`.
 * @internal
 */
export const toCSSDeclarations = function toCSSDeclarations(
	style: CSSProperties | undefined
): [property: string, value: string][] {
	const declarations: [string, string][] = [];
	for (const [name, value] of Object.entries(style ?? {})) {
		if (value !== undefined && value !== null && value !== '') {
			declarations.push([toCSSPropertyName(name), toCSSValue(name, value)]);
		}
	}
	return declarations;
};

/**
 * Serialize a style object for a `style` attribute.
 *
 * @param style - A slot or component style object.
 * @returns The attribute value, or `undefined` when nothing is set.
 * @internal
 *
 * @example
 * ```ts
 * toStyleAttributeValue({ padding: 8, opacity: 0.5 });
 * // 'padding:8px;opacity:0.5'
 * ```
 */
export const toStyleAttributeValue = function toStyleAttributeValue(
	style: CSSProperties | undefined
): string | undefined {
	const declarations = toCSSDeclarations(style);
	return declarations.length > 0
		? declarations.map(([property, value]) => `${property}:${value}`).join(';')
		: undefined;
};

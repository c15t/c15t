import type { AllThemeKeys, Theme } from '@c15t/ui/theme';

/** One part's final `class` and inline `style`. */
export interface SlotBinding {
	class: string;
	style: string | undefined;
}

const toCSSProperty = function toCSSProperty(name: string): string {
	if (name.startsWith('--') || name.includes('-')) {
		return name;
	}
	const kebab = name.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
	// `msTransform` has no leading capital but still takes a vendor dash.
	return kebab.startsWith('ms-') ? `-${kebab}` : kebab;
};

/**
 * Merge a `theme.slots` entry over a part's stock classes.
 *
 * The slot's classes follow the stock ones, and its `style` object becomes
 * an inline `style` string. A slot with `noStyle: true` replaces the stock
 * classes of that part. Slot classes stay when the component's `noStyle`
 * already dropped the stock ones, as `resolveStyles` in `@c15t/ui` does.
 *
 * @param theme - The integration's `theme`.
 * @param key - The slot key, such as `consentBannerCard`.
 * @param stockClass - The part's stock classes, empty with `noStyle`.
 * @returns The part's `class` and `style`.
 */
export const resolveSlotBinding = function resolveSlotBinding(
	theme: Theme | undefined,
	key: AllThemeKeys,
	stockClass: string
): SlotBinding {
	const value = theme?.slots?.[key];
	if (!value) {
		return { class: stockClass, style: undefined };
	}
	const { className, noStyle, style } =
		typeof value === 'string' ? { className: value } : value;
	const declarations = Object.entries(style ?? {})
		.filter(([, declared]) => declared !== undefined && declared !== '')
		.map(([name, declared]) => `${toCSSProperty(name)}:${String(declared)}`);
	return {
		class: [noStyle ? '' : stockClass, className?.trim() ?? '']
			.filter(Boolean)
			.join(' '),
		style: declarations.length > 0 ? declarations.join(';') : undefined,
	};
};

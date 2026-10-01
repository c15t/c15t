import type { AllThemeKeys, Theme } from '@c15t/ui/theme';
import { toStyleAttributeValue } from '@c15t/ui/utils';

/** One part's final `class` and inline `style`. */
export interface SlotBinding {
	class: string;
	style: string | undefined;
}

/**
 * Merge a `theme.slots` entry over a part's stock classes.
 *
 * The slot's classes follow the stock ones, and its `style` object becomes
 * an inline `style` string, with `px` on numeric lengths. A slot with `noStyle: true` replaces the stock
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
	return {
		class: [noStyle ? '' : stockClass, className?.trim() ?? '']
			.filter(Boolean)
			.join(' '),
		// Numbers get `px` where the property takes a unit, as React does.
		style: toStyleAttributeValue(style),
	};
};

/**
 * A `components` part as the stock UI binds it: element attributes, plus
 * the `noStyle: true` that `theme.slots` can add through
 * `applyThemeSlots`.
 */
interface SlotPart {
	readonly class?: unknown;
	readonly style?: unknown;
	readonly noStyle?: unknown;
}

/**
 * The attributes to bind for a `components` part, together with the
 * element's stock classes.
 *
 * A part with `noStyle: true` drops `stock` and keeps its own `class`, the
 * way the other adapters treat a `theme.slots` entry with `noStyle`. The
 * flag itself is never bound, so it does not reach the DOM.
 *
 * @param part - The part from `config.components`.
 * @param stock - The classes the stock UI gives the element.
 * @returns Attributes for `v-bind`.
 * @internal
 *
 * @example
 * ```vue
 * <div v-bind="slotAttrs(config.components?.banner?.card, bannerStyles.card)" />
 * ```
 */
export const slotAttrs = function slotAttrs(
	part: SlotPart | undefined,
	stock?: unknown
): Record<string, unknown> {
	const { noStyle, ...attributes } = (part ?? {}) as Record<string, unknown>;
	const stockClass = noStyle === true ? undefined : stock;
	if (stockClass === undefined) {
		return attributes;
	}
	return {
		...attributes,
		class:
			attributes.class === undefined
				? stockClass
				: [stockClass, attributes.class],
	};
};

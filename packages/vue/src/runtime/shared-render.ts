/**
 * What the Nuxt plugin knows about the render it runs in.
 */
export interface SharedRenderInput {
	/**
	 * `nuxtApp.payload.prerenderedAt`. Nuxt sets it while it prerenders a
	 * route, and it stays in the payload the browser reads.
	 */
	prerenderedAt?: unknown;
	/**
	 * `event.context` of the request being rendered, on the server only.
	 * Nitro sets `cache` while a route cache rule renders the response it
	 * stores, and `_nitro.routeRules` for every request.
	 */
	eventContext?: Readonly<Record<string, unknown>>;
}

const isEnabled = (value: unknown): boolean =>
	value !== undefined && value !== null && value !== false;

const asRecord = (
	value: unknown
): Readonly<Record<string, unknown>> | undefined =>
	typeof value === 'object' && value !== null
		? (value as Record<string, unknown>)
		: undefined;

/**
 * Whether the HTML being rendered can be served to more than one visitor:
 * a prerendered route, or one a `cache`, `swr`, `isr` or `prerender` route
 * rule caches. Such HTML must not carry one visitor's consent, location or
 * request headers, and the browser must resolve the visitor itself.
 *
 * Nitro renders a cached route without the visitor's cookies or location
 * headers, so a cached render cannot know the visitor either way.
 *
 * @param input - The prerender marker and the request's event context.
 * @returns `true` when the render is shared between visitors.
 * @internal
 */
export const isSharedNuxtRender = function isSharedNuxtRender(
	input: SharedRenderInput
): boolean {
	if (isEnabled(input.prerenderedAt)) {
		return true;
	}
	const context = input.eventContext;
	if (isEnabled(context?.cache)) {
		return true;
	}
	const rules = asRecord(asRecord(context?._nitro)?.routeRules);
	if (!rules) {
		return false;
	}
	return (
		isEnabled(rules.cache) ||
		isEnabled(rules.isr) ||
		isEnabled(rules.swr) ||
		rules.prerender === true
	);
};

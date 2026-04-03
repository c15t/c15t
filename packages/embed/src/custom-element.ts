/**
 * Registers the `<c15t-script>` custom element.
 *
 * This element is inert — it never executes script content. It exists purely
 * as a declarative way for CMS users to mark scripts that should be consent-gated:
 *
 * ```html
 * <c15t-script category="marketing" src="https://ads.example.com/pixel.js" async></c15t-script>
 * ```
 *
 * The embed scanner reads its attributes and converts them into Script objects.
 * The actual script loading is handled by c15t's script loader.
 */
export function registerCustomElement(): void {
	if (customElements.get('c15t-script')) {
		return; // Already registered
	}

	customElements.define(
		'c15t-script',
		class C15tScript extends HTMLElement {
			// No shadow DOM, no rendering, no behavior.
			// connectedCallback is intentionally a no-op.
		}
	);
}

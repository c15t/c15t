/**
 * The preference dialog's stylesheets.
 *
 * `styles.css` is the only render-blocking stylesheet, and it carries only
 * what a first paint can show. The dialog's rules ship separately and are
 * needed once someone opens it. The islands cannot bring them along
 * themselves: Astro's production build drops the CSS a page script reaches
 * through a dynamic import, so the Svelte and Vue islands arrive with none.
 * Where a chunk does keep its CSS, the `<link>` Vite adds for it lives in
 * `<head>`, which the ClientRouter replaces on the next navigation, and
 * Vite never adds it again.
 *
 * So the integration hands the stylesheet URLs to the page script, and the
 * client links them itself before the island mounts, then carries the
 * links into every document the ClientRouter swaps in.
 */

/** Marks the `<link>` elements this module owns. */
export const DIALOG_STYLES_ATTRIBUTE = 'data-c15t-dialog-styles';

interface LinkedStylesheet {
	element: HTMLLinkElement;
	loaded: Promise<void>;
}

let registered: readonly string[] = [];
const linked = new Map<string, LinkedStylesheet>();

/**
 * Set the stylesheets the dialog needs. The integration calls this from the
 * page script it injects.
 *
 * @param hrefs - Stylesheet URLs, as the app's build emitted them.
 */
export const registerDialogStyles = function registerDialogStyles(
	hrefs: readonly string[]
): void {
	registered = [...hrefs];
};

const linkStylesheet = function linkStylesheet(
	href: string,
	nonce: string | undefined
): Promise<void> {
	const existing = linked.get(href);
	if (existing?.element.isConnected) {
		return existing.loaded;
	}
	const element = document.createElement('link');
	element.rel = 'stylesheet';
	element.href = href;
	// A policy that lists only a nonce for styles covers `<link>` too.
	if (nonce) {
		element.nonce = nonce;
	}
	element.setAttribute(DIALOG_STYLES_ATTRIBUTE, '');
	const loaded = new Promise<void>((resolve) => {
		element.addEventListener('load', () => resolve(), { once: true });
		// An unstyled dialog beats one that never opens. Forgetting the link
		// lets the next open try the download again.
		element.addEventListener(
			'error',
			() => {
				linked.delete(href);
				element.remove();
				resolve();
			},
			{ once: true }
		);
	});
	linked.set(href, { element, loaded });
	document.head.append(element);
	return loaded;
};

/**
 * Link the dialog's stylesheets, once, and wait until they have loaded.
 *
 * Waiting is what keeps the island from painting a frame without its rules.
 * A link something removed is added again.
 *
 * @param nonce - The page's CSP nonce, put on every link this adds.
 * @returns Resolves once every stylesheet has loaded or failed.
 */
export const loadDialogStyles = async function loadDialogStyles(
	nonce?: string
): Promise<void> {
	await Promise.all(registered.map((href) => linkStylesheet(href, nonce)));
};

/**
 * Keep the dialog's stylesheets through a ClientRouter navigation.
 *
 * The router removes every `<head>` element the incoming document lacks,
 * except a stylesheet `<link>` whose `href` it also has. Copying the links
 * into the incoming document before the swap keeps the loaded ones in
 * place, so nothing is downloaded or applied a second time.
 *
 * @param incoming - The `newDocument` of an `astro:before-swap` event.
 */
export const keepDialogStylesOnSwap = function keepDialogStylesOnSwap(
	incoming: Document
): void {
	const present = new Set(
		Array.from(
			incoming.head.querySelectorAll('link[rel="stylesheet"]'),
			(link) => link.getAttribute('href')
		)
	);
	for (const { element } of linked.values()) {
		const href = element.getAttribute('href');
		if (element.isConnected && !present.has(href)) {
			incoming.head.append(incoming.importNode(element));
		}
	}
};

/**
 * Forget every registered and linked stylesheet.
 *
 * Tests only.
 *
 * @internal
 */
export const resetDialogStylesForTest =
	function resetDialogStylesForTest(): void {
		registered = [];
		linked.clear();
	};

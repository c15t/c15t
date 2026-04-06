import type { Script } from 'c15t/script-loader';

/**
 * Scans the DOM for `<c15t-script>` custom elements and returns Script objects.
 */
function scanCustomElements(): Script[] {
	const elements = document.querySelectorAll('c15t-script');
	const scripts: Script[] = [];

	for (const el of elements) {
		const category = el.getAttribute('category');
		if (!category) continue;

		const src = el.getAttribute('src') || undefined;
		const textContent = el.textContent?.trim() || undefined;

		// Must have either src or inline content
		if (!src && !textContent) continue;

		scripts.push({
			id: el.getAttribute('id') || `c15t-scan-${scripts.length}`,
			src,
			textContent: !src ? textContent : undefined,
			category: category as Script['category'],
			async: el.hasAttribute('async'),
			defer: el.hasAttribute('defer'),
			target: (el.getAttribute('target') as 'head' | 'body') || 'head',
		});
	}

	return scripts;
}

/**
 * Scans the DOM for `<script data-c15t-category="...">` elements and returns Script objects.
 *
 * These scripts use `type="text/plain"` to prevent execution and `data-src` for the real source.
 * When consent is granted, the script loader creates a new script element with the real src.
 */
function scanDataAttributes(): Script[] {
	const elements = document.querySelectorAll<HTMLScriptElement>(
		'script[data-c15t-category]'
	);
	const scripts: Script[] = [];

	for (const el of elements) {
		const category = el.dataset.c15tCategory;
		if (!category) continue;

		const src = el.dataset.src || el.dataset.c15tSrc || undefined;
		const textContent =
			el.type === 'text/plain' && !src
				? el.textContent?.trim() || undefined
				: undefined;

		if (!src && !textContent) continue;

		scripts.push({
			id: el.id || `c15t-data-${scripts.length}`,
			src,
			textContent,
			category: category as Script['category'],
			async: el.hasAttribute('async'),
			defer: el.hasAttribute('defer'),
		});
	}

	return scripts;
}

/**
 * Scans the entire DOM for consent-gated scripts using both mechanisms:
 * 1. `<c15t-script>` custom elements (preferred)
 * 2. `<script data-c15t-category="...">` data attributes (compatibility)
 */
export function scanDOM(): Script[] {
	return [...scanCustomElements(), ...scanDataAttributes()];
}

/**
 * Sets up a MutationObserver to detect dynamically added consent-gated scripts.
 * Calls `onScriptsFound` whenever new scripts are discovered.
 */
export function observeDOM(
	onScriptsFound: (scripts: Script[]) => void
): () => void {
	const observer = new MutationObserver((mutations) => {
		let hasNewScripts = false;

		for (const mutation of mutations) {
			for (const node of mutation.addedNodes) {
				if (!(node instanceof HTMLElement)) continue;

				if (
					node.tagName === 'C15T-SCRIPT' ||
					(node.tagName === 'SCRIPT' &&
						(node as HTMLElement).dataset.c15tCategory)
				) {
					hasNewScripts = true;
					break;
				}

				// Check descendants
				if (node.querySelector('c15t-script, script[data-c15t-category]')) {
					hasNewScripts = true;
					break;
				}
			}

			if (hasNewScripts) break;
		}

		if (hasNewScripts) {
			// Re-scan the full DOM — simpler and more reliable than incremental
			onScriptsFound(scanDOM());
		}
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});

	return () => observer.disconnect();
}

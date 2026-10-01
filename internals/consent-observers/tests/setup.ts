/**
 * jsdom has no `matchMedia`; the provider reads it for the color scheme and
 * reduced motion. Answer "no match" like a default desktop browser.
 */
if (typeof window !== 'undefined' && !window.matchMedia) {
	window.matchMedia = (query: string): MediaQueryList => ({
		addEventListener() {
			// Static answer; nothing to notify.
		},
		addListener() {
			// Static answer; nothing to notify.
		},
		dispatchEvent: () => false,
		matches: false,
		media: query,
		onchange: null,
		removeEventListener() {
			// Static answer; nothing to notify.
		},
		removeListener() {
			// Static answer; nothing to notify.
		},
	});
}

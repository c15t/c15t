// Stands in for an analytics SDK such as gtag.js. It only runs once the
// `measurement` category is granted; the page's `scripts` entry says so.
(() => {
	window.exampleAnalytics = {
		loadedAt: new Date().toISOString(),
		track(name) {
			window.dispatchEvent(
				new CustomEvent('example:log', { detail: `analytics.track("${name}")` })
			);
		},
	};
	window.dispatchEvent(
		new CustomEvent('example:log', { detail: 'vendor/analytics.js executed' })
	);
})();

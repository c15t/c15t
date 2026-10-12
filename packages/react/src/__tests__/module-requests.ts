/**
 * Which source modules this test document has requested.
 *
 * Vitest's browser mode serves each source module as its own request. The
 * resource timing buffer keeps 250 entries by default and a test document
 * fills it while loading the suite, so an observer records the requests made
 * after this module runs. Import what you measure dynamically, after this.
 */
const requested = new Set<string>();

new PerformanceObserver((list) => {
	for (const entry of list.getEntries()) {
		requested.add(new URL(entry.name).pathname);
	}
}).observe({ buffered: true, type: 'resource' });

export const moduleRequested = (path: string): boolean => requested.has(path);

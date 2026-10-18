import { createRoot } from 'react-dom/client';
import { afterEach, expect, test, vi } from 'vitest';

import { policyFixture } from './policy-fixture';

// Vitest's browser mode serves each source module as its own request, so the
// resource timeline shows which modules this document has loaded.
const BANNER_MODULE = '/src/components/prompt/prompt.tsx';

// From the start: the timeline's buffer fills before the test runs.
const requested = new Set<string>();
new PerformanceObserver((list) => {
	for (const entry of list.getEntries()) {
		requested.add(new URL(entry.name).pathname);
	}
}).observe({ buffered: true, type: 'resource' });
const loaded = (path: string) => requested.has(path);

const banner = () =>
	document.querySelector('[data-testid="consent-banner-root"]');

const cleanups: (() => void)[] = [];

afterEach(() => {
	for (const cleanup of cleanups.splice(0)) {
		cleanup();
	}
});

const renderBanner = async (prefetch: ReturnType<typeof policyFixture>) => {
	const { ConsentBanner, ConsentProvider, offline } = await import('../index');
	const container = document.createElement('div');
	document.body.append(container);
	const root = createRoot(container);
	cleanups.push(() => {
		root.unmount();
		container.remove();
	});
	root.render(
		<ConsentProvider
			options={{ mode: offline(), persistence: false, prefetch }}
		>
			<ConsentBanner disableAnimation />
		</ConsentProvider>
	);
};

// The two tests share one document, so the order matters: once the banner
// module has loaded, it stays loaded.
test('a visitor whose choice stands does not load the banner', async () => {
	await renderBanner(policyFixture({ measurement: true }));
	// Long enough for the provider to settle and any preload to start.
	// oxlint-disable-next-line promise/avoid-new -- A fixed wait: nothing should load in it.
	await new Promise((resolve) => {
		setTimeout(resolve, 300);
	});

	expect(banner()).toBeNull();
	expect(loaded(BANNER_MODULE)).toBe(false);
});

test('a visitor who owes a choice loads and shows the banner', async () => {
	await renderBanner(policyFixture());

	await vi.waitFor(() => expect(banner()).not.toBeNull(), { timeout: 5000 });
	expect(loaded(BANNER_MODULE)).toBe(true);
});

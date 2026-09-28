import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';

import { policyFixture } from './policy-fixture';

// Vitest's browser mode serves each source module as its own request, so the
// resource timeline shows which modules this document has loaded.
const DIALOG_MODULE = '/src/components/panel/panel.tsx';
const WIDGET_MODULE = '/src/components/preferences/preferences.tsx';

const recordModuleRequests = () => {
	const urls: string[] = [];
	const observer = new PerformanceObserver((list) => {
		for (const entry of list.getEntries()) {
			urls.push(entry.name);
		}
	});
	observer.observe({ type: 'resource' });
	const loaded = (path: string) =>
		[...urls, ...performance.getEntriesByType('resource').map((e) => e.name)]
			.map((url) => new URL(url).pathname)
			.includes(path);
	return { loaded, stop: () => observer.disconnect() };
};

test('the split dialog and widget entries load nothing until they are needed', async () => {
	const modules = recordModuleRequests();
	const container = document.createElement('div');
	document.body.append(container);
	const root = createRoot(container);
	const dialog = () =>
		document.querySelector('[data-testid="consent-dialog-root"]');
	// Idle-time preloading, where the provider supports it, would load the
	// dialog on its own. This test is about what importing the entries loads.
	vi.stubGlobal('requestIdleCallback', () => 0);
	try {
		const { ConsentDialog } = await import('../panel');
		await import('../preferences');
		const { ConsentBanner } = await import('../prompt');
		const { ConsentProvider } = await import('../provider');
		const { offline } = await import('../transports/offline');

		root.render(
			<ConsentProvider
				options={{
					mode: offline(),
					persistence: false,
					prefetch: policyFixture(),
				}}
			>
				<ConsentBanner disableAnimation />
				<ConsentDialog disableAnimation />
			</ConsentProvider>
		);
		const customize = await vi.waitFor(() => {
			const button = document.querySelector<HTMLButtonElement>(
				'[data-testid="consent-banner-customize-button"]'
			);
			expect(button).not.toBeNull();
			return button as HTMLButtonElement;
		});

		// The banner is up and the dialog can open, but neither the dialog nor
		// the widget has been requested.
		expect(modules.loaded(DIALOG_MODULE)).toBe(false);
		expect(modules.loaded(WIDGET_MODULE)).toBe(false);
		expect(dialog()).toBeNull();

		customize.click();
		await vi.waitFor(() => expect(dialog()).not.toBeNull());
		expect(modules.loaded(DIALOG_MODULE)).toBe(true);
	} finally {
		modules.stop();
		root.unmount();
		container.remove();
		vi.unstubAllGlobals();
	}
});

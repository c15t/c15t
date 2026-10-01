/**
 * A page that allows styles only by nonce must still get a styled banner
 * when the loader tag carries that nonce.
 */
import { afterEach, describe, expect, it } from 'vitest';

// The fixture page imports these modules. Importing them here makes Vite
// transform them while it collects this file, outside any test's timeout.
// Otherwise the first page load transforms the whole client and UI graph
// inside the test, which took over ten seconds in a busy parallel run.
import '../auto-init';
import '../client';
import '../ui/mount';
import type { UICSPPage } from './fixtures/ui-csp-page';

const frames: HTMLIFrameElement[] = [];

const openPage = async (search = ''): Promise<UICSPPage> => {
	const frame = document.createElement('iframe');
	frames.push(frame);
	frame.src = `/__c15t-test__/ui-csp${search}`;
	document.body.append(frame);
	const read = () =>
		(frame.contentWindow as (Window & { c15tUICSP?: UICSPPage }) | null)
			?.c15tUICSP;
	await expect.poll(read, { timeout: 10_000 }).toBeDefined();
	const page = read() as UICSPPage;
	await page.ready;
	return page;
};

const injectedStyle = (page: UICSPPage): HTMLStyleElement => {
	const style = page.client.ui?.root.querySelector('style');
	if (!style) {
		throw new Error('The UI mounted without a style element');
	}
	return style;
};

afterEach(() => {
	for (const frame of frames.splice(0)) {
		frame.remove();
	}
});

describe('stock UI under a nonce-based style-src', () => {
	it("applies the UI stylesheet with the loader tag's nonce", async () => {
		const page = await openPage();

		expect(page.nonce).toBe('c15t-test-nonce');
		await expect.poll(() => injectedStyle(page).sheet).not.toBeNull();
		expect(page.violations).not.toContain('style-src-elem');
	});

	it('is blocked by the same policy without the nonce', async () => {
		const page = await openPage('?nonce=off');

		await expect.poll(() => page.violations).toContain('style-src-elem');
		expect(injectedStyle(page).sheet).toBeNull();
	});
});

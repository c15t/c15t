import { useMemo } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { V3UIConfigContext } from '~/ui-config-context';

import { SurfaceStyles, useSurfaceSheetsReady } from '../surface-styles';
import type { SurfaceStyleSheet } from '../surface-styles';

/**
 * A deferred sheet has an `id` and a `load`, and no text: the Next.js
 * adapter gives browser bundles one in place of the first-paint sheet,
 * whose text the server-rendered HTML already holds. Each test uses its own
 * `id`, because the loaded text is cached per page.
 */

const CSS = '.deferred-probe{color:rgb(1, 2, 3)}';
const NONCE_CONFIG = { nonce: 'test-nonce' };

const deferredSheet = (id: string) => {
	const load = vi.fn(() => Promise.resolve(CSS));
	const sheet: SurfaceStyleSheet = { css: '', id, load };
	return { load, sheet };
};

const Surface = ({ sheet }: { sheet: SurfaceStyleSheet }) => {
	// Stable, like the module-level sheet lists the stock surfaces pass.
	const sheets = useMemo(() => [sheet], [sheet]);
	const ready = useSurfaceSheetsReady(sheets);
	return ready ? (
		<>
			<SurfaceStyles sheets={sheets} />
			<div data-testid="surface">surface</div>
		</>
	) : null;
};

const stylesFor = (id: string) => [
	...document.querySelectorAll<HTMLStyleElement>(
		`style[data-href~="${id}"],style[data-c15t-styles="${id}"]`
	),
];

describe('deferred surface sheets', () => {
	test('hydrating over the server-rendered sheet adopts it without loading', async () => {
		const id = 'c15t-test-hydrate';
		const { load, sheet } = deferredSheet(id);
		// The server renders the eager sheet: same id, full text.
		const html = renderToString(<Surface sheet={{ css: CSS, id }} />);
		expect(html).toContain(CSS);

		const container = document.createElement('div');
		container.innerHTML = html;
		// React 19 puts hoisted styles in `<head>`; renderToString leaves them
		// at the start of the markup. Move it where the browser would have it.
		const serverStyle = container.querySelector(`style[data-href="${id}"]`);
		expect(serverStyle).not.toBeNull();
		document.head.append(serverStyle as HTMLStyleElement);
		document.body.append(container);

		const errors: unknown[] = [];
		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation((...args) => errors.push(args));
		const root = hydrateRoot(container, <Surface sheet={sheet} />, {
			onRecoverableError: (error) => errors.push(error),
		});
		await vi.waitFor(() =>
			expect(container.querySelector('[data-testid="surface"]')).not.toBeNull()
		);
		await new Promise((resolve) => {
			setTimeout(resolve, 50);
		});
		consoleError.mockRestore();

		expect(errors).toEqual([]);
		expect(load).not.toHaveBeenCalled();
		// One element, still holding the server's text.
		expect(stylesFor(id).map((element) => element.textContent)).toEqual([CSS]);
		root.unmount();
		container.remove();
	});

	test('a surface the browser renders first waits for the loaded sheet', async () => {
		const id = 'c15t-test-client';
		const { load, sheet } = deferredSheet(id);
		const screen = await render(<Surface sheet={sheet} />);

		await expect.element(screen.getByTestId('surface')).toBeInTheDocument();
		expect(load).toHaveBeenCalledTimes(1);
		expect(stylesFor(id).map((element) => element.textContent)).toEqual([CSS]);
		await screen.unmount();
	});

	test('with a nonce, a later surface reuses the text of the in-place sheet', async () => {
		const id = 'c15t-test-nonce';
		const { load, sheet } = deferredSheet(id);
		const serverStyle = document.createElement('style');
		serverStyle.dataset.c15tStyles = id;
		serverStyle.textContent = CSS;
		document.body.append(serverStyle);

		const screen = await render(
			<V3UIConfigContext.Provider value={NONCE_CONFIG}>
				<Surface sheet={sheet} />
			</V3UIConfigContext.Provider>
		);
		await expect.element(screen.getByTestId('surface')).toBeInTheDocument();
		// The server's element goes away with its surface; the text stays.
		serverStyle.remove();
		await screen.rerender(
			<V3UIConfigContext.Provider value={NONCE_CONFIG}>
				<Surface sheet={sheet} />
			</V3UIConfigContext.Provider>
		);

		expect(load).not.toHaveBeenCalled();
		expect(stylesFor(id).map((element) => element.textContent)).toEqual([CSS]);
		await screen.unmount();
	});

	test('a surface shows without a sheet that failed to load, and the next one retries it', async () => {
		const id = 'c15t-test-retry';
		const load = vi
			.fn<() => Promise<string>>()
			.mockRejectedValueOnce(new Error('chunk failed to load'))
			.mockResolvedValue(CSS);
		const sheet: SurfaceStyleSheet = { css: '', id, load };

		const first = await render(<Surface sheet={sheet} />);
		await expect.element(first.getByTestId('surface')).toBeInTheDocument();
		expect(load).toHaveBeenCalledTimes(1);
		expect(stylesFor(id)).toEqual([]);
		await first.unmount();

		const second = await render(<Surface sheet={sheet} />);
		await expect.element(second.getByTestId('surface')).toBeInTheDocument();
		await vi.waitFor(() =>
			expect(stylesFor(id).map((element) => element.textContent)).toEqual([CSS])
		);
		expect(load).toHaveBeenCalledTimes(2);
		await second.unmount();
	});
});

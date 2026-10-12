/**
 * Tests for the useLateEntry hook.
 *
 * @packageDocumentation
 */

import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { useLateEntry } from '../use-late-entry';

/** The page first painted at 0; the clock reads `now`. */
const setClock = function setClock(now: number) {
	vi.spyOn(performance, 'getEntriesByType').mockImplementation((type) =>
		type === 'paint'
			? [{ name: 'first-contentful-paint', startTime: 0 } as PerformanceEntry]
			: []
	);
	vi.spyOn(performance, 'now').mockReturnValue(now);
};

const Probe = ({ shown, label = '' }: { shown: boolean; label?: string }) => {
	const late = useLateEntry(shown);
	return shown ? (
		<div
			data-testid="probe"
			data-entry={late ? 'late' : undefined}
		>
			{label}
		</div>
	) : null;
};

const entryOf = (container: HTMLElement) =>
	container.querySelector<HTMLElement>('[data-testid="probe"]')?.dataset.entry;

describe('useLateEntry', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('marks a banner that mounts after the page painted', async () => {
		setClock(1000);
		const { container } = await render(<Probe shown />);
		expect(entryOf(container)).toBe('late');
	});

	test('does not mark a banner that mounts with the first paint', async () => {
		setClock(50);
		const { container } = await render(<Probe shown />);
		expect(entryOf(container)).toBeUndefined();
	});

	test('holds the decision while the banner stays shown', async () => {
		setClock(50);
		const { container, rerender } = await render(
			<Probe
				shown
				label="a"
			/>
		);
		setClock(5000);
		await rerender(
			<Probe
				shown
				label="b"
			/>
		);
		expect(container.textContent).toBe('b');
		expect(entryOf(container)).toBeUndefined();
	});

	test('decides again when the banner shows a second time', async () => {
		setClock(50);
		const { container, rerender } = await render(<Probe shown />);
		await rerender(<Probe shown={false} />);
		setClock(5000);
		await rerender(<Probe shown />);
		expect(entryOf(container)).toBe('late');
	});

	test('keeps a banner hydrated from server HTML unmarked', async () => {
		setClock(5000);
		vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
		const consoleError = vi.spyOn(console, 'error');
		const container = document.createElement('div');
		container.innerHTML = renderToString(<Probe shown />);
		document.body.append(container);
		try {
			let root = null as ReturnType<typeof hydrateRoot> | null;
			await act(() => {
				root = hydrateRoot(container, <Probe shown />);
			});
			// A re-render would write the attribute if hydration had decided
			// late; React leaves mismatched attributes alone while hydrating.
			await act(() => {
				root?.render(
					<Probe
						shown
						label="after"
					/>
				);
			});
			expect(container.textContent).toBe('after');
			expect(entryOf(container)).toBeUndefined();
			expect(consoleError).not.toHaveBeenCalled();
			act(() => root?.unmount());
		} finally {
			container.remove();
			vi.unstubAllGlobals();
		}
	});
});

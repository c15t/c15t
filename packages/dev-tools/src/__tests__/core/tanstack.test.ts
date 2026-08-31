import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	C15tTanStackDevtoolsPanel,
	c15tDevtools,
	c15tDevtoolsPlugin,
} from '../../tanstack';

const createDevToolsPanelMock = vi.fn();

describe('tanstack integration', () => {
	let mountNode: HTMLDivElement;
	let root: Root | null;
	let destroyCallbacks: ReturnType<typeof vi.fn>[];

	beforeEach(() => {
		vi.useFakeTimers();
		mountNode = document.createElement('div');
		document.body.appendChild(mountNode);
		root = createRoot(mountNode);
		destroyCallbacks = [];

		createDevToolsPanelMock.mockImplementation(() => {
			const element = document.createElement('section');
			element.setAttribute('data-testid', 'embedded-panel');
			const destroy = vi.fn();
			destroyCallbacks.push(destroy);
			return {
				destroy,
				element,
			};
		});
	});

	afterEach(async () => {
		if (root) {
			await act(() => {
				root?.unmount();
			});
		}
		await act(async () => {
			await vi.runOnlyPendingTimersAsync();
		});
		vi.useRealTimers();
		root = null;
		mountNode.remove();
		createDevToolsPanelMock.mockReset();
	});

	it('creates a React-compatible plugin config', () => {
		const plugin = c15tDevtools({
			defaultOpen: true,
			namespace: 'testStore',
		});

		expect(plugin.id).toBe('c15t');
		expect(plugin.name).toBe('c15t');
		expect(plugin.defaultOpen).toBe(true);
		expect(React.isValidElement(plugin.render)).toBe(true);
	});

	it('keeps c15tDevtoolsPlugin as a backward-compatible alias', () => {
		expect(c15tDevtoolsPlugin).toBe(c15tDevtools);
	});

	it('mounts and destroys the embedded panel with React lifecycle', async () => {
		await act(() => {
			root?.render(
				React.createElement(C15tTanStackDevtoolsPanel, {
					createPanel: createDevToolsPanelMock,
					'data-testid': 'panel-shell',
					namespace: 'testStore',
				})
			);
		});

		expect(createDevToolsPanelMock).toHaveBeenCalledWith({
			mode: 'embedded',
			namespace: 'testStore',
		});

		const shell = mountNode.querySelector('[data-testid="panel-shell"]');
		expect(
			shell?.querySelector('[data-testid="embedded-panel"]')
		).not.toBeNull();

		await act(() => {
			root?.unmount();
		});
		root = null;

		expect(destroyCallbacks).toHaveLength(1);
		expect(destroyCallbacks[0]).not.toHaveBeenCalled();

		await act(async () => {
			await vi.advanceTimersByTimeAsync(60_000);
		});

		expect(destroyCallbacks[0]).toHaveBeenCalledTimes(1);
	});

	it('reuses the embedded panel after a remount', async () => {
		const plugin = c15tDevtools({
			createPanel: createDevToolsPanelMock,
			namespace: 'testStore',
		});

		await act(() => {
			root?.render(plugin.render);
		});

		await act(() => {
			root?.unmount();
		});
		root = createRoot(mountNode);

		await act(() => {
			root.render(plugin.render);
		});

		expect(createDevToolsPanelMock).toHaveBeenCalledTimes(1);
		expect(destroyCallbacks[0]).not.toHaveBeenCalled();
	});
});

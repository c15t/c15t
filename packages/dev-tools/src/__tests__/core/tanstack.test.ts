import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createDevToolsPanelMock } = vi.hoisted(() => ({
	createDevToolsPanelMock: vi.fn(),
}));

vi.mock('../../core/devtools', () => ({
	createDevToolsPanel: createDevToolsPanelMock,
}));

import {
	C15tTanStackDevtoolsPanel,
	c15tDevtools,
	c15tDevtoolsPlugin,
} from '../../tanstack';

describe('tanstack integration', () => {
	let mountNode: HTMLDivElement;
	let root: Root | null;
	let destroyCallbacks: Array<ReturnType<typeof vi.fn>>;

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
				element,
				destroy,
			};
		});
	});

	afterEach(async () => {
		if (root) {
			await act(async () => {
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
			namespace: 'testStore',
			defaultOpen: true,
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
		await act(async () => {
			root?.render(
				React.createElement(C15tTanStackDevtoolsPanel, {
					namespace: 'testStore',
					'data-testid': 'panel-shell',
				})
			);
		});

		expect(createDevToolsPanelMock).toHaveBeenCalledWith({
			namespace: 'testStore',
			mode: 'embedded',
		});

		const shell = mountNode.querySelector('[data-testid="panel-shell"]');
		expect(
			shell?.querySelector('[data-testid="embedded-panel"]')
		).not.toBeNull();

		await act(async () => {
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
			namespace: 'testStore',
		});

		await act(async () => {
			root?.render(plugin.render);
		});

		await act(async () => {
			root?.unmount();
		});
		root = createRoot(mountNode);

		await act(async () => {
			root.render(plugin.render);
		});

		expect(createDevToolsPanelMock).toHaveBeenCalledTimes(1);
		expect(destroyCallbacks[0]).not.toHaveBeenCalled();
	});
});

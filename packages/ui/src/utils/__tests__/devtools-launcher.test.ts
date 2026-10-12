import { createConsentKernel } from '@c15t/core';
import { describe, expect, it, vi } from 'vitest';

import {
	claimDevToolsLauncher,
	getDevToolsLauncherSnapshot,
	measureDevToolsDock,
	publishDevToolsLauncher,
	subscribeDevToolsLauncher,
} from '../devtools-launcher';
import type { DevToolsLauncherTarget } from '../devtools-launcher';

type OpenListener = Parameters<DevToolsLauncherTarget['subscribe']>[0];

const createTarget = function createTarget() {
	let isOpen = false;
	const listeners = new Set<OpenListener>();
	const target = {
		dock: vi.fn(),
		getState: () => ({ isOpen }),
		subscribe: (listener: OpenListener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		toggle: () => {
			const previous = { isOpen };
			isOpen = !isOpen;
			for (const listener of listeners) {
				listener({ isOpen }, previous);
			}
		},
	} satisfies DevToolsLauncherTarget;
	return target;
};

const fixedElement = function fixedElement(rect: {
	left: number;
	top: number;
	width: number;
	height: number;
}): HTMLElement {
	const element = document.createElement('div');
	Object.defineProperties(element, {
		offsetHeight: { value: rect.height },
		offsetLeft: { value: rect.left },
		offsetTop: { value: rect.top },
		offsetWidth: { value: rect.width },
	});
	return element;
};

describe('DevTools launcher slot', () => {
	it('gives the launcher to the first claim and undocks after the last release', () => {
		const kernel = createConsentKernel();
		const target = createTarget();
		const listener = vi.fn();
		subscribeDevToolsLauncher(kernel, listener);

		const withdraw = publishDevToolsLauncher(kernel, target);
		const releaseFirst = claimDevToolsLauncher(kernel, 'first');
		const releaseSecond = claimDevToolsLauncher(kernel, 'second');
		expect(getDevToolsLauncherSnapshot(kernel)).toMatchObject({
			instance: target,
			isOpen: false,
			owner: 'first',
		});

		target.toggle();
		expect(getDevToolsLauncherSnapshot(kernel).isOpen).toBe(true);

		releaseFirst();
		expect(getDevToolsLauncherSnapshot(kernel).owner).toBe('second');
		expect(target.dock).not.toHaveBeenCalled();

		releaseSecond();
		expect(target.dock).toHaveBeenCalledWith(null);
		expect(getDevToolsLauncherSnapshot(kernel).owner).toBeNull();

		withdraw();
		expect(getDevToolsLauncherSnapshot(kernel).instance).toBeNull();
		expect(listener).toHaveBeenCalled();
	});

	it('keeps kernels apart', () => {
		const first = createConsentKernel();
		const second = createConsentKernel();
		publishDevToolsLauncher(first, createTarget());
		expect(getDevToolsLauncherSnapshot(second).instance).toBeNull();
	});
});

describe('measureDevToolsDock', () => {
	const { clientWidth, clientHeight } = document.documentElement;

	it('docks above a bottom-right trigger, flush with its right edge', () => {
		const element = fixedElement({
			height: 40,
			left: clientWidth - 100,
			top: clientHeight - 60,
			width: 80,
		});
		expect(measureDevToolsDock(element, 'bottom-right')).toEqual({
			block: 68,
			inline: 20,
			position: 'bottom-right',
		});
	});

	it('docks below a top-left trigger, flush with its left edge', () => {
		const element = fixedElement({ height: 40, left: 20, top: 20, width: 80 });
		expect(measureDevToolsDock(element, 'top-left')).toEqual({
			block: 68,
			inline: 20,
			position: 'top-left',
		});
	});
});

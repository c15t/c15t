import { createConsentKernel } from '@c15t/core/v3';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDevTools } from '../../index';
import type { DevToolsInstance } from '../../index';

const instances: DevToolsInstance[] = [];

// oxlint-disable-next-line func-style -- Test helpers are clearer as declarations.
function createInstance(
	kernel = createConsentKernel(),
	container?: HTMLElement
): DevToolsInstance {
	const instance = createDevTools({ container, kernel });
	instances.push(instance);
	return instance;
}

afterEach(() => {
	for (const instance of instances.splice(0)) {
		instance.destroy();
	}
	document.body.replaceChildren();
});

describe('createDevTools', () => {
	it('publishes kernel snapshots to instance subscribers', () => {
		const kernel = createConsentKernel();
		const devTools = createInstance(kernel);
		const listener = vi.fn();
		const unsubscribe = devTools.subscribe(listener);

		kernel.set.consent({ measurement: true });

		expect(devTools.getState().snapshot.consents.measurement).toBe(true);
		expect(listener).toHaveBeenCalled();
		expect(listener.mock.lastCall?.[0].snapshot).toBe(kernel.getSnapshot());

		unsubscribe();
		const callCount = listener.mock.calls.length;
		devTools.open();
		expect(listener).toHaveBeenCalledTimes(callCount);
	});

	it('does not expose the instance or kernel through window globals', () => {
		const devTools = createInstance();

		expect(devTools.element).toBeInstanceOf(HTMLElement);
		expect('__c15tDevTools' in window).toBe(false);
		expect('c15tStore' in window).toBe(false);
	});

	it('unsubscribes from the kernel and removes its DOM on destroy', () => {
		const kernel = createConsentKernel();
		const devTools = createInstance(kernel);
		const listener = vi.fn();
		devTools.subscribe(listener);
		const stateBeforeDestroy = devTools.getState();
		const { element } = devTools;

		devTools.destroy();
		kernel.set.consent({ marketing: true });

		expect(element?.isConnected).toBe(false);
		expect(devTools.getState()).toBe(stateBeforeDestroy);
		expect(devTools.getState().snapshot.consents.marketing).toBe(false);
		expect(listener).not.toHaveBeenCalled();
	});

	it('keeps state, events, DOM, and cleanup isolated by instance', () => {
		const firstKernel = createConsentKernel();
		const secondKernel = createConsentKernel();
		const firstContainer = document.createElement('div');
		const secondContainer = document.createElement('div');
		document.body.append(firstContainer, secondContainer);
		const first = createInstance(firstKernel, firstContainer);
		const second = createInstance(secondKernel, secondContainer);

		first.open();
		firstKernel.set.consent({ experience: true });

		expect(first.getState().isOpen).toBe(true);
		expect(second.getState().isOpen).toBe(false);
		expect(first.getState().snapshot.consents.experience).toBe(true);
		expect(second.getState().snapshot.consents.experience).toBe(false);
		expect(first.getState().events.map((event) => event.type)).toContain(
			'consent:set'
		);
		expect(second.getState().events).toHaveLength(0);

		first.destroy();
		expect(firstContainer.childElementCount).toBe(0);
		expect(secondContainer.childElementCount).toBe(1);

		secondKernel.set.consent({ functionality: true });
		expect(second.getState().snapshot.consents.functionality).toBe(true);
	});
});

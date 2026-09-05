import { createConsentKernel } from '@c15t/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDevTools } from '../../index';
import type { DevToolsInstance } from '../../index';
import { choiceRecords } from '../helpers/kernel';

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
	it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
		'bounds captured events for maxEvents=%s',
		(maxEvents) => {
			const kernel = createConsentKernel();
			const tools = createDevTools({ kernel, maxEvents });
			instances.push(tools);
			const launcher = tools.element?.querySelector<HTMLButtonElement>(
				'button[aria-label="Open c15t DevTools"]'
			);
			launcher?.focus();
			for (let index = 0; index < 110; index += 1) {
				kernel.set.overrides({ country: index % 2 === 0 ? 'DE' : 'FR' });
			}
			expect(tools.getState().events).toHaveLength(
				Number.isFinite(maxEvents) ? 1 : 100
			);
			expect(document.activeElement).toBe(launcher);
			expect(
				tools.element?.querySelector('[role="tabpanel"]')?.childElementCount
			).toBe(0);
			tools.open();
			expect(
				tools.element?.querySelector<HTMLInputElement>(
					'[data-focus-key="consent:measurement"]'
				)?.checked
			).toBe(false);
			expect(
				tools.element?.querySelector('[role="tabpanel"]')?.childElementCount
			).toBeGreaterThan(0);
		}
	);
	it('disables duplicate saves and reports failure and retry success beside the controls', async () => {
		const pendingSave = Promise.withResolvers<{ ok: boolean }>();
		const save = vi
			.fn()
			.mockReturnValueOnce(pendingSave.promise)
			.mockResolvedValue({ ok: true });
		const kernel = createConsentKernel({ transport: { save } });
		const devTools = createInstance(kernel);
		devTools.open();
		const saveButton = () =>
			[...(devTools.element?.querySelectorAll('button') ?? [])].find(
				(button) => button.textContent === 'Save changes'
			);
		saveButton()?.click();
		expect(saveButton()?.disabled).toBe(true);
		saveButton()?.click();
		await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
		pendingSave.resolve({ ok: false });
		await vi.waitFor(() =>
			expect(
				devTools.element?.querySelector('[role="alert"]')?.textContent
			).toContain('request failed')
		);
		expect(saveButton()?.disabled).toBe(false);
		saveButton()?.click();
		await vi.waitFor(() =>
			expect(
				devTools.element?.querySelector('[role="status"]')?.textContent
			).toBe('Consent saved.')
		);
	});

	it('accepts and rejects only displayed categories, preserving hidden choices', async () => {
		const kernel = createConsentKernel({
			initialRecords: choiceRecords({ experience: true, functionality: false }),
		});
		const devTools = createDevTools({
			defaultOpen: true,
			getConsentCategories: () => ['necessary', 'marketing', 'measurement'],
			kernel,
		});
		instances.push(devTools);
		expect(devTools.element?.querySelectorAll('[role="switch"]')).toHaveLength(
			3
		);
		const click = (label: string) => {
			const button = [
				...(devTools.element?.querySelectorAll('button') ?? []),
			].find((element) => element.textContent === label);
			if (!button) {
				throw new Error(`Missing ${label}`);
			}
			button.click();
		};
		click('Accept all');
		expect(kernel.getSnapshot().effectivePermissions).toEqual({
			experience: true,
			functionality: false,
			marketing: true,
			measurement: true,
			necessary: true,
		});
		await vi.waitFor(() => {
			expect(
				devTools.element?.querySelector('[role="status"]')?.textContent
			).toBe('Displayed consents accepted.');
		});
		click('Reject optional');
		expect(kernel.getSnapshot().effectivePermissions).toEqual({
			experience: true,
			functionality: false,
			marketing: false,
			measurement: false,
			necessary: true,
		});
		await devTools.actions.save('all');
		expect(kernel.getSnapshot().effectivePermissions.functionality).toBe(false);
		await devTools.actions.save('none');
		expect(kernel.getSnapshot().effectivePermissions.experience).toBe(true);
	});

	it('stages choices through labeled switches and keeps necessary consent locked', async () => {
		const kernel = createConsentKernel();
		const devTools = createInstance(kernel);
		devTools.open();
		const necessary = devTools.element?.querySelector<HTMLInputElement>(
			'[data-focus-key="consent:necessary"]'
		);
		const marketing = devTools.element?.querySelector<HTMLInputElement>(
			'[data-focus-key="consent:marketing"]'
		);

		expect(necessary?.disabled).toBe(true);
		expect(necessary?.closest('label')?.textContent).toContain('Always on');
		expect(marketing?.getAttribute('role')).toBe('switch');
		marketing?.closest('label')?.click();
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		expect(devTools.getState().draft.marketing).toBe(true);
		await devTools.actions.save();
		expect(
			kernel.getSnapshot().explicitChoice?.categories.marketing?.value
		).toBe(true);
	});

	it('opens from an accessible icon-only launcher', () => {
		const devTools = createInstance();
		const launcher = devTools.element?.querySelector<HTMLButtonElement>(
			'button[aria-label="Open c15t DevTools"]'
		);

		expect(launcher?.textContent).toBe('');
		expect(launcher?.querySelector('svg')?.getAttribute('aria-hidden')).toBe(
			'true'
		);
		launcher?.click();
		expect(devTools.getState().isOpen).toBe(true);
	});

	it.each([false, true])(
		'closes with Escape and returns focus to the launcher with custom container=%s',
		async (customContainer) => {
			const container = document.createElement('div');
			document.body.append(container);
			const devTools = createInstance(
				undefined,
				customContainer ? container : undefined
			);
			devTools.open();
			devTools.element?.dispatchEvent(
				new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' })
			);

			expect(devTools.getState().isOpen).toBe(false);
			await vi.waitFor(() => {
				expect(document.activeElement?.getAttribute('aria-label')).toBe(
					'Open c15t DevTools'
				);
			});
		}
	);
	it('keeps the embedded panel open on Escape', () => {
		const devTools = createInstance(undefined, document.body);
		devTools.element?.classList.add('c15t-dev-tools--embedded');
		devTools.open();
		devTools.element?.dispatchEvent(
			new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' })
		);
		expect(devTools.getState().isOpen).toBe(true);
	});

	it('publishes kernel snapshots to instance subscribers', () => {
		const kernel = createConsentKernel();
		const devTools = createInstance(kernel);
		const listener = vi.fn();
		const unsubscribe = devTools.subscribe(listener);

		kernel.commands.save({ measurement: true });

		expect(devTools.getState().snapshot.effectivePermissions.measurement).toBe(
			true
		);
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
		kernel.commands.save({ marketing: true });

		expect(element?.isConnected).toBe(false);
		expect(devTools.getState()).toBe(stateBeforeDestroy);
		expect(devTools.getState().snapshot.effectivePermissions.marketing).toBe(
			false
		);
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
		firstKernel.commands.save({ experience: true });

		expect(first.getState().isOpen).toBe(true);
		expect(second.getState().isOpen).toBe(false);
		expect(first.getState().snapshot.effectivePermissions.experience).toBe(
			true
		);
		expect(second.getState().snapshot.effectivePermissions.experience).toBe(
			false
		);
		expect(first.getState().events.map((event) => event.type)).toContain(
			'choice:recorded'
		);
		expect(second.getState().events).toHaveLength(0);

		first.destroy();
		expect(firstContainer.childElementCount).toBe(0);
		expect(secondContainer.childElementCount).toBe(1);

		secondKernel.commands.save({ functionality: true });
		expect(second.getState().snapshot.effectivePermissions.functionality).toBe(
			true
		);
	});
});

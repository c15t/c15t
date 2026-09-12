import { policyRulePresets } from '@c15t/core';
import { resolvePolicyRules } from '@c15t/schema/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createConsentClient } from '../client';
import { createGlobal, installGlobal } from '../global';
import type { C15tGlobal } from '../global';
import type { ConsentClient, ConsentClientOptions } from '../types';

const testWindow = window as Window & { c15t?: unknown };
const clients: ConsentClient[] = [];
const observers = new Set<MutationObserver>();
const policy = {
	...policyRulePresets.europeOptIn(),
	categories: ['measurement'] as const,
	match: { isDefault: true },
	scopeMode: 'strict' as const,
};
const optionsFor = (prefetched = true): ConsentClientOptions => ({
	consentCategories: ['measurement'],
	policyRules: [policy],
	prefetch: prefetched
		? { initialPolicyResolution: resolvePolicyRules({ rules: [policy] }) }
		: undefined,
	ui: false,
});

const persistGrant = async (): Promise<void> => {
	const client = createConsentClient(optionsFor());
	clients.push(client);
	client.start();
	await client.ready();
	await client.acceptAll();
	expect(client.has('measurement')).toBe(true);
	client.dispose();
};

const install = (): C15tGlobal =>
	installGlobal(createGlobal({ pkg: '@c15t/browser/test' }));

const trackObservers = (): void => {
	const { observe, disconnect } = MutationObserver.prototype;
	vi.spyOn(MutationObserver.prototype, 'observe').mockImplementation(
		function observeTracked(this: MutationObserver, target, options) {
			observers.add(this);
			observe.call(this, target, options);
		}
	);
	vi.spyOn(MutationObserver.prototype, 'disconnect').mockImplementation(
		function disconnectTracked(this: MutationObserver) {
			observers.delete(this);
			disconnect.call(this);
		}
	);
};

afterEach(() => {
	(testWindow.c15t as C15tGlobal | undefined)?.dispose?.();
	testWindow.c15t = undefined;
	for (const client of clients.splice(0)) {
		client.dispose();
	}
	for (const observer of observers) {
		observer.disconnect();
	}
	observers.clear();
	vi.restoreAllMocks();
	localStorage.clear();
	for (const entry of document.cookie.split(';')) {
		document.cookie = `${entry.split('=')[0]?.trim()}=; Max-Age=0; path=/`;
	}
	document.body.replaceChildren();
});

describe('global event listeners', () => {
	it.each([false, true])(
		'delivers the persisted grant to listeners queued before startup with prefetch %s',
		async (prefetched) => {
			await persistGrant();
			const onConsent = vi.fn();
			testWindow.c15t = [
				['config', optionsFor(prefetched)],
				['on', 'consent', onConsent],
			];
			const api = install();

			api.init();

			expect(api.hasConsented()).toBe(true);
			expect(onConsent).toHaveBeenCalledWith(
				expect.objectContaining({ explicitChoice: expect.anything() })
			);
			await api.ready();
			expect(api.has('measurement')).toBe(true);
		}
	);

	it('honours unsubscribe before initialization', async () => {
		await persistGrant();
		const api = install();
		const onConsent = vi.fn();
		const off = api.on('consent', onConsent);
		off();

		api.init(optionsFor());
		await api.ready();

		expect(onConsent).not.toHaveBeenCalled();
	});

	it('lets the first queued callback unsubscribe another during hydration', async () => {
		await persistGrant();
		const api = install();
		const second = vi.fn();
		let offSecond: () => void = () => undefined;
		const first = vi.fn(() => offSecond());
		const offFirst = api.on('consent', first);
		offSecond = api.on('consent', second);

		api.init(optionsFor());
		expect(first).toHaveBeenCalled();
		expect(second).not.toHaveBeenCalled();
		offFirst();
		const calls = first.mock.calls.length;
		await api.rejectAll();
		expect(first).toHaveBeenCalledTimes(calls);
	});

	it('attaches live listeners immediately without replaying past consent', async () => {
		await persistGrant();
		const api = install();
		api.init(optionsFor());
		await api.ready();
		const onConsent = vi.fn();
		api.on('consent', onConsent);
		expect(onConsent).not.toHaveBeenCalled();

		const saving = api.rejectAll();

		expect(onConsent).toHaveBeenCalled();
		await saving;
	});

	it('does not carry cancelled or previous-client listeners into a new client', async () => {
		await persistGrant();
		const api = install();
		const cancelled = vi.fn();
		api.on('consent', cancelled);
		api.dispose();
		const previous = vi.fn();
		api.on('consent', previous);
		api.init(optionsFor());
		expect(previous).toHaveBeenCalled();
		const previousCalls = previous.mock.calls.length;
		api.dispose();
		const current = vi.fn();
		api.on('consent', current);

		api.init(optionsFor());
		await api.ready();

		expect(cancelled).not.toHaveBeenCalled();
		expect(previous).toHaveBeenCalledTimes(previousCalls);
		expect(current).toHaveBeenCalled();
	});

	it('cleans startup resources when a queued consent listener disposes', async () => {
		await persistGrant();
		trackObservers();
		const api = install();
		const onConsent = vi.fn(() => api.dispose());
		const onReady = vi.fn();
		api.on('consent', onConsent);
		api.on('ready', onReady);

		const client = api.init(optionsFor());

		expect(onConsent).toHaveBeenCalledOnce();
		expect(onReady).not.toHaveBeenCalled();
		expect(api.client).toBeNull();
		expect(client.started).toBe(false);
		expect(observers.size).toBe(0);
		const button = document.createElement('button');
		button.setAttribute('data-c15t-action', 'customize');
		document.body.append(button);
		const click = new MouseEvent('click', { bubbles: true, cancelable: true });
		button.dispatchEvent(click);
		expect(click.defaultPrevented).toBe(false);
	});

	it('keeps listener generations separate when hydration disposes and reinitializes', async () => {
		await persistGrant();
		trackObservers();
		const api = install();
		const previousReady = vi.fn();
		const nextReady = vi.fn();
		const nextInit = vi.fn();
		let nextClient: ConsentClient | undefined;
		api.on('consent', () => {
			api.dispose();
			api.on('ready', nextReady);
			api.onInit(nextInit);
			nextClient = api.init({ ...optionsFor(), enabled: false });
		});
		api.on('ready', previousReady);

		const previousClient = api.init(optionsFor());
		await api.ready();

		expect(previousClient.started).toBe(false);
		expect(api.client).toBe(nextClient);
		expect(nextClient?.started).toBe(true);
		expect(previousReady).not.toHaveBeenCalled();
		expect(nextReady).toHaveBeenCalledOnce();
		expect(nextInit).toHaveBeenCalledExactlyOnceWith(nextClient);
		api.dispose();
		expect(observers.size).toBe(0);
	});

	it('delivers UI changes from hydration callbacks after older startup events', async () => {
		await persistGrant();
		const api = install();
		const events: string[] = [];
		api.on('consent', () => {
			events.push('consent');
			api.openDialog();
		});
		api.on('ui', (surface) => events.push(surface));
		api.on('ready', () => events.push('ready'));

		api.init(optionsFor());

		expect(api.getSnapshot().activeUI).toBe('dialog');
		expect(events).toEqual(['consent', 'none', 'ready', 'dialog']);
	});
});

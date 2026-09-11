import { policyRulePresets } from '@c15t/core';
import { resolvePolicyRules } from '@c15t/schema/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createConsentClient } from '../client';
import type { ConsentClient, ConsentClientOptions } from '../types';

const clients: ConsentClient[] = [];
const observers = new Set<MutationObserver>();

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

const startupCases: [string, ConsentClientOptions][] = [
	['disabled', { enabled: false }],
	[
		'prefetched',
		{
			prefetch: {
				initialPolicyResolution: resolvePolicyRules({
					rules: [
						{ ...policyRulePresets.europeOptIn(), match: { isDefault: true } },
					],
				}),
			},
		},
	],
];

describe.each(startupCases)('%s client startup', (_name, options) => {
	it.each(['client', 'document'])(
		'removes page handlers and observers when a %s ready listener disposes',
		async (eventSource) => {
			trackObservers();
			const client = createConsentClient({ ...options, ui: false });
			clients.push(client);
			const onReady = vi.fn(() => client.dispose());
			if (eventSource === 'client') {
				client.on('ready', onReady);
			} else {
				document.addEventListener('c15t:ready', onReady, { once: true });
			}

			client.start();

			expect(onReady).toHaveBeenCalledOnce();
			expect(client.started).toBe(false);
			await expect(client.ready()).resolves.toBeDefined();
			const link = document.createElement('a');
			link.href = '#c15t-preferences';
			document.body.append(link);
			const click = new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
			});
			link.dispatchEvent(click);

			expect(click.defaultPrevented).toBe(false);
			expect(observers.size).toBe(0);
			client.start();
			expect(client.started).toBe(false);
			expect(onReady).toHaveBeenCalledOnce();
		}
	);
});

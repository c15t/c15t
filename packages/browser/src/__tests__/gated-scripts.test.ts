import { afterEach, describe, expect, it, vi } from 'vitest';

import { createConsentClient } from '../client';
import { activateGatedScripts } from '../gated-scripts';
import type { ConsentClient } from '../types';

const clients: ConsentClient[] = [];

const clearCookies = function clearCookies(): void {
	for (const entry of document.cookie.split(';')) {
		const name = entry.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
};

const inertScript = function inertScript(
	category: string,
	body: string
): HTMLScriptElement {
	const script = document.createElement('script');
	script.type = 'text/plain';
	script.setAttribute('data-c15t-category', category);
	script.textContent = body;
	document.body.append(script);
	return script;
};

afterEach(() => {
	for (const client of clients.splice(0)) {
		client.dispose();
	}
	localStorage.clear();
	clearCookies();
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

describe('gated inline scripts', () => {
	it('activates a script once its category is granted', async () => {
		inertScript('measurement', 'window.__gated = (window.__gated ?? 0) + 1;');
		const client = createConsentClient(
			{ consentCategories: ['measurement'], reloadOnConsentRevoked: false },
			{ pkg: 'test' }
		);
		clients.push(client);
		client.start();
		await client.ready();

		expect(
			document.querySelector('script[data-c15t-activated="true"]')
		).toBeNull();

		await client.acceptAll();

		const activated = document.querySelector<HTMLScriptElement>(
			'script[data-c15t-activated="true"]'
		);
		expect(activated).not.toBeNull();
		expect(activated?.type).toBe('');
		expect(activated?.textContent).toContain('__gated');
		expect(
			document.querySelectorAll('script[data-c15t-category]')
		).toHaveLength(1);
	});

	it('leaves a denied category inert and flags unknown ones', () => {
		inertScript('marketing', 'window.__never = true;');
		inertScript('telemetry', 'window.__never = true;');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
			/* silenced */
		});
		const client = createConsentClient({ ui: false }, { pkg: 'test' });
		clients.push(client);

		const count = activateGatedScripts(client.getSnapshot());

		expect(count).toBe(0);
		expect(warn).toHaveBeenCalledOnce();
		expect(
			document
				.querySelector('script[data-c15t-category="telemetry"]')
				?.getAttribute('data-c15t-activated')
		).toBe('invalid');
		expect(
			document
				.querySelector('script[data-c15t-category="marketing"]')
				?.hasAttribute('data-c15t-activated')
		).toBe(false);
	});
});

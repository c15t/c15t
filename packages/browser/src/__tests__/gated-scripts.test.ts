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
	it('does not execute an ordinary script again', () => {
		const script = inertScript('necessary', 'window.__once = true;');
		script.type = 'text/javascript';
		const client = createConsentClient({ ui: false });
		clients.push(client);
		expect(activateGatedScripts(client.getSnapshot())).toBe(0);
		expect(document.querySelector('script')).toBe(script);
	});

	it('activates inert scripts inserted after initialization', async () => {
		const client = createConsentClient({ ui: false });
		clients.push(client);
		client.start();
		await client.ready();
		const script = inertScript('necessary', 'window.__late = true;');
		await vi.waitFor(() => expect(script.isConnected).toBe(false));
		expect(
			document.querySelector('[data-c15t-activated="true"]')
		).not.toBeNull();
	});
	it('activates a script once its category is granted', async () => {
		inertScript('measurement', 'window.__gated = (window.__gated ?? 0) + 1;');
		const client = createConsentClient(
			{ consentCategories: ['measurement'] },
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

const externalScript = (category = 'necessary', asynchronous = false) => {
	const script = inertScript(category, '');
	script.src = 'https://example.test/vendor.js';
	if (asynchronous) {
		script.setAttribute('async', '');
	}
	return script;
};

describe('ordered gated scripts', () => {
	it('waits for each external load or error across observer rescans', async () => {
		externalScript();
		const firstSetup = inertScript('necessary', 'window.__first = true;');
		const secondVendor = externalScript();
		const secondSetup = inertScript('necessary', 'window.__second = true;');
		const client = createConsentClient({ ui: false });
		clients.push(client);
		client.start();
		await client.ready();
		const firstVendor =
			document.querySelector<HTMLScriptElement>('script[src]');
		expect(firstVendor?.async).toBe(false);
		expect(firstSetup.isConnected).toBe(true);
		expect(secondVendor.isConnected).toBe(true);
		expect(secondSetup.isConnected).toBe(true);

		const late = inertScript('necessary', 'window.__late = true;');
		await Promise.resolve();
		expect(late.isConnected).toBe(true);
		firstVendor?.dispatchEvent(new Event('load'));
		expect(firstSetup.isConnected).toBe(false);
		expect(secondVendor.isConnected).toBe(false);
		expect(secondSetup.isConnected).toBe(true);
		const vendors = document.querySelectorAll('script[src]');
		vendors[1]?.dispatchEvent(new Event('error'));
		expect(secondSetup.isConnected).toBe(false);
		expect(late.isConnected).toBe(false);
		await Promise.resolve();
		expect(
			document.querySelectorAll('[data-c15t-activated="true"]')
		).toHaveLength(5);
	});

	it('lets explicit async external scripts run while ordered scripts wait', async () => {
		externalScript();
		const setup = inertScript('necessary', 'window.__setup = true;');
		// The async attribute has no effect on inline classic scripts.
		setup.setAttribute('async', '');
		const asynchronous = externalScript('necessary', true);
		const client = createConsentClient({ ui: false });
		clients.push(client);
		client.start();
		await client.ready();

		expect(asynchronous.isConnected).toBe(false);
		expect(setup.isConnected).toBe(true);
		const vendors = document.querySelectorAll<HTMLScriptElement>('script[src]');
		expect(vendors[1]?.async).toBe(true);
		vendors[1]?.dispatchEvent(new Event('load'));
		expect(setup.isConnected).toBe(true);
		vendors[0]?.dispatchEvent(new Event('load'));
		expect(setup.isConnected).toBe(false);
	});

	it('checks current consent before continuing and resumes after a new grant', async () => {
		externalScript('measurement');
		const setup = inertScript('measurement', 'window.__setup = true;');
		const client = createConsentClient({
			consentCategories: ['measurement'],
			ui: false,
		});
		clients.push(client);
		client.start();
		await client.ready();
		await client.acceptAll();
		const vendor = document.querySelector('script[src]');
		expect(vendor?.getAttribute('data-c15t-activated')).toBe('true');
		expect(setup.isConnected).toBe(true);

		await client.rejectAll();
		vendor?.dispatchEvent(new Event('load'));
		expect(setup.isConnected).toBe(true);
		expect(setup.hasAttribute('data-c15t-activated')).toBe(false);
		await client.acceptAll();
		expect(setup.isConnected).toBe(false);
		expect(document.querySelectorAll('script[src]')).toHaveLength(1);
	});

	it('does not activate pending or newly inserted scripts after disposal', async () => {
		externalScript();
		const setup = inertScript('necessary', 'window.__setup = true;');
		const client = createConsentClient({ ui: false });
		clients.push(client);
		client.start();
		await client.ready();
		client.dispose();
		document.querySelector('script[src]')?.dispatchEvent(new Event('load'));
		const late = inertScript('necessary', 'window.__late = true;');
		await Promise.resolve();

		expect(setup.isConnected).toBe(true);
		expect(late.isConnected).toBe(true);
		expect(setup.hasAttribute('data-c15t-activated')).toBe(false);
		expect(late.hasAttribute('data-c15t-activated')).toBe(false);
	});

	it("waits for an earlier client's external script after disposal and reinitialization", async () => {
		externalScript();
		const setup = inertScript('necessary', 'window.__setup = true;');
		const previous = createConsentClient({ ui: false });
		clients.push(previous);
		previous.start();
		await previous.ready();
		const vendor = document.querySelector('script[src]');
		previous.dispose();

		const replacement = createConsentClient({ ui: false });
		clients.push(replacement);
		replacement.start();
		await replacement.ready();
		expect(setup.isConnected).toBe(true);
		vendor?.dispatchEvent(new Event('load'));
		expect(setup.isConnected).toBe(false);
		expect(document.querySelectorAll('script')).toHaveLength(2);
	});

	it('shares in-flight ordering with standalone scans without duplicate activation', async () => {
		externalScript();
		const setup = inertScript('necessary', 'window.__setup = true;');
		const client = createConsentClient({ ui: false });
		clients.push(client);
		client.start();
		await client.ready();

		expect(activateGatedScripts(client.getSnapshot())).toBe(0);
		expect(setup.isConnected).toBe(true);
		document.querySelector('script[src]')?.dispatchEvent(new Event('load'));
		expect(setup.isConnected).toBe(false);
		expect(document.querySelectorAll('script')).toHaveLength(2);
	});

	it('skips waiting nodes removed before their vendor finishes loading', async () => {
		externalScript();
		const removed = inertScript('necessary', 'window.__removed = true;');
		const remaining = inertScript('necessary', 'window.__remaining = true;');
		const client = createConsentClient({ ui: false });
		clients.push(client);
		client.start();
		await client.ready();
		removed.remove();
		document.querySelector('script[src]')?.dispatchEvent(new Event('load'));

		expect(removed.hasAttribute('data-c15t-activated')).toBe(false);
		expect(remaining.isConnected).toBe(false);
		expect(document.querySelectorAll('script')).toHaveLength(2);
	});
});

import { policyRulePresets } from '@c15t/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createScriptTagConsentClient as createConsentClient } from '../script-tag-client';
import type { ConsentClient, ConsentUIHandle } from '../types';
import { mountConsentUI } from '../ui/mount';

const clients: ConsentClient[] = [];

const clearCookies = function clearCookies(): void {
	for (const entry of document.cookie.split(';')) {
		const name = entry.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
};

const mount = async function mount(
	options: Parameters<typeof createConsentClient>[0] = {}
): Promise<{
	client: ConsentClient;
	root: ParentNode;
}> {
	const client = createConsentClient(
		{
			acknowledgeNoRecords: true,
			consentCategories: ['measurement', 'marketing'],
			policyRules: [
				{
					...policyRulePresets.europeOptIn(),
					categories: ['measurement', 'marketing'],
					match: { isDefault: true },
					privacySignals: { gpc: { denyCategories: ['marketing'] } },
					scopeMode: 'strict',
				},
			],
			ui: { disableAnimation: true, styles: false },
			...options,
		},
		{ mountUI: mountConsentUI, pkg: '@c15t/browser/test' }
	);
	clients.push(client);
	client.start();
	await client.ready();
	const handle = client.ui as ConsentUIHandle;
	return { client, root: handle.root };
};

const query = function query<ElementType extends HTMLElement = HTMLElement>(
	root: ParentNode,
	testId: string
): ElementType {
	const element = root.querySelector<ElementType>(`[data-testid="${testId}"]`);
	if (!element) {
		throw new Error(`missing ${testId}`);
	}
	return element;
};

afterEach(() => {
	for (const client of clients.splice(0)) {
		client.dispose();
	}
	localStorage.clear();
	clearCookies();
	document.body.replaceChildren();
	document.head.querySelector('#c15t-styles')?.remove();
});

describe('browser widget restriction notice and GPC seeding', () => {
	it('does not show a restriction notice for an unsaved draft toggle', async () => {
		const { client, root } = await mount();
		client.openDialog();

		const marketing = query(root, 'consent-widget-switch-marketing');
		expect(marketing.getAttribute('aria-checked')).toBe('false');
		marketing.click();
		expect(marketing.getAttribute('aria-checked')).toBe('true');
		expect(
			root.querySelector('[data-testid="consent-widget-restriction-marketing"]')
		).toBeNull();
		expect(marketing.hasAttribute('aria-describedby')).toBe(false);
	});

	it('shows a restriction notice below the row for a saved grant that GPC overrides', async () => {
		const { client, root } = await mount({
			overrides: { gpc: true },
		});
		await client.save({ marketing: true, measurement: true });
		client.openDialog();

		const notice = query(root, 'consent-widget-restriction-marketing');
		expect(notice.textContent).toContain('restricted');

		const trigger = query(root, 'consent-widget-accordion-trigger-marketing');
		expect(trigger.contains(notice)).toBe(false);

		const marketing = query(root, 'consent-widget-switch-marketing');
		expect(marketing.getAttribute('aria-checked')).toBe('true');
		expect(marketing.getAttribute('aria-describedby')).toBe(notice.id);
		expect(
			root.querySelector(
				'[data-testid="consent-widget-restriction-measurement"]'
			)
		).toBeNull();

		// Turning GPC off removes the notice and aria-describedby.
		client.kernel.set.overrides({ gpc: false });
		expect(
			root.querySelector('[data-testid="consent-widget-restriction-marketing"]')
		).toBeNull();
		expect(marketing.hasAttribute('aria-describedby')).toBe(false);
	});

	it('shows a GPC-denied opt-out category off and saves a denial when untouched', async () => {
		const { client, root } = await mount({
			consentCategories: ['functionality', 'measurement', 'marketing'],
			overrides: { country: 'US', gpc: true, region: 'CA' },
			policyRules: [policyRulePresets.californiaOptOut()],
		});
		expect(client.getSnapshot().policyRule.model).toBe('opt-out');
		client.openDialog();

		expect(
			query(root, 'consent-widget-switch-marketing').getAttribute(
				'aria-checked'
			)
		).toBe('false');
		expect(
			query(root, 'consent-widget-switch-functionality').getAttribute(
				'aria-checked'
			)
		).toBe('true');
		expect(
			root.querySelector('[data-testid="consent-widget-restriction-marketing"]')
		).toBeNull();

		query(root, 'consent-widget-footer-save-button').click();
		await vi.waitFor(() => expect(client.getSnapshot().activeUI).toBe('none'));
		expect(client.getSnapshot().explicitChoice?.categories).toMatchObject({
			functionality: { value: true },
			marketing: { value: false },
		});
	});
});

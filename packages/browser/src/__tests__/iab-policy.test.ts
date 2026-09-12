import {
	POLICY_CHOICE,
	POLICY_MAX_AGE,
	POLICY_NOW,
	POLICY_SCENARIOS,
} from '@c15t/conformance/fixtures';
import { evaluateConsent } from '@c15t/core';
import { clearGVLCache } from '@c15t/iab';
import type { PolicyRule } from '@c15t/schema/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import { init } from '../iab';
import { offline } from '../transports/offline';
import type { ConsentClient, ConsentClientOptions } from '../types';

const iabRule: PolicyRule = {
	id: 'browser-iab-policy',
	match: { isDefault: true },
	model: 'iab',
	prompt: POLICY_CHOICE.prompt,
	scopeMode: POLICY_CHOICE.scopeMode,
	validity: { choiceDays: POLICY_CHOICE.choice.maxAgeMs / 86400000 },
};
const clients: ConsentClient[] = [];
const start = async (
	options: ConsentClientOptions = {}
): Promise<ConsentClient> => {
	const client = init({
		iab: { cmpId: 28, gvl: completeGVL },
		mode: offline({ policyRules: [iabRule] }),
		overrides: { country: 'DE' },
		ui: { styles: false },
		...options,
	});
	clients.push(client);
	await client.ready();
	await client.runtime.iab?.whenReady?.();
	return client;
};
const target = { category: 'marketing', vendorId: 755 } as const;
const query = (client: ConsentClient, id: string): Element | null | undefined =>
	client.ui?.root.querySelector(`[data-testid="${id}"]`);

const pendingTransport = () => {
	const response = Promise.withResolvers<{ ok: boolean }>();
	const started = Promise.withResolvers<undefined>();
	const factory = offline({ policyRules: [iabRule] });
	const mode: typeof factory = Object.assign(
		(context: Parameters<typeof factory>[0]) => ({
			...factory(context),
			save: () => {
				started.resolve(undefined);
				return response.promise;
			},
		}),
		{ kind: 'custom' as const }
	);
	return { mode, response, started: started.promise };
};

afterEach(() => {
	for (const client of clients.splice(0)) {
		client.dispose();
	}
	clearGVLCache();
	localStorage.clear();
	for (const entry of document.cookie.split(';')) {
		document.cookie = `${entry.split('=')[0]?.trim()}=; Max-Age=0; path=/`;
	}
	document.body.replaceChildren();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('browser IAB policy and pending confirmations', () => {
	it('confirms IAB preferences with a strict partial-category policy scope', async () => {
		const client = await start({
			mode: offline({
				policyRules: [{ ...iabRule, categories: [...POLICY_CHOICE.scope] }],
			}),
		});
		expect((await client.acceptAll()).ok).toBe(true);
		expect(client.getSnapshot().iab?.authority?.vendorConsents['755']).toBe(
			true
		);
		expect(client.has('marketing')).toBe(true);
		expect(client.has('functionality')).toBe(false);
	});

	it('keeps the shared GPC restriction when an IAB authority grants a vendor', async () => {
		const scenario = POLICY_SCENARIOS.find(
			(entry) => entry.id === 'iab-gpc-restriction-survives-authority'
		);
		if (!scenario) {
			throw new Error('Missing shared IAB GPC policy scenario');
		}
		const client = await start({
			mode: offline({
				policyRules: [
					{
						...iabRule,
						privacySignals: {
							gpc: { denyCategories: [...scenario.policy.gpcDenyCategories] },
						},
					},
				],
			}),
			overrides: { country: 'DE', gpc: scenario.gpc },
		});
		expect((await client.acceptAll()).ok).toBe(true);
		expect(client.getSnapshot().iab?.authority?.vendorConsents['755']).toBe(
			true
		);
		expect(evaluateConsent(target, client.getSnapshot())).toBe(
			scenario.steps[0]?.expect?.iabTargetAllowed
		);
		client.setOverrides({ gpc: false });
		await client.kernel.commands.init();
		await vi.waitFor(() =>
			expect(evaluateConsent(target, client.getSnapshot())).toBe(true)
		);
		client.setOverrides({ gpc: true });
		await client.kernel.commands.init();
		await vi.waitFor(() =>
			expect(evaluateConsent(target, client.getSnapshot())).toBe(false)
		);
	});

	it('prompts again when stored TC authority expires before a new page load', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(POLICY_NOW);
		const original = await start();
		expect((await original.acceptAll()).ok).toBe(true);
		expect(original.getSnapshot().iab?.authority?.expiresAt).toBe(
			POLICY_NOW + POLICY_MAX_AGE
		);
		original.dispose();
		vi.setSystemTime(POLICY_NOW + POLICY_MAX_AGE);
		const restored = await start();
		expect(restored.getSnapshot().iab?.authority).toBeNull();
		expect(evaluateConsent(target, restored.getSnapshot())).toBe(false);
		expect(restored.getSnapshot().promptRequirement).toMatchObject({
			kind: 'choice',
			reason: 'expired',
		});
		expect(query(restored, 'iab-consent-banner-root')).not.toBeNull();
	});

	it('replaces ordinary preferences with IAB choices when the region changes', async () => {
		const client = await start({
			mode: 'offline',
			overrides: { country: 'US', region: 'CA' },
		});
		client.openDialog();
		expect(query(client, 'consent-dialog-root')).not.toBeNull();
		expect(query(client, 'iab-consent-dialog-root')).toBeNull();
		client.setOverrides({ country: 'DE' });
		await client.kernel.commands.init();
		await vi.waitFor(() =>
			expect(client.getSnapshot().policyRule.model).toBe('iab')
		);
		client.openDialog();
		await vi.waitFor(() =>
			expect(query(client, 'consent-dialog-root')).toBeNull()
		);
		expect(query(client, 'iab-consent-dialog-root')).not.toBeNull();
		expect(query(client, 'purpose-item-1-consent')).not.toBeNull();
		expect((await client.save({ marketing: true })).ok).toBe(false);
		expect(client.getSnapshot().iab?.authority).toBeNull();
	});

	it('does not close preferences reopened while an IAB save awaits the server', async () => {
		const pending = pendingTransport();
		const client = await start({ mode: pending.mode });
		client.openDialog();
		const saving = client.acceptAll();
		await pending.started;
		client.closeDialog();
		client.openDialog();
		pending.response.resolve({ ok: true });
		expect((await saving).ok).toBe(true);
		expect(client.getSnapshot().activeUI).toBe('dialog');
		expect(query(client, 'iab-consent-dialog-root')).not.toBeNull();
	});

	it('preserves a newer vendor draft when an older confirmation receives its acknowledgement', async () => {
		const pending = pendingTransport();
		const client = await start({ mode: pending.mode });
		const saving = client.acceptAll();
		await pending.started;
		const confirmed = client.getSnapshot().iab?.authority;
		client.openDialog();
		client.runtime.iab?.setVendorConsent(755, false);
		pending.response.resolve({ ok: true });
		expect((await saving).ok).toBe(true);
		expect(client.getSnapshot().iab?.vendorConsents['755']).toBe(false);
		expect(client.getSnapshot().iab?.authority).toBe(confirmed);
		expect(client.getSnapshot().iab?.authority?.vendorConsents['755']).toBe(
			true
		);
		expect(client.getSnapshot().activeUI).toBe('dialog');
	});
});

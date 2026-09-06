/**
 * Tests for the rich InitResponse + policy derivation + set.iab action.
 *
 * Verifies:
 * 1. commands.init applies all new fields (location, translations, branding,
 *    policy, policyDecision, policySnapshotToken) to the snapshot.
 * 2. Policy drives derived state: model, activeUI, policyCategories,
 *    policyScopeMode, policyBanner, policyDialog.
 * 3. Preselected consents do not become runtime grants before consent.
 * 4. IAB passthrough: gvl/customVendors/cmpId land on snapshot.iab.
 * 5. set.iab mutates snapshot.iab idempotently and re-derives model
 *    when enabled flips.
 * 6. SavePayload carries policySnapshotToken and tcString.
 */
import type { PolicyDecision, ResolvedPolicy } from '@c15t/schema/types';
import { describe, expect, test, vi } from 'vitest';

import { createConsentKernel } from '../index';
import type { KernelTransport, SavePayload } from '../index';

// --- Fixture: a reasonable GDPR policy with all the fields we care about ---

const GDPR_POLICY: ResolvedPolicy = {
	consent: {
		categories: ['necessary', 'functionality', 'marketing', 'measurement'],
		model: 'opt-in',
		preselectedCategories: ['necessary', 'functionality'],
		scopeMode: 'permissive',
	},
	id: 'gdpr-strict',
	model: 'opt-in',
	ui: {
		banner: {
			allowedActions: ['accept', 'reject', 'customize'],
			direction: 'row',
			primaryActions: ['accept', 'reject'],
			scrollLock: false,
			uiProfile: 'balanced',
		},
		dialog: {
			allowedActions: ['accept', 'reject', 'customize'],
			direction: 'column',
			primaryActions: ['accept'],
			scrollLock: true,
			uiProfile: 'balanced',
		},
		mode: 'banner',
	},
} as unknown as ResolvedPolicy;

const GDPR_DECISION: PolicyDecision = {
	fingerprint: 'abc123',
	matchedBy: 'region',
} as unknown as PolicyDecision;

const IAB_POLICY: ResolvedPolicy = {
	...GDPR_POLICY,
	consent: {
		...GDPR_POLICY.consent,
		model: 'iab',
	},
	id: 'iab-policy',
	model: 'iab',
} as unknown as ResolvedPolicy;

const NO_BANNER_POLICY: ResolvedPolicy = {
	id: 'no_banner',
	model: 'none',
	ui: { mode: 'none' },
} as unknown as ResolvedPolicy;

describe('rich init: applies full response to snapshot', () => {
	test('fills location / translations / branding / policy / policyDecision / policySnapshotToken', async () => {
		const transport: KernelTransport = {
			init() {
				return {
					branding: 'c15t',
					location: { countryCode: 'DE', regionCode: 'BE' },
					policy: GDPR_POLICY,
					policyDecision: GDPR_DECISION,
					policySnapshotToken: 'token-xyz',
					translations: {
						language: 'de',
						translations: {
							common: { acceptAll: 'Alle akzeptieren' },
						} as never,
					},
				};
			},
		};
		const kernel = createConsentKernel({ transport });

		await kernel.commands.init();
		const snap = kernel.getSnapshot();

		expect(snap.location).toEqual({ countryCode: 'DE', regionCode: 'BE' });
		expect(snap.translations?.language).toBe('de');
		expect(snap.branding).toBe('c15t');
		expect(snap.policy).toMatchObject({ id: 'gdpr-strict', model: 'opt-in' });
		expect(snap.policyDecision?.matchedBy).toBe('region');
		expect(snap.policySnapshotToken).toBe('token-xyz');
	});

	test('derives model, activeUI, policyCategories, policyScopeMode from policy', async () => {
		const transport: KernelTransport = {
			init() {
				return {
					policy: GDPR_POLICY,
				};
			},
		};
		const kernel = createConsentKernel({ transport });

		await kernel.commands.init();
		const snap = kernel.getSnapshot();

		// GDPR + no IAB → opt-in
		expect(snap.model).toBe('opt-in');
		// policy.ui.mode = banner
		expect(snap.activeUI).toBe('banner');
		// policy.consent.categories — order follows allConsentNames, not the
		// input allowlist, so compare as a set.
		expect(new Set(snap.policyCategories)).toEqual(
			new Set(['necessary', 'functionality', 'marketing', 'measurement'])
		);
		// policy.consent.scopeMode
		expect(snap.policyScopeMode).toBe('permissive');
		// policy.ui.banner + dialog landed
		expect(snap.policyBanner?.allowedActions).toEqual([
			'accept',
			'reject',
			'customize',
		]);
		expect(snap.policyDialog?.scrollLock).toBe(true);
	});

	test('does not grant policy.preselectedCategories when hasConsented is false', async () => {
		const transport: KernelTransport = {
			init() {
				return { policy: GDPR_POLICY };
			},
		};
		const kernel = createConsentKernel({ transport });

		expect(kernel.getSnapshot().consents.functionality).toBe(false);
		await kernel.commands.init();
		const snap = kernel.getSnapshot();

		// preselectedCategories can seed UI drafts, but opt-in silence is denied
		// in the kernel's runtime gating snapshot.
		expect(snap.consents.necessary).toBe(true);
		expect(snap.consents.functionality).toBe(false);
		expect(snap.consents.marketing).toBe(false);
	});

	test('does NOT overwrite consents when hasConsented=true', async () => {
		const transport: KernelTransport = {
			init() {
				// oxlint-disable-next-line sort-keys -- Preserve declaration order, interface shape, and public compatibility.
				return {
					policy: GDPR_POLICY,
					// Server says hasConsented=true — user has prior choice
					hasConsented: true,
					consents: { marketing: true },
				};
			},
		};
		const kernel = createConsentKernel({ transport });

		await kernel.commands.init();
		const snap = kernel.getSnapshot();

		expect(snap.hasConsented).toBe(true);
		// Server consent respected
		expect(snap.consents.marketing).toBe(true);
		// Preselected not applied (hasConsented=true)
		expect(snap.consents.functionality).toBe(false);
	});

	test('model=null when policy.model is none', async () => {
		const transport: KernelTransport = {
			init() {
				return { policy: NO_BANNER_POLICY };
			},
		};
		const kernel = createConsentKernel({ transport });

		await kernel.commands.init();
		expect(kernel.getSnapshot().model).toBeNull();
		expect(kernel.getSnapshot().activeUI).toBe('none');
	});
});

describe('rich init: IAB passthrough', () => {
	test('gvl / customVendors / cmpId land on snapshot.iab', async () => {
		const transport: KernelTransport = {
			init() {
				return {
					cmpId: 28,
					customVendors: [{ id: 'cv-1', name: 'Custom Vendor 1' } as never],
					gvl: {
						features: {},
						gvlSpecificationVersion: 3,
						lastUpdated: '2026-01-01T00:00:00Z',
						purposes: {},
						specialFeatures: {},
						specialPurposes: {},
						stacks: {},
						tcfPolicyVersion: 4,
						vendorListVersion: 42,
						vendors: {},
					} as never,
				};
			},
		};
		const kernel = createConsentKernel({ transport });

		await kernel.commands.init();
		const snap = kernel.getSnapshot();

		expect(snap.iab).not.toBeNull();
		expect(snap.iab?.gvl).not.toBeNull();
		expect(snap.iab?.customVendors).toHaveLength(1);
		expect(snap.iab?.cmpId).toBe(28);
	});

	test('gvl=null on 200 response → iab.enabled remains false', async () => {
		const transport: KernelTransport = {
			init() {
				return { gvl: null };
			},
		};
		const kernel = createConsentKernel({
			// consumer wanted IAB
			initialIab: { enabled: true },
			transport,
		});

		await kernel.commands.init();
		expect(kernel.getSnapshot().iab?.enabled).toBe(false);
	});

	test('no IAB fields in response → snapshot.iab unchanged', async () => {
		const transport: KernelTransport = {
			init() {
				return {};
			},
		};
		const kernel = createConsentKernel({
			initialIab: { cmpId: 99, enabled: true },
			transport,
		});

		await kernel.commands.init();
		expect(kernel.getSnapshot().iab?.cmpId).toBe(99);
	});
});

describe('set.iab: kernel action', () => {
	test('applies patch when current iab is null', () => {
		const kernel = createConsentKernel();
		expect(kernel.getSnapshot().iab).toBeNull();

		kernel.set.iab({ cmpId: 28, enabled: true });
		const snap = kernel.getSnapshot();
		expect(snap.iab?.enabled).toBe(true);
		expect(snap.iab?.cmpId).toBe(28);
	});

	test('updates vendor consent without wiping other fields', () => {
		const kernel = createConsentKernel({
			initialIab: { cmpId: 28, enabled: true, purposeConsents: { 1: true } },
		});

		kernel.set.iab({ vendorConsents: { '500': false, '755': true } });
		const snap = kernel.getSnapshot();
		expect(snap.iab?.vendorConsents['755']).toBe(true);
		expect(snap.iab?.cmpId).toBe(28);
		expect(snap.iab?.purposeConsents[1]).toBe(true);
	});

	test('notifies subscribers and emits iab:set event', () => {
		const kernel = createConsentKernel({ initialIab: { enabled: true } });
		const listener = vi.fn();
		const eventListener = vi.fn();
		kernel.subscribe(listener);
		kernel.events.on('iab:set', eventListener);

		kernel.set.iab({ purposeConsents: { 1: true } });

		expect(listener).toHaveBeenCalledTimes(1);
		expect(eventListener).toHaveBeenCalledTimes(1);
	});

	test('flipping enabled re-derives model + activeUI', () => {
		const kernel = createConsentKernel({
			initialIab: { enabled: false },
			initialPolicy: IAB_POLICY,
		});

		expect(kernel.getSnapshot().model).toBeNull();

		kernel.set.iab({ enabled: true });
		expect(kernel.getSnapshot().model).toBe('iab');

		kernel.set.iab({ enabled: false });
		expect(kernel.getSnapshot().model).toBeNull();
	});

	test('no-op patch does not notify subscribers', () => {
		const kernel = createConsentKernel({
			initialIab: { cmpId: 28, enabled: true },
		});
		const listener = vi.fn();
		kernel.subscribe(listener);

		kernel.set.iab({ cmpId: 28, enabled: true });
		expect(listener).not.toHaveBeenCalled();
	});
});

describe('SavePayload: carries policySnapshotToken + tcString', () => {
	test('policySnapshotToken is passed to transport.save', async () => {
		const saveSpy = vi.fn().mockResolvedValue({ ok: true });
		const transport: KernelTransport = {
			init() {
				return { policySnapshotToken: 'snap-42' };
			},
			save: saveSpy,
		};
		const kernel = createConsentKernel({ transport });

		await kernel.commands.init();
		await kernel.commands.save('all');

		const payload = saveSpy.mock.calls[0]?.[0] as SavePayload;
		expect(payload.policySnapshotToken).toBe('snap-42');
	});

	test('tcString from snapshot.iab is passed to transport.save', async () => {
		const saveSpy = vi.fn().mockResolvedValue({ ok: true });
		const transport: KernelTransport = { save: saveSpy };
		const kernel = createConsentKernel({ transport });

		kernel.set.iab({ enabled: true, tcString: 'CPTCFg...base64...' });
		await kernel.commands.save('all');

		const payload = saveSpy.mock.calls[0]?.[0] as SavePayload;
		expect(payload.tcString).toBe('CPTCFg...base64...');
	});
});

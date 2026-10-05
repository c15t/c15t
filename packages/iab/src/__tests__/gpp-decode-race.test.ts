/** @vitest-environment jsdom */
import { createConsentKernel } from '@c15t/core';
import type { ConsentKernel, KernelIABAuthority } from '@c15t/core';
import {
	createPolicyRuleFingerprints,
	normalizePolicyRule,
} from '@c15t/schema/types';
import { afterEach, expect, test, vi } from 'vitest';

import type { GPPEventData, GPPPingData } from '../gpp';
import { createGPPRuntime } from '../gpp/create-gpp';
import { completeGVL } from './fixtures/gvl-sample';

/** Decodes that finish only when the test resolves them. */
const pending = new Map<string, (parsed: Record<string, unknown>[]) => void>();
const parseTCFEUSection = (tcString: string) =>
	new Promise<Record<string, unknown>[]>((resolve) => {
		pending.set(tcString, resolve);
	});

const disposers: (() => void)[] = [];
afterEach(() => {
	for (const dispose of disposers.splice(0).reverse()) {
		dispose();
	}
	pending.clear();
});

const authority = (tcString: string): KernelIABAuthority => ({
	choiceFingerprint: 'fingerprint',
	confirmedAt: Date.now(),
	expiresAt: Date.now() + 86_400_000,
	purposeConsents: {},
	purposeLegitimateInterests: {},
	specialFeatureOptIns: {},
	tcString,
	vendorConsents: {},
	vendorLegitimateInterests: {},
});

const ping = (): GPPPingData => {
	let data: GPPPingData | undefined;
	window.__gpp?.('ping', (result) => {
		data = result as GPPPingData;
	});
	if (!data) {
		throw new Error('no ping');
	}
	return data;
};

test('a slow decode of an older TC String never replaces the current one', async () => {
	const policy = normalizePolicyRule({
		id: 'iab',
		match: { isDefault: true },
		model: 'iab',
		prompt: 'choice',
	});
	const kernel = createConsentKernel({
		initialIab: { cmpId: 28, enabled: true, gvl: completeGVL },
		initialPolicyResolution: {
			fingerprints: createPolicyRuleFingerprints(policy),
			matchedBy: 'default',
			policy,
			policyId: policy.id,
			status: 'matched',
		},
	});
	disposers.push(kernel.dispose);
	kernel.set.activeUI('none');
	// The kernel only installs authority a TCF CMP validated. The race
	// depends only on which TC String the snapshot holds, so substitute it.
	let held: KernelIABAuthority | null = null;
	const listeners = new Set<() => void>();
	const holding = {
		...kernel,
		getSnapshot: () => {
			const snapshot = kernel.getSnapshot();
			return {
				...snapshot,
				iab: snapshot.iab && { ...snapshot.iab, authority: held },
			};
		},
		subscribe: (listener: () => void) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	} as ConsentKernel;
	const hold = (tcString: string) => {
		held = authority(tcString);
		for (const listener of listeners) {
			listener();
		}
	};
	const gpp = createGPPRuntime({ kernel: holding }, { parseTCFEUSection });
	disposers.push(gpp.dispose);
	const events: string[] = [];
	window.__gpp?.('addEventListener', (event) => {
		const { eventName, data } = event as GPPEventData;
		events.push(`${eventName}:${String(data)}`);
	});

	hold('OLD');
	hold('NEW');
	pending.get('NEW')?.([{ CmpId: 2, Version: 2 }]);
	await vi.waitFor(() => expect(ping().signalStatus).toBe('ready'));
	expect(ping().gppString.split('~')[1]).toBe('NEW');
	const settled = events.length;

	pending.get('OLD')?.([{ CmpId: 1, Version: 2 }]);
	await Promise.resolve();
	await Promise.resolve();

	expect(ping()).toMatchObject({
		parsedSections: { tcfeuv2: [{ CmpId: 2, Version: 2 }] },
		signalStatus: 'ready',
	});
	expect(ping().gppString.split('~')[1]).toBe('NEW');
	expect(events.slice(settled)).toEqual([]);
});

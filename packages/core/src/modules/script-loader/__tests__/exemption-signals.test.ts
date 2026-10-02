import { describe, expect, test } from 'vitest';

import {
	matchedResolution,
	NOW,
	optOutRule,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../kernel';
import { buildCallbackInfo } from '../callbacks';
import { buildReconcilePass, hasScriptConsent } from '../eligibility';
import { normalizeScripts } from '../normalize';
import type { Script } from '../types';

const statistics: Script = {
	callbackOnly: true,
	category: 'measurement',
	id: 'statistics',
};

const mixedResolution = () =>
	matchedResolution(
		{
			exemptions: { measurement: { kind: 'uk-statistics', revision: '1' } },
			id: 'uk-mixed',
			match: { countries: ['GB'] },
			model: 'opt-in',
			prompt: 'choice',
			scopeMode: 'strict',
		},
		'country'
	);

describe('exempt script consent signals', () => {
	test('allows exempt scripts while keeping the provider consent signal denied', () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: mixedResolution(),
			now: NOW,
		});
		try {
			const snapshot = kernel.getSnapshot();
			const [normalized] = normalizeScripts([statistics]);
			if (!normalized) {
				throw new Error('Missing normalized statistics script');
			}
			const permitted = hasScriptConsent(
				normalized,
				buildReconcilePass(snapshot)
			);
			expect(permitted).toBe(true);
			const info = buildCallbackInfo(
				statistics,
				snapshot,
				permitted,
				'statistics'
			);
			expect(info.hasConsent).toBe(true);
			expect(info.consents.measurement).toBe(true);
			expect(info.consentSignals?.measurement).toBe(false);
			expect(snapshot.explicitChoice).toBeNull();
		} finally {
			kernel.dispose();
		}
	});

	test('separates an advertising grant from statistics permission', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: mixedResolution(),
			now: NOW,
		});
		try {
			await kernel.commands.save({ marketing: true });
			const info = buildCallbackInfo(
				statistics,
				kernel.getSnapshot(),
				true,
				'statistics'
			);
			expect(info.consents).toMatchObject({
				marketing: true,
				measurement: true,
			});
			expect(info.consentSignals).toMatchObject({
				marketing: true,
				measurement: false,
			});
			await kernel.commands.save({ measurement: false });
			const denied = buildCallbackInfo(
				statistics,
				kernel.getSnapshot(),
				false,
				'statistics'
			);
			expect(denied.consents.measurement).toBe(false);
			expect(denied.consentSignals?.measurement).toBe(false);
		} finally {
			kernel.dispose();
		}
	});

	test('keeps existing opt-out callback behavior for policies without exemptions', () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(optOutRule()),
			now: NOW,
		});
		try {
			const info = buildCallbackInfo(
				statistics,
				kernel.getSnapshot(),
				true,
				'statistics'
			);
			expect(info.consents.measurement).toBe(true);
			expect(info.consentSignals).toBeUndefined();
		} finally {
			kernel.dispose();
		}
	});
});

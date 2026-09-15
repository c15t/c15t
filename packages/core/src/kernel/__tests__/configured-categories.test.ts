import { expect, test } from 'vitest';

import {
	choiceRecords,
	matchedResolution,
	NOW,
	optInRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../index';

test.each([undefined, []])(
	'an unset or empty client list keeps the full policy choice scope: %j',
	async (consentCategories) => {
		const kernel = createConsentKernel({ consentCategories, now: NOW });
		try {
			await kernel.commands.save('all');
			expect(
				Object.keys(kernel.getSnapshot().explicitChoice?.categories ?? {})
			).toHaveLength(4);
			expect(kernel.getSnapshot().promptRequirement).toEqual({ kind: 'none' });
		} finally {
			kernel.dispose();
		}
	}
);

test.each(['strict', 'permissive'] as const)(
	'client categories do not expand a %s backend scope',
	async (scopeMode) => {
		const kernel = createConsentKernel({
			consentCategories: ['necessary', 'measurement', 'marketing'],
			initialPolicyResolution: matchedResolution(
				optInRule({ categories: ['measurement'], scopeMode })
			),
			now: NOW,
		});
		try {
			await kernel.commands.save('all');
			expect(
				Object.keys(kernel.getSnapshot().explicitChoice?.categories ?? {})
			).toEqual(['measurement']);
			expect(kernel.getSnapshot().promptRequirement).toEqual({ kind: 'none' });
			expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(
				scopeMode === 'permissive'
			);
		} finally {
			kernel.dispose();
		}
	}
);

test('server construction and repeated init use the client scope without changing fingerprints', async () => {
	const resolution = matchedResolution(
		optInRule({ categories: ['necessary'] })
	);
	const kernel = createConsentKernel({
		consentCategories: ['necessary', 'measurement'],
		initialPolicyResolution: resolution,
		initialRecords: choiceRecords(
			{ measurement: true },
			{ fingerprint: resolution.fingerprints.choice }
		),
		now: NOW,
	});
	try {
		expect(kernel.getServerSnapshot().activeUI).toBe('none');
		expect(kernel.getSnapshot().evaluationPolicy.choice.fingerprint).toBe(
			resolution.fingerprints.choice
		);
		await kernel.commands.init();
		expect(kernel.getSnapshot().activeUI).toBe('none');
		kernel.set.consentCategories(['necessary']);
		expect(kernel.getSnapshot().promptRequirement).toEqual({ kind: 'none' });
		kernel.set.consentCategories(undefined);
		expect(kernel.getSnapshot().promptRequirement).toEqual({
			kind: 'choice',
			reason: 'missing',
		});
	} finally {
		kernel.dispose();
	}
});

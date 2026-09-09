import { describe, expect, test, vi } from 'vitest';

import {
	iabRule,
	matchedResolution,
	NOW,
	optOutRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../index';
import { mergeDraft, mergeIab } from '../setters';

describe('mergeDraft', () => {
	test('merges optional booleans and ignores the rest', () => {
		const first = mergeDraft(null, { marketing: true, necessary: true });
		expect(first).toEqual({ marketing: true });
		// oxlint-disable-next-line typescript/no-explicit-any -- deliberately invalid input
		const second = mergeDraft(first, { measurement: 'yes' as any });
		expect(second).toBe(first);
		expect(mergeDraft(first, { marketing: false })).toEqual({
			marketing: false,
		});
	});
});

describe('mergeIab', () => {
	test('previously-null slice + any patch is a change', () => {
		const result = mergeIab(null, { enabled: true });
		expect(result.changed).toBe(true);
		expect(result.next.enabled).toBe(true);
	});

	test('no-change when scalar fields match the baseline', () => {
		const baseline = mergeIab(null, { enabled: true }).next;
		expect(mergeIab(baseline, { enabled: true }).changed).toBe(false);
	});

	test('detects scalar field flip', () => {
		const baseline = mergeIab(null, { enabled: true }).next;
		expect(mergeIab(baseline, { enabled: false }).changed).toBe(true);
	});
});

describe('buildSetters', () => {
	test('set.draft stages a draft without changing the snapshot', () => {
		const kernel = createConsentKernel({ now: NOW });
		const before = kernel.getSnapshot();
		const listener = vi.fn();
		kernel.subscribe(listener);
		kernel.set.draft({ marketing: true });
		expect(kernel.getSnapshot()).toBe(before);
		expect(listener).not.toHaveBeenCalled();
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
	});

	test('choice authority has no boolean setter', () => {
		const kernel = createConsentKernel();
		expect(kernel.set).not.toHaveProperty('hasConsented');
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
	});

	test('set.language is a no-op when language already matches', () => {
		const kernel = createConsentKernel({
			initialOverrides: { language: 'en' },
			now: NOW,
		});
		const before = kernel.getSnapshot();
		kernel.set.language('en');
		expect(kernel.getSnapshot()).toBe(before);
	});

	test('set.subjectId updates the subject once', () => {
		const kernel = createConsentKernel({ now: NOW });
		kernel.set.subjectId('sub_1');
		expect(kernel.getSnapshot().subject).toEqual({ subjectId: 'sub_1' });
		expect(kernel.getSnapshot().subject?.subjectId ?? null).toBe('sub_1');
		const before = kernel.getSnapshot();
		kernel.set.subjectId('sub_1');
		expect(kernel.getSnapshot()).toBe(before);
		kernel.set.subjectId(null);
		expect(kernel.getSnapshot().subject).toBeNull();
	});

	test('set.iab re-derives the model when enabled flips', () => {
		const kernel = createConsentKernel({
			initialIab: { enabled: false },
			initialPolicyResolution: matchedResolution(iabRule()),
			now: NOW,
		});
		const events = vi.fn();
		kernel.events.on('iab:set', events);
		expect(kernel.getSnapshot().model).toBe('opt-in');
		kernel.set.iab({ enabled: true });
		expect(kernel.getSnapshot().model).toBe('iab');
		expect(events).toHaveBeenCalledTimes(1);
	});

	test('set.overrides with gpc masks permissions and emits permissions:changed', () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(
				optOutRule({
					privacySignals: { gpc: { denyCategories: ['marketing'] } },
					prompt: 'none',
				})
			),
			now: NOW,
		});
		const permissions = vi.fn();
		kernel.events.on('permissions:changed', permissions);
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);
		kernel.set.overrides({ gpc: true });
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		expect(kernel.getSnapshot().restrictions.marketing).toEqual(['gpc']);
		expect(permissions).toHaveBeenCalledTimes(1);
		// An override is not a detected signal: no standing directive.
		expect(kernel.getSnapshot().optOutDirectives).toEqual([]);
	});
});

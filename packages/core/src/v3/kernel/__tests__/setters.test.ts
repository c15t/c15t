import { describe, expect, test, vi } from 'vitest';
import type { ConsentSnapshot } from '../../types';
import type { SnapshotPatch } from '../patch';
import { applyPatch } from '../patch';
import { buildSetters, mergeConsent, mergeIab } from '../setters';
import { buildInitialSnapshot } from '../snapshot';

describe('mergeConsent', () => {
	test('returns null when no key actually changes', () => {
		const snap = buildInitialSnapshot({});
		expect(mergeConsent(snap.consents, { necessary: true })).toBeNull();
	});

	test('returns next consents when a key flips', () => {
		const snap = buildInitialSnapshot({});
		const next = mergeConsent(snap.consents, { marketing: true });
		expect(next?.marketing).toBe(true);
		expect(next?.necessary).toBe(true);
	});

	test('drops non-boolean values', () => {
		const snap = buildInitialSnapshot({});
		// biome-ignore lint/suspicious/noExplicitAny: deliberately invalid input
		const next = mergeConsent(snap.consents, { marketing: 'yes' as any });
		expect(next).toBeNull();
	});

	test('drops unknown keys', () => {
		const snap = buildInitialSnapshot({});
		// biome-ignore lint/suspicious/noExplicitAny: deliberately invalid input
		const next = mergeConsent(snap.consents, { analytics: true as any });
		expect(next).toBeNull();
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
		const result = mergeIab(baseline, { enabled: true });
		expect(result.changed).toBe(false);
	});

	test('detects scalar field flip', () => {
		const baseline = mergeIab(null, { enabled: true, cmpId: 1 }).next;
		const result = mergeIab(baseline, { cmpId: 2 });
		expect(result.changed).toBe(true);
		expect(result.next.cmpId).toBe(2);
	});
});

describe('buildSetters', () => {
	function makeKernelStub() {
		let snapshot: ConsentSnapshot = buildInitialSnapshot({});
		const events: { type: string }[] = [];
		const setters = buildSetters({
			getSnapshot: () => snapshot,
			advance: (patch: SnapshotPatch) => {
				snapshot = applyPatch(snapshot, patch);
			},
			emit: (event) => {
				events.push({ type: event.type });
			},
		});
		return { setters, events, getSnapshot: () => snapshot };
	}

	test('set.consent emits when a key changes', () => {
		const { setters, events, getSnapshot } = makeKernelStub();
		setters.consent({ marketing: true });
		expect(events).toEqual([{ type: 'consent:set' }]);
		expect(getSnapshot().consents.marketing).toBe(true);
	});

	test('set.consent is a no-op when nothing changes', () => {
		const { setters, events } = makeKernelStub();
		const fn = vi.fn();
		setters.consent({ necessary: true });
		expect(events).toEqual([]);
		expect(fn).not.toHaveBeenCalled();
	});

	test('set.language is a no-op when language already matches', () => {
		const { setters, events, getSnapshot } = makeKernelStub();
		setters.language('en');
		expect(events).toEqual([{ type: 'overrides:set' }]);
		const before = getSnapshot();
		setters.language('en');
		expect(getSnapshot()).toBe(before);
	});

	test('set.subjectId is a no-op when value matches', () => {
		const { setters, getSnapshot } = makeKernelStub();
		setters.subjectId(null);
		expect(getSnapshot().subjectId).toBeNull();
		const before = getSnapshot();
		setters.subjectId(null);
		expect(getSnapshot()).toBe(before);
	});

	test('set.iab re-derives model + activeUI when enabled flips', () => {
		// Start with an opt-in policy + iab.enabled: false → model "opt-in".
		// Flip iab.enabled to true under the same policy → model still
		// "opt-in" but the derivation runs. Use an iab-only policy to
		// observe the flip cleanly.
		let snapshot: ConsentSnapshot = buildInitialSnapshot({
			initialPolicy: {
				model: 'iab',
				ui: { mode: 'banner' },
				// biome-ignore lint/suspicious/noExplicitAny: minimal policy fixture
			} as any,
		});
		const setters = buildSetters({
			getSnapshot: () => snapshot,
			advance: (patch: SnapshotPatch) => {
				snapshot = applyPatch(snapshot, patch);
			},
			emit: () => {},
		});
		expect(snapshot.model).toBeNull();
		setters.iab({ enabled: true });
		expect(snapshot.model).toBe('iab');
	});
});

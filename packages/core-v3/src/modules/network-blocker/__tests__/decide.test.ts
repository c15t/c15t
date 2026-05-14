import { describe, expect, test } from 'vitest';
import { createConsentKernel } from '../../../kernel';
import { evaluateBlock } from '../decide';
import type { NetworkBlockerRule } from '../types';

function makeRule(
	overrides: Partial<NetworkBlockerRule> = {}
): NetworkBlockerRule {
	return {
		id: 'r',
		domain: 'tracker.example',
		category: 'marketing',
		...overrides,
	};
}

describe('evaluateBlock', () => {
	test('passes a request through when no rule matches', () => {
		const snap = createConsentKernel().getSnapshot();
		const decision = evaluateBlock(
			new URL('https://allowed.example/foo'),
			'GET',
			[makeRule()],
			snap
		);
		expect(decision.shouldBlock).toBe(false);
	});

	test('blocks a matching domain when consent is denied', () => {
		const snap = createConsentKernel().getSnapshot();
		const decision = evaluateBlock(
			new URL('https://tracker.example/foo'),
			'GET',
			[makeRule()],
			snap
		);
		expect(decision.shouldBlock).toBe(true);
		expect(decision.rule?.id).toBe('r');
	});

	test('passes a matching domain when consent is granted', () => {
		const snap = createConsentKernel({
			initialConsents: { marketing: true },
		}).getSnapshot();
		const decision = evaluateBlock(
			new URL('https://tracker.example/foo'),
			'GET',
			[makeRule()],
			snap
		);
		expect(decision.shouldBlock).toBe(false);
	});

	test('returns the first matching rule (rule order matters)', () => {
		const snap = createConsentKernel().getSnapshot();
		const ruleA = makeRule({ id: 'a' });
		const ruleB = makeRule({ id: 'b' });
		const decision = evaluateBlock(
			new URL('https://tracker.example/foo'),
			'GET',
			[ruleA, ruleB],
			snap
		);
		expect(decision.rule?.id).toBe('a');
	});

	test('respects pathIncludes filter', () => {
		const snap = createConsentKernel().getSnapshot();
		const rule = makeRule({ pathIncludes: 'track' });
		const blocked = evaluateBlock(
			new URL('https://tracker.example/api/track'),
			'GET',
			[rule],
			snap
		);
		const passed = evaluateBlock(
			new URL('https://tracker.example/api/health'),
			'GET',
			[rule],
			snap
		);
		expect(blocked.shouldBlock).toBe(true);
		expect(passed.shouldBlock).toBe(false);
	});

	test('respects methods filter', () => {
		const snap = createConsentKernel().getSnapshot();
		const rule = makeRule({ methods: ['POST'] });
		const blocked = evaluateBlock(
			new URL('https://tracker.example/'),
			'POST',
			[rule],
			snap
		);
		const passed = evaluateBlock(
			new URL('https://tracker.example/'),
			'GET',
			[rule],
			snap
		);
		expect(blocked.shouldBlock).toBe(true);
		expect(passed.shouldBlock).toBe(false);
	});
});

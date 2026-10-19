import { normalizePolicyRule } from '@c15t/schema';
import type { PolicyRule, SubjectScriptsWire } from '@c15t/schema';
import { describe, expect, it } from 'vitest';

import { recordScriptPermissions } from './script-permissions';
import type { ScriptPermissionFacts } from './script-permissions';

const rule = (overrides: Partial<PolicyRule>) =>
	normalizePolicyRule({
		id: 'rule',
		match: { isDefault: true },
		model: 'opt-in',
		prompt: 'choice',
		...overrides,
	});

const facts = (
	overrides: Partial<ScriptPermissionFacts>
): ScriptPermissionFacts => ({
	confirmed: undefined,
	gpc: false,
	model: 'opt-in',
	preferences: undefined,
	rule: undefined,
	vendorGrants: undefined,
	...overrides,
});

const allowed = (
	scripts: SubjectScriptsWire,
	overrides: Partial<ScriptPermissionFacts>
) =>
	Object.fromEntries(
		recordScriptPermissions(scripts, facts(overrides)).map((script) => [
			script.id,
			script.allowed,
		])
	);

describe('recordScriptPermissions', () => {
	it('evaluates nested category conditions', () => {
		expect(
			allowed(
				[
					{ category: { and: ['measurement', { not: 'marketing' }] }, id: 'a' },
					{ category: { or: ['marketing', 'experience'] }, id: 'b' },
					{ category: 'necessary', id: 'c' },
				],
				{ preferences: { marketing: false, measurement: true } }
			)
		).toEqual({ a: true, b: false, c: true });
	});

	it('permits categories outside a permissive scope by default', () => {
		const permissive = rule({
			categories: ['marketing'],
			scopeMode: 'permissive',
		});
		expect(
			allowed(
				[
					{ category: 'measurement', id: 'outside' },
					{ category: 'marketing', id: 'inside' },
				],
				{ preferences: {}, rule: permissive }
			)
		).toEqual({ inside: false, outside: true });
	});

	it('leaves IAB TCF scripts uncomputed under an iab policy', () => {
		const recorded = recordScriptPermissions(
			[
				{ category: 'marketing', iabPurposes: [1], id: 'tcf' },
				{ category: 'marketing', id: 'plain', vendor: 'plain' },
			],
			facts({
				model: 'iab',
				preferences: { marketing: true },
				rule: rule({ model: 'iab' }),
				vendorGrants: { plain: false },
			})
		);
		expect(recorded).toEqual([
			{ category: 'marketing', iabPurposes: [1], id: 'tcf' },
			// The TC string speaks for vendors in IAB mode, not vendor grants.
			{ allowed: true, category: 'marketing', id: 'plain', vendor: 'plain' },
		]);
	});

	it('only vouches for earlier values when either reading agrees', () => {
		const scripts: SubjectScriptsWire = [
			{ category: 'marketing', id: 'earlier-grant' },
			{ category: 'experience', id: 'earlier-refusal' },
			{ category: { or: ['measurement', 'marketing'] }, id: 'either' },
			{ category: { and: ['measurement', 'marketing'] }, id: 'both' },
		];
		const preferences = {
			experience: false,
			marketing: true,
			measurement: true,
		};
		const confirmed = new Set(['measurement']);
		// Opt-in: a lapsed grant falls back to denied, a lapsed refusal too.
		expect(
			allowed(scripts, { confirmed, preferences, rule: rule({}) })
		).toEqual({
			both: undefined,
			'earlier-grant': undefined,
			'earlier-refusal': false,
			either: true,
		});
		// Opt-out: a lapsed grant falls back to allowed, a lapsed refusal too.
		expect(
			allowed(scripts, {
				confirmed,
				model: 'opt-out',
				preferences,
				rule: rule({ model: 'opt-out' }),
			})
		).toEqual({
			both: true,
			'earlier-grant': true,
			'earlier-refusal': undefined,
			either: true,
		});
	});

	it('loads alwaysLoad scripts even when their category is denied', () => {
		expect(
			allowed([{ alwaysLoad: true, category: 'marketing', id: 'always' }], {
				preferences: { marketing: false },
			})
		).toEqual({ always: true });
	});
});

/**
 * Policy pack authoring.
 *
 * Ported wholesale from `@c15t/backend` at the rewrite, and it arrived with no
 * tests of its own — `instance.test.ts` exercised `createPack` and
 * `composePacks` in passing and left the rest at 69%.
 *
 * What is worth pinning is the part with consequences: **every visitor must
 * resolve to some policy**. A pack with no default leaves whoever does not
 * match a country rule with no decision at all, which on a consent platform
 * means either no banner where one is required, or a blocked page.
 */

import { assert, describe, it } from '@effect/vitest';

import { composePacks, policyBuilder } from './builder';

describe('createPackWithDefault', () => {
	it('appends a world fallback when the pack has none', () => {
		const pack = policyBuilder.createPackWithDefault([
			{ countries: ['DE'], id: 'eu', model: 'opt-in' },
		]);

		// Without this a visitor from anywhere but Germany resolves nothing.
		const fallback = pack.at(-1);
		assert.strictEqual(pack.length, 2);
		assert.strictEqual(fallback?.id, 'world_no_banner');
		assert.isTrue(fallback?.match.isDefault);
	});

	it('leaves a pack that already has a default alone', () => {
		const pack = policyBuilder.createPackWithDefault([
			{ countries: ['DE'], id: 'eu' },
			{ id: 'catch_all', isDefault: true, model: 'none' },
		]);

		// Appending a second default would make which one wins depend on order.
		assert.strictEqual(pack.length, 2);
		assert.strictEqual(
			pack.filter((policy) => policy.match.isDefault).length,
			1
		);
	});

	it('uses a supplied fallback, stripped of any geography', () => {
		const pack = policyBuilder.createPackWithDefault(
			[{ countries: ['DE'], id: 'eu' }],
			{ countries: ['US'], id: 'house_rules', model: 'opt-out', regions: [] }
		);

		const fallback = pack.at(-1);
		assert.strictEqual(fallback?.id, 'house_rules');
		assert.isTrue(fallback?.match.isDefault);
		// A default that also matched on country would not be a default: it
		// would be another rule that happens to be last.
		assert.isUndefined(fallback?.match.countries);
		assert.isUndefined(fallback?.match.regions);
	});
});

describe('createPack', () => {
	it('normalises UI surface config', () => {
		const [policy] = policyBuilder.createPack([
			{
				banner: {
					allowedActions: ['accept', 'accept', ' reject ', ''],
				},
				countries: ['DE'],
				id: 'eu',
			},
		]);

		// Duplicates and whitespace come from hand-written config files. A
		// duplicated action would render twice.
		assert.deepStrictEqual(policy?.ui?.banner?.allowedActions, [
			'accept',
			'reject',
		]);
	});

	it('omits a surface that was not configured', () => {
		const [policy] = policyBuilder.createPack([
			{ countries: ['DE'], id: 'eu' },
		]);

		// Absent rather than an empty object: the manifest is fingerprinted, and
		// an empty surface is not the same document as no surface.
		assert.isUndefined(policy?.ui?.banner);
		assert.isUndefined(policy?.ui?.dialog);
	});
});

describe('composePacks', () => {
	it('keeps the first policy to claim an id', () => {
		const composed = composePacks(
			policyBuilder.createPack([{ countries: ['DE'], id: 'eu' }]),
			policyBuilder.createPack([{ countries: ['FR'], id: 'eu' }])
		);

		assert.strictEqual(composed.length, 1);
		assert.deepStrictEqual(composed[0]?.match?.countries, ['DE']);
	});

	it('preserves order across packs', () => {
		const composed = composePacks(
			policyBuilder.createPack([{ countries: ['DE'], id: 'a' }]),
			policyBuilder.createPack([{ countries: ['US'], id: 'b' }]),
			policyBuilder.createPack([{ id: 'c', isDefault: true }])
		);

		// Resolution walks the list in order, so composition order is the
		// precedence the author wrote.
		assert.deepStrictEqual(
			composed.map((policy) => policy.id),
			['a', 'b', 'c']
		);
	});

	it('returns an empty pack unchanged', () => {
		assert.deepStrictEqual(composePacks(), []);
		assert.deepStrictEqual(composePacks([]), []);
	});
});

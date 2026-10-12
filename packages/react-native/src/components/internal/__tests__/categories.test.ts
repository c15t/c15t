/**
 * Which categories a consent surface lists for a snapshot.
 *
 * The native core decides the list -- `decidedCategories` in each of the two,
 * graded by the protocol fixtures: `necessary`, then the resolved policy scope
 * narrowed by the app's declared scope. This layer puts that decision in display
 * order, drops names the vocabulary does not know, and lists the full vocabulary
 * only for a snapshot from a core with no configuration installed. The web
 * dialog derives the same set from the same policy (`use-manager.ts`), so the
 * same backend lists the same rows on both platforms.
 */

import { describe, expect, test } from 'vitest';

import { buildSnapshot } from '../../../__tests__/helpers/fake-native';
import type { ConsentSnapshot } from '../../../protocol';
import type { AllConsentNames } from '../../../protocol/vocabulary';
import { buildConsentCategoryRows } from '../categories';

const listedKeys = function listedKeys(
	snapshot: ConsentSnapshot
): readonly AllConsentNames[] {
	return buildConsentCategoryRows(snapshot).map((row) => row.key);
};

describe('buildConsentCategoryRows', () => {
	test('lists the categories the core decided, necessary first', () => {
		const snapshot = buildSnapshot({
			consentCategories: [
				'necessary',
				'experience',
				'functionality',
				'marketing',
				'measurement',
			],
		});

		expect(listedKeys(snapshot)).toEqual([
			'necessary',
			'functionality',
			'experience',
			'measurement',
			'marketing',
		]);
	});

	test('drops what the resolved scope does not govern', () => {
		// The four the policy puts in scope, narrowed by an app that declares no
		// experience integration: the row is gone, not merely defaulted.
		const snapshot = buildSnapshot({
			consentCategories: ['necessary', 'measurement'],
		});

		expect(listedKeys(snapshot)).toEqual(['necessary', 'measurement']);
	});

	test('lists every known category only while no configuration is installed', () => {
		// `null` answers for a core that has no config yet; the set matches the
		// safe fallback rule both cores evaluate against until a policy resolves.
		expect(listedKeys(buildSnapshot())).toEqual([
			'necessary',
			'functionality',
			'experience',
			'measurement',
			'marketing',
		]);
	});

	test('ignores a name the vocabulary does not know', () => {
		const snapshot = buildSnapshot({
			consentCategories: [
				'necessary',
				// A name from a newer vocabulary than this build carries: the
				// evaluator cannot accept it, so it must not be rendered.
				'future_category' as AllConsentNames,
				'measurement',
			],
		});

		expect(listedKeys(snapshot)).toEqual(['necessary', 'measurement']);
	});
});

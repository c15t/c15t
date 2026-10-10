/**
 * ConsentRoot's early script loader decision runs during render. Whatever
 * the browser has stored, it writes no storage and requests none of
 * persistence's write code before the page commits.
 *
 * Each render suspends forever, so nothing commits and no effect runs:
 * anything written or loaded came from the render.
 */
import { offline } from '@c15t/core/modes';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { encodeStoredConsentEnvelopeJson } from '../../../core/src/modules/persistence/writer/encode';
import { ConsentRoot } from '../root';
import type { ConsentState } from '../types';
import { policyFixture } from './policy-fixture';

/** These tests are not about the backend; an explicit offline() needs none. */
const OFFLINE_CONFIG = { mode: offline() };

const writer = vi.hoisted(() => ({ loads: 0 }));

// oxlint-disable-next-line anti-slop/no-module-mocking -- The property under test is whether persistence's write code is requested at all; counting its evaluation is the only view of that from a test.
vi.mock(
	'../../../core/src/modules/persistence/writer/writer',
	async (importOriginal) => {
		writer.loads += 1;
		return await importOriginal();
	}
);

const SUBJECT_ID = 'sub_2VZxR7YmNpKq3WfLs8TgHd';

const never = new Promise<never>(() => {
	// Never settles.
});

/** Set once the root has rendered down to its children. */
let held = false;

/** Suspends forever, so the tree around it never commits. */
const Hold = (): null => {
	held = true;
	throw never;
};

let root: Root | undefined;

afterEach(() => {
	root?.unmount();
	root = undefined;
	held = false;
	vi.restoreAllMocks();
	localStorage.clear();
});

/** A marketing grant the server read from the cookie a minute ago. */
const seededGrant = (): ConsentState => {
	const fixture = policyFixture({ marketing: true });
	const grant = fixture.initialRecords?.choice?.categories.marketing;
	if (!grant) {
		throw new Error('The fixture records a marketing decision.');
	}
	return {
		...fixture,
		initialRecords: {
			choice: {
				categories: {
					marketing: { ...grant, confirmedAt: fixture.now - 60_000 },
				},
				version: 3,
			},
		},
	};
};

const cases: [string, () => ConsentState][] = [
	[
		'a stored denial newer than the server read',
		() => {
			const state = seededGrant();
			const grant = state.initialRecords?.choice?.categories.marketing;
			if (!grant) {
				throw new Error('The state records a marketing decision.');
			}
			localStorage.setItem(
				'c15t',
				encodeStoredConsentEnvelopeJson({
					categories: {
						marketing: {
							...grant,
							confirmedAt: Date.now() - 1000,
							value: false,
						},
					},
					version: 3,
				})
			);
			return state;
		},
	],
	[
		'a legacy-key record that a write would migrate',
		() => {
			localStorage.setItem(
				'privacy-consent-storage',
				JSON.stringify({
					consentInfo: {
						materialPolicyFingerprint: 'fp-old',
						subjectId: SUBJECT_ID,
						time: Date.now() - 1000,
					},
					consents: { marketing: true, necessary: true },
				})
			);
			return policyFixture();
		},
	],
	[
		'a subject-only record',
		() => {
			localStorage.setItem(
				'c15t',
				encodeStoredConsentEnvelopeJson({
					categories: {},
					subject: { subjectId: SUBJECT_ID },
					version: 3,
				})
			);
			return policyFixture();
		},
	],
];

describe('ConsentRoot: the early script loader decision writes nothing', () => {
	test.each(cases)('with %s', async (_, arrange) => {
		const state = arrange();
		const writes: string[] = [];
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key) => {
			writes.push(`setItem ${key}`);
		});
		vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
			writes.push(`removeItem ${key}`);
		});
		vi.spyOn(Document.prototype, 'cookie', 'set').mockImplementation(
			(value) => {
				writes.push(`cookie ${value}`);
			}
		);
		const container = document.createElement('div');
		document.body.append(container);
		root = createRoot(container);
		root.render(
			<ConsentRoot
				config={OFFLINE_CONFIG}
				scripts={[
					{
						category: 'marketing',
						id: 'pixel',
						src: 'https://example.com/pixel.js',
					},
				]}
				state={Promise.resolve(state)}
			>
				<Hold />
			</ConsentRoot>
		);
		await vi.waitFor(() => expect(held).toBe(true));
		for (let turn = 0; turn < 10; turn += 1) {
			// oxlint-disable-next-line no-await-in-loop -- Sequential turns are the point.
			await new Promise((resolve) => {
				setTimeout(resolve, 20);
			});
		}
		expect(writes).toEqual([]);
		expect(writer.loads).toBe(0);
	});
});

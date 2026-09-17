/**
 * The category list, the switches, and what a save is allowed to write.
 *
 * These cover the dialog and the preference centre together because they share
 * one derivation: the rows come from the snapshot, the switches hold the
 * subject's edits until save, and the payload is exactly the visible rows.
 */

import { afterEach, describe, expect, test, vi } from 'vitest';

import { flushPromises } from '../../__tests__/helpers/fake-native';
import {
	resetNativeStub,
	uiState,
} from '../../__tests__/helpers/react-native-stub';
import { resetConsentClient } from '../../native/client';
import { ConsentDialog } from '../consent-dialog';
import { ConsentPreferences } from '../consent-preferences';
import {
	CONTROL_ROLES,
	mountSurface,
	requireRole,
	roleNodes,
	tap,
	translatedSnapshot,
} from './harness';
import type { SurfaceTree } from './harness';

afterEach(() => {
	resetConsentClient();
	resetNativeStub();
});

/** The switch position for one category label. */
const checked = function checked(
	tree: SurfaceTree,
	label: string
): string | null {
	return requireRole(tree.container(), 'switch', label).getAttribute(
		'aria-checked'
	);
};

/** Open the built-in manager over a given snapshot. */
const mountDialog = function mountDialog(
	snapshot = translatedSnapshot(),
	props: { readonly onOpenPreferences?: () => void } = {}
): SurfaceTree {
	const tree = mountSurface(
		<ConsentDialog
			onOpenPreferences={props.onOpenPreferences}
			onRequestClose={() => {
				// The host owns the open flag; these cases assert what it was asked.
			}}
			open
		/>,
		snapshot
	);

	return tree;
};

describe('ConsentDialog', () => {
	test('shows one switch per category in scope', () => {
		const tree = mountDialog();

		expect(tree.text()).toContain('Zustimmung verwalten');
		expect(tree.text()).toContain('Waehle die Kategorien, die du erlaubst.');
		expect(roleNodes(tree.container(), 'switch')).toHaveLength(5);

		tree.unmount();
	});

	test('switches follow the effective permissions without a receipt', () => {
		const tree = mountDialog();

		expect(checked(tree, 'Funktionalitaet')).toBe('true');
		expect(checked(tree, 'Werbung')).toBe('false');
		expect(checked(tree, 'Messung')).toBe('false');

		tree.unmount();
	});

	test('an explicit receipt outranks the effective permission', () => {
		const tree = mountDialog(
			translatedSnapshot({
				effectivePermissions: {
					experience: true,
					functionality: true,
					marketing: true,
					measurement: true,
					necessary: true,
				},
				explicitChoice: {
					categories: {
						marketing: {
							authority: 'valid',
							expiresAt: null,
							recordId: 'r-1',
							value: false,
						},
					},
					version: 1,
				},
			})
		);

		// The core denied marketing on the receipt, so the row reads off even
		// though the policy would allow it.
		expect(checked(tree, 'Werbung')).toBe('false');

		tree.unmount();
	});

	test('necessary is on and cannot be moved', async () => {
		const tree = mountDialog();
		const necessary = requireRole(tree.container(), 'switch', 'Notwendig');

		expect(necessary.getAttribute('aria-checked')).toBe('true');
		expect(necessary.disabled).toBe(true);

		// A locked switch answers to no press at all, so nothing is written.
		tap(necessary);
		await flushPromises();

		expect(tree.fake.commitIntents).toEqual([]);
		expect(checked(tree, 'Notwendig')).toBe('true');

		tree.unmount();
	});

	test('a restricted category is off and cannot be moved', () => {
		const tree = mountDialog(
			translatedSnapshot({
				effectivePermissions: {
					experience: true,
					functionality: true,
					marketing: true,
					measurement: true,
					necessary: true,
				},
				restrictions: { marketing: ['gpc'] },
			})
		);
		const marketing = requireRole(tree.container(), 'switch', 'Werbung');

		expect(marketing.getAttribute('aria-checked')).toBe('false');
		expect(marketing.disabled).toBe(true);

		tree.unmount();
	});

	test('a declared scope narrows the list', () => {
		const tree = mountDialog(
			translatedSnapshot({ consentCategories: ['necessary', 'marketing'] })
		);

		expect(roleNodes(tree.container(), 'switch')).toHaveLength(2);
		expect(tree.text()).toContain('Werbung');
		expect(tree.text()).not.toContain('Messung');

		tree.unmount();
	});

	test('a switch moves its row before anything is saved', () => {
		const tree = mountDialog();

		tap(requireRole(tree.container(), 'switch', 'Messung'));

		expect(checked(tree, 'Messung')).toBe('true');
		expect(tree.fake.commitIntents).toEqual([]);

		tree.unmount();
	});

	test('save writes every visible category exactly once', async () => {
		const tree = mountDialog();

		tap(requireRole(tree.container(), 'switch', 'Messung'));
		tap(requireRole(tree.container(), 'button', 'Speichern'));
		// A second press while the write is in flight must not reach the core.
		tap(requireRole(tree.container(), 'button', 'Speichern'));
		await flushPromises();

		expect(tree.fake.commitIntents).toHaveLength(1);
		expect(JSON.parse(tree.fake.commitIntents[0] as string)).toEqual({
			action: 'explicit',
			consents: {
				experience: false,
				functionality: true,
				marketing: false,
				measurement: true,
			},
		});

		tree.unmount();
	});

	test('a save the core rejects leaves the sheet open', async () => {
		const onRequestClose = vi.fn();
		const tree = mountSurface(
			<ConsentDialog
				onRequestClose={onRequestClose}
				open
			/>
		);

		tree.fake.failCommitWith('the core replied with prose');
		tap(requireRole(tree.container(), 'button', 'Speichern'));
		await flushPromises();

		expect(tree.text()).toContain('Zustimmung verwalten');
		expect(onRequestClose).not.toHaveBeenCalled();

		tree.unmount();
	});

	test('accept all writes the whole grant and abandons the draft', async () => {
		// The label promises everything, so the switches the subject had been
		// flicking are dropped rather than carried into the decision: the write is
		// the blanket grant and nothing else.
		const onRequestClose = vi.fn();
		const tree = mountSurface(
			<ConsentDialog
				onRequestClose={onRequestClose}
				open
			/>
		);

		tap(requireRole(tree.container(), 'switch', 'Messung'));
		tap(requireRole(tree.container(), 'button', 'Alle akzeptieren'));
		await flushPromises();

		expect(tree.fake.commitIntents).toEqual(['{"action":"all"}']);
		expect(onRequestClose).toHaveBeenCalledTimes(1);

		tree.unmount();
	});

	test('reject all writes the minimum and closes the sheet', async () => {
		const onRequestClose = vi.fn();
		const tree = mountSurface(
			<ConsentDialog
				onRequestClose={onRequestClose}
				open
			/>
		);

		tap(requireRole(tree.container(), 'switch', 'Messung'));
		tap(requireRole(tree.container(), 'button', 'Alle ablehnen'));
		await flushPromises();

		expect(tree.fake.commitIntents).toEqual(['{"action":"necessary"}']);
		expect(onRequestClose).toHaveBeenCalledTimes(1);

		tree.unmount();
	});

	test('a decision the core rejects leaves the draft where it was', async () => {
		const onRequestClose = vi.fn();
		const tree = mountSurface(
			<ConsentDialog
				onRequestClose={onRequestClose}
				open
			/>
		);

		tree.fake.failCommitWith('the core replied with prose');
		tap(requireRole(tree.container(), 'switch', 'Werbung'));
		tap(requireRole(tree.container(), 'button', 'Alle akzeptieren'));
		await flushPromises();

		// The draft survives a failed decision, so the subject is not sent back
		// through switches they already set.
		expect(tree.text()).toContain('Zustimmung verwalten');
		expect(checked(tree, 'Werbung')).toBe('true');
		expect(onRequestClose).not.toHaveBeenCalled();

		tree.unmount();
	});

	test('offers the host preference centre only when it has one', () => {
		const onOpenPreferences = vi.fn();
		const withEntry = mountDialog(translatedSnapshot(), { onOpenPreferences });

		tap(requireRole(withEntry.container(), 'link', 'Einstellungen'));
		expect(onOpenPreferences).toHaveBeenCalledTimes(1);
		withEntry.unmount();

		// The sheet's remaining link is the branding tab, which every surface carries
		// unless the host asks otherwise. Asserting "no links at all" would have been
		// true only while the sheet had exactly one kind of link, and what this case
		// is actually about is the entry point: absent here, present above.
		const withoutEntry = mountDialog();
		expect(
			roleNodes(withoutEntry.container(), 'link').map((node) =>
				node.getAttribute('aria-label')
			)
		).toEqual(['Secured by c15t']);
		withoutEntry.unmount();
	});

	test('labels every control and announces itself', () => {
		const tree = mountDialog();

		for (const role of CONTROL_ROLES) {
			for (const node of roleNodes(tree.container(), role)) {
				expect(node.getAttribute('aria-label')).toBeTruthy();
			}
		}

		expect(uiState.announcements).toContain('Zustimmung verwalten');

		tree.unmount();
	});
});

describe('ConsentPreferences', () => {
	test('opens when the policy owes nothing', () => {
		const tree = mountSurface(
			<ConsentPreferences
				onRequestClose={() => {
					// The app owns the flag.
				}}
				open
			/>,
			translatedSnapshot({ promptRequirement: { kind: 'none' } })
		);

		expect(tree.text()).toContain('Waehle die Kategorien, die du erlaubst.');
		expect(roleNodes(tree.container(), 'switch')).toHaveLength(5);

		tree.unmount();
	});

	test('closing without saving writes nothing', () => {
		const onRequestClose = vi.fn();
		const tree = mountSurface(
			<ConsentPreferences
				onRequestClose={onRequestClose}
				open
			/>
		);

		tap(requireRole(tree.container(), 'switch', 'Werbung'));
		tap(requireRole(tree.container(), 'button', 'Schliessen'));

		expect(tree.fake.commitIntents).toEqual([]);
		expect(onRequestClose).toHaveBeenCalledTimes(1);

		tree.unmount();
	});

	test('a standing grant can be rewritten without the switches', async () => {
		// The centre opens long after the prompt was answered, and the same two
		// decisions the web manager offers have to be reachable from here too.
		const onRequestClose = vi.fn();
		const tree = mountSurface(
			<ConsentPreferences
				onRequestClose={onRequestClose}
				open
			/>
		);

		tap(requireRole(tree.container(), 'button', 'Alle akzeptieren'));
		await flushPromises();

		expect(tree.fake.commitIntents).toEqual(['{"action":"all"}']);
		expect(onRequestClose).toHaveBeenCalledTimes(1);

		tree.unmount();
	});

	test('saves the toggles the subject made', async () => {
		const onRequestClose = vi.fn();
		const tree = mountSurface(
			<ConsentPreferences
				onRequestClose={onRequestClose}
				open
			/>
		);

		tap(requireRole(tree.container(), 'switch', 'Werbung'));
		tap(requireRole(tree.container(), 'switch', 'Funktionalitaet'));
		tap(requireRole(tree.container(), 'button', 'Speichern'));
		await flushPromises();

		expect(tree.fake.commitIntents).toHaveLength(1);
		expect(JSON.parse(tree.fake.commitIntents[0] as string)).toEqual({
			action: 'explicit',
			consents: {
				experience: false,
				functionality: false,
				marketing: true,
				measurement: false,
			},
		});
		expect(onRequestClose).toHaveBeenCalledTimes(1);

		tree.unmount();
	});

	test('labels every control', () => {
		const tree = mountSurface(
			<ConsentPreferences
				onRequestClose={vi.fn()}
				open
			/>
		);

		for (const role of CONTROL_ROLES) {
			for (const node of roleNodes(tree.container(), role)) {
				expect(node.getAttribute('aria-label')).toBeTruthy();
			}
		}

		expect(uiState.announcements).toContain('Einstellungen');

		tree.unmount();
	});
});

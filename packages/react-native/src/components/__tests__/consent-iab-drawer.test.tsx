/**
 * The IAB drawer: what it draws, what it writes, and what it refuses to write.
 *
 * The rows are the subject of the parity test, so this file takes the fixture as
 * given and asks the questions a screen raises instead. Does a page arrive along
 * the trailing edge rather than lifting from the bottom. Does a tab change the
 * list without throwing away the draft. Does the locked section stay locked. And
 * above all, does a subject who moves six switches and then closes the page have
 * written nothing at all.
 *
 * That last question is the drawer's whole bargain, so it is pinned from both
 * ends: Save reports exactly once with everything in it, and Close reports never.
 */

import { afterEach, describe, expect, test } from 'vitest';

import { IAB_DEMO_DISPLAY_MODEL } from '../../../../../examples/react-native-bare/src/fixtures/iab-display-model';
import { flushPromises } from '../../__tests__/helpers/fake-native';
import {
	animationState,
	resetNativeStub,
	setReduceMotion,
} from '../../__tests__/helpers/react-native-stub';
import { ConsentDialog } from '../consent-dialog';
import { ConsentIabDrawer } from '../consent-iab-drawer';
import type { ConsentIabSelection } from '../iab-display-model';
import { lightTheme } from '../theme/create-consent-theme';
import type { SurfaceTree } from './harness';
import { mountSurface, nodeStyle, roleNodes, tap } from './harness';

afterEach(() => {
	resetNativeStub();
});

/** What {@link mountDrawer} hands back. */
interface DrawerTree extends SurfaceTree {
	/** How many times the subject left without saving. */
	readonly closes: () => number;
	/** Every selection handed to `onSave`, in order. */
	readonly saved: ConsentIabSelection[];
}

/**
 * Mount the drawer over the fixture.
 *
 * @param open - Whether it starts open.
 * @returns The tree, with the writes it recorded.
 */
const mountDrawer = function mountDrawer(open = true): DrawerTree {
	const saved: ConsentIabSelection[] = [];
	let closes = 0;
	const tree = mountSurface(
		<ConsentIabDrawer.Root
			initialSelection={{ vendorConsents: { '755': true } }}
			model={IAB_DEMO_DISPLAY_MODEL}
			onClose={() => {
				closes += 1;
			}}
			onSave={(selection) => {
				saved.push(selection);
			}}
			open={open}
			theme={lightTheme}
		>
			<ConsentIabDrawer.Header />
			<ConsentIabDrawer.Tabs />
			<ConsentIabDrawer.Body />
			<ConsentIabDrawer.Footer />
		</ConsentIabDrawer.Root>
	);

	return {
		closes: () => closes,
		commits: tree.commits,
		container: tree.container,
		fake: tree.fake,
		rerender: tree.rerender,
		resetCommits: tree.resetCommits,
		saved,
		text: tree.text,
		unmount: tree.unmount,
	};
};

/**
 * The node a display-model `testId` names.
 *
 * @param tree - Mounted drawer.
 * @param testId - An id from the model, which is the only id scheme in use.
 * @returns The row.
 * @throws {Error} When nothing carries the id.
 */
const row = function row(tree: DrawerTree, testId: string): HTMLElement {
	const node = tree
		.container()
		.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

	if (node === null) {
		throw new Error(`no row carries test id ${testId}`);
	}

	return node;
};

/**
 * The one control in a subtree that answers to a label.
 *
 * @param root - Subtree to search.
 * @param role - The role the control carries.
 * @param name - The label it announces.
 * @returns The control.
 * @throws {Error} When the subtree holds anything other than exactly one.
 */
const control = function control(
	root: HTMLElement,
	role: string,
	name: string
): HTMLElement {
	const matches = roleNodes(root, role).filter(
		(candidate) => candidate.getAttribute('aria-label') === name
	);

	if (matches.length !== 1) {
		throw new Error(
			`expected one ${role} labelled "${name}", saw ${String(matches.length)}`
		);
	}

	return matches[0] as HTMLElement;
};

/**
 * The style a wrapper was drawn with, walking outwards until a part answers.
 *
 * @param node - A node inside the wrapper being looked for.
 * @param wants - The style fact that identifies the wrapper.
 * @returns The matching ancestor's style.
 * @throws {Error} When no ancestor carries it.
 */
const ancestorStyle = function ancestorStyle(
	node: HTMLElement,
	wants: (style: Record<string, unknown>) => boolean
): Record<string, unknown> {
	for (
		let current: HTMLElement | null = node.parentElement;
		current !== null;
		current = current.parentElement
	) {
		const style = nodeStyle(current);

		if (wants(style)) {
			return style;
		}
	}

	throw new Error('no ancestor was drawn with the style the test asked for');
};

/**
 * The transform the surface revealed itself with.
 *
 * @param tree - Mounted surface.
 * @returns The animated container's resolved style.
 * @throws {Error} When the surface animated nothing.
 */
const revealStyle = function revealStyle(
	tree: SurfaceTree
): Record<string, unknown> {
	const node = tree.container().querySelector<HTMLElement>('[data-animated]');

	if (node === null) {
		throw new Error('the surface revealed itself with no animated container');
	}

	return JSON.parse(node.getAttribute('data-animated') ?? '{}') as Record<
		string,
		unknown
	>;
};

/** The axis a reveal travels along, as the one key of its transform. */
const travelAxis = function travelAxis(
	tree: SurfaceTree
): 'translateX' | 'translateY' {
	const transforms = (revealStyle(tree).transform ?? []) as Record<
		string,
		unknown
	>[];
	const keys = Object.keys(transforms[0] ?? {});

	expect(keys).toHaveLength(1);

	return keys[0] as 'translateX' | 'translateY';
};

describe('the drawer as a page', () => {
	test('is not in the tree while it is closed', () => {
		const tree = mountDrawer(false);

		expect(tree.container().querySelector('[role="dialog"]')).toBeNull();
	});

	test('arrives along x, and leaves the dialog along y', () => {
		const tree = mountDrawer();

		expect(travelAxis(tree)).toBe('translateX');

		tree.unmount();

		const dialog = mountSurface(
			<ConsentDialog
				onRequestClose={() => {
					// The host owns the open flag.
				}}
				open
			/>
		);

		expect(travelAxis(dialog)).toBe('translateY');
	});

	test('names itself after the disclosure', () => {
		const tree = mountDrawer();
		const sheet = tree
			.container()
			.querySelector<HTMLElement>('[role="dialog"][aria-label]');

		expect(sheet?.getAttribute('aria-label')).toBe('Privacy Settings');
	});

	test('collapses the reveal under reduced motion and still draws the rows', async () => {
		setReduceMotion(true);

		const tree = mountDrawer();

		// The first pass always animates, because a surface that waits on an
		// asynchronous answer may never reveal itself at all. What reduced motion
		// has to do is reach the reveal: the same animation, in one millisecond.
		await flushPromises();

		expect(animationState.durations).toContain(1);
		expect(row(tree, 'purpose-item-1')).toBeDefined();
	});

	test('grows its body into the page instead of a measured cap', () => {
		const tree = mountDrawer();

		expect(() =>
			ancestorStyle(
				row(tree, 'purpose-item-1'),
				(style) => style.flexGrow === 1 && style.minHeight === 0
			)
		).not.toThrow();
	});

	test('bands the footer over the list it covers', () => {
		const tree = mountDrawer();
		const footer = ancestorStyle(
			control(tree.container(), 'button', 'Save Settings'),
			(style) => style.borderTopWidth === 1 && style.gap === 16
		);

		expect(footer.paddingHorizontal).toBe(16);
		expect(footer.paddingTop).toBe(12);
		expect(footer.paddingBottom).toBe(12);
	});
});

describe('the two tabs', () => {
	test('offer the web tab pair with the web counts', () => {
		const tree = mountDrawer();
		const tabs = roleNodes(tree.container(), 'tab');

		expect(tabs.map((tab) => tab.getAttribute('aria-label'))).toStrictEqual([
			'Purposes (18)',
			'Vendors (4)',
		]);
		expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toStrictEqual([
			'true',
			'false',
		]);
	});

	test('swap the list without losing the draft', () => {
		const tree = mountDrawer();
		const [purposes, vendors] = roleNodes(tree.container(), 'tab');

		tap(vendors as HTMLElement);

		expect(row(tree, 'vendor-item-755')).toBeDefined();
		expect(
			tree.container().querySelector('[data-testid="purpose-item-1"]')
		).toBeNull();

		tap(purposes as HTMLElement);

		expect(row(tree, 'purpose-item-1')).toBeDefined();
		expect(tree.saved).toHaveLength(0);
	});

	test('list the partners under the two headings the web uses', () => {
		const tree = mountDrawer();

		tap(roleNodes(tree.container(), 'tab')[1] as HTMLElement);

		expect(tree.text()).toContain('IAB Registered Vendors');
		expect(
			tree.container().querySelectorAll('[data-testid^="vendor-item-"]')
		).toHaveLength(4);
	});

	// The web's `{count} partners` link opens the panel straight on the partner
	// list, so a host copying that link has to be able to say so at mount.
	test('opens on the tab the caller named', () => {
		const tree = mountSurface(
			<ConsentIabDrawer.Root
				initialTab="vendors"
				model={IAB_DEMO_DISPLAY_MODEL}
				onClose={() => {}}
				onSave={() => {}}
				open
				theme={lightTheme}
			>
				<ConsentIabDrawer.Header />
				<ConsentIabDrawer.Tabs />
				<ConsentIabDrawer.Body />
				<ConsentIabDrawer.Footer />
			</ConsentIabDrawer.Root>
		);

		expect(
			roleNodes(tree.container(), 'tab').map((tab) =>
				tab.getAttribute('aria-selected')
			)
		).toStrictEqual(['false', 'true']);
		expect(
			tree.container().querySelector('[data-testid="purpose-item-1"]')
		).toBeNull();
	});
});

describe('the purposes tab', () => {
	test('draws every row under the id the model gave it', () => {
		const tree = mountDrawer();

		for (const id of [
			'purpose-item-1',
			'stack-item-2',
			'stack-item-3',
			'stack-item-1',
			'stack-item-4',
			'special-feature-item-1',
			'special-feature-item-2',
		]) {
			expect(row(tree, id)).toBeDefined();
		}
	});

	test('reveals a description on tap', () => {
		const tree = mountDrawer();
		const purpose = row(tree, 'purpose-item-1');

		expect(purpose.textContent).not.toContain('Cookies, device or similar');

		tap(
			control(purpose, 'button', 'Store and/or access information on a device')
		);

		expect(purpose.textContent).toContain('Cookies, device or similar');
	});

	test('shows a stack as the purposes it absorbed', () => {
		const tree = mountDrawer();
		const stack = row(tree, 'stack-item-2');

		tap(
			control(
				stack,
				'button',
				'Personalised advertising profile and target audience measurement'
			)
		);

		for (const id of ['purpose-item-3', 'purpose-item-4', 'purpose-item-9']) {
			expect(stack.querySelector(`[data-testid="${id}"]`)).not.toBeNull();
		}
	});

	test('moves every member of a stack at once', () => {
		const tree = mountDrawer();

		tap(
			control(
				row(tree, 'stack-item-2'),
				'switch',
				'Personalised advertising profile and target audience measurement'
			)
		);
		tap(control(tree.container(), 'button', 'Save Settings'));

		expect(tree.saved[0]?.purposeConsents).toMatchObject({
			3: true,
			4: true,
			9: true,
		});
	});

	test('says so when a stack is only half granted', () => {
		const tree = mountDrawer();
		const stack = row(tree, 'stack-item-2');

		tap(
			control(
				stack,
				'button',
				'Personalised advertising profile and target audience measurement'
			)
		);
		tap(
			control(stack, 'switch', 'Create profiles for personalised advertising')
		);

		expect(
			control(
				stack,
				'switch',
				'Personalised advertising profile and target audience measurement: Partially enabled'
			).getAttribute('aria-checked')
		).toBe('false');
		expect(stack.querySelector('[data-rn-role="image"]')).not.toBeNull();
	});

	test('renders the essential section on and impossible to move', () => {
		const tree = mountDrawer();
		const essential = row(tree, 'iab-essential-section');

		tap(control(essential, 'button', 'Essential Functions (Required)'));

		const switches = roleNodes(essential, 'switch');

		expect(switches.length).toBeGreaterThan(0);

		for (const toggle of switches) {
			expect(toggle.getAttribute('aria-checked')).toBe('true');
			expect(toggle.getAttribute('aria-disabled')).toBe('true');
			expect(toggle.hasAttribute('disabled')).toBe(true);
		}

		expect(tree.saved).toHaveLength(0);
	});

	test('lists the locked rows as special purposes and then features', () => {
		const tree = mountDrawer();
		const essential = row(tree, 'iab-essential-section');

		tap(control(essential, 'button', 'Essential Functions (Required)'));

		expect(
			[...essential.querySelectorAll('[data-testid]')].map((node) =>
				node.getAttribute('data-testid')
			)
		).toStrictEqual([
			'special-purpose-item-1',
			'special-purpose-item-2',
			'feature-item-1',
			'feature-item-2',
			'feature-item-3',
		]);
	});
});

describe('the vendors tab', () => {
	/**
	 * Open the partners tab and one partner inside it.
	 *
	 * @param tree - Mounted drawer.
	 * @param id - GVL partner id, which is what its row id ends with.
	 * @param name - Display name the row announces.
	 * @returns The partner's row.
	 */
	const openVendor = function openVendor(
		tree: DrawerTree,
		id: string,
		name: string
	): HTMLElement {
		tap(roleNodes(tree.container(), 'tab')[1] as HTMLElement);

		const vendor = row(tree, `vendor-item-${id}`);

		tap(control(vendor, 'button', name));

		return vendor;
	};

	test('keep a consent leg and a legitimate-interest leg apart', () => {
		const tree = mountDrawer();
		const vendor = openVendor(tree, '10', 'Index Exchange, Inc.');

		expect(vendor.textContent).toContain('1 purpose, 2 special');
		expect(
			vendor.querySelector('[data-testid="vendor-legitimate-interest-10"]')
		).not.toBeNull();
	});

	test('list what a partner claims, by name, under each basis', () => {
		const tree = mountDrawer();
		const vendor = openVendor(tree, '755', 'Google Advertising Products');

		expect(vendor.textContent).toContain('Purposes (11)');
		expect(vendor.textContent).toContain('Special Purposes (2)');
		expect(vendor.textContent).toContain('Special Features (2)');
		expect(vendor.textContent).toContain('Features (3)');
		expect(vendor.textContent).toContain(
			'Store and/or access information on a device'
		);
	});

	test('object to a legitimate-interest claim and write the objection', () => {
		const tree = mountDrawer();
		const vendor = openVendor(tree, '10', 'Index Exchange, Inc.');

		tap(control(vendor, 'button', 'Legitimate Interest: Index Exchange, Inc.'));
		tap(control(tree.container(), 'button', 'Save Settings'));

		expect(tree.saved[0]?.vendorLegitimateInterests).toStrictEqual({
			'10': false,
		});
	});

	test('show a partner consent the caller already holds', () => {
		const tree = mountDrawer();

		tap(roleNodes(tree.container(), 'tab')[1] as HTMLElement);

		expect(
			control(
				row(tree, 'vendor-item-755'),
				'switch',
				'Google Advertising Products'
			).getAttribute('aria-checked')
		).toBe('true');
	});
});

describe('what a press writes', () => {
	test('hold every switch locally until one save', () => {
		const tree = mountDrawer();

		tap(
			control(
				row(tree, 'purpose-item-1'),
				'switch',
				'Store and/or access information on a device'
			)
		);
		tap(
			control(
				row(tree, 'special-feature-item-1'),
				'switch',
				'Use precise geolocation data'
			)
		);

		expect(tree.saved).toHaveLength(0);

		tap(control(tree.container(), 'button', 'Save Settings'));

		expect(tree.saved).toHaveLength(1);

		const [selection] = tree.saved;

		// Every decision the surface can move is in the one call, including the
		// twelve the subject never touched, so the far side encodes one TC String
		// rather than four partial maps it has to default itself.
		expect(Object.keys(selection?.purposeConsents ?? {}).sort()).toStrictEqual(
			['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'].sort()
		);
		expect(selection?.purposeConsents).toMatchObject({ 1: true });
		expect(selection?.specialFeatureOptIns).toStrictEqual({
			1: true,
			2: false,
		});
		expect(selection?.vendorConsents).toStrictEqual({
			'1': false,
			'10': false,
			'2': false,
			'755': true,
		});
		expect(selection?.vendorLegitimateInterests).toStrictEqual({ '10': true });
	});

	test('give back the standing rather than the draft once a write lands', () => {
		const tree = mountDrawer();

		tap(
			control(
				row(tree, 'purpose-item-1'),
				'switch',
				'Store and/or access information on a device'
			)
		);
		tap(control(tree.container(), 'button', 'Save Settings'));

		expect(
			control(
				row(tree, 'purpose-item-1'),
				'switch',
				'Store and/or access information on a device'
			).getAttribute('aria-checked')
		).toBe('false');
	});

	test('decide the whole surface in one press', () => {
		const tree = mountDrawer();

		tap(control(tree.container(), 'button', 'Accept All'));

		expect(tree.saved).toHaveLength(1);
		expect(
			Object.values(tree.saved[0]?.purposeConsents ?? {}).every(Boolean)
		).toBe(true);
		expect(tree.saved[0]?.vendorLegitimateInterests).toStrictEqual({
			'10': true,
		});

		tap(control(tree.container(), 'button', 'Reject All'));

		expect(tree.saved).toHaveLength(2);
		expect(
			Object.values(tree.saved[1]?.purposeConsents ?? {}).some(Boolean)
		).toBe(false);
		expect(tree.saved[1]?.vendorConsents).toStrictEqual({
			'1': false,
			'10': false,
			'2': false,
			'755': false,
		});
	});

	test('leave nothing behind when the subject closes the page', () => {
		const tree = mountDrawer();

		tap(
			control(
				row(tree, 'purpose-item-1'),
				'switch',
				'Store and/or access information on a device'
			)
		);
		tap(control(tree.container(), 'button', 'Close'));

		expect(tree.closes()).toBe(1);
		expect(tree.saved).toHaveLength(0);
	});

	test('take a dismissal from the scrim without writing', () => {
		const tree = mountDrawer();

		tap(control(tree.container(), 'button', 'Privacy Settings'));

		expect(tree.closes()).toBe(1);
		expect(tree.saved).toHaveLength(0);
	});
});

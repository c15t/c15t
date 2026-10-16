import { resolveIABDialogDisplayModel } from '@c15t/iab/headless';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { IAB_DEMO_DISPLAY_MODEL } from '../../../../../internals/fixtures/react-native-bare/src/fixtures/iab-display-model';
import { completeGVL } from '../../../../iab/src/__tests__/fixtures/gvl-sample';
import { flush, flushPromises } from '../../__tests__/helpers/fake-native';
import {
	alertState,
	focusState,
	linking,
	pressBack,
	resetNativeStub,
	setPlatformOS,
	uiState,
} from '../../__tests__/helpers/react-native-stub';
import { resetConsentClient } from '../../native/client';
import { ConsentIabBanner } from '../consent-iab-banner';
import { ConsentIabPreferences } from '../consent-iab-preferences';
import type {
	ConsentIabDisplayModel,
	ConsentIabSelection,
} from '../iab-display-model';
import { mountSurface, requireRole, roleNodes, tap } from './harness';

const PURPOSE = 'Store and/or access information on a device';
const STACK =
	'Personalised advertising profile and target audience measurement';
const MODEL = IAB_DEMO_DISPLAY_MODEL;

const mountIab = (
	options: {
		initialTab?: 'purposes' | 'vendors';
		model?: ConsentIabDisplayModel;
		open?: boolean;
		presentation?: 'page' | 'sheet';
	} = {}
) => {
	const saved: ConsentIabSelection[] = [];
	const close = vi.fn();
	const render = (open: boolean) => (
		<ConsentIabPreferences.Root
			initialSelection={{ vendorConsents: { '755': true } }}
			model={MODEL}
			onClose={close}
			onSave={(selection) => saved.push(selection)}
			open={open}
			{...options}
		/>
	);
	const tree = mountSurface(render(options.open ?? true));
	return { ...tree, close, render, saved };
};
const button = (root: HTMLElement, name: string) =>
	requireRole(root, 'button', name);
const toggle = (root: HTMLElement, name: string) =>
	requireRole(root, 'switch', name);
const search = (root: HTMLElement, value: string) => {
	const input = root.querySelector('input');
	if (!input) {
		throw new Error('vendor search is missing');
	}
	flush(() => {
		Object.getOwnPropertyDescriptor(
			HTMLInputElement.prototype,
			'value'
		)?.set?.call(input, value);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
};

afterEach(() => {
	resetConsentClient();
	resetNativeStub();
});

describe('IAB preferences', () => {
	test('toggling one partner renders only its native switch', async () => {
		const tree = mountIab({ initialTab: 'vendors' });
		await flushPromises();
		uiState.switchRenders.clear();
		tap(toggle(tree.container(), 'Google Advertising Products'));
		expect([...uiState.switchRenders.keys()]).toEqual([
			'Google Advertising Products',
		]);
		tree.unmount();
	});
	test('a closed page has no controls', () => {
		const tree = mountIab({ open: false });
		expect(roleNodes(tree.container(), 'button')).toHaveLength(0);
		tree.unmount();
	});

	test('tabs retain the local draft without saving', async () => {
		const tree = mountIab();
		tap(toggle(tree.container(), PURPOSE));
		tap(requireRole(tree.container(), 'tab', 'Vendors (4)'));
		await flushPromises();
		expect(
			toggle(tree.container(), 'Google Advertising Products').getAttribute(
				'aria-checked'
			)
		).toBe('true');
		tap(requireRole(tree.container(), 'tab', 'Purposes (18)'));
		await flushPromises();
		expect(toggle(tree.container(), PURPOSE).getAttribute('aria-checked')).toBe(
			'true'
		);
		expect(tree.saved).toEqual([]);
		tree.unmount();
	});

	test('counts only the partners the vendors tab lists', async () => {
		const webModel = resolveIABDialogDisplayModel({
			adTechProviders: [
				{ id: 89, name: 'Meta', policyUrl: 'https://www.facebook.com/privacy' },
				{
					id: 2677,
					name: 'Seedtag',
					policyUrl: 'https://www.seedtag.com/privacy',
				},
			],
			gvl: completeGVL,
		});
		const tree = mountIab({
			model: {
				...MODEL,
				data: { ...MODEL.data, totalVendors: webModel.data.totalVendors },
				vendorTabCount: webModel.vendorTabCount,
			},
		});

		expect(webModel.vendorTabCount).toBe(6);
		tap(requireRole(tree.container(), 'tab', 'Vendors (4)'));
		await flushPromises();
		expect(roleNodes(tree.container(), 'switch')).toHaveLength(4);
		for (const vendor of MODEL.vendors) {
			expect(button(tree.container(), vendor.name)).toBeDefined();
		}
		tree.unmount();
	});

	test('purpose and stack details push pages, and edits survive Back', async () => {
		const tree = mountIab();
		tap(button(tree.container(), STACK));
		await flushPromises();
		expect(tree.text()).toContain(
			'Create profiles for personalised advertising'
		);
		tap(
			toggle(tree.container(), 'Create profiles for personalised advertising')
		);
		tap(button(tree.container(), 'Back'));
		await flushPromises();
		expect(toggle(tree.container(), STACK).getAttribute('aria-checked')).toBe(
			'false'
		);
		tap(button(tree.container(), 'Save Settings'));
		expect(tree.saved[0]?.purposeConsents['3']).toBe(true);
		expect(tree.saved[0]?.purposeConsents['4']).toBe(false);
		tree.unmount();
	});

	test('a stack moves its consent purposes in one press', () => {
		const tree = mountIab();
		tap(toggle(tree.container(), STACK));
		tap(button(tree.container(), 'Save Settings'));
		expect(tree.saved[0]?.purposeConsents).toMatchObject({
			3: true,
			4: true,
			9: true,
		});
		tree.unmount();
	});

	test('always-on processing has detail pages and no editable switches', async () => {
		const tree = mountIab();
		tap(
			button(
				tree.container(),
				'Ensure security, prevent and detect fraud, and fix errors'
			)
		);
		await flushPromises();
		expect(tree.text()).toContain('Partners Using This Purpose');
		expect(roleNodes(tree.container(), 'switch')).toHaveLength(0);
		expect(tree.saved).toEqual([]);
		tree.unmount();
	});

	test('vendor search filters names and shows an empty result', async () => {
		const tree = mountIab({ initialTab: 'vendors' });
		search(tree.container(), 'google');
		await flushPromises();
		expect(
			button(tree.container(), 'Google Advertising Products')
		).toBeDefined();
		expect(roleNodes(tree.container(), 'switch')).toHaveLength(1);
		search(tree.container(), 'missing partner');
		await flushPromises();
		expect(roleNodes(tree.container(), 'switch')).toHaveLength(0);
		expect(tree.text()).toContain('missing partner');
		tree.unmount();
	});

	test('returns to the partner list when the open partner leaves the model', async () => {
		const save = vi.fn();
		const close = vi.fn();
		const render = (model: typeof MODEL) => (
			<ConsentIabPreferences.Root
				initialTab="vendors"
				model={model}
				onClose={close}
				onSave={save}
				open
			/>
		);
		const tree = mountSurface(render(MODEL));
		tap(button(tree.container(), 'Google Advertising Products'));
		await flushPromises();
		tree.rerender(
			render({
				...MODEL,
				vendors: MODEL.vendors.filter((vendor) => vendor.id !== 755),
			})
		);
		await flushPromises();
		expect(roleNodes(tree.container(), 'tab')).toHaveLength(2);
		expect(button(tree.container(), 'Index Exchange, Inc.')).toBeDefined();
		expect(save).not.toHaveBeenCalled();
		expect(close).not.toHaveBeenCalled();
		tree.unmount();
	});

	test('vendor detail separates consent and legitimate interest, and explains objections', async () => {
		const tree = mountIab({ initialTab: 'vendors' });
		tap(button(tree.container(), 'Index Exchange, Inc.'));
		await flushPromises();
		tap(button(tree.container(), 'Legitimate Interest, More info'));
		expect(alertState.alerts[0]?.message).toContain('object');
		tap(toggle(tree.container(), 'Legitimate Interest'));
		tap(button(tree.container(), 'Save Settings'));
		expect(tree.saved[0]?.vendorLegitimateInterests).toEqual({ '10': false });
		expect(tree.saved[0]?.vendorConsents['10']).toBe(false);
		tree.unmount();
	});

	test('vendor detail renders retention and opens the published policy', async () => {
		const tree = mountIab({ initialTab: 'vendors' });
		tap(button(tree.container(), 'Google Advertising Products'));
		await flushPromises();
		tap(requireRole(tree.container(), 'link', 'Privacy Policy'));
		expect(linking.opened).toEqual([
			MODEL.vendors.find((vendor) => vendor.id === 755)?.policyUrl,
		]);
		expect(tree.text()).toContain('Features');
		tree.unmount();
	});

	test.each(['Accept All', 'Reject All'])(
		'%s writes one complete selection',
		(label) => {
			const tree = mountIab();
			tap(button(tree.container(), label));
			expect(tree.saved).toHaveLength(1);
			expect(Object.keys(tree.saved[0]?.vendorConsents ?? {})).toHaveLength(4);
			expect(
				Object.values(tree.saved[0]?.vendorConsents ?? {}).every(
					(value) => value === (label === 'Accept All')
				)
			).toBe(true);
			tree.unmount();
		}
	);

	test('closing discards the draft on the next opening', async () => {
		const tree = mountIab();
		tap(toggle(tree.container(), PURPOSE));
		tap(button(tree.container(), 'Close'));
		expect(tree.close).toHaveBeenCalledTimes(1);
		expect(tree.saved).toEqual([]);
		tree.rerender(tree.render(false));
		tree.rerender(tree.render(true));
		await flushPromises();
		expect(toggle(tree.container(), PURPOSE).getAttribute('aria-checked')).toBe(
			'false'
		);
		tree.unmount();
	});

	test('Android Back pops details before closing and focuses the new title', async () => {
		setPlatformOS('android');
		const tree = mountIab();
		await flushPromises();
		const before = focusState.tags.length;
		tap(button(tree.container(), PURPOSE));
		await flushPromises();
		await vi.waitFor(() =>
			expect(focusState.tags.length).toBeGreaterThan(before)
		);
		flush(() => pressBack());
		await flushPromises();
		expect(roleNodes(tree.container(), 'tab')).toHaveLength(2);
		expect(tree.close).not.toHaveBeenCalled();
		flush(() => pressBack());
		expect(tree.close).toHaveBeenCalledTimes(1);
		expect(tree.saved).toEqual([]);
		tree.unmount();
	});
});

describe('IAB first layer', () => {
	test('discloses partners and opens their tab inside the sheet', async () => {
		const tree = mountSurface(
			<ConsentIabBanner
				model={MODEL}
				onSave={vi.fn()}
				open
			/>
		);
		expect(tree.text()).toContain('4 partners');
		tap(button(tree.container(), '4 partners'));
		await flushPromises();
		expect(
			toggle(tree.container(), 'Google Advertising Products')
		).toBeDefined();
		flush(() => pressBack());
		expect(tree.text()).toContain('We value your privacy');
		tree.unmount();
	});

	test('Accept All reports the full selection without a manage visit', () => {
		const save = vi.fn();
		const tree = mountSurface(
			<ConsentIabBanner
				model={MODEL}
				onSave={save}
				open
			/>
		);
		tap(button(tree.container(), 'Accept All'));
		expect(save).toHaveBeenCalledTimes(1);
		expect(save.mock.calls[0]?.[0].vendorConsents['755']).toBe(true);
		tree.unmount();
	});
});

test('a pop keeps the departing detail above its destination until the animation ends', async () => {
	const tree = mountIab();
	tap(button(tree.container(), PURPOSE));
	await flushPromises();
	tap(button(tree.container(), 'Back'));
	const layers = [
		...tree.container().querySelectorAll<HTMLElement>('[data-animated]'),
	];
	const outgoing = layers.at(-1);
	expect(outgoing?.textContent).toContain('Cookies, device or similar');
	expect(outgoing?.getAttribute('aria-hidden')).not.toBe('true');
	await flushPromises();
	expect(roleNodes(tree.container(), 'tab')).toHaveLength(2);
	expect(button(tree.container(), PURPOSE)).toBeDefined();
	tree.unmount();
});

test('an interrupted push cannot restore the screen that was popped', async () => {
	const tree = mountIab();
	tap(button(tree.container(), PURPOSE));
	tap(button(tree.container(), 'Back'));
	await flushPromises();
	expect(button(tree.container(), STACK)).toBeDefined();
	expect(
		tree.container().querySelector('[data-testid="c15t-iab-purpose.1"]')
	).toBeNull();
	tree.unmount();
});

test('an iOS edge swipe follows the finger and finishes from its release position', async () => {
	const { gestureState } =
		await import('../../__tests__/helpers/react-native-stub');
	const tree = mountIab();
	tap(button(tree.container(), PURPOSE));
	await flushPromises();
	const responder = gestureState.responders.at(-1);
	if (!responder) {
		throw new Error('back gesture is missing');
	}
	const gesture = { dx: 180, dy: 0, vx: 1, vy: 0 };
	flush(() => {
		responder.onPanResponderGrant?.(null, gesture);
		responder.onPanResponderMove?.(null, gesture);
	});
	const leavingLayer = () =>
		tree.container().querySelector('[data-testid="c15t-iab-purpose.1"]')
			?.parentElement;
	const translate = () =>
		JSON.parse(leavingLayer()?.getAttribute('data-animated') ?? '{}')
			.transform?.[0]?.translateX;
	expect(translate()).toBeCloseTo(180);
	expect(
		tree.container().querySelector('[data-testid="c15t-iab-iab.manage"]')
	).not.toBeNull();
	flush(() => responder.onPanResponderRelease?.(null, gesture));
	expect(translate()).toBeCloseTo(180);
	await flushPromises();
	expect(roleNodes(tree.container(), 'tab')).toHaveLength(2);
	expect(tree.saved).toEqual([]);
	tree.unmount();
});

test('an iOS edge swipe returns to the list without saving', async () => {
	const { dragResponder, gestureState } =
		await import('../../__tests__/helpers/react-native-stub');
	const tree = mountIab();
	tap(button(tree.container(), PURPOSE));
	await flushPromises();
	const responder = gestureState.responders.at(-1);
	if (!responder) {
		throw new Error('back gesture is missing');
	}
	flush(() => dragResponder(responder, { dx: 20 }));
	await flushPromises();
	expect(roleNodes(tree.container(), 'tab')).toHaveLength(0);
	flush(() => dragResponder(responder, { dx: 200, vx: 1 }));
	await flushPromises();
	expect(roleNodes(tree.container(), 'tab')).toHaveLength(2);
	expect(tree.saved).toEqual([]);
	tree.unmount();
});

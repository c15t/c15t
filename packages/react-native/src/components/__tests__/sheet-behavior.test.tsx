import { afterEach, expect, test, vi } from 'vitest';

import { flush, flushPromises } from '../../__tests__/helpers/fake-native';
import {
	animationState,
	dragResponder,
	gestureState,
	pressBack,
	resetNativeStub,
	setReduceMotion,
} from '../../__tests__/helpers/react-native-stub';
import { resetConsentClient } from '../../native/client';
import { ConsentBanner } from '../consent-banner';
import { ConsentPreferences } from '../consent-preferences';
import {
	mountSurface,
	nodeStyle,
	requireRole,
	surfaceNode,
	tap,
	translatedSnapshot,
} from './harness';

const dragSheet = (dy: number, vy = 0) => {
	const responder = gestureState.responders.at(-1);
	if (!responder) {
		throw new Error('sheet gesture is missing');
	}
	flush(() => dragResponder(responder, { dy, vy }));
};

afterEach(() => {
	resetConsentClient();
	resetNativeStub();
});

test('a choice ignores scrim, downward drags and root Back without writing', () => {
	const tree = mountSurface(<ConsentBanner />);
	const scrim = tree
		.container()
		.querySelector<HTMLElement>('[data-testid="c15t-sheet-scrim"]');
	if (!scrim) {
		throw new Error('scrim is missing');
	}
	tap(scrim);
	dragSheet(600);
	flush(() => pressBack());
	expect(tree.text()).toContain('Deine Privatsphaere');
	expect(tree.fake.commitIntents).toEqual([]);
	expect(tree.fake.dismissCalls).toBe(0);
	tree.unmount();
});

test.each(['drag', 'scrim', 'back'])(
	'a notice can dismiss by %s without granting categories',
	async (method) => {
		const tree = mountSurface(
			<ConsentBanner />,
			translatedSnapshot({
				promptRequirement: { kind: 'notice', reason: 'missing' },
			})
		);
		if (method === 'drag') {
			dragSheet(600);
		} else if (method === 'back') {
			flush(() => pressBack());
		} else {
			const scrim = tree
				.container()
				.querySelector<HTMLElement>('[data-testid="c15t-sheet-scrim"]');
			if (!scrim) {
				throw new Error('scrim is missing');
			}
			tap(scrim);
		}
		await flushPromises();
		expect(tree.fake.dismissCalls).toBe(1);
		expect(tree.fake.commitIntents).toEqual([]);
		tree.unmount();
	}
);

test('Manage expands the sheet; dragging it down returns to the unanswered first layer', () => {
	const tree = mountSurface(<ConsentBanner />);
	expect(nodeStyle(surfaceNode(tree.container())).height).toBeNull();
	tap(requireRole(tree.container(), 'button', 'Einstellungen'));
	expect(nodeStyle(surfaceNode(tree.container())).height).toBeGreaterThan(0);
	dragSheet(600);
	expect(tree.text()).toContain('Deine Privatsphaere');
	expect(tree.fake.commitIntents).toEqual([]);
	tree.unmount();
});

test('a short drag snaps back without dismissing', () => {
	const close = vi.fn();
	const tree = mountSurface(
		<ConsentPreferences
			onClose={close}
			open
			presentation="sheet"
		/>
	);
	dragSheet(20);
	expect(close).not.toHaveBeenCalled();
	dragSheet(30, 2);
	expect(close).toHaveBeenCalledTimes(1);
	tree.unmount();
});

test('standalone sheet dismissal leaves consent untouched', () => {
	const close = vi.fn();
	const tree = mountSurface(
		<ConsentPreferences
			onClose={close}
			open
			presentation="sheet"
		/>
	);
	tap(requireRole(tree.container(), 'switch', 'Werbung'));
	dragSheet(600);
	expect(close).toHaveBeenCalledTimes(1);
	expect(tree.fake.commitIntents).toEqual([]);
	tree.unmount();
});

test('reduced motion fades the page and skips detent animation', async () => {
	setReduceMotion(true);
	const tree = mountSurface(
		<ConsentPreferences
			onClose={vi.fn()}
			open
		/>
	);
	await flushPromises();
	expect(
		tree.container().querySelector('[data-animation-type="fade"]')
	).not.toBeNull();
	tree.unmount();
	const banner = mountSurface(<ConsentBanner />);
	await flushPromises();
	const before = gestureState.layoutAnimations;
	tap(requireRole(banner.container(), 'button', 'Einstellungen'));
	expect(gestureState.layoutAnimations).toBe(before);
	expect(animationState.jsDriverStarts).toBe(0);
	banner.unmount();
});

test('reduced motion fades a sheet and returns a short drag without a spring', async () => {
	setReduceMotion(true);
	const close = vi.fn();
	const tree = mountSurface(
		<ConsentPreferences
			onClose={close}
			open
			presentation="sheet"
		/>
	);
	await flushPromises();
	expect(animationState.durations.at(-1)).toBe(150);
	dragSheet(20);
	expect(animationState.durations.at(-1)).toBe(150);
	await flushPromises();
	expect(close).not.toHaveBeenCalled();
	expect(
		JSON.parse(
			surfaceNode(tree.container()).getAttribute('data-animated') ?? '{}'
		)
	).toMatchObject({ opacity: 1, transform: null });
	expect(tree.fake.commitIntents).toEqual([]);
	tree.unmount();
});

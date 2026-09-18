import { afterEach, describe, expect, test, vi } from 'vitest';

import {
	DAY,
	matchedResolution,
	NOW,
	noticeRule,
	optInRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import type { KernelEvent, SavePayload } from '../../types';
import { createConsentKernel } from '../index';

type SurfaceShown = Extract<KernelEvent, { type: 'surface:shown' }>;
type NoticeDismissed = Extract<KernelEvent, { type: 'notice:dismissed' }>;

const disposers: (() => void)[] = [];
afterEach(() => {
	for (const dispose of disposers.splice(0)) {
		dispose();
	}
	vi.restoreAllMocks();
});

const setup = (save = vi.fn().mockResolvedValue({ ok: true })) => {
	const kernel = createConsentKernel({
		initialPolicyResolution: matchedResolution(
			optInRule({ categories: ['marketing', 'measurement'] })
		),
		now: NOW,
		transport: { save },
	});
	disposers.push(kernel.dispose);
	const shown: SurfaceShown[] = [];
	kernel.events.on('surface:shown', (event) => shown.push(event));
	return { kernel, save, shown };
};

describe('surface:shown', () => {
	test('a banner visible before init is shown once at init', async () => {
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 500);
		const { kernel, shown } = setup();
		expect(kernel.getSnapshot().activeUI).toBe('banner');
		expect(kernel.getSnapshot().surfaceShownAt).toEqual({
			banner: null,
			dialog: null,
		});
		expect(shown).toHaveLength(0);

		await kernel.commands.init();

		expect(shown).toHaveLength(1);
		expect(shown[0]).toMatchObject({ shownAt: NOW + 500, surface: 'banner' });
		expect(shown[0]?.snapshot.surfaceShownAt).toEqual({
			banner: NOW + 500,
			dialog: null,
		});
		expect(kernel.getSnapshot().surfaceShownAt.banner).toBe(NOW + 500);

		// Unrelated commits do not repeat the impression.
		kernel.set.language('fr');
		kernel.refresh(NOW + 900);
		expect(shown).toHaveLength(1);
	});

	test('opening the dialog is its own impression, stamped once', async () => {
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 500);
		const { kernel, shown } = setup();
		await kernel.commands.init();

		vi.spyOn(Date, 'now').mockReturnValue(NOW + 2000);
		kernel.set.activeUI('dialog');
		expect(shown).toHaveLength(2);
		expect(shown[1]).toMatchObject({ shownAt: NOW + 2000, surface: 'dialog' });

		kernel.set.activeUI('none');
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 3000);
		kernel.set.activeUI('dialog');
		expect(shown).toHaveLength(3);
		expect(kernel.getSnapshot().surfaceShownAt).toEqual({
			banner: NOW + 500,
			dialog: NOW + 2000,
		});
	});

	test('hydration alone never records an impression', () => {
		const { kernel, shown } = setup();
		kernel.hydrate({ subject: { subjectId: 'sub_1' } });
		expect(shown).toHaveLength(0);
		expect(kernel.getSnapshot().surfaceShownAt.banner).toBeNull();
	});

	test('markLive() stamps a visible banner without init, once', () => {
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 500);
		const { kernel, shown } = setup();
		kernel.hydrate({ subject: { subjectId: 'sub_1' } });
		expect(shown).toHaveLength(0);

		kernel.markLive();
		kernel.markLive();

		expect(shown).toHaveLength(1);
		expect(shown[0]).toMatchObject({ shownAt: NOW + 500, surface: 'banner' });
		expect(kernel.getSnapshot().surfaceShownAt.banner).toBe(NOW + 500);
	});

	test('a dialog hidden by save and restored is one impression', async () => {
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 500);
		const { kernel, shown } = setup();
		await kernel.commands.init();
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 2000);
		kernel.set.activeUI('dialog');
		expect(shown).toHaveLength(2);

		// The save clears the prompt, which derives activeUI to none. The
		// adapter keeps its dialog open for the save and puts it back.
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 2100);
		await kernel.commands.save('none');
		expect(kernel.getSnapshot().activeUI).toBe('none');
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 2102);
		kernel.set.activeUI('dialog');
		expect(shown).toHaveLength(2);

		// The visitor closes it and reopens it later: a fresh impression.
		kernel.set.activeUI('none');
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 9000);
		kernel.set.activeUI('dialog');
		expect(shown).toHaveLength(3);
	});

	test('a listener re-hiding the surface still gets the event', async () => {
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 500);
		const { kernel, shown } = setup();
		await kernel.commands.init();
		expect(shown).toHaveLength(1);

		// A synchronous listener re-enters the kernel and hides the dialog
		// before the outer commit finished emitting. The impression happened:
		// the stamp is recorded, so the event must describe that commit.
		const unsubscribe = kernel.subscribe((next) => {
			if (next.activeUI === 'dialog') {
				kernel.set.activeUI('none');
			}
		});
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 2000);
		kernel.set.activeUI('dialog');
		unsubscribe();

		expect(kernel.getSnapshot().activeUI).toBe('none');
		expect(kernel.getSnapshot().surfaceShownAt.dialog).toBe(NOW + 2000);
		expect(shown).toHaveLength(2);
		expect(shown[1]).toMatchObject({ shownAt: NOW + 2000, surface: 'dialog' });
		expect(shown[1]?.snapshot.activeUI).toBe('dialog');
	});

	test('a dialog a listener restores mid-save is one impression', async () => {
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 500);
		const { kernel, shown } = setup();
		await kernel.commands.init();
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 2000);
		kernel.set.activeUI('dialog');
		expect(shown).toHaveLength(2);

		// The adapter keeps its dialog open and puts it back inside the very
		// snapshot notification that announced the save hid it.
		const unsubscribe = kernel.subscribe((next) => {
			if (next.activeUI === 'none') {
				kernel.set.activeUI('dialog');
			}
		});
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 2100);
		await kernel.commands.save('none');
		unsubscribe();

		expect(kernel.getSnapshot().activeUI).toBe('dialog');
		expect(shown).toHaveLength(2);

		// A later close and reopen is a fresh impression.
		kernel.set.activeUI('none');
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 9000);
		kernel.set.activeUI('dialog');
		expect(shown).toHaveLength(3);
	});

	test('a banner shown again after expiry is a new impression', async () => {
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 500);
		const save = vi.fn().mockResolvedValue({ ok: true });
		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(
				optInRule({
					categories: ['marketing', 'measurement'],
					validity: { choiceDays: 1 },
				})
			),
			now: NOW,
			transport: { save },
		});
		disposers.push(kernel.dispose);
		const shown: SurfaceShown[] = [];
		kernel.events.on('surface:shown', (event) => shown.push(event));
		await kernel.commands.init();
		expect(shown).toHaveLength(1);

		// The save hides the banner without an explicit `set.activeUI`.
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 1000);
		await kernel.commands.save('all');
		expect(kernel.getSnapshot().activeUI).toBe('none');
		expect(kernel.getSnapshot().nextDeadline).toBe(NOW + 1000 + DAY);

		// The choice lapses and the deadline re-evaluation shows the banner
		// again: the visitor is asked afresh, so this is a fresh impression.
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 2 * DAY);
		kernel.refresh(NOW + 2 * DAY);
		expect(kernel.getSnapshot().activeUI).toBe('banner');
		expect(kernel.getSnapshot().promptRequirement).toEqual({
			kind: 'choice',
			reason: 'expired',
		});
		expect(shown).toHaveLength(2);
		expect(shown[1]).toMatchObject({
			shownAt: NOW + 2 * DAY,
			surface: 'banner',
		});
	});

	test('a choice carries the time from impression to action', async () => {
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 500);
		const { kernel, save } = setup();
		await kernel.commands.init();
		const recorded = vi.fn();
		kernel.events.on('choice:recorded', recorded);

		vi.spyOn(Date, 'now').mockReturnValue(NOW + 4200);
		await kernel.commands.save('all');

		expect(recorded).toHaveBeenCalledOnce();
		expect(recorded.mock.calls[0]?.[0]).toMatchObject({
			actionAt: NOW + 4200,
			timeToDecisionMs: 3700,
		});
		const payload = save.mock.calls[0]?.[0] as SavePayload;
		expect(payload.uiSource).toBe('banner');
		expect(payload.timeToDecisionMs).toBe(3700);
	});

	test('explicit uiSource is kept; only prompts time a decision', async () => {
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 500);
		const { kernel, save } = setup();
		await kernel.commands.init();
		const recorded = vi.fn();
		kernel.events.on('choice:recorded', recorded);

		await kernel.commands.save({ marketing: true }, { uiSource: 'widget' });

		expect(recorded.mock.calls[0]?.[0]).not.toHaveProperty('timeToDecisionMs');
		const payload = save.mock.calls[0]?.[0] as SavePayload;
		expect(payload.uiSource).toBe('widget');
		expect(payload).not.toHaveProperty('timeToDecisionMs');
	});
});

describe('notice:dismissed attribution', () => {
	const setupNotice = () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(noticeRule()),
			now: NOW,
		});
		disposers.push(kernel.dispose);
		const dismissed: NoticeDismissed[] = [];
		kernel.events.on('notice:dismissed', (event) => dismissed.push(event));
		return { dismissed, kernel };
	};

	test('a dismissal from the shown banner is timed from its impression', async () => {
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 500);
		const { dismissed, kernel } = setupNotice();
		await kernel.commands.init();
		expect(kernel.getSnapshot().activeUI).toBe('banner');

		vi.spyOn(Date, 'now').mockReturnValue(NOW + 4200);
		await kernel.commands.dismissNotice();

		expect(dismissed[0]).toMatchObject({
			surface: 'banner',
			timeToDecisionMs: 3700,
		});
	});

	test('a programmatic dismissal with no prompt open is not a banner outcome', async () => {
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 500);
		const { dismissed, kernel } = setupNotice();
		await kernel.commands.init();
		kernel.set.activeUI('none');

		await kernel.commands.dismissNotice();

		expect(dismissed[0]).toMatchObject({ surface: 'none' });
		expect(dismissed[0]).not.toHaveProperty('timeToDecisionMs');
	});

	test('a clock that moved backwards omits the timing instead of clamping', async () => {
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 500);
		const { dismissed, kernel } = setupNotice();
		await kernel.commands.init();

		vi.spyOn(Date, 'now').mockReturnValue(NOW + 100);
		await kernel.commands.dismissNotice();

		expect(dismissed[0]).toMatchObject({ surface: 'banner' });
		expect(dismissed[0]).not.toHaveProperty('timeToDecisionMs');
	});

	test('the dismissal keeps the arm it happened under, not a reassignment made during commit', async () => {
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 500);
		const { dismissed, kernel } = setupNotice();
		await kernel.commands.init();
		const original = {
			acknowledgedDiagnostics: false,
			assignedBy: 'host',
			id: 'banner-shape',
			variant: 'wall',
		} as const;
		kernel.set.experiment(original);
		// A subscriber reacting to the dismissal commit swaps the arm before
		// the event is built.
		const unsubscribe = kernel.subscribe((snapshot) => {
			if (snapshot.noticeDismissal) {
				kernel.set.experiment({ ...original, variant: 'floating' });
			}
		});

		await kernel.commands.dismissNotice();
		unsubscribe();

		expect(dismissed[0]?.experiment).toEqual(original);
		expect(dismissed[0]?.snapshot.experiment?.variant).toBe('floating');
	});
});

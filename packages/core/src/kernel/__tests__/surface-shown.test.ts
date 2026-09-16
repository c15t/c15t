import { afterEach, describe, expect, test, vi } from 'vitest';

import {
	matchedResolution,
	NOW,
	optInRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import type { KernelEvent, SavePayload } from '../../types';
import { createConsentKernel } from '../index';

type SurfaceShown = Extract<KernelEvent, { type: 'surface:shown' }>;

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
	test('a banner visible before init is shown once, when init runs', async () => {
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

	test('opening the dialog is its own impression; the first time is kept', async () => {
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

	test('a dialog the kernel hid on save and the adapter restored is one impression', async () => {
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

	test('a choice carries the time from the impression to the action', async () => {
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

	test('an explicit uiSource is attributed and only prompt surfaces time a decision', async () => {
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

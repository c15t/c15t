import { createConsentKernel } from 'c15t';
import type { ConsentKernel, ExperimentAssignment } from 'c15t';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { callbacks } from './consent-callbacks';

const experiment = {
	acknowledgedDiagnostics: false,
	arm: 'bar',
	assignedBy: 'host',
	id: 'banner-layout',
} satisfies ExperimentAssignment;

const kernels: ConsentKernel[] = [];

const captureAnalytics = () =>
	vi.spyOn(console, 'info').mockImplementation(() => undefined);

const createVisitor = (assigned = true) => {
	const kernel = createConsentKernel({
		consentCategories: ['measurement', 'marketing'],
		initialExperiment: assigned ? experiment : undefined,
		transport: { save: vi.fn().mockResolvedValue({ ok: true }) },
	});
	kernels.push(kernel);
	kernel.events.on('surface:shown', callbacks.onSurfaceShown);
	kernel.events.on('choice:recorded', callbacks.onChoiceRecorded);
	return kernel;
};

afterEach(() => {
	for (const kernel of kernels.splice(0)) {
		kernel.dispose();
	}
	vi.restoreAllMocks();
});

describe('banner experiment analytics', () => {
	it('reports one banner impression when Customize opens the dialog', async () => {
		const analytics = captureAnalytics();
		const kernel = createVisitor();
		const shown = vi.fn();
		kernel.events.on('surface:shown', shown);

		await kernel.commands.init();
		kernel.set.activeUI('dialog');

		expect(shown).toHaveBeenCalledTimes(2);
		expect(shown.mock.calls[1]?.[0]).toMatchObject({
			experiment,
			surface: 'dialog',
		});
		expect(analytics).toHaveBeenCalledExactlyOnceWith(
			'[analytics] consent_banner_shown',
			{
				arm: 'bar',
				assigned_by: 'host',
				experiment_id: 'banner-layout',
				surface: 'banner',
			}
		);
	});

	it('does not report impressions or choices for an unassigned visitor', async () => {
		const analytics = captureAnalytics();
		const kernel = createVisitor(false);
		await kernel.commands.init();
		kernel.set.activeUI('dialog');
		await kernel.commands.save('all', { uiSource: 'dialog' });

		expect(analytics).not.toHaveBeenCalled();
	});

	it('reports a dialog choice under the arm of the banner the visitor saw', async () => {
		const analytics = captureAnalytics();
		const kernel = createVisitor();
		await kernel.commands.init();
		kernel.set.activeUI('dialog');
		analytics.mockClear();

		await kernel.commands.save('all', { uiSource: 'dialog' });

		expect(analytics).toHaveBeenCalledExactlyOnceWith(
			'[analytics] consent_choice_made',
			{
				arm: 'bar',
				assigned_by: 'host',
				consent_action: 'all',
				experiment_id: 'banner-layout',
				surface: 'dialog',
				time_to_decision_ms: expect.any(Number),
			}
		);
	});
});

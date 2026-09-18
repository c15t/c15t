/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createConsentKernel } from '../../kernel';
import type { ConsentSnapshot, KernelEvent } from '../../types';
import type { ExperimentAssignment } from '../experiment';
import {
	buildChoiceRecordedReport,
	buildNoticeDismissedReport,
	buildSurfaceShownReport,
	createExperimentReporting,
	createPosthogReporter,
	dataLayerReporter,
	posthogReporter,
	resolveExperimentReporters,
} from '../experiment-reporting';
import type { ExperimentReportEvent } from '../experiment-reporting';

type ReportingWindow = Window & {
	dataLayer?: unknown[];
	posthog?: { capture?: (name: string, props?: unknown) => void };
};

const assignment: ExperimentAssignment = {
	acknowledgedDiagnostics: false,
	assignedBy: 'host',
	id: 'banner-shape',
	variant: 'bar',
};

const snapshot = function snapshot(
	experiment: ExperimentAssignment | null
): ConsentSnapshot {
	return { experiment } as ConsentSnapshot;
};

const shown = function shown(
	experiment: ExperimentAssignment | null
): Extract<KernelEvent, { type: 'surface:shown' }> {
	const event: Extract<KernelEvent, { type: 'surface:shown' }> = {
		shownAt: 1000,
		snapshot: snapshot(experiment),
		surface: 'banner',
		type: 'surface:shown',
	};
	if (experiment) {
		event.experiment = experiment;
	}
	return event;
};

const recorded = function recorded(
	experiment: ExperimentAssignment | null
): Extract<KernelEvent, { type: 'choice:recorded' }> {
	const event: Extract<KernelEvent, { type: 'choice:recorded' }> = {
		actionAt: 1500,
		confirmed: ['marketing', 'measurement'],
		consentAction: 'all',
		snapshot: snapshot(experiment),
		timeToDecisionMs: 500,
		type: 'choice:recorded',
		uiSource: 'banner',
	};
	if (experiment) {
		event.experiment = experiment;
	}
	return event;
};

const dismissed = function dismissed(
	experiment: ExperimentAssignment | null
): Extract<KernelEvent, { type: 'notice:dismissed' }> {
	const event: Extract<KernelEvent, { type: 'notice:dismissed' }> = {
		dismissal: { dismissedAt: 1800, fingerprint: 'fp', version: 1 },
		snapshot: snapshot(experiment),
		surface: 'banner',
		timeToDecisionMs: 800,
		type: 'notice:dismissed',
	};
	if (experiment) {
		event.experiment = experiment;
	}
	return event;
};

afterEach(() => {
	const host = window as ReportingWindow;
	delete host.dataLayer;
	delete host.posthog;
	vi.restoreAllMocks();
});

describe('build reports', () => {
	it('reports a notice dismissal as the outcome of an opt-out arm', () => {
		expect(buildNoticeDismissedReport(dismissed(assignment))).toEqual({
			actionAt: 1800,
			assignedBy: 'host',
			experimentId: 'banner-shape',
			name: 'c15t_notice_dismissed',
			surface: 'banner',
			timeToDecisionMs: 800,
			variant: 'bar',
		});
		expect(buildNoticeDismissedReport(dismissed(null))).toBeNull();
	});

	it('returns null without an experiment', () => {
		expect(buildSurfaceShownReport(shown(null))).toBeNull();
		expect(buildChoiceRecordedReport(recorded(null))).toBeNull();
	});

	it('carries only the arm, the surface and the decision', () => {
		expect(buildSurfaceShownReport(shown(assignment))).toEqual({
			assignedBy: 'host',
			experimentId: 'banner-shape',
			name: 'c15t_surface_shown',
			shownAt: 1000,
			surface: 'banner',
			variant: 'bar',
		});
		expect(buildChoiceRecordedReport(recorded(assignment))).toEqual({
			actionAt: 1500,
			assignedBy: 'host',
			confirmed: ['marketing', 'measurement'],
			consentAction: 'all',
			experimentId: 'banner-shape',
			name: 'c15t_choice_recorded',
			surface: 'banner',
			timeToDecisionMs: 500,
			variant: 'bar',
		});
	});

	it('omits timeToDecisionMs when the kernel did not know it', () => {
		const event = recorded(assignment);
		delete event.timeToDecisionMs;
		expect(buildChoiceRecordedReport(event)).not.toHaveProperty(
			'timeToDecisionMs'
		);
	});
});

describe('dataLayer reporter', () => {
	it('creates the array and pushes snake_case properties', () => {
		const host = window as ReportingWindow;
		dataLayerReporter(
			buildSurfaceShownReport(shown(assignment)) as ExperimentReportEvent
		);
		dataLayerReporter(
			buildChoiceRecordedReport(recorded(assignment)) as ExperimentReportEvent
		);
		expect(host.dataLayer).toEqual([
			{
				assigned_by: 'host',
				event: 'c15t_surface_shown',
				experiment_id: 'banner-shape',
				shown_at: 1000,
				surface: 'banner',
				variant: 'bar',
			},
			{
				action_at: 1500,
				assigned_by: 'host',
				confirmed: ['marketing', 'measurement'],
				consent_action: 'all',
				event: 'c15t_choice_recorded',
				experiment_id: 'banner-shape',
				surface: 'banner',
				time_to_decision_ms: 500,
				variant: 'bar',
			},
		]);
	});

	it('appends to an existing dataLayer', () => {
		const host = window as ReportingWindow;
		host.dataLayer = [{ event: 'gtm.js' }];
		dataLayerReporter(
			buildSurfaceShownReport(shown(assignment)) as ExperimentReportEvent
		);
		expect(host.dataLayer).toHaveLength(2);
		expect(host.dataLayer[0]).toEqual({ event: 'gtm.js' });
	});
});

describe('posthog reporter', () => {
	it('calls capture with the event name and snake_case properties', () => {
		const capture = vi.fn();
		(window as ReportingWindow).posthog = { capture };
		posthogReporter(
			buildChoiceRecordedReport(recorded(assignment)) as ExperimentReportEvent
		);
		expect(capture).toHaveBeenCalledWith('c15t_choice_recorded', {
			action_at: 1500,
			assigned_by: 'host',
			confirmed: ['marketing', 'measurement'],
			consent_action: 'all',
			experiment_id: 'banner-shape',
			surface: 'banner',
			time_to_decision_ms: 500,
			variant: 'bar',
		});
	});

	it('holds events until posthog loads, then sends them in order', () => {
		vi.useFakeTimers();
		try {
			posthogReporter(
				buildSurfaceShownReport(shown(assignment)) as ExperimentReportEvent
			);
			posthogReporter(
				buildChoiceRecordedReport(recorded(assignment)) as ExperimentReportEvent
			);
			vi.advanceTimersByTime(1000);
			const capture = vi.fn();
			(window as ReportingWindow).posthog = { capture };
			expect(capture).not.toHaveBeenCalled();
			vi.advanceTimersByTime(250);
			expect(capture.mock.calls.map(([name]) => name)).toEqual([
				'c15t_surface_shown',
				'c15t_choice_recorded',
			]);
			expect(capture.mock.calls[0]?.[1]).toMatchObject({
				shown_at: 1000,
				variant: 'bar',
			});
			// Once PostHog is present, later events go straight through.
			posthogReporter(
				buildSurfaceShownReport(shown(assignment)) as ExperimentReportEvent
			);
			expect(capture).toHaveBeenCalledTimes(3);
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('createPosthogReporter', () => {
	it('dispose drops the held events and stops waiting for the SDK', () => {
		vi.useFakeTimers();
		try {
			const handle = createPosthogReporter();
			handle.reporter(
				buildSurfaceShownReport(shown(assignment)) as ExperimentReportEvent
			);
			handle.dispose();
			const capture = vi.fn();
			(window as ReportingWindow).posthog = { capture };
			vi.advanceTimersByTime(1000);
			expect(capture).not.toHaveBeenCalled();
			expect(vi.getTimerCount()).toBe(0);
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('createExperimentReporting', () => {
	const kernelWith = (
		reportTo: ExperimentReportTarget,
		onError?: ExperimentReportingOptions['onError']
	) => {
		const kernel = createConsentKernel();
		const stop = createExperimentReporting({ kernel, onError, reportTo });
		const dispose = () => {
			stop();
			kernel.dispose();
		};
		return { dispose, kernel };
	};

	it('a throwing onError does not stop the remaining reporters', () => {
		const received: ExperimentReportEvent[] = [];
		const { dispose, kernel } = kernelWith(
			[
				() => {
					throw new Error('sink down');
				},
				(event) => received.push(event),
			],
			() => {
				throw new Error('logger down');
			}
		);
		expect(() => kernel.events.emit(shown(assignment))).not.toThrow();
		expect(received).toHaveLength(1);
		dispose();
	});

	it('disposing clears the posthog buffer and timer of that subscription', () => {
		vi.useFakeTimers();
		try {
			const { dispose, kernel } = kernelWith('posthog');
			kernel.events.emit(shown(assignment));
			expect(vi.getTimerCount()).toBe(1);
			dispose();
			expect(vi.getTimerCount()).toBe(0);
			const capture = vi.fn();
			(window as ReportingWindow).posthog = { capture };
			vi.advanceTimersByTime(1000);
			expect(capture).not.toHaveBeenCalled();
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('resolveExperimentReporters', () => {
	it('maps names and functions, in order', () => {
		const custom = vi.fn();
		expect(resolveExperimentReporters(undefined)).toEqual([]);
		expect(resolveExperimentReporters('dataLayer')).toEqual([
			dataLayerReporter,
		]);
		expect(resolveExperimentReporters([custom, 'posthog'])).toEqual([
			custom,
			posthogReporter,
		]);
	});

	it('rejects an unknown name', () => {
		expect(() =>
			resolveExperimentReporters('segment' as unknown as 'posthog')
		).toThrow(/unknown reportTo target "segment"/u);
	});
});

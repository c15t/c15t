import { afterEach, describe, expect, it, vi } from 'vitest';

import { TelemetryEventName } from '~/utils/telemetry';

import { createTelemetrySubscriber } from './telemetry-plugin';

const createTelemetryMock = function createTelemetryMock() {
	return {
		trackEvent: vi.fn(),
	} as const;
};

describe('createTelemetrySubscriber', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('tracks generate stage completion with duration and stable stage names', () => {
		const telemetry = createTelemetryMock();
		const subscriber = createTelemetrySubscriber({
			machineId: 'generate',
			skipStates: ['routeToMode'],
			telemetry: telemetry as never,
		});
		const nowSpy = vi
			.spyOn(Date, 'now')
			.mockReturnValueOnce(0)
			.mockReturnValueOnce(500);

		subscriber({
			context: {
				dependenciesToAdd: [],
				errors: [],
				filesCreated: [],
				filesModified: [],
			},
			value: 'preflight',
		});
		subscriber({
			context: {
				dependenciesToAdd: [],
				errors: [],
				filesCreated: [],
				filesModified: [],
			},
			value: 'modeSelection',
		});

		expect(telemetry.trackEvent).toHaveBeenCalledWith(
			TelemetryEventName.ONBOARDING_STAGE,
			expect.objectContaining({
				durationMs: 500,
				errorsCount: 0,
				nextStage: 'mode_selection',
				result: 'completed',
				stage: 'preflight',
			})
		);
		expect(nowSpy).toHaveBeenCalledTimes(2);
	});

	it('classifies generate cancellations with stable reasons', () => {
		const telemetry = createTelemetryMock();
		const subscriber = createTelemetrySubscriber({
			machineId: 'generate',
			skipStates: ['routeToMode'],
			telemetry: telemetry as never,
		});
		const nowSpy = vi
			.spyOn(Date, 'now')
			.mockReturnValueOnce(1_000)
			.mockReturnValueOnce(1_250);

		subscriber({
			context: {
				dependenciesToAdd: [],
				errors: [],
				filesCreated: [],
				filesModified: [],
			},
			value: 'modeSelection',
		});
		subscriber({
			context: {
				cancelReason: 'Mode selection cancelled',
				dependenciesToAdd: [],
				errors: [],
				filesCreated: [],
				filesModified: [],
			},
			value: 'cancelling',
		});

		expect(telemetry.trackEvent).toHaveBeenCalledWith(
			TelemetryEventName.ONBOARDING_STAGE,
			expect.objectContaining({
				durationMs: 250,
				nextStage: 'cancelling',
				reason: 'mode_selection_cancelled',
				result: 'cancelled',
				stage: 'mode_selection',
			})
		);
		expect(nowSpy).toHaveBeenCalledTimes(2);
	});

	it('marks dependency install stage failures with install context', () => {
		const telemetry = createTelemetryMock();
		const subscriber = createTelemetrySubscriber({
			machineId: 'generate',
			skipStates: ['routeToMode'],
			telemetry: telemetry as never,
		});
		const nowSpy = vi
			.spyOn(Date, 'now')
			.mockReturnValueOnce(2_000)
			.mockReturnValueOnce(3_000);

		subscriber({
			context: {
				dependenciesToAdd: ['c15t', '@c15t/dev-tools'],
				errors: [],
				filesCreated: ['a.ts'],
				filesModified: [{ backup: 'x', path: 'b.ts', type: 'modified' }],
				installAttempted: true,
				installConfirmed: true,
				installSucceeded: false,
			},
			value: 'dependencyInstall',
		});
		subscriber({
			context: {
				dependenciesToAdd: ['c15t', '@c15t/dev-tools'],
				errors: [],
				filesCreated: ['a.ts'],
				filesModified: [{ backup: 'x', path: 'b.ts', type: 'modified' }],
				installAttempted: true,
				installConfirmed: true,
				installSucceeded: false,
			},
			value: 'summary',
		});

		expect(telemetry.trackEvent).toHaveBeenCalledWith(
			TelemetryEventName.ONBOARDING_STAGE,
			expect.objectContaining({
				dependencyCount: 2,
				durationMs: 1000,
				filesCreatedCount: 1,
				filesModifiedCount: 1,
				installAttempted: true,
				installConfirmed: true,
				installSucceeded: false,
				nextStage: 'summary',
				reason: 'dependency_install_failed',
				result: 'failed',
				stage: 'dependency_install',
			})
		);
		expect(nowSpy).toHaveBeenCalledTimes(2);
	});

	it('does not emit onboarding stage events for non-generate machines', () => {
		const telemetry = createTelemetryMock();
		const subscriber = createTelemetrySubscriber({
			machineId: 'self-host',
			telemetry: telemetry as never,
		});
		vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(100);

		subscriber({ context: {}, value: 'idle' });
		subscriber({ context: {}, value: 'complete' });

		expect(telemetry.trackEvent).not.toHaveBeenCalledWith(
			TelemetryEventName.ONBOARDING_STAGE,
			expect.anything()
		);
	});
});

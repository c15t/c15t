import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TelemetryEventName } from '~/utils/telemetry';
import { createTelemetrySubscriber } from './telemetry-plugin';

function createTelemetryMock() {
	return {
		trackEvent: vi.fn(),
	} as const;
}

describe('createTelemetrySubscriber', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('tracks generate stage completion with duration and stable stage names', () => {
		const telemetry = createTelemetryMock();
		const subscriber = createTelemetrySubscriber({
			telemetry: telemetry as never,
			machineId: 'generate',
			skipStates: ['routeToMode'],
		});
		const nowSpy = vi
			.spyOn(Date, 'now')
			.mockReturnValueOnce(0)
			.mockReturnValueOnce(500);

		subscriber({
			value: 'preflight',
			context: {
				errors: [],
				dependenciesToAdd: [],
				filesCreated: [],
				filesModified: [],
			},
		});
		subscriber({
			value: 'modeSelection',
			context: {
				errors: [],
				dependenciesToAdd: [],
				filesCreated: [],
				filesModified: [],
			},
		});

		expect(telemetry.trackEvent).toHaveBeenCalledWith(
			TelemetryEventName.ONBOARDING_STAGE,
			expect.objectContaining({
				stage: 'preflight',
				nextStage: 'mode_selection',
				durationMs: 500,
				result: 'completed',
				errorsCount: 0,
			})
		);
		expect(nowSpy).toHaveBeenCalledTimes(2);
	});

	it('classifies generate cancellations with stable reasons', () => {
		const telemetry = createTelemetryMock();
		const subscriber = createTelemetrySubscriber({
			telemetry: telemetry as never,
			machineId: 'generate',
			skipStates: ['routeToMode'],
		});
		const nowSpy = vi
			.spyOn(Date, 'now')
			.mockReturnValueOnce(1_000)
			.mockReturnValueOnce(1_250);

		subscriber({
			value: 'modeSelection',
			context: {
				errors: [],
				dependenciesToAdd: [],
				filesCreated: [],
				filesModified: [],
			},
		});
		subscriber({
			value: 'cancelling',
			context: {
				cancelReason: 'Mode selection cancelled',
				errors: [],
				dependenciesToAdd: [],
				filesCreated: [],
				filesModified: [],
			},
		});

		expect(telemetry.trackEvent).toHaveBeenCalledWith(
			TelemetryEventName.ONBOARDING_STAGE,
			expect.objectContaining({
				stage: 'mode_selection',
				nextStage: 'cancelling',
				durationMs: 250,
				result: 'cancelled',
				reason: 'mode_selection_cancelled',
			})
		);
		expect(nowSpy).toHaveBeenCalledTimes(2);
	});

	it('marks dependency install stage failures with install context', () => {
		const telemetry = createTelemetryMock();
		const subscriber = createTelemetrySubscriber({
			telemetry: telemetry as never,
			machineId: 'generate',
			skipStates: ['routeToMode'],
		});
		const nowSpy = vi
			.spyOn(Date, 'now')
			.mockReturnValueOnce(2_000)
			.mockReturnValueOnce(3_000);

		subscriber({
			value: 'dependencyInstall',
			context: {
				errors: [],
				dependenciesToAdd: ['c15t', '@c15t/dev-tools'],
				filesCreated: ['a.ts'],
				filesModified: [{ path: 'b.ts', backup: 'x', type: 'modified' }],
				installConfirmed: true,
				installAttempted: true,
				installSucceeded: false,
			},
		});
		subscriber({
			value: 'summary',
			context: {
				errors: [],
				dependenciesToAdd: ['c15t', '@c15t/dev-tools'],
				filesCreated: ['a.ts'],
				filesModified: [{ path: 'b.ts', backup: 'x', type: 'modified' }],
				installConfirmed: true,
				installAttempted: true,
				installSucceeded: false,
			},
		});

		expect(telemetry.trackEvent).toHaveBeenCalledWith(
			TelemetryEventName.ONBOARDING_STAGE,
			expect.objectContaining({
				stage: 'dependency_install',
				nextStage: 'summary',
				durationMs: 1000,
				result: 'failed',
				reason: 'dependency_install_failed',
				dependencyCount: 2,
				filesCreatedCount: 1,
				filesModifiedCount: 1,
				installConfirmed: true,
				installAttempted: true,
				installSucceeded: false,
			})
		);
		expect(nowSpy).toHaveBeenCalledTimes(2);
	});

	it('does not emit onboarding stage events for non-generate machines', () => {
		const telemetry = createTelemetryMock();
		const subscriber = createTelemetrySubscriber({
			telemetry: telemetry as never,
			machineId: 'self-host',
		});
		vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(100);

		subscriber({ value: 'idle', context: {} });
		subscriber({ value: 'complete', context: {} });

		expect(telemetry.trackEvent).not.toHaveBeenCalledWith(
			TelemetryEventName.ONBOARDING_STAGE,
			expect.anything()
		);
	});
});

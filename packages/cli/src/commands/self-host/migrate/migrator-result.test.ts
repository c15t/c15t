import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clack/prompts', () => {
	return {
		confirm: vi.fn(),
		isCancel: (value: unknown) => value === Symbol.for('CANCEL'),
	};
});

import * as prompts from '@clack/prompts';
import { TelemetryEventName } from '../../../utils/telemetry';
import { handleMigrationResult } from './migrator-result';

function createMockContext() {
	return {
		logger: {
			info: vi.fn(),
			success: vi.fn(),
		},
		telemetry: {
			trackEvent: vi.fn(),
		},
	} as unknown as Parameters<typeof handleMigrationResult>[0];
}

function createResult() {
	return {
		execute: vi.fn().mockResolvedValue(undefined),
		getSQL: vi.fn().mockReturnValue('SELECT 1;'),
	} as unknown as Parameters<typeof handleMigrationResult>[1];
}

describe('handleMigrationResult', () => {
	beforeEach(() => {
		(prompts.confirm as unknown as ReturnType<typeof vi.fn>).mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('tracks failure when user cancels at view SQL prompt', async () => {
		const context = createMockContext();
		const result = createResult();
		(
			prompts.confirm as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce(Symbol.for('CANCEL'));

		await handleMigrationResult(context, result);

		expect(context.telemetry.trackEvent).toHaveBeenCalledWith(
			TelemetryEventName.MIGRATION_PLANNED,
			{ success: true }
		);
		expect(context.telemetry.trackEvent).toHaveBeenCalledWith(
			TelemetryEventName.MIGRATION_FAILED,
			{ viewSQL: false }
		);
		expect(result.execute).not.toHaveBeenCalled();
	});

	it('logs SQL when user chooses to view, then cancels execute', async () => {
		const context = createMockContext();
		const result = createResult();
		(prompts.confirm as unknown as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(true) // view SQL
			.mockResolvedValueOnce(Symbol.for('CANCEL')); // execute cancel

		await handleMigrationResult(context, result);

		expect(result.getSQL).toHaveBeenCalled();
		expect(context.logger.info).toHaveBeenCalledWith('SELECT 1;');
		expect(context.telemetry.trackEvent).toHaveBeenCalledWith(
			TelemetryEventName.MIGRATION_FAILED,
			{ execute: false }
		);
		expect(result.execute).not.toHaveBeenCalled();
	});

	it('executes migration and tracks completion', async () => {
		const context = createMockContext();
		const result = createResult();
		(prompts.confirm as unknown as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(false) // do not view SQL
			.mockResolvedValueOnce(true); // execute

		await handleMigrationResult(context, result);

		expect(result.execute).toHaveBeenCalledTimes(1);
		expect(context.logger.success).toHaveBeenCalledWith('Migration completed.');
		expect(context.telemetry.trackEvent).toHaveBeenCalledWith(
			TelemetryEventName.MIGRATION_COMPLETED,
			{ success: true }
		);
	});
});

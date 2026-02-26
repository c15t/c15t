import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clack/prompts', () => ({
	select: vi.fn(),
	isCancel: vi.fn((value: unknown) => value === Symbol.for('CANCEL')),
}));

vi.mock('./migrate', () => ({
	migrate: vi.fn(async () => undefined),
}));

import * as prompts from '@clack/prompts';
import { TelemetryEventName } from '~/utils/telemetry';
import { selfHost } from './index';
import { migrate } from './migrate';

function createMockContext(commandArgs: string[] = []) {
	return {
		commandArgs,
		logger: {
			debug: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
			outro: vi.fn(),
		},
		telemetry: {
			trackEvent: vi.fn(),
		},
		error: {
			handleCancel: vi.fn(),
		},
	} as unknown as Parameters<typeof selfHost>[0];
}

describe('selfHost command', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('runs migrate when migrate subcommand is provided', async () => {
		const context = createMockContext(['migrate']);

		await selfHost(context);

		expect(migrate).toHaveBeenCalledWith(context);
	});

	it('shows usage guidance for unknown subcommands', async () => {
		const context = createMockContext(['unknown']);

		await selfHost(context);

		expect(context.logger.error).toHaveBeenCalledWith(
			'Unknown self-host subcommand: unknown'
		);
		expect(context.logger.info).toHaveBeenCalledWith(
			'Usage: c15t self-host <migrate>'
		);
		expect(context.telemetry.trackEvent).toHaveBeenCalledWith(
			TelemetryEventName.SELF_HOST_COMPLETED,
			{
				success: false,
				reason: 'unknown_subcommand',
			}
		);
	});

	it('exits self-host menu gracefully when Exit is selected', async () => {
		const context = createMockContext();
		(
			prompts.select as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce('exit');
		(
			prompts.isCancel as unknown as ReturnType<typeof vi.fn>
		).mockReturnValueOnce(false);

		await selfHost(context);

		expect(context.error.handleCancel).not.toHaveBeenCalled();
		expect(context.logger.outro).toHaveBeenCalledWith('Exited self-host menu.');
		expect(context.telemetry.trackEvent).toHaveBeenCalledWith(
			TelemetryEventName.INTERACTIVE_MENU_EXITED,
			{
				action: 'exit',
				context: 'self-host',
			}
		);
	});

	it('uses cancellation handler when selection is cancelled', async () => {
		const context = createMockContext();
		const cancel = Symbol.for('CANCEL');
		(
			prompts.select as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce(cancel);
		(
			prompts.isCancel as unknown as ReturnType<typeof vi.fn>
		).mockReturnValueOnce(true);

		await selfHost(context);

		expect(context.error.handleCancel).toHaveBeenCalledWith(
			'Operation cancelled.',
			{
				command: 'self-host',
				stage: 'menu_selection',
			}
		);
	});
});

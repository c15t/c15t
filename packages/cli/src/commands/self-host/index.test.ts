import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TelemetryEventName } from '~/utils/telemetry';

import { selfHost } from './index';

const prompts = {
	select: vi.fn(),
	isCancel: vi.fn((value: unknown) => value === Symbol.for('CANCEL')),
};
const migrate = vi.fn(async () => undefined);
const dependencies = {
	...prompts,
	migrate,
};

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

		await selfHost(context, dependencies);

		expect(migrate).toHaveBeenCalledWith(context);
	});

	it('shows usage guidance for unknown subcommands', async () => {
		const context = createMockContext(['unknown']);

		await selfHost(context, dependencies);

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
		prompts.select.mockResolvedValueOnce('exit');
		prompts.isCancel.mockReturnValueOnce(false);

		await selfHost(context, dependencies);

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
		prompts.select.mockResolvedValueOnce(cancel);
		prompts.isCancel.mockReturnValueOnce(true);

		await selfHost(context, dependencies);

		expect(context.error.handleCancel).toHaveBeenCalledWith(
			'Operation cancelled.',
			{
				command: 'self-host',
				stage: 'menu_selection',
			}
		);
	});
});

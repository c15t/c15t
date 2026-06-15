/**
 * Mock Hexbus prompt helpers for testing.
 */

import { type Mock, vi } from 'vitest';

export interface MockPrompts {
	promptSelect: Mock;
	promptText: Mock;
	promptConfirm: Mock;
	promptMultiselect: Mock;
	createSpinner: Mock;
	logMessage: Mock;
}

export function createMockPrompts(
	responses: Record<string, unknown> = {}
): MockPrompts {
	return {
		promptSelect: vi
			.fn()
			.mockImplementation(async ({ message }: { message: string }) => {
				return responses[message] ?? responses.default ?? 'mock-value';
			}),

		promptText: vi
			.fn()
			.mockImplementation(async ({ message }: { message: string }) => {
				return responses[message] ?? responses.default ?? 'mock-text';
			}),

		promptConfirm: vi
			.fn()
			.mockImplementation(async ({ message }: { message: string }) => {
				return responses[message] ?? responses.default ?? true;
			}),

		promptMultiselect: vi
			.fn()
			.mockImplementation(async ({ message }: { message: string }) => {
				return responses[message] ?? responses.default ?? [];
			}),

		createSpinner: vi.fn().mockReturnValue({
			start: vi.fn(),
			stop: vi.fn(),
			message: vi.fn(),
		}),

		logMessage: vi.fn(),
	};
}

export function mockCancel(prompts: MockPrompts): void {
	prompts.promptSelect.mockResolvedValue(undefined);
	prompts.promptText.mockResolvedValue(undefined);
	prompts.promptConfirm.mockResolvedValue(undefined);
	prompts.promptMultiselect.mockResolvedValue(undefined);
}

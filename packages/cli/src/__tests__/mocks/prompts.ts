/**
 * Mock @clack/prompts for testing
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

export interface MockPrompts {
	select: Mock;
	text: Mock;
	confirm: Mock;
	multiselect: Mock;
	isCancel: Mock;
	spinner: Mock;
	log: {
		message: Mock;
		info: Mock;
		warn: Mock;
		error: Mock;
		step: Mock;
	};
	intro: Mock;
	outro: Mock;
	note: Mock;
}

export const createMockPrompts = function createMockPrompts(
	responses: Record<string, unknown> = {}
): MockPrompts {
	return {
		confirm: vi
			.fn()
			.mockImplementation(
				({ message }: { message: string }) =>
					responses[message] ?? responses.default ?? true
			),

		intro: vi.fn(),

		isCancel: vi.fn().mockReturnValue(false),

		log: {
			error: vi.fn(),
			info: vi.fn(),
			message: vi.fn(),
			step: vi.fn(),
			warn: vi.fn(),
		},

		multiselect: vi
			.fn()
			.mockImplementation(
				({ message }: { message: string }) =>
					responses[message] ?? responses.default ?? []
			),

		note: vi.fn(),

		outro: vi.fn(),

		select: vi
			.fn()
			.mockImplementation(
				({ message }: { message: string }) =>
					responses[message] ?? responses.default ?? 'mock-value'
			),

		spinner: vi.fn().mockReturnValue({
			message: vi.fn(),

			start: vi.fn(),
			stop: vi.fn(),
		}),

		text: vi
			.fn()
			.mockImplementation(
				({ message }: { message: string }) =>
					responses[message] ?? responses.default ?? 'mock-text'
			),
	};
};

export const mockCancel = function mockCancel(prompts: MockPrompts): void {
	prompts.isCancel.mockReturnValue(true);
};

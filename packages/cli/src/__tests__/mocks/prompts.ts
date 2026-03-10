/**
 * Mock @clack/prompts for testing
 */

import { type Mock, vi } from 'vitest';

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

export function createMockPrompts(
	responses: Record<string, unknown> = {}
): MockPrompts {
	return {
		select: vi
			.fn()
			.mockImplementation(async ({ message }: { message: string }) => {
				return responses[message] ?? responses.default ?? 'mock-value';
			}),

		text: vi
			.fn()
			.mockImplementation(async ({ message }: { message: string }) => {
				return responses[message] ?? responses.default ?? 'mock-text';
			}),

		confirm: vi
			.fn()
			.mockImplementation(async ({ message }: { message: string }) => {
				return responses[message] ?? responses.default ?? true;
			}),

		multiselect: vi
			.fn()
			.mockImplementation(async ({ message }: { message: string }) => {
				return responses[message] ?? responses.default ?? [];
			}),

		isCancel: vi.fn().mockReturnValue(false),

		spinner: vi.fn().mockReturnValue({
			start: vi.fn(),
			stop: vi.fn(),
			message: vi.fn(),
		}),

		log: {
			message: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			step: vi.fn(),
		},

		intro: vi.fn(),
		outro: vi.fn(),
		note: vi.fn(),
	};
}

export function mockCancel(prompts: MockPrompts): void {
	prompts.isCancel.mockReturnValue(true);
}

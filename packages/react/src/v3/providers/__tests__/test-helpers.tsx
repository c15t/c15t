import { beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

const mockFetch = vi.fn();

export function setupMocks(): {
	mockFetch: Mock;
} {
	window.fetch = mockFetch;

	beforeEach(() => {
		mockFetch.mockReset();
	});

	return { mockFetch };
}

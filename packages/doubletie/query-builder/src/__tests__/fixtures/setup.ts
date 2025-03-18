import { afterAll, vi } from 'vitest';

// Set up global test environment
vi.mock('better-sqlite3', async () => {
	const mockDatabase = {
		prepare: vi.fn().mockReturnValue({
			run: vi.fn(),
			get: vi.fn(),
			all: vi.fn(),
			finalize: vi.fn(),
		}),
		exec: vi.fn(),
		transaction: vi.fn((fn) => fn()),
		close: vi.fn(),
	};

	return vi.fn(() => mockDatabase);
});

// Set up any global variables needed for tests
//@ts-expect-error
globalThis.__TEST_ENV__ = process.env.TEST_TYPE || 'unit';

// Clean up any global resources after tests
afterAll(() => {
	vi.clearAllMocks();
});

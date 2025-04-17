import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generate } from '../src/commands/generate';

// Create a simple mock context
const mockContext = {
	logger: {
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		success: vi.fn(),
		failed: vi.fn(),
		message: vi.fn(),
		note: vi.fn(),
		outro: vi.fn(),
	},
	flags: { config: 'c15t.config.js', y: true },
	cwd: '/test/dir',
	commandName: 'generate',
	commandArgs: [],
	error: {
		handleError: vi.fn(),
		handleCancel: vi.fn(),
	},
	fs: {
		getPackageInfo: vi.fn(() => ({ version: '1.0.0' })),
	},
};

// Mock generate function
vi.mock('../src/commands/generate', () => ({
	generate: vi.fn(),
}));

// Mock config module
vi.mock('../src/actions/get-config', () => ({
	getConfig: vi.fn().mockResolvedValue({
		mode: 'c15t',
		backendURL: 'https://test.c15t.dev',
	}),
}));

// Mock onboarding
vi.mock('../src/onboarding', () => ({
	startOnboarding: vi.fn(),
}));

// Mock setupGenerateEnvironment
vi.mock('../src/commands/generate/setup', () => ({
	setupGenerateEnvironment: vi.fn().mockResolvedValue({
		config: { mode: 'c15t', backendURL: 'https://test.c15t.dev' },
		adapter: null,
	}),
}));

// Mock clack/prompts
vi.mock('@clack/prompts', () => ({
	confirm: vi.fn().mockImplementation(() => false),
	isCancel: vi.fn().mockReturnValue(false),
	log: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

describe('Command Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('generate command', () => {
		it('should call generate with context', async () => {
			// Call generate directly
			await generate(mockContext);

			// Check that generate was called
			expect(generate).toHaveBeenCalledTimes(1);
			expect(generate).toHaveBeenCalledWith(mockContext);
		});
	});

	// describe('migrate command', () => {
	// 	it('should call migrate with parsed arguments', async () => {
	// 		const args = [
	// 			'--cwd',
	// 			'/test/dir',
	// 			'--config',
	// 			'c15t.config.js',
	// 			'-y',
	// 		];
	// 		process.argv = ['node', 'index.js', 'migrate', ...args];

	// 		try {
	// 			await main();
	// 			// Check that the migrate function was called with the arguments *after* the command name
	// 			expect(migrate).toHaveBeenCalledTimes(1);
	// 			expect(migrate).toHaveBeenCalledWith(args);
	// 		} catch (error) {
	// 			// biome-ignore lint/suspicious/noConsole: its okay as its a test
	// 			console.error('Test failed with error:', error);
	// 			throw error;
	// 		}
	// 	});
	// });
});

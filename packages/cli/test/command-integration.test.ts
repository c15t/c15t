import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Import the functions/modules we want to test or mock
import { main } from '../src/index';
import { generate } from '../src/commands/generate';
import type * as prompts from '@clack/prompts'; // To mock interactions

// Define regex pattern at the top level
const SECRET_HEX_PATTERN = /C15T_SECRET=[a-f0-9]{64}/i;

// Mock filesystem correctly for Vitest
vi.mock('node:fs', () => {
	return {
		// Provide the mocked functions directly
		existsSync: vi.fn().mockReturnValue(true),
		readFile: vi.fn().mockImplementation(async (filePath) => {
			if (typeof filePath === 'string' && filePath.endsWith('package.json')) {
				return '{ "version": "1.0.0-test" }';
			}
			// Return empty for other reads in this test context
			return '{}';
		}),
		writeFile: vi.fn().mockResolvedValue(undefined), // Note: original mock used wrireFile
		// Add other fs functions if needed by tested code, e.g., readdirSync
		readdirSync: vi.fn().mockReturnValue([]), 
		statSync: vi.fn().mockReturnValue({ isDirectory: () => false }), // Mock statSync
		// IMPORTANT: Vitest might need a default export if the original module has one
		// default: { ... } // Add if needed, consult fs module structure
	};
});

// Mock config (RE-ENABLE THIS MOCK)
vi.mock('../src/actions/get-config', () => ({
	getConfig: vi.fn().mockResolvedValue({
		database: { id: 'kysely', introspection: {} }, // Minimal valid config
		basePath: '/api/c15t',
		appName: 'Test App',
	}),
}));

// Mock the actual command functions to spy on them
vi.mock('../src/commands/generate', () => ({
	generate: vi.fn(),
}));
vi.mock('../src/commands/migrate', () => ({
	migrate: vi.fn(),
}));
vi.mock('../src/onboarding', () => ({
	startOnboarding: vi.fn(),
}));
// Mock clack/prompts to simulate non-interactive execution (-y)
vi.mock('@clack/prompts', async (importOriginal) => {
	const original = await importOriginal<typeof prompts>();
	return {
		...original, // Use original implementations for log, etc.
		select: vi.fn(), // Mock select if needed for interactive tests
		confirm: vi.fn().mockResolvedValue(true), // Auto-confirm for -y tests
		isCancel: vi.fn().mockReturnValue(false),
	};
});

describe('Command Integration', () => {
	beforeEach(() => {
		// Clear mocks before each test
		vi.clearAllMocks();
		// Mock process.exit to prevent tests from exiting
		vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('generate command', () => {
		it('should call generate with parsed arguments', async () => {
			const args = [
				'--cwd',
				'/test/dir',
				'--config',
				'c15t.config.js',
				'--output',
				'schema.ts',
				'-y',
			];
			process.argv = ['node', 'index.js', 'generate', ...args];

			try {
				await main();
				// Check that the generate function was called with the arguments *after* the command name
				expect(generate).toHaveBeenCalledTimes(1);
				expect(generate).toHaveBeenCalledWith(args);
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: its okay as its a test
				console.error('Test failed with error:', error);
				throw error;
			}
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

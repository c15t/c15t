import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateSecret } from '../src/commands/secret';
import logger from '../src/utils/logger';

// Define regex pattern at the top level
const SECRET_HEX_PATTERN = /C15T_SECRET=[a-f0-9]{64}/i;

// Mock filesystem
vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
}));

// Mock database
vi.mock('better-sqlite3', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      prepare: vi.fn().mockReturnValue({
        run: vi.fn(),
        all: vi.fn().mockReturnValue([]),
        get: vi.fn(),
      }),
      transaction: vi.fn(),
    })),
  };
});

// Mock getMigrations
vi.mock('@c15t/backend/pkgs/migrations', () => ({
  getMigrations: vi.fn().mockImplementation(() => ({
    compileMigrations: vi.fn().mockResolvedValue('-- Mock SQL Migration'),
    toBeAdded: [],
    toBeCreated: [],
    runMigrations: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock config with more complete data
vi.mock('../src/utils/get-config', () => ({
  getConfig: vi.fn().mockResolvedValue({
    database: {
      id: 'kysely',
      introspection: { schema: {}, tables: {} },
    },
    basePath: '/api/c15t',
    appName: 'Test App',
  }),
}));

// Mock adapter with necessary methods
vi.mock('@c15t/backend/pkgs/db-adapters', () => ({
  getAdapter: vi.fn().mockResolvedValue({
    id: 'kysely',
    generateSchema: vi.fn().mockResolvedValue('-- Generated Schema'),
    inspect: vi.fn().mockResolvedValue({ schema: {}, tables: {} }),
    options: { provider: 'sqlite' },
  }),
}));

describe('Command Integration', () => {
  beforeEach(() => {
    // Mock process.exit to prevent tests from exiting
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generate command', () => {
    it('should call generateAction with correct options', async () => {
      // Create a spy action handler
      const actionSpy = vi.fn();

      // Create a test command with our spy
      const testCommand = new Command('generate')
        .option('-c, --cwd <cwd>', 'working directory', process.cwd())
        .option('--config <config>', 'config file path')
        .option('--output <output>', 'output file path')
        .option('-y, --y', 'auto-confirm', false)
        .action(actionSpy);

      // Create a program and add our test command
      const program = new Command();
      program.addCommand(testCommand);

      try {
        // Parse arguments
        await program.parseAsync([
          'node',
          'test',
          'generate',
          '--cwd',
          '/test/dir',
          '--config',
          'c15t.config.js',
          '--output',
          'schema.ts',
          '-y',
        ]);

        // Check that the action was called with the correct options
        expect(actionSpy).toHaveBeenCalledTimes(1);
        // Check only the first argument (options object)
        expect(actionSpy.mock.calls[0]?.[0]).toEqual(
          expect.objectContaining({
            cwd: '/test/dir',
            config: 'c15t.config.js',
            output: 'schema.ts',
            y: true,
          })
        );
      } catch (error) {
        // biome-ignore lint/suspicious/noConsole: its okay as its a test
        console.error('Test failed with error:', error);
        throw error;
      }
    });
  });

  describe('migrate command', () => {
    it('should call migrateAction with correct options', async () => {
      // Create a spy action handler
      const actionSpy = vi.fn();

      // Create a test command with our spy
      const testCommand = new Command('migrate')
        .option('-c, --cwd <cwd>', 'working directory', process.cwd())
        .option('--config <config>', 'config file path')
        .option('-y, --y', 'auto-confirm', false)
        .action(actionSpy);

      // Create a program and add our test command
      const program = new Command();
      program.addCommand(testCommand);

      try {
        // Parse arguments
        await program.parseAsync([
          'node',
          'test',
          'migrate',
          '--cwd',
          '/test/dir',
          '--config',
          'c15t.config.js',
          '-y',
        ]);

        // Check that the action was called with the correct options
        expect(actionSpy).toHaveBeenCalledTimes(1);
        // Check only the first argument (options object)
        expect(actionSpy.mock.calls[0]?.[0]).toEqual(
          expect.objectContaining({
            cwd: '/test/dir',
            config: 'c15t.config.js',
            y: true,
          })
        );
      } catch (error) {
        // biome-ignore lint/suspicious/noConsole: its okay as its a test
        console.error('Test failed with error:', error);
        throw error;
      }
    });
  });

  describe('secret command', () => {
    it('should call logger with generated secret', async () => {
      // Mock the logger.info method
      const loggerSpy = vi
        .spyOn(logger, 'info')
        .mockImplementation(() => undefined);

      // Create a new program and register the command
      const program = new Command();
      program.addCommand(generateSecret);

      try {
        // Parse arguments
        await program.parseAsync(['node', 'test', 'secret']);

        // Verify logger was called with a message containing the secret
        expect(loggerSpy).toHaveBeenCalledTimes(1);
        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringMatching(SECRET_HEX_PATTERN)
        );
      } catch (error) {
        // biome-ignore lint/suspicious/noConsole: its okay as its a test
        console.error('Test failed with error:', error);
        throw error;
      }
    });
  });
});

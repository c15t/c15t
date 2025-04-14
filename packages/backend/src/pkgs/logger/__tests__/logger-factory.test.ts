import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { levels } from '../log-levels';
import * as logLevels from '../log-levels';
import { createLogger } from '../logger-factory';

describe('logger-factory', () => {
  // Mock console methods
  beforeEach(() => {
    // biome-ignore lint/suspicious/noEmptyBlockStatements: its okay its a test
    vi.spyOn(console, 'log').mockImplementation(() => {});
    // biome-ignore lint/suspicious/noEmptyBlockStatements: its okay its a test
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    // biome-ignore lint/suspicious/noEmptyBlockStatements: its okay its a test
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // biome-ignore lint/suspicious/noEmptyBlockStatements: its okay its a test
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createLogger', () => {
    it('should create a logger with all log level methods', () => {
      const logger = createLogger();
      for (const level of levels) {
        expect(typeof logger[level]).toBe('function');
      }
    });

    it('should respect disabled option', () => {
      const logger = createLogger({ disabled: true });
      logger.error('This should not be logged');
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should respect log level option', () => {
      // Mock the shouldPublishLog function to return expected values for our test
      vi.spyOn(logLevels, 'shouldPublishLog').mockImplementation(
        (currentLevel, messageLevel) => {
          if (currentLevel === 'warn') {
            return messageLevel === 'warn' || messageLevel === 'error';
          }
          return false;
        }
      );

      const logger = createLogger({ level: 'warn' });

      logger.error('This should be logged'); // Should be logged
      logger.warn('This should be logged'); // Should be logged
      logger.info('This should not be logged'); // Should not be logged
      logger.debug('This should not be logged'); // Should not be logged

      // Verify calls
      expect(console.error).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalled();
      expect(console.debug).not.toHaveBeenCalled();

      // Restore the original function
      vi.mocked(logLevels.shouldPublishLog).mockRestore();
    });

    it('should use custom log handler when provided', () => {
      const customLog = vi.fn();
      const logger = createLogger({
        log: customLog,
        level: 'debug',
      });

      // Mock shouldPublishLog to always return true for this test
      vi.spyOn(logLevels, 'shouldPublishLog').mockReturnValue(true);

      logger.info('Info message');
      logger.error('Error message');
      logger.success('Success message');

      expect(customLog).toHaveBeenCalledTimes(3);
      expect(customLog).toHaveBeenCalledWith('info', 'Info message');
      expect(customLog).toHaveBeenCalledWith('error', 'Error message');
      // 'success' should be treated as 'info' when using custom log handler
      expect(customLog).toHaveBeenCalledWith('info', 'Success message');

      vi.mocked(logLevels.shouldPublishLog).mockRestore();
    });

    it('should format messages with timestamp and level', () => {
      // Mock shouldPublishLog to return true for this test
      vi.spyOn(logLevels, 'shouldPublishLog').mockReturnValue(true);

      const logger = createLogger();
      logger.error('Test message');

      // Check that console.error was called with a formatted message
      expect(console.error).toHaveBeenCalled();

      // Extract the first argument from the first call
      const mockedConsoleError = vi.mocked(console.error);
      const firstCallArg = mockedConsoleError.mock.calls[0]?.[0];

      // Check that the message contains the expected parts
      expect(firstCallArg).toContain('ERROR');
      expect(firstCallArg).toContain('[c15t]');
      expect(firstCallArg).toContain('Test message');

      // Check that timestamp matches ISO format
      // biome-ignore lint/performance/useTopLevelRegex: its okay its a test
      expect(firstCallArg).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      vi.mocked(logLevels.shouldPublishLog).mockRestore();
    });

    it('should pass additional arguments to console methods', () => {
      // Mock shouldPublishLog to return true for this test
      vi.spyOn(logLevels, 'shouldPublishLog').mockReturnValue(true);

      const logger = createLogger();
      const meta = { userId: 'user123' };

      logger.error('Error with meta', meta);

      expect(console.error).toHaveBeenCalled();
      const mockedConsoleError = vi.mocked(console.error);
      expect(mockedConsoleError.mock.calls[0]?.[1]).toBe(meta);

      vi.mocked(logLevels.shouldPublishLog).mockRestore();
    });

    it('should use custom app name when provided', () => {
      // Mock shouldPublishLog to return true for this test
      vi.spyOn(logLevels, 'shouldPublishLog').mockReturnValue(true);

      // Create a logger with a custom app name
      const customAppName = 'test-app';
      const logger = createLogger({ appName: customAppName });

      // Log a test message
      logger.info('Test message with custom app name');

      // Check that console.log was called with a formatted message
      expect(console.log).toHaveBeenCalled();

      // Extract the first argument from the first call
      const mockedConsoleLog = vi.mocked(console.log);
      const logMessage = mockedConsoleLog.mock.calls[0]?.[0];

      // Verify the message contains the custom app name
      expect(logMessage).toContain(`[${customAppName}]`);
      // And doesn't contain the default app name
      expect(logMessage).not.toContain('[🪢 doubletie]');

      vi.mocked(logLevels.shouldPublishLog).mockRestore();
    });
  });
});

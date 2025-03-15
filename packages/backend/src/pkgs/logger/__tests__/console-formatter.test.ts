import { describe, expect, it } from 'vitest';
import { colors, formatMessage, levelColors } from '../console-formatter';

describe('console-formatter', () => {
	describe('colors', () => {
		it('should define ANSI color codes for text formatting', () => {
			expect(colors.reset).toBe('\x1b[0m');
			expect(colors.bright).toBe('\x1b[1m');
			expect(colors.dim).toBe('\x1b[2m');

			// Foreground colors
			expect(colors.fg.red).toBe('\x1b[31m');
			expect(colors.fg.green).toBe('\x1b[32m');
			expect(colors.fg.yellow).toBe('\x1b[33m');
			expect(colors.fg.blue).toBe('\x1b[34m');
			expect(colors.fg.magenta).toBe('\x1b[35m');
		});
	});

	describe('levelColors', () => {
		it('should assign appropriate colors to each log level', () => {
			expect(levelColors.info).toBe(colors.fg.blue);
			expect(levelColors.success).toBe(colors.fg.green);
			expect(levelColors.warn).toBe(colors.fg.yellow);
			expect(levelColors.error).toBe(colors.fg.red);
			expect(levelColors.debug).toBe(colors.fg.magenta);
		});
	});

	describe('formatMessage', () => {
		it('should format a message with timestamp, level, and app name', () => {
			const formattedMessage = formatMessage('error', 'Test message');

			// Verify the message contains the main components
			expect(formattedMessage).toContain('ERROR');
			expect(formattedMessage).toContain('[🪢 doubletie]');
			expect(formattedMessage).toContain('Test message');

			// Verify formatting includes timestamp (ISO format)
			expect(formattedMessage).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
		});

		it('should use custom app name when provided', () => {
			const formattedMessage = formatMessage(
				'info',
				'Custom app',
				'custom-app'
			);

			expect(formattedMessage).toContain('[custom-app]');
			expect(formattedMessage).toContain('INFO');
			expect(formattedMessage).toContain('Custom app');
		});

		it('should use appropriate color for each log level', () => {
			const errorMessage = formatMessage('error', 'Error message');
			const warnMessage = formatMessage('warn', 'Warning message');
			const infoMessage = formatMessage('info', 'Info message');

			// Check that each message contains the color code for its level
			expect(errorMessage).toContain(colors.fg.red);
			expect(warnMessage).toContain(colors.fg.yellow);
			expect(infoMessage).toContain(colors.fg.blue);
		});
	});
});

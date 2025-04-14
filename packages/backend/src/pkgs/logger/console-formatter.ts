import type { LogLevel } from './types';

/**
 * ANSI color codes for terminal output formatting.
 *
 * @remarks
 * Used to add color and styling to log messages in terminal environments.
 *
 * @internal
 */
export const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
  },
  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m',
  },
};

/**
 * Mapping of log levels to their corresponding colors.
 *
 * @internal
 */
export const levelColors: Record<LogLevel, string> = {
  info: colors.fg.blue,
  success: colors.fg.green,
  warn: colors.fg.yellow,
  error: colors.fg.red,
  debug: colors.fg.magenta,
};

/**
 * Formats a log message with timestamp, level indicator, and styling.
 *
 * @param level - The severity level of the message
 * @param message - The message content to format
 * @param appName - Optional application name to include in the log prefix
 * @returns The formatted message string with ANSI color codes
 *
 * @internal
 */
export const formatMessage = (
  level: LogLevel,
  message: string,
  appName = 'c15t'
): string => {
  const timestamp = new Date().toISOString();
  return `${colors.dim}${timestamp}${colors.reset} ${
    levelColors[level]
  }${level.toUpperCase()}${colors.reset} ${colors.bright}[${appName}]:${
    colors.reset
  } ${message}`;
};

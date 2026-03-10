<p align="center">
  <a href="https://c15t.com?utm_source=github&utm_medium=repopage_%40c15t%2Flogger" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="../../docs/assets/c15t-banner-readme-dark.svg" type="image/svg+xml">
      <img src="../../docs/assets/c15t-banner-readme-light.svg" alt="c15t Banner" type="image/svg+xml">
    </picture>
  </a>
  <br />
  <h1 align="center">@c15t/logger: Logger for c15t</h1>
</p>

[![GitHub stars](https://img.shields.io/github/stars/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
[![CI](https://img.shields.io/github/actions/workflow/status/c15t/c15t/ci.yml?style=flat-square)](https://github.com/c15t/c15t/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg?style=flat-square)](https://github.com/c15t/c15t/blob/main/LICENSE.md)
[![Discord](https://img.shields.io/discord/1312171102268690493?style=flat-square)](https://c15t.link/discord)
[![npm version](https://img.shields.io/npm/v/%40c15t%2Flogger?style=flat-square)](https://www.npmjs.com/package/@c15t/logger)
[![Top Language](https://img.shields.io/github/languages/top/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
[![Last Commit](https://img.shields.io/github/last-commit/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t/commits/main)
[![Open Issues](https://img.shields.io/github/issues/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t/issues)

A lightweight, customizable logging utility for Node.js and TypeScript applications. Designed for use in c15t CLI and backend applications.

## Key Features

- Color-coded console output with picocolors
- Configurable log levels (error, warn, info, debug, success)
- Custom log handlers
- Type-safe with TypeScript
- Console redirection functionality
- Lightweight with minimal dependencies

## Installation

```bash
pnpm add @c15t/logger
```

## Documentation

For further information, guides, and examples visit the [reference documentation](https://c15t.com/).

## Quick Start

```typescript
import { createLogger } from '@c15t/logger';

// Create a logger instance
const logger = createLogger({
  level: 'info',
  appName: 'my-app',
});

// Log messages at different levels
logger.info('Application started');
logger.debug('Debug information', { userId: 123 });
logger.warn('Warning message');
logger.error('Error occurred', new Error('Something went wrong'));
logger.success('Operation completed successfully');
```
## Configuration

### LoggerOptions

```typescript
interface LoggerOptions {
  /** Whether logging is disabled */
  disabled?: boolean;

  /** The minimum log level to publish */
  level?: 'error' | 'warn' | 'info' | 'debug';

  /** Custom log handler function */
  log?: (level: LogLevel, message: string, ...args: unknown[]) => void;

  /** Custom application name to display in log messages */
  appName?: string;
}
```
## Advanced Usage

### Custom Log Handler

```typescript
const logger = createLogger({
  level: 'info',
  appName: 'my-app',
  log: (level, message, ...args) => {
    // Send logs to external service
    sendToLoggingService({ level, message, args });
  },
});
```

### Extending the Logger

```typescript
import { extendLogger } from '@c15t/logger';

const baseLogger = createLogger({ level: 'info' });

const extendedLogger = extendLogger(baseLogger, {
  http: (message, ...args) => baseLogger.info(`HTTP: ${message}`, ...args),
  database: (message, ...args) => baseLogger.info(`DB: ${message}`, ...args),
});

extendedLogger.http('GET /api/users');
extendedLogger.database('Query executed in 10ms');
```

## API Reference

### Core Functions

- `createLogger(options?: LoggerOptions): Logger` - Creates a configured logger instance
- `logger` - Default logger instance with standard configuration
- `extendLogger<T>(baseLogger: Logger, extensions: T): ExtendedLogger<T>` - Extends a logger with additional methods

### Utility Functions

- `formatArgs(args)` - Formats arguments for display
- `formatMessage(level, message, args, appName)` - Formats a log message with app name and styling

## Support

- Join our [Discord community](https://c15t.link/discord)
- Open an issue on our [GitHub repository](https://github.com/c15t/c15t/issues)
- Visit [consent.io](https://consent.io) and use the chat widget
- Contact our support team via email [support@consent.io](mailto:support@consent.io)

## Contributing

- We're open to all community contributions!
- Read our [Contribution Guidelines](https://c15t.com/docs/oss/contributing)
- Review our [Code of Conduct](https://c15t.com/docs/oss/code-of-conduct)
- Fork the repository
- Create a new branch for your feature
- Submit a pull request
- **All contributions, big or small, are welcome and appreciated!**

## Security

If you believe you have found a security vulnerability in c15t, we encourage you to **_responsibly disclose this and NOT open a public issue_**. We will investigate all legitimate reports.

Our preference is that you make use of GitHub's private vulnerability reporting feature to disclose potential security vulnerabilities in our Open Source Software. To do this, please visit [https://github.com/c15t/c15t/security](https://github.com/c15t/c15t/security) and click the "Report a vulnerability" button.

### Security Policy

- Please do not share security vulnerabilities in public forums, issues, or pull requests
- Provide detailed information about the potential vulnerability
- Allow reasonable time for us to address the issue before any public disclosure
- We are committed to addressing security concerns promptly and transparently

## License

[GNU General Public License v3.0](https://github.com/c15t/c15t/blob/main/LICENSE.md)

---

**Built with ❤️ by the [consent.io](https://www.consent.io?utm_source=github&utm_medium=repopage_%40c15t%2Flogger) team**

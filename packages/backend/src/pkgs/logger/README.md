# DoubleTie Logger

A lightweight, customizable logging utility for Node.js and TypeScript applications. It provides structured logging capabilities, error logging utilities for the Result pattern, and flexible configuration options.

## Features

- Configurable log levels (`info`, `success`, `warn`, `error`, `debug`)
- Color-coded console output for better readability
- Custom log handlers for integration with other logging systems
- Error logging utilities for [neverthrow](https://github.com/supermacro/neverthrow) Result types
- TypeScript support with comprehensive type definitions
- Support for passing existing Logger instances
- Customizable application name in log messages

## Installation

```bash
npm install @doubletie/logger
```

## Usage

### Basic Logging

```typescript
import { createLogger } from '@doubletie/logger';

// Create a logger with default settings (only logs errors)
const logger = createLogger();

// Log messages at different levels
logger.error('This is an error message');
logger.warn('This is a warning');
logger.info('This is an info message'); // Won't be logged with default settings
logger.debug('This is a debug message'); // Won't be logged with default settings
logger.success('This is a success message'); // Won't be logged with default settings
```

### Customizing Log Levels

```typescript
import { createLogger } from '@doubletie/logger';

// Create a logger that logs all message types
const logger = createLogger({ level: 'debug' });

// Now all messages will be logged
logger.info('Application started');
logger.debug('Initializing components', { component: 'database' });
logger.warn('Configuration missing, using defaults');
logger.error('Failed to connect', { retry: true });
```

### Custom Application Name

```typescript
import { createLogger } from '@doubletie/logger';

// Create a logger with a custom application name
const logger = createLogger({ appName: 'my-service' });

// The logs will now display the custom app name
logger.info('Service initialized');
// Output example: 2023-03-15T12:34:56.789Z INFO [my-service]: Service initialized
```

### Disabling Logging

```typescript
import { createLogger } from '@doubletie/logger';

// Create a logger with logging disabled
const logger = createLogger({ disabled: true });

// No messages will be logged
logger.error('This won\'t be logged');
```

### Custom Log Handler

```typescript
import { createLogger } from '@doubletie/logger';

// Create a logger with a custom log handler
const logger = createLogger({
  level: 'info',
  log: (level, message, ...args) => {
    // Send logs to a custom logging service
    myLoggingService.send({
      level,
      message,
      timestamp: new Date().toISOString(),
      data: args[0] || {},
    });
  },
});

logger.info('User logged in', { userId: 'user123' });
```

### Using Existing Logger Instances

```typescript
import { createLogger, Logger } from '@doubletie/logger';

// Create a logger with specific options
const baseLogger = createLogger({ level: 'warn' });

// In another part of your application, you can pass the
// existing logger instance to createLogger
function setupService(options: { logger?: Logger }) {
  // If a logger is provided, it will be used as-is
  // Otherwise, a new one will be created with default settings
  const serviceLogger = createLogger(options.logger);
  
  serviceLogger.info('Service initializing');
}

// Pass the existing logger to the service
setupService({ logger: baseLogger });
```

### Error Logging with Result Types

```typescript
import { logError, logErrorAsync } from '@doubletie/logger';
import { createLogger } from '@doubletie/logger';
import { ok, err, okAsync, errAsync } from 'neverthrow';

const logger = createLogger();

// Log errors from a Result without disrupting the Result flow
function processData(input: string) {
  const result = validate(input); // Returns Result<ValidData, Error>
  
  // Log any errors but continue with the Result
  return logError(result, logger, 'Validation error:');
}

// Log errors from a ResultAsync
async function fetchData(url: string) {
  const resultAsync = fetchAsync(url); // Returns ResultAsync<Response, Error>
  
  // Log any errors but continue with the ResultAsync
  return logErrorAsync(resultAsync, logger, 'Fetch error:');
}
```

## API Reference

### Types

#### `LogLevel`

```typescript
type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug';
```

#### `LoggerOptions`

```typescript
interface LoggerOptions {
  disabled?: boolean;
  level?: Exclude<LogLevel, 'success'>;
  log?: (level: Exclude<LogLevel, 'success'>, message: string, ...args: unknown[]) => void;
  appName?: string;
}
```

#### `Logger`

```typescript
type Logger = Record<LogLevel, (message: string, ...args: unknown[]) => void>;
```

#### `BaseError`

```typescript
interface BaseError {
  message: string;
  code?: string | number;
  status?: number;
  data?: Record<string, unknown>;
  category?: string;
  stack?: string;
}
```

### Functions

#### `createLogger(options?: LoggerOptions | Logger)`

Creates a configured logger instance with methods for each log level. If passed an existing Logger instance, it will return that instance unchanged.

```typescript
function createLogger(options?: LoggerOptions | Logger): Logger;
```

#### `shouldPublishLog(currentLogLevel: LogLevel, logLevel: LogLevel)`

Determines if a log message should be published based on configured log level.

```typescript
function shouldPublishLog(currentLogLevel: LogLevel, logLevel: LogLevel): boolean;
```

#### `logError<ValueType, ErrorType extends BaseError>(result: Result<ValueType, ErrorType>, logger, message?)`

Logs any errors in a Result without changing the Result.

```typescript
function logError<ValueType, ErrorType extends BaseError>(
  result: Result<ValueType, ErrorType>,
  logger: { error: (message: string, ...args: unknown[]) => void },
  message?: string
): Result<ValueType, ErrorType>;
```

#### `logErrorAsync<ValueType, ErrorType extends BaseError>(resultAsync: ResultAsync<ValueType, ErrorType>, logger, message?)`

Logs any errors in a ResultAsync without changing the ResultAsync.

```typescript
function logErrorAsync<ValueType, ErrorType extends BaseError>(
  resultAsync: ResultAsync<ValueType, ErrorType>,
  logger: { error: (message: string, ...args: unknown[]) => void },
  message?: string
): ResultAsync<ValueType, ErrorType>;
```

## Package Structure

This package is organized into several focused modules:

- `types.ts` - All type definitions for the logger
- `log-levels.ts` - Log level management and filtering
- `console-formatter.ts` - Formatting utilities for console output
- `logger-factory.ts` - Logger creation functionality
- `result-logging.ts` - Error logging utilities for Result types
- `index.ts` - Main exports

## License

MIT 
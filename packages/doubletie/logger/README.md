# DoubleTie Logger

A lightweight, customizable logging utility for Node.js and TypeScript applications. It provides structured logging capabilities, Result pattern integration, and flexible configuration options.

## Features

- Configurable log levels (`info`, `success`, `warn`, `error`, `debug`)
- Color-coded console output for better readability
- Custom log handlers for integration with other logging systems
- Integration with Result pattern for error handling
- TypeScript support with comprehensive type definitions
- Customizable application name in log messages

## Installation

```bash
npm install @doubletie/logger
```

## Core Concepts

The logger provides a simple interface for outputting logs at different severity levels. The main interface is:

```typescript
interface Logger {
  info(message: string, data?: object): void;
  success(message: string, data?: object): void;
  warn(message: string, data?: object): void;
  error(message: string, data?: object): void;
  debug(message: string, data?: object): void;
}
```

### Log Levels

Log levels are ordered by severity:
- `error` - Critical issues that require immediate attention
- `warn` - Potential problems that should be investigated
- `info` - General informational messages about system operation
- `success` - Successful operations (treated as info level in custom handlers)
- `debug` - Detailed information for debugging purposes

## Usage

### Creating a Logger

```typescript
import { createLogger } from '@doubletie/logger';

// Create a logger with default settings (only logs errors)
const logger = createLogger();

// Create a logger that logs all message types
const verboseLogger = createLogger({ level: 'debug' });

// Create a logger with a custom application name
const appLogger = createLogger({ appName: 'my-service' });
```

### Logging at Different Levels

```typescript
// Critical issues
logger.error('Failed to connect to database', { retryCount: 3, timeout: 5000 });

// Warnings about potential issues
logger.warn('Configuration missing, using defaults', { config: 'cache.json' });

// General information
logger.info('Application started', { environment: 'production', version: '1.2.3' });

// Success messages
logger.success('User registered successfully', { userId: 'user123' });

// Debug information
logger.debug('Processing request', { requestId: 'req-123', payload: { name: 'Test' } });
```

### Integration with Result Types

When working with Result types from libraries like [neverthrow](https://github.com/supermacro/neverthrow), you can use these utilities to log errors without disrupting the flow:

```typescript
import { logResult, logResultAsync } from '@doubletie/logger';
import { createLogger } from '@doubletie/logger';
import { ok, err, okAsync, errAsync } from 'neverthrow';

const logger = createLogger();

// Log errors from a Result without disrupting the Result flow
function processData(input: string) {
  const result = validate(input); // Returns Result<ValidData, Error>
  
  // Log any errors but continue with the Result
  return logResult(result, logger, 'Validation error:');
}

// Log errors from a ResultAsync
async function fetchData(url: string) {
  const resultAsync = fetchAsync(url); // Returns ResultAsync<Response, Error>
  
  // Log any errors but continue with the ResultAsync
  return logResultAsync(resultAsync, logger, 'Fetch error:');
}
```

### Custom Log Handler

```typescript
import { createLogger } from '@doubletie/logger';

// Create a logger with a custom log handler
const logger = createLogger({
  level: 'info',
  log: (level, message, data) => {
    // Send logs to a custom logging service
    myLoggingService.send({
      level,
      message,
      timestamp: new Date().toISOString(),
      data: data || {},
    });
  },
});

logger.info('User logged in', { userId: 'user123' });
```

## API Reference

### Core Functions

#### `createLogger(options?: LoggerOptions | Logger): Logger`

Creates a configured logger instance with methods for each log level.

#### `isLogLevelEnabled(currentLogLevel: LogLevel, logLevel: LogLevel): boolean`

Determines if a log message should be published based on configured log level.

### Result Logging Functions

#### `logResult<T, E extends LoggableError>(result: Result<T, E>, logger, message?): Result<T, E>`

Logs any errors in a Result without changing the Result.

#### `logResultAsync<T, E extends LoggableError>(resultAsync: ResultAsync<T, E>, logger, message?): ResultAsync<T, E>`

Logs any errors in a ResultAsync without changing the ResultAsync.

### Types

#### `LogLevel`

```typescript
type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug';
```

#### `Logger`

```typescript
type Logger = {
  info(message: string, data?: object): void;
  success(message: string, data?: object): void;
  warn(message: string, data?: object): void;
  error(message: string, data?: object): void;
  debug(message: string, data?: object): void;
};
```

#### `LoggerOptions`

```typescript
interface LoggerOptions {
  disabled?: boolean;
  level?: Exclude<LogLevel, 'success'>;
  log?: (level: LogLevel, message: string, data?: object) => void;
  appName?: string;
}
```

#### `LoggableError`

```typescript
interface LoggableError {
  message: string;
  code?: string | number;
  status?: number;
  meta?: Record<string, unknown>;
  category?: string;
  stack?: string;
}
```

## Best Practices

1. **Use Structured Logging**
   - Always include relevant data objects with your log messages
   - This makes logs easier to search and analyze

2. **Choose Appropriate Log Levels**
   - Use `error` only for actual errors that require attention
   - Use `warn` for potentially problematic situations
   - Use `info` for normal operation events
   - Use `debug` only for detailed troubleshooting information

3. **Include Context**
   - Add request IDs, user IDs, or transaction IDs to logs
   - This helps correlate related log entries

## License

MIT 
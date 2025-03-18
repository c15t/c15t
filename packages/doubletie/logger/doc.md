## Overview

The DoubleTie Logger is a lightweight, flexible logging utility designed for Node.js and TypeScript applications. It provides structured logging capabilities with configurable log levels, color-coded console output, and special utilities for error handling with the Result pattern.

This documentation provides comprehensive guidance on setting up, configuring, and using the DoubleTie Logger in your applications.

## Installation

Install the DoubleTie Logger package using your preferred package manager:

```bash
# Using npm
npm install @doubletie/logger

# Using pnpm
pnpm add @doubletie/logger

# Using yarn
yarn add @doubletie/logger
```

## Getting Started

### Basic Usage

Create a logger instance and start logging messages:

```typescript
import { createLogger } from '@doubletie/logger';

// Create a logger with default settings (logs errors only)
const logger = createLogger();

// Log messages at different severity levels
logger.error('An error occurred while processing the request');
logger.warn('User session is about to expire');
logger.info('Application started successfully');
logger.debug('Connection details:', { host: 'example.com', port: 8080 });
logger.success('Data was saved successfully');
```

### Log Levels

The logger supports five log levels, in order of decreasing severity:

1. **error** - Critical issues that require immediate attention
2. **warn** - Potential problems that don't prevent the application from working
3. **info** - General information about application operation
4. **success** - Successful operations (treated as info level when using custom handlers)
5. **debug** - Detailed information useful for debugging

By default, the logger is configured to show only error messages. You can change this by specifying a different log level during creation.

### Configuring Log Levels

```typescript
import { createLogger } from '@doubletie/logger';

// Create a logger that shows warnings and errors
const warnLogger = createLogger({ level: 'warn' });

// Create a logger that shows all messages
const verboseLogger = createLogger({ level: 'debug' });

// With 'warn' level, these will be logged
warnLogger.error('Database connection failed');
warnLogger.warn('Deprecated function called');

// These will be suppressed with 'warn' level
warnLogger.info('User profile updated');
warnLogger.debug('Query parameters:', { id: 123 });

// With 'debug' level, all messages will be shown
verboseLogger.error('Critical error');
verboseLogger.warn('Warning message');
verboseLogger.info('Information message');
verboseLogger.debug('Debug details');
verboseLogger.success('Operation successful');
```

### Customizing App Name

You can customize the application name that appears in the log messages:

```typescript
import { createLogger } from '@doubletie/logger';

// Create a logger with a custom application name
const logger = createLogger({ appName: 'my-app' });

// Logs will show "[my-app]" instead of the default
logger.info('Application started');
// Output: 2023-03-15T12:34:56.789Z INFO [my-app]: Application started

// You can combine with other options
const appLogger = createLogger({
  level: 'debug',
  appName: 'payment-service'
});

appLogger.debug('Processing payment intent');
// Output: 2023-03-15T12:34:56.789Z DEBUG [payment-service]: Processing payment intent
```

### Disabling Logging

For scenarios where you need to temporarily disable all logging:

```typescript
const logger = createLogger({ disabled: true });

// None of these messages will be logged
logger.error('This is hidden');
logger.warn('Also hidden');
logger.info('Hidden too');
```

This is useful for testing environments or when you want to conditionally enable/disable logging based on environment variables.

## Advanced Features

### Custom Log Handlers

You can provide your own log handler function to direct logs to a custom destination:

```typescript
import { createLogger } from '@doubletie/logger';

// Create a logger with a custom log handler
const logger = createLogger({
  level: 'info',
  log: (level, message, ...args) => {
    // Send to an external logging service
    externalLoggingService.log({
      level,
      message,
      timestamp: new Date().toISOString(),
      data: args.length > 0 ? args[0] : undefined,
      app: 'my-application',
      environment: process.env.NODE_ENV
    });
    
    // You could also write logs to a file
    fs.appendFileSync(
      `./logs/${level}.log`, 
      `${new Date().toISOString()} - ${message} - ${JSON.stringify(args)}\n`
    );
  }
});

// Now logs will be sent to your custom destinations
logger.info('User authentication successful', { userId: '12345' });
logger.error('Payment failed', { orderId: 'ORD-789', reason: 'Insufficient funds' });
```

### Using Existing Logger Instances

The `createLogger` function is flexible and can accept either configuration options or an existing logger instance:

```typescript
import { createLogger, Logger } from '@doubletie/logger';

// Create a base logger
const baseLogger = createLogger({ level: 'warn' });

// Function that can accept an optional logger
function initializeDatabase(config: { connectionString: string, logger?: Logger }) {
  // If a logger is provided, use it; otherwise create a new one
  const dbLogger = createLogger(config.logger);
  
  dbLogger.info('Initializing database connection');
  
  // Database initialization code...
  
  dbLogger.success('Database connected successfully');
}

// Pass the existing logger
initializeDatabase({ 
  connectionString: 'postgres://localhost:5432/mydb',
  logger: baseLogger 
});
```

This pattern is particularly useful for dependency injection and for ensuring consistent logging throughout an application.

### Structured Logging with Additional Data

All logger methods accept additional arguments that can be used for structured logging:

```typescript
// Log with contextual data
logger.info('User profile updated', { 
  userId: 'user123', 
  changes: ['email', 'preferences'],
  source: 'web' 
});

// Log performance metrics
logger.debug('Query execution completed', { 
  duration: 125, // ms
  recordsReturned: 42,
  cacheHit: false
});

// Log errors with details
logger.error('Payment processing failed', {
  orderId: 'ORD-123456',
  amount: 99.99,
  currency: 'USD',
  errorCode: 'INSUFFICIENT_FUNDS'
});
```

## Error Handling with Result Types

The logger package includes special utilities for handling errors with [neverthrow](https://github.com/supermacro/neverthrow)'s Result and ResultAsync types, allowing you to log errors without interrupting the error handling flow.

### Logging Errors from Result

```typescript
import { logError } from '@doubletie/logger';
import { Result, err, ok } from 'neverthrow';
import type { BaseError } from '@doubletie/logger';

// Create a function that returns a Result
function validateUser(data: unknown): Result<User, BaseError> {
  if (!data || typeof data !== 'object') {
    return err({
      message: 'Invalid user data',
      code: 'INVALID_USER_DATA',
      data
    });
  }
  
  // Validation logic...
  
  return ok({ id: '123', name: 'John Doe' });
}

// Use the validation function and log any errors
function processUserData(data: unknown) {
  const logger = createLogger();
  
  // Log errors but continue the Result flow
  const result = logError(
    validateUser(data),
    logger,
    'User validation error:'
  );
  
  // Continue processing with the Result
  return result.match(
    (user) => {
      // Handle valid user
      logger.info('Processing user', { id: user.id });
      return user;
    },
    (error) => {
      // Handle error (already logged)
      return null;
    }
  );
}
```

### Logging Errors from ResultAsync

```typescript
import { logErrorAsync } from '@doubletie/logger';
import { ResultAsync } from 'neverthrow';

// Function that returns a ResultAsync
async function fetchUserData(userId: string): ResultAsync<UserData, BaseError> {
  // Fetch implementation...
}

// Log async errors
async function getUserProfile(userId: string) {
  const logger = createLogger();
  
  // Log errors but continue the ResultAsync flow
  const resultAsync = logErrorAsync(
    fetchUserData(userId),
    logger,
    'Error fetching user data:'
  );
  
  // Process the ResultAsync
  return await resultAsync.match(
    (userData) => {
      logger.info('User data retrieved successfully');
      return constructUserProfile(userData);
    },
    (error) => {
      // Error already logged by logErrorAsync
      return createDefaultProfile(userId);
    }
  );
}
```

## API Reference

### Types

#### `LogLevel`

```typescript
type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug';
```

The available log severity levels.

#### `LoggerOptions`

```typescript
interface LoggerOptions {
  /**
   * Whether logging is disabled.
   */
  disabled?: boolean;

  /**
   * The minimum log level to publish.
   * Only logs with this level or higher severity will be published.
   * Note that 'success' is treated as 'info' when using custom log handlers.
   */
  level?: Exclude<LogLevel, 'success'>;

  /**
   * Custom log handler function.
   * When provided, this function will be called instead of console methods.
   */
  log?: (
    level: Exclude<LogLevel, 'success'>,
    message: string,
    ...args: unknown[]
  ) => void;
  
  /**
   * Custom application name to display in log messages.
   * When provided, this will override the default app name in the log format.
   * 
   * @default '🪢 doubletie'
   */
  appName?: string;
}
```

#### `Logger`

```typescript
type Logger = Record<LogLevel, (message: string, ...args: unknown[]) => void>;
```

The logger interface with methods for each log level.

#### `BaseError`

```typescript
interface BaseError {
  /** The error message */
  message: string;
  
  /** Optional error code */
  code?: string | number;
  
  /** Optional HTTP status code */
  status?: number;
  
  /** Optional additional error data */
  data?: Record<string, unknown>;
  
  /** Optional error category */
  category?: string;
  
  /** Error stack trace */
  stack?: string;
}
```

The base interface for errors used with the logger.

### Functions

#### `createLogger`

```typescript
function createLogger(options?: LoggerOptions | Logger): Logger;
```

Creates a configured logger instance with methods for each log level.

- If passed an existing Logger instance, it will return that instance unchanged.
- If passed LoggerOptions, it will create a new logger with those options.
- If called with no arguments, it creates a logger with default settings (error level only).

#### `shouldPublishLog`

```typescript
function shouldPublishLog(currentLogLevel: LogLevel, logLevel: LogLevel): boolean;
```

Determines if a log message should be published based on configured log level.

- `currentLogLevel`: The configured threshold log level
- `logLevel`: The level of the message being evaluated
- Returns: Boolean indicating whether the message should be published

#### `logError`

```typescript
function logError<ValueType, ErrorType extends BaseError>(
  result: Result<ValueType, ErrorType>,
  logger: { error: (message: string, ...args: unknown[]) => void },
  messagePrefix?: string
): Result<ValueType, ErrorType>;
```

Logs any errors in a Result without changing the Result.

- `result`: The Result to check for errors
- `logger`: An object with an error method for logging
- `messagePrefix`: Optional prefix for the error message
- Returns: The original Result unchanged

#### `logErrorAsync`

```typescript
function logErrorAsync<ValueType, ErrorType extends BaseError>(
  resultAsync: ResultAsync<ValueType, ErrorType>,
  logger: { error: (message: string, ...args: unknown[]) => void },
  messagePrefix?: string
): ResultAsync<ValueType, ErrorType>;
```

Logs any errors in a ResultAsync without changing the ResultAsync.

- `resultAsync`: The ResultAsync to check for errors
- `logger`: An object with an error method for logging
- `messagePrefix`: Optional prefix for the error message
- Returns: The original ResultAsync unchanged

## Best Practices

### 1. Configure Log Levels by Environment

Adjust your log levels based on the environment:

```typescript
const logLevel = process.env.NODE_ENV === 'production' 
  ? 'error'  // Only log errors in production
  : process.env.NODE_ENV === 'test' 
    ? 'warn'   // Log warnings and errors in test
    : 'debug'; // Log everything in development

const logger = createLogger({ level: logLevel });
```

### 2. Use Structured Logging

Always include structured data as objects rather than string concatenation:

```typescript
// Instead of this:
logger.info(`User ${userId} logged in from ${ipAddress} at ${timestamp}`);

// Do this:
logger.info('User logged in', { 
  userId, 
  ipAddress, 
  timestamp: new Date().toISOString() 
});
```

This makes logs easier to parse, filter, and analyze.

### 3. Create Domain-Specific Loggers

Create specialized loggers for different components of your application:

```typescript
// Database logger
const dbLogger = createLogger({
  level: 'info',
  log: (level, message, ...args) => {
    const baseLogger = createLogger();
    baseLogger[level](`[DATABASE] ${message}`, ...args);
  }
});

// API logger
const apiLogger = createLogger({
  level: 'debug',
  log: (level, message, ...args) => {
    const baseLogger = createLogger();
    baseLogger[level](`[API] ${message}`, ...args);
  }
});
```

### 4. Avoid Logging Sensitive Information

Never log passwords, authentication tokens, or personally identifiable information:

```typescript
// BAD: Logging sensitive data
logger.debug('User credentials', { 
  username: 'john.doe', 
  password: 'secret123' // Don't log passwords!
});

// GOOD: Redact sensitive information
logger.debug('Login attempt', {
  username: 'john.doe',
  passwordProvided: true,
  timestamp: new Date().toISOString()
});
```

## Troubleshooting

### Common Issues

#### Logs Not Appearing

If your logs aren't showing up:

1. Check that your log level is correctly set. Remember that with `level: 'error'`, only error messages will be displayed.
2. Verify that `disabled` isn't set to `true`.
3. If using a custom log handler, ensure it's implemented correctly.

#### TypeScript Errors

If you encounter TypeScript errors:

```typescript
// If you get errors about Logger or LoggerOptions not being found
import type { Logger, LoggerOptions } from '@doubletie/logger';

// If you're extending BaseError and get errors
import type { BaseError } from '@doubletie/logger';

interface MyCustomError extends BaseError {
  // Your custom properties
  customField: string;
}
```

#### Performance Considerations

For high-volume logging in production:

1. Consider using a more efficient custom log handler that batches logs
2. Restrict log levels to only what's necessary
3. Use conditional logging for expensive operations:

```typescript
if (logger.shouldLog('debug')) {
  // Only prepare this data if debug logging is enabled
  const expensiveData = calculateExpensiveMetrics();
  logger.debug('Performance metrics', expensiveData);
}
```

## License

The DoubleTie Logger is licensed under the MIT License.

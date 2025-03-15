# DoubleTie Errors Package

A standardized error handling system for TypeScript applications. This package provides consistent error handling patterns, error codes, and utilities that make it easier to develop robust applications.

## Key Features

- A standardized error class (`DoubleTieError`) with rich context information
- Standard error codes categorized by domain and purpose
- Utilities for working with the Result pattern (using [neverthrow](https://github.com/supermacro/neverthrow))
- Recovery mechanisms for handling expected errors
- Pipeline patterns for common error handling scenarios
- Extensibility points for adding custom error types and codes

## Installation

```bash
npm install @doubletie/errors
```

## Package Structure

The errors package is organized into logical directories for better discoverability:

- **core/** - Core error functionality
  - **error-class.ts** - Defines the `DoubleTieError` class
  - **error-codes.ts** - Contains error code definitions and utilities
- **results/** - Result pattern utilities
  - **result-helpers.ts** - Utilities for working with the Result pattern
  - **recovery-utils.ts** - Contains utilities for recovering from expected errors
- **pipeline/** - Pipeline utilities
  - **validation-pipeline.ts** - Defines validation pipeline for input data
  - **retrieval-pipeline.ts** - Defines data retrieval pipeline
- **types.ts** - Shared type definitions
- **index.ts** - Main exports

## Usage

### Basic Error Handling

The most basic usage involves creating and throwing a `DoubleTieError`:

```typescript
import { DoubleTieError, ERROR_CODES } from '@doubletie/errors';

function getUserById(id: string) {
  const user = userRepository.findById(id);
  if (!user) {
    throw new DoubleTieError('User not found', {
      code: ERROR_CODES.NOT_FOUND, 
      status: 404,
      meta: { userId: id }
    });
  }
  return user;
}
```

### Working with Results

Using the Result pattern for error handling:

```typescript
import { 
  AppResult, 
  ok, 
  fail, 
  ERROR_CODES 
} from '@doubletie/errors';

function getUser(id: string): AppResult<User> {
  const user = users.find(u => u.id === id);
  if (!user) {
    return fail('User not found', {
      code: ERROR_CODES.NOT_FOUND,
      status: 404,
      meta: { userId: id }
    });
  }
  return ok(user);
}

// Using the result
const userResult = getUser('123');
if (userResult.isOk()) {
  const user = userResult.value;
  console.log(`Found user: ${user.name}`);
} else {
  const error = userResult.error;
  console.error(`Error: ${error.message} (${error.code})`);
}
```

### Async Operations with ResultAsync

For asynchronous operations:

```typescript
import { 
  AppResultAsync, 
  tryCatchAsync, 
  ERROR_CODES 
} from '@doubletie/errors';

async function fetchUserData(id: string): Promise<AppResultAsync<UserData>> {
  return tryCatchAsync(
    async () => {
      const response = await fetch(`/api/users/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.statusText}`);
      }
      return response.json();
    },
    ERROR_CODES.NETWORK_ERROR
  );
}

// Using the async result
const userDataResult = await fetchUserData('123');
if (userDataResult.isOk()) {
  const userData = userDataResult.value;
  console.log(`Found user: ${userData.name}`);
} else {
  const error = userDataResult.error;
  console.error(`Error: ${error.message} (${error.code})`);
}
```

### Converting Promises to Results

You can easily wrap promises with result handling:

```typescript
import { 
  promiseToResult, 
  ERROR_CODES 
} from '@doubletie/errors';

async function fetchData() {
  const resultAsync = promiseToResult(
    fetch('https://api.example.com/users')
      .then(res => res.json()),
    ERROR_CODES.NETWORK_ERROR
  );
  
  return resultAsync;
}
```

### Validation Pipelines

Creating validation pipelines with Zod:

```typescript
import { validationPipeline, ERROR_CODES } from '@doubletie/errors';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().min(18)
});

const validateUser = validationPipeline(
  userSchema,
  (data) => ({ ...data, createdAt: new Date() })
);

// Using the validation pipeline
const result = validateUser(req.body);
if (result.isOk()) {
  const validatedUser = result.value;
  // Proceed with validated user data
} else {
  // Handle validation error
  const validationErrors = result.error.meta?.validationErrors;
  res.status(400).json({ 
    error: result.error.message, 
    details: validationErrors 
  });
}
```

### Recovery Mechanisms

Recovering from expected errors with fallbacks:

```typescript
import { 
  withFallbackForCodes, 
  ERROR_CODES 
} from '@doubletie/errors';

const userResult = await getUserById(userId);
const safeUserResult = withFallbackForCodes(
  userResult,
  [ERROR_CODES.NOT_FOUND],
  { id: userId, name: 'Guest User', isDefault: true }
);

// Now safeUserResult will contain a default user object
// if the original error was NOT_FOUND
const user = safeUserResult.isOk() 
  ? safeUserResult.value 
  : handleOtherErrors(safeUserResult.error);
```

### Creating Custom Error Codes

You can extend the error system with your own domain-specific error codes:

```typescript
import { 
  createErrorCodes, 
  DoubleTieError 
} from '@doubletie/errors';

const BILLING_ERROR_CODES = createErrorCodes({
  PAYMENT_FAILED: 'Payment processing failed',
  INVOICE_NOT_FOUND: 'Invoice not found',
  INSUFFICIENT_FUNDS: 'Insufficient funds to complete transaction',
});

// Later in your code
throw new DoubleTieError('Credit card declined', {
  code: BILLING_ERROR_CODES.PAYMENT_FAILED,
  status: 400,
  meta: { 
    cardType: 'Visa',
    lastFour: '1234',
    transactionId: 'txn_123456'
  }
});
```

### Creating Domain-Specific Error Subclasses

For better error typing and handling:

```typescript
import { DoubleTieError } from '@doubletie/errors';
import { BILLING_ERROR_CODES } from './billing-errors';

const BillingError = DoubleTieError.createSubclass('BillingError');

// Later in your code
throw new BillingError('Failed to process payment', {
  code: BILLING_ERROR_CODES.PAYMENT_FAILED,
  status: 400,
  meta: { transactionId: 'txn_123456' }
});

// Type checking
try {
  await processPayment();
} catch (error) {
  if (error instanceof BillingError) {
    // Handle billing-specific errors
  } else if (error instanceof DoubleTieError) {
    // Handle other DoubleTie errors
  } else {
    // Handle unknown errors
  }
}
```

## Error Categories

Errors are organized into categories for better management:

- **validation** - Errors related to input validation
- **authorization** - Errors related to authentication and permissions
- **storage** - Errors related to data storage and retrieval
- **network** - Errors related to network operations
- **plugin** - Errors related to plugin management
- **configuration** - Errors related to configuration issues
- **unexpected** - Unexpected errors that don't fit other categories

You can create your own categories with the `createErrorCategories` utility.

## API Reference

### Types

#### `AppResult<T>` (renamed from `DoubleTieResult`)

```typescript
type AppResult<T> = Result<T, DoubleTieError>;
```

#### `AppResultAsync<T>` (renamed from `DoubleTieResultAsync`)

```typescript
type AppResultAsync<T> = ResultAsync<T, DoubleTieError>;
```

#### `ErrorCodeValue` (renamed from `ErrorMessage`)

```typescript
type ErrorCodeValue = string;
```

#### `ErrorTransformer` (renamed from `ErrorMapper`)

```typescript
type ErrorTransformer = (error: Error) => DoubleTieError;
```

### Core Functions

#### Result Helpers

```typescript
function ok<T>(value: T): AppResult<T>;
function fail<T>(message: string, options: DoubleTieErrorOptions): AppResult<T>;
function tryCatch<T>(fn: () => T, errorCode?: ErrorCodeValue): AppResult<T>;
function tryCatchAsync<T>(fn: () => Promise<T>, errorCode?: ErrorCodeValue): AppResultAsync<T>;
function promiseToResult<T>(promise: Promise<T>, errorCode?: ErrorCodeValue): AppResultAsync<T>;
```

#### Recovery Utilities

```typescript
function withFallbackForCodes<T>(result: AppResult<T>, codes: ErrorCodeValue[], defaultValue: T): AppResult<T>;
function withFallbackForCategory<T>(result: AppResult<T>, category: string, defaultValue: T): AppResult<T>;
```

#### Pipeline Utilities

```typescript
function validationPipeline<Input, Output>(schema: ZodSchema<Input>, transformer: (data: Input) => Output): (data: unknown) => AppResult<Output>;
function retrievalPipeline<RawData, TransformedData>(fetcher: () => Promise<RawData>, transformer: (data: RawData) => TransformedData, errorCode?: ErrorCodeValue): () => AppResultAsync<TransformedData>;
```

## Testing

The errors package includes comprehensive tests to ensure reliability. Run tests with:

```bash
cd packages/backend
npx vitest run src/pkgs/errors
```

## License

MIT 
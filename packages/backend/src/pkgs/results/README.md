# DoubleTie Results Package

A comprehensive outcome handling system for TypeScript applications. This package provides consistent patterns for managing both successful results and errors, making it easier to develop robust, predictable applications.

## Key Features

- Complete implementation of the Result pattern (built on [neverthrow](https://github.com/supermacro/neverthrow))
- A standardized error class (`DoubleTieError`) with rich context information
- Standard error codes categorized by domain and purpose
- Recovery mechanisms for handling expected errors
- Processing pipelines for validation and data retrieval
- Extensibility points for custom error types and domain-specific results

## Installation

```bash
npm install @doubletie/results
```

## Package Structure

The results package is organized into logical directories for better discoverability:

- **core/** - Core functionality
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

### Working with Results

Using the Result pattern for comprehensive outcome handling:

```typescript
import { 
  AppResult, 
  ok, 
  fail, 
  ERROR_CODES 
} from '@doubletie/results';

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
} from '@doubletie/results';

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
} from '@doubletie/results';

async function fetchData() {
  const resultAsync = promiseToResult(
    fetch('https://api.example.com/users')
      .then(res => res.json()),
    ERROR_CODES.NETWORK_ERROR
  );
  
  return resultAsync;
}
```

### Error Handling

The package provides a standardized error class for consistent error handling:

```typescript
import { DoubleTieError, ERROR_CODES } from '@doubletie/results';

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

### Validation Pipelines

Creating validation pipelines with Zod:

```typescript
import { validationPipeline, ERROR_CODES } from '@doubletie/results';
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
} from '@doubletie/results';

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
} from '@doubletie/results';

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
import { DoubleTieError } from '@doubletie/results';
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

#### `AppResult<T>`

```typescript
type AppResult<T> = Result<T, DoubleTieError>;
```

#### `AppResultAsync<T>`

```typescript
type AppResultAsync<T> = ResultAsync<T, DoubleTieError>;
```

#### `ErrorCodeValue`

```typescript
type ErrorCodeValue = string;
```

#### `ErrorTransformer`

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

The results package includes comprehensive tests to ensure reliability. Run tests with:

```bash
cd packages/backend
npx vitest run src/pkgs/results
```

## License

MIT 
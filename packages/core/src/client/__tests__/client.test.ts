/**
 * This file is maintained for backward compatibility.
 * The tests have been split into separate files matching the source files:
 * - client-factory.test.ts - Tests for the client factory
 * - client-c15t.test.ts - Tests for the C15t client implementation
 * - client-offline.test.ts - Tests for the offline client implementation
 * - client-custom.test.ts - Tests for the custom client implementation
 *
 * Each test file is focused on testing a specific implementation, making
 * the tests more maintainable and easier to understand.
 */

// This file is kept for backward compatibility and to avoid breaking CI
// Import specific tests from their dedicated files
import './client-factory.test.ts';
import './client-c15t.test.ts';
import './client-offline.test.ts';
import './client-custom.test.ts';

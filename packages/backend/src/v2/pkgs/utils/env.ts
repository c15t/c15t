/**
 * Environment variables object
 *
 * Provides access to environment variables in a way that works in both
 * browser and Node.js environments. In Node.js, this will be process.env,
 * and in browsers, it will be an empty object.
 *
 * @returns An object containing environment variables accessible in the current runtime
 *
 * @example
 * ```ts
 * // Access an environment variable
 * const apiKey = env.API_KEY;
 * ```
 */
export const env = typeof process !== 'undefined' ? process.env : {};

/**
 * Determines if the application is running in production mode
 *
 * Checks if NODE_ENV is set to 'production'. This is useful for
 * conditionally enabling or disabling features based on the environment.
 *
 * @returns Boolean indicating whether the application is running in production mode
 *
 * @example
 * ```ts
 * // Conditionally execute code based on environment
 * if (isProduction) {
 *   // Production-only code
 * }
 * ```
 */
export const isProduction =
	typeof process !== 'undefined' && process.env.NODE_ENV === 'production';

/**
 * Converts a string or boolean value to a boolean
 *
 * @param val - The value to convert to boolean
 * @returns `false` if the value is falsy or the string 'false', otherwise `true`
 *
 * @example
 * ```ts
 * toBoolean('true'); // true
 * toBoolean('false'); // false
 * toBoolean(undefined); // false
 * toBoolean(true); // true
 * ```
 *
 * @internal Used for environment variable parsing
 */
function toBoolean(val: boolean | string | undefined) {
	return val ? val !== 'false' : false;
}

/**
 * The current Node.js environment value
 *
 * Retrieves the NODE_ENV environment variable value if available,
 * otherwise returns an empty string.
 *
 * @returns The current NODE_ENV value or empty string if not set
 */
export const nodeENV =
	(typeof process !== 'undefined' && process.env && process.env.NODE_ENV) || '';

/**
 * Determines if the application is running in test mode
 *
 * Checks if NODE_ENV is set to 'test' or if the TEST environment
 * variable is truthy and not 'false'.
 *
 * @returns Boolean indicating whether the application is running in test mode
 *
 * @example
 * ```ts
 * // Skip expensive operations in tests
 * if (!isTest) {
 *   runExpensiveOperation();
 * }
 * ```
 */
export const isTest = nodeENV === 'test' || toBoolean(env.TEST);

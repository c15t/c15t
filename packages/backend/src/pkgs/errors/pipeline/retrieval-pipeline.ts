import { ResultAsync } from 'neverthrow';
import { DoubleTieError } from '../core/error-class';
import { ERROR_CODES } from '../core/error-codes';
import type { ErrorMessageType, SDKResultAsync } from '../types';

/**
 * Creates a retrieval pipeline that fetches data asynchronously and transforms it.
 * Handles errors in a standardized way.
 *
 * @template TRawData - Type of the raw data fetched from the source
 * @template TTransformedData - Type of the data after transformation
 *
 * @param fetcher - Async function that fetches the raw data
 * @param transformer - Function that transforms the raw data
 * @param errorCode - Error code to use if the fetcher throws (defaults to NOT_FOUND)
 * @returns A function that returns a ResultAsync with the transformed data or an error
 *
 * @example
 * ```typescript
 * import { retrievalPipeline, ERROR_CODES } from '@doubletie/errors';
 *
 * const getUserById = retrievalPipeline(
 *   async () => await db.users.findUnique({ where: { id } }),
 *   (user) => ({ ...user, fullName: `${user.firstName} ${user.lastName}` }),
 *   ERROR_CODES.NOT_FOUND
 * );
 *
 * const result = await getUserById();
 * if (result.isOk()) {
 *   // data is fetched and transformed
 *   const user = result.value;
 * } else {
 *   // handle error
 *   const error = result.error;
 * }
 * ```
 */
export const retrievalPipeline = <TRawData, TTransformedData>(
	fetcher: () => Promise<TRawData>,
	transformer: (data: TRawData) => TTransformedData,
	errorCode: ErrorMessageType = ERROR_CODES.NOT_FOUND
): (() => SDKResultAsync<TTransformedData>) => {
	return () => {
		return ResultAsync.fromPromise(
			fetcher().then((data) => {
				// Check if data is null or undefined
				if (data === null || data === undefined) {
					throw new Error('Resource not found');
				}

				return transformer(data);
			}),
			(error): DoubleTieError => {
				// Determine if this is a not found error or something else
				const isNotFound =
					error instanceof Error &&
					(error.message.includes('not found') ||
						error.message.includes('Not found') ||
						error.message.includes('does not exist'));

				if (isNotFound) {
					return new DoubleTieError('Resource not found', {
						code: errorCode,
						status: 404,
						cause: error instanceof Error ? error : undefined,
					});
				}

				return new DoubleTieError('Failed to retrieve resource', {
					code: ERROR_CODES.BAD_REQUEST,
					status: 400,
					cause: error instanceof Error ? error : undefined,
				});
			}
		);
	};
};

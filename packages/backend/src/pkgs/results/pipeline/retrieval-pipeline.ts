import { ResultAsync } from 'neverthrow';
import { DoubleTieError } from '../core/error-class';
import { ERROR_CODES } from '../core/error-codes';
import type { ErrorMessageType, SDKResultAsync } from '../types';

/**
 * Creates a retrieval pipeline that fetches data asynchronously and transforms it.
 * Handles errors in a standardized way and includes null/undefined checks.
 *
 * @template TRawData - Type of the raw data fetched from the source
 * @template TTransformedData - Type of the data after transformation
 *
 * @param fetcher - Async function that fetches the raw data
 * @param transformer - Function that transforms the raw data
 * @param errorCode - Error code to use if the fetcher throws (defaults to NOT_FOUND)
 * @returns A function that returns a ResultAsync with the transformed data or an error
 * 
 * @remarks
 * This function implements a common pattern for retrieving and transforming data from
 * external sources like databases, APIs, or file systems. It handles:
 * 
 * 1. Asynchronous data fetching with proper error handling
 * 2. Null/undefined checks to detect missing resources
 * 3. Data transformation to convert raw data to the desired format
 * 4. Standardized error creation with appropriate error codes and metadata
 * 
 * The pipeline is particularly useful for:
 * - Database queries where records might not exist
 * - API calls that may fail or return empty results
 * - File system operations where files might be missing
 * 
 * @see ERROR_CODES.NOT_FOUND for the default error code used when resources are missing
 * @see validationPipeline for handling data validation
 * 
 * @example
 * ```typescript
 * import { retrievalPipeline, ERROR_CODES } from '@doubletie/results';
 * import { db } from './database';
 * 
 * // Define types for raw and transformed data
 * interface UserRecord {
 *   id: string;
 *   first_name: string;
 *   last_name: string;
 *   email: string;
 *   created_at: string;
 * }
 * 
 * interface User {
 *   id: string;
 *   fullName: string;
 *   email: string;
 *   createdAt: Date;
 * }
 * 
 * // Create a retrieval pipeline for fetching users
 * const getUserById = (userId: string) => {
 *   return retrievalPipeline<UserRecord, User>(
 *     // Fetcher function to get raw data
 *     async () => {
 *       return await db.users.findUnique({ 
 *         where: { id: userId } 
 *       });
 *     },
 *     
 *     // Transformer function to format the data
 *     (record) => ({
 *       id: record.id,
 *       fullName: `${record.first_name} ${record.last_name}`,
 *       email: record.email,
 *       createdAt: new Date(record.created_at)
 *     }),
 *     
 *     // Custom error code for this specific resource type
 *     ERROR_CODES.USER_NOT_FOUND
 *   );
 * };
 * 
 * // Using the pipeline
 * async function handleUserRequest(req, res) {
 *   const userId = req.params.id;
 *   
 *   const userResult = await getUserById(userId)();
 *   
 *   return userResult.match(
 *     (user) => {
 *       // Successfully retrieved and transformed the user
 *       return res.json(user);
 *     },
 *     (error) => {
 *       // Handle the error based on its code
 *       if (error.code === ERROR_CODES.USER_NOT_FOUND) {
 *         return res.status(404).json({ error: `User ${userId} not found` });
 *       }
 *       
 *       // Handle other errors
 *       console.error(`Error fetching user:`, error);
 *       return res.status(error.status).json({ error: error.message });
 *     }
 *   );
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
			fetcher()
				.then((data) => {
					// Check if data is null or undefined
					if (data === null || data === undefined) {
						throw new Error('Resource not found');
					}

					try {
						// Transform the data (wrapping in try/catch to handle transformer errors)
						return transformer(data);
					} catch (transformerError) {
						// Explicitly handle transformer errors as BAD_REQUEST
						throw new DoubleTieError(
							transformerError instanceof Error
								? transformerError.message
								: 'Error transforming data',
							{
								code: ERROR_CODES.BAD_REQUEST,
								status: 400,
								cause: transformerError instanceof Error ? transformerError : undefined,
							}
						);
					}
				}),
			(error) => {
				// If the error is already a DoubleTieError, return it directly
				if (error instanceof DoubleTieError) {
					return error;
				}

				// Check if this is a custom error code or a standard one
				const useCustomErrorCode = errorCode !== ERROR_CODES.NOT_FOUND;

				// If a custom error code is provided, always use it
				if (useCustomErrorCode) {
					return new DoubleTieError(
						error instanceof Error ? error.message : 'Failed to retrieve resource',
						{
							code: errorCode,
							status: 400, // Custom codes default to 400
							cause: error instanceof Error ? error : undefined,
						}
					);
				}
				
				// Handle standard error cases
				const isNotFoundError = error instanceof Error && 
					error.message.toLowerCase().includes('not found');
				
				// Use specific error code based on error type
				if (isNotFoundError) {
					// Not found errors
					return new DoubleTieError(error.message, {
						code: ERROR_CODES.NOT_FOUND,
						status: 404,
						cause: error,
					});
				} else {
					// All other errors use BAD_REQUEST
					return new DoubleTieError(
						error instanceof Error ? error.message : 'Failed to retrieve resource',
						{
							code: ERROR_CODES.BAD_REQUEST, 
							status: 400,
							cause: error instanceof Error ? error : undefined,
						}
					);
				}
			}
		);
	};
};

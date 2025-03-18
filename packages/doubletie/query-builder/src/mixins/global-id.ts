/**
 * Provides Global ID functionality for models
 *
 * @module globalId
 */
import type { NoResultError, SelectType } from 'kysely';
import type { ModelFunctions } from '../model';

/**
 * Type for ID parsing callback
 *
 * @typeParam TIdType - Type of ID after parsing
 */
type ParseCallback<TIdType> = (id: string) => TIdType;

/**
 * Decodes a global ID into its type and local ID
 *
 * @typeParam TIdType - Type of ID after parsing
 * @param globalId - Global ID to decode
 * @param parse - Function to parse the ID portion
 * @returns Object containing type and parsed ID
 * @throws {Error} If the global ID format is invalid
 */
export function decodeFromGlobalId<TIdType>(
	globalId: string,
	parse: ParseCallback<TIdType>
): { type: string; id: TIdType } {
	try {
		const [type, rawId] = globalId.split('_');

		if (!type || !rawId) {
			throw new Error('Invalid global ID format');
		}

		return { type, id: parse(rawId) };
	} catch (error) {
		throw new Error(
			`Error decoding global ID: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

/**
 * Extracts just the type portion from a global ID
 *
 * @param globalId - Global ID to decode
 * @returns The type portion of the global ID or null if invalid
 */
export function decodeTypeFromGlobalId(globalId: string): string | null {
	if (!globalId || typeof globalId !== 'string') {
		return null;
	}

	const parts = globalId.split('_');
	return parts[0] ?? null;
}

/**
 * Returns enhanced model with global ID functionality
 *
 * @typeParam TDatabase - Database schema type
 * @typeParam TTableName - Table name in the database
 * @typeParam TIdColumnName - ID column name in the table
 * @typeParam TIdType - The type of ID (usually string or number)
 *
 * @param model - The base model to enhance
 * @param idColumnName - Name of the ID column or parser function
 * @param type - Global ID type prefix (e.g., "USER" for "USER_123")
 * @returns Enhanced model with global ID capabilities
 */
export function withGlobalId<
	TDatabase,
	TTableName extends keyof TDatabase & string,
	TIdColumnName extends keyof TDatabase[TTableName] & string,
	TIdType extends SelectType<TDatabase[TTableName][TIdColumnName]> = SelectType<
		TDatabase[TTableName][TIdColumnName]
	>,
>(
	model: ModelFunctions<TDatabase, TTableName, TIdColumnName>,
	idColumnName: TIdColumnName,
	type?: string
): ModelFunctions<TDatabase, TTableName, TIdColumnName> & {
	globalIdType: string;
	getGlobalId(id: TIdType | string | number): string;
	getLocalId(globalId: string): TIdType;
	parseGlobalId(globalId: string | null | undefined): TIdType | string | null;
	findByGlobalId(
		globalId: string,
		options?: { throwIfNotFound?: boolean; error?: typeof NoResultError }
	): Promise<any>;
	getByGlobalId(globalId: string, error?: typeof NoResultError): Promise<any>;
	findByGlobalIds(globalIds: string[]): Promise<any[]>;
} {
	// Handle string IDs directly, or use custom parser
	const parseId: ParseCallback<TIdType> =
		typeof idColumnName === 'function'
			? (idColumnName as unknown as ParseCallback<TIdType>)
			: (id: string) => id as unknown as TIdType;

	// Default to using the table name if no type provided
	const globalIdType = type || model.table.toUpperCase();

	return {
		...model,

		/**
		 * Type prefix used for global IDs
		 */
		globalIdType,

		/**
		 * Generates a global ID from a local ID
		 *
		 * @param id - Local ID to convert
		 * @returns Global ID
		 */
		getGlobalId(id: TIdType | string | number): string {
			return `${globalIdType}_${id}`;
		},

		/**
		 * Extracts the local ID from a global ID
		 *
		 * @param globalId - Global ID to convert
		 * @returns Local ID
		 */
		getLocalId(globalId: string): TIdType {
			try {
				const parts = globalId.split('_');
				if (parts.length !== 2 || parts[0] !== globalIdType) {
					throw new Error(`Invalid global ID format: ${globalId}`);
				}
				return parseId(parts[1] as string);
			} catch (error) {
				throw new Error(`Invalid global ID format: ${globalId}`);
			}
		},

		/**
		 * Parses a global ID into its components and extracts just the ID part
		 *
		 * @param globalId - Global ID to parse
		 * @returns The ID portion of the global ID (without the type prefix), or the original string if invalid
		 */
		parseGlobalId(
			globalId: string | null | undefined
		): TIdType | string | null {
			if (!globalId) return null;
			if (typeof globalId !== 'string' || globalId.trim() === '') return null;

			try {
				const parts = globalId.split('_');
				if (parts.length === 2) {
					// Extract the ID part (after the underscore)
					return parseId(parts[1] as string);
				}

				// If it doesn't match our format, return the original string
				return globalId;
			} catch (error) {
				return globalId;
			}
		},

		/**
		 * Finds a record by its global ID
		 *
		 * @param globalId - Global ID to search for
		 * @param options - Optional find options
		 * @returns Found record or undefined
		 */
		findByGlobalId(
			globalId: string,
			options?: {
				throwIfNotFound?: boolean;
				error?: typeof NoResultError;
			}
		) {
			try {
				const parts = globalId.split('_');
				if (parts.length !== 2) {
					throw new Error(`Invalid global ID format: ${globalId}`);
				}

				const [type, rawId] = parts;

				// Check if the type matches
				if (type !== globalIdType) {
					throw new Error(
						`Global ID type mismatch: expected ${globalIdType}, got ${type}`
					);
				}

				return model.findById(parseId(rawId as string), undefined, options);
			} catch (error) {
				if (options?.throwIfNotFound) {
					throw error;
				}
				return Promise.resolve(undefined);
			}
		},

		/**
		 * Gets a record by its global ID (throws if not found)
		 *
		 * @param globalId - Global ID to search for
		 * @param error - Custom error to throw if not found
		 * @returns Found record
		 * @throws {NoResultError} If record not found
		 */
		getByGlobalId(globalId: string, error?: typeof NoResultError) {
			return this.findByGlobalId(globalId, {
				throwIfNotFound: true,
				error,
			});
		},

		/**
		 * Finds multiple records by their global IDs
		 *
		 * @param globalIds - Array of global IDs to search for
		 * @returns Array of found records
		 */
		findByGlobalIds(globalIds: string[]) {
			const ids = globalIds
				.map((gid) => {
					try {
						const parts = gid.split('_');
						if (parts.length !== 2) return null;

						const [type, rawId] = parts;
						if (type !== globalIdType) return null;

						return parseId(rawId as string);
					} catch (error) {
						return null;
					}
				})
				.filter((id): id is TIdType => id !== null);

			if (ids.length === 0) return Promise.resolve([]);

			return model.findByIds(ids);
		},
	};
}

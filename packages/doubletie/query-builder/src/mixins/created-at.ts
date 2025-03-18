import type {
	ModelFunctions,
	InsertObjectOrList as ModelInsertObjectOrList,
} from '../model';
import type { DrainOuterGeneric } from '../utils/type-utils';

/**
 * Enhances a model with automatic created_at timestamp functionality
 *
 * @typeParam TDatabase - Database schema type
 * @typeParam TTableName - Table name in the database
 * @typeParam TIdColumnName - Name of the ID column
 *
 * @param model - Base model to enhance
 * @param field - Name of the created_at field
 * @returns Enhanced model with created_at functionality
 */
export default function withCreatedAt<
	TDatabase,
	TTableName extends keyof TDatabase & string,
	TIdColumnName extends keyof TDatabase[TTableName] & string,
>(
	model: ModelFunctions<TDatabase, TTableName, TIdColumnName>,
	field: keyof TDatabase[TTableName] & string
): DrainOuterGeneric<
	ModelFunctions<TDatabase, TTableName, TIdColumnName> & {
		processDataBeforeInsert<
			T extends ModelInsertObjectOrList<TDatabase, TTableName>,
		>(
			data: T
		): T extends any[]
			? Array<T[number] & { [K in typeof field]: Date }>
			: T & { [K in typeof field]: Date };
	}
> {
	// Get the original processDataBeforeInsert function to extend
	const originalProcessDataBeforeInsert =
		model.processDataBeforeInsert || ((data) => data);

	// Return a new object with the added functionality
	return {
		...model,

		/**
		 * Adds a timestamp to the data before insertion
		 *
		 * This adds a created_at timestamp to all inserted records if
		 * they don't already have one.
		 *
		 * @param data - Data to process before insert
		 * @returns The processed data with added timestamp
		 */
		processDataBeforeInsert<
			T extends ModelInsertObjectOrList<TDatabase, TTableName>,
		>(
			data: T
		): T extends any[]
			? Array<T[number] & { [K in typeof field]: Date }>
			: T & { [K in typeof field]: Date } {
			// Process with original method first
			const processedData = originalProcessDataBeforeInsert(data);

			// Add timestamp to single object or each object in array
			const timestamp = new Date();

			if (Array.isArray(processedData)) {
				return processedData.map((item) => ({
					...item,
					[field]: (item as any)[field] ?? timestamp,
				})) as T extends any[]
					? Array<T[number] & { [K in typeof field]: Date }>
					: T & { [K in typeof field]: Date };
			}

			return {
				...processedData,
				[field]: (processedData as any)[field] ?? timestamp,
			} as T extends any[]
				? Array<T[number] & { [K in typeof field]: Date }>
				: T & { [K in typeof field]: Date };
		},
	};
}

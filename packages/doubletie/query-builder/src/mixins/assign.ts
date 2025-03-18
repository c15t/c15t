import type { Selectable } from 'kysely';
import type { ModelFunctions } from '../model';
import type { DrainOuterGeneric } from '../utils/type-utils';

/**
 * Type for a model with assign functionality
 */
export interface ModelWithAssign<
	TDatabase,
	TTableName extends keyof TDatabase & string,
	TIdColumnName extends keyof TDatabase[TTableName] & string,
> extends DrainOuterGeneric<
		ModelFunctions<TDatabase, TTableName, TIdColumnName> & {
			/**
			 * Assigns data values to the model instance
			 *
			 * @param data - Data to assign (can be partial)
			 * @returns Model instance with assigned data and all model properties
			 */
			assign(data?: Partial<Selectable<TDatabase[TTableName]>>): any;
		}
	> {}

/**
 * Enhances a model with data assignment functionality
 *
 * @typeParam TDatabase - Database schema type
 * @typeParam TTableName - Table name in the database
 * @typeParam TIdColumnName - Name of the ID column
 *
 * @param model - Base model to enhance
 * @returns Enhanced model with assign functionality
 */
export default function withAssign<
	TDatabase,
	TTableName extends keyof TDatabase & string,
	TIdColumnName extends keyof TDatabase[TTableName] & string,
>(
	model: ModelFunctions<TDatabase, TTableName, TIdColumnName>
): ModelWithAssign<TDatabase, TTableName, TIdColumnName> {
	return {
		...model,

		/**
		 * Assigns data values to the model instance
		 *
		 * @param data - Data to assign (can be partial)
		 * @returns Model instance with assigned data
		 */
		assign(data?: Partial<Selectable<TDatabase[TTableName]>>) {
			// Create a new object with all the model properties
			const instance = { ...this };

			// Assign all data properties to the instance
			if (data) {
				Object.assign(instance, data);
			}

			return instance;
		},
	};
}

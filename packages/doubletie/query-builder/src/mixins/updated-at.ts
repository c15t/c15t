import type { OperandValueExpressionOrList, SelectType } from 'kysely';

import type { ModelFunctions, UpdateObjectExpression } from '../model';

/**
 * Type for the enhanced model with updateById method
 */
type ModelWithUpdateById<
	TDatabase,
	TTableName extends keyof TDatabase & string,
	TIdColumnName extends keyof TDatabase[TTableName] & string,
> = ModelFunctions<TDatabase, TTableName, TIdColumnName> & {
	updateById: <TColumnName extends keyof TDatabase[TTableName] & string>(
		id: Readonly<SelectType<TDatabase[TTableName][TIdColumnName]>>,
		column: TColumnName,
		value: TDatabase[TTableName][TColumnName]
	) => Promise<any>;
};

/**
 * Converts a Date object to an ISO string for SQLite compatibility
 */
function formatDateForSqlite(date: Date): string {
	return date.toISOString();
}

/**
 * Enhances a model with automatic updated_at timestamp functionality
 *
 * @typeParam TDatabase - Database schema type
 * @typeParam TTableName - Table name in the database
 * @typeParam TIdColumnName - Name of the ID column
 *
 * @param model - Base model to enhance
 * @param field - Name of the updated_at field
 * @returns Enhanced model with updated_at functionality
 */
export default function withUpdatedAt<
	TDatabase,
	TTableName extends keyof TDatabase & string,
	TIdColumnName extends keyof TDatabase[TTableName] & string,
>(
	model: ModelFunctions<TDatabase, TTableName, TIdColumnName>,
	field: keyof TDatabase[TTableName] & string
): ModelWithUpdateById<TDatabase, TTableName, TIdColumnName> {
	// Save the original processDataBeforeUpdate function
	const originalProcessDataBeforeUpdate =
		model.processDataBeforeUpdate ||
		((data: UpdateObjectExpression<TDatabase, TTableName>) => data);

	// Add a method to easily update a record with automatic timestamp
	const updateById = async <
		TColumnName extends keyof TDatabase[TTableName] & string,
	>(
		id: OperandValueExpressionOrList<TDatabase, TTableName, TIdColumnName>,
		column: TColumnName,
		value: TDatabase[TTableName][TColumnName]
	) => {
		// Use current timestamp formatted for SQLite
		const now = new Date();
		const sqliteDate = formatDateForSqlite(now);

		// Create a query builder and use a callback for the where clause
		const query = model
			.updateTable()
			.where((eb) => {
				return eb(model.id, '=', id);
			})
			.set({
				[column]: value,
				[field]: sqliteDate,
			} as any);

		// Execute the query and return the result
		return query.returningAll().executeTakeFirstOrThrow();
	};

	// Create enhanced model
	const enhancedModel = {
		...model,
		// Override processDataBeforeUpdate to add the timestamp
		processDataBeforeUpdate: (data) => {
			// Process with original function first
			const processedData = originalProcessDataBeforeUpdate(data as any);

			// Add the updated_at timestamp formatted for SQLite
			const now = new Date();
			const sqliteDate = formatDateForSqlite(now);

			return {
				...processedData,
				[field]: sqliteDate,
			} as any;
		},

		// Override updateTable to ensure the timestamp is set
		updateTable: () => {
			const originalUpdateTable = model.updateTable();
			const originalSet = originalUpdateTable.set;

			// Create a proxy to intercept the set method
			const proxy = new Proxy(originalUpdateTable, {
				get(target, prop) {
					if (prop === 'set') {
						// Return a custom set function
						return (data: any) => {
							// Add the updated_at timestamp
							const now = new Date();
							const sqliteDate = formatDateForSqlite(now);

							const updatedData = {
								...data,
								[field]: sqliteDate,
							};

							// Call the original set method with our modified data
							return originalSet.call(target, updatedData, field);
						};
					}

					// For all other properties, return the original
					return Reflect.get(target, prop);
				},
			});

			return proxy;
		},

		// Add the new direct update method
		updateById,
	} as ModelWithUpdateById<TDatabase, TTableName, TIdColumnName>;

	return enhancedModel;
}

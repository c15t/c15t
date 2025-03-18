/**
 * Slug generation mixin for models
 *
 * @module slug
 */
import slugify from 'url-slug';
import type { ModelFunctions } from '../model';
import type { DrainOuterGeneric } from '../utils/type-utils';

import type {
	InsertObject,
	OperandValueExpressionOrList,
	SelectType,
	Selectable,
	UpdateObject,
} from 'kysely';

/**
 * Type alias for insert objects or arrays of insert objects
 */
type InsertObjectOrList<TDatabase, TTableName extends keyof TDatabase> =
	| InsertObject<TDatabase, TTableName>
	| Array<InsertObject<TDatabase, TTableName>>;

/**
 * Available slug operations
 */
const Operation = {
	/** Convert to lowercase */
	LOWERCASE: 'lowercase',
	/** Convert to uppercase */
	UPPERCASE: 'uppercase',
	/** Capitalize first letter of each word */
	CAPITALIZE: 'capitalize',
} as const;

/**
 * Type for slug operations
 */
export type Operation = (typeof Operation)[keyof typeof Operation];

/**
 * Options for slug generation
 */
export type SlugOptions = {
	/** Separator to use between words */
	separator?: string;
	/** Maximum length to truncate slugs */
	truncate?: number;
	/** Dictionary of words to replace */
	dictionary?: Record<string, string>;
};

/**
 * Configuration options for the slug mixin
 *
 * @typeParam TDatabase - Database schema type
 * @typeParam TTableName - Table name in the database
 */
export type Options<TDatabase, TTableName extends keyof TDatabase> = {
	/** Field to store the slug */
	field: keyof TDatabase[TTableName] & string;
	/** Source fields to generate slug from */
	sources: Array<keyof TDatabase[TTableName] & string>;
	/** Operation to apply to the slug */
	operation?: Operation;
	/** Additional slug options */
	slugOptions?: SlugOptions;
};

/**
 * Type for values that can be inserted or updated
 *
 * @typeParam TDatabase - Database schema type
 * @typeParam TTableName - Table name in the database
 */
export type TableValues<
	TDatabase,
	TTableName extends keyof TDatabase,
> = Partial<Record<keyof TDatabase[TTableName] & string, unknown>>;

/**
 * Type guard to check if a value is a string
 *
 * @param value - Value to check
 * @returns Whether the value is a string
 */
function isString(value: unknown): value is string {
	return typeof value === 'string';
}

/**
 * Generates a slug value from data using the provided options
 *
 * @typeParam TDatabase - Database schema type
 * @typeParam TTableName - Table name in the database
 * @param data - Source data for generating the slug
 * @param options - Slug generation options
 * @returns Generated slug string or undefined if no source data
 */
function generateSlugValue<TDatabase, TTableName extends keyof TDatabase>(
	data: TableValues<TDatabase, TTableName>,
	options: Options<TDatabase, TTableName>
): string | undefined {
	const { field, sources, operation, slugOptions = {} } = options;
	const { separator = '-', truncate, dictionary } = slugOptions;

	// Skip if data already has a valid slug
	const fieldValue = data[field];
	if (isString(fieldValue) && fieldValue !== '') {
		return fieldValue;
	}

	// Collect values from source fields
	const values: string[] = [];
	for (const source of sources) {
		const value = data[source];
		if (value != null && String(value).trim() !== '') {
			values.push(String(value));
		}
	}

	if (values.length === 0) {
		return undefined;
	}

	// Generate the initial slug
	let slug = slugify(values.join(' '), { separator });

	// Apply dictionary replacements
	if (dictionary) {
		for (const [search, replace] of Object.entries(dictionary)) {
			slug = slug.replace(new RegExp(search, 'gi'), replace);
		}
	}

	// Apply operation
	if (operation) {
		// biome-ignore lint/style/useDefaultSwitchClause: <explanation>
		switch (operation) {
			case Operation.LOWERCASE:
				slug = slug.toLowerCase();
				break;
			case Operation.UPPERCASE:
				slug = slug.toUpperCase();
				break;
			case Operation.CAPITALIZE:
				slug = slug
					.split(separator)
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
					.join(separator);
				break;
		}
	}

	// Truncate if needed
	if (truncate && slug.length > truncate) {
		slug = slug.substring(0, truncate);
	}

	return slug;
}

/**
 * Type for the enhanced model with slug functionality
 */
export type SlugModelType<
	TDatabase,
	TTableName extends keyof TDatabase & string,
	TIdColumnName extends keyof TDatabase[TTableName] & string,
> = DrainOuterGeneric<
	ModelFunctions<TDatabase, TTableName, TIdColumnName> & {
		findBySlug(
			value: string,
			column?: keyof TDatabase[TTableName] & string
		): Promise<Selectable<TDatabase[TTableName]> | undefined>;
		insertWithSlug(
			values: TableValues<TDatabase, TTableName>
		): Promise<Selectable<TDatabase[TTableName]>>;
		insertIfNotExistsWithSlug(
			values: TableValues<TDatabase, TTableName>,
			uniqueColumn: keyof TDatabase[TTableName] & string
		): Promise<Selectable<TDatabase[TTableName]> | undefined>;
		upsertWithSlug(
			criteria: {
				column: keyof TDatabase[TTableName] & string;
				value: unknown;
			},
			insertValues: TableValues<TDatabase, TTableName>,
			updateValues?: TableValues<TDatabase, TTableName>
		): Promise<Selectable<TDatabase[TTableName]> | undefined>;
		insertMany(
			values: Array<TableValues<TDatabase, TTableName>>
		): Promise<Array<Selectable<TDatabase[TTableName]>>>;
		generateUniqueSlug(
			values: TableValues<TDatabase, TTableName>
		): Promise<string | undefined>;
	}
>;

/**
 * Adds slug generation functionality to a model
 */
function withSlug<
	TDatabase,
	TTableName extends keyof TDatabase & string,
	TIdColumnName extends keyof TDatabase[TTableName] & string,
>(
	model: ModelFunctions<TDatabase, TTableName, TIdColumnName>,
	slugField?: keyof TDatabase[TTableName] & string,
	sourceField?: keyof TDatabase[TTableName] & string
):
	| SlugModelType<TDatabase, TTableName, TIdColumnName>
	| ((
			options: Options<TDatabase, TTableName>
	  ) => SlugModelType<TDatabase, TTableName, TIdColumnName>) {
	// Direct usage with all parameters provided
	if (slugField && sourceField) {
		const options: Options<TDatabase, TTableName> = {
			field: slugField,
			sources: [sourceField],
		};
		return implementSlug(model, options);
	}

	// Curried usage - return a function that takes options
	return (options: Options<TDatabase, TTableName>) => {
		return implementSlug(model, options);
	};
}

/**
 * Internal implementation of the slug functionality
 */
function implementSlug<
	TDatabase,
	TTableName extends keyof TDatabase & string,
	TIdColumnName extends keyof TDatabase[TTableName] & string,
>(
	model: ModelFunctions<TDatabase, TTableName, TIdColumnName>,
	options: Options<TDatabase, TTableName>
): SlugModelType<TDatabase, TTableName, TIdColumnName> {
	type Table = TDatabase[TTableName];
	type TableRecord = Selectable<Table>;
	type TableInsertValues = TableValues<TDatabase, TTableName>;

	/**
	 * Checks if data already has a valid slug field
	 *
	 * @param values - Values to check
	 * @returns Whether the values already have a slug
	 */
	const hasValidSlugField = (values: TableInsertValues): boolean => {
		const { field } = options;
		const fieldValue = values[field];
		return (
			field in values &&
			fieldValue != null &&
			isString(fieldValue) &&
			fieldValue.trim() !== ''
		);
	};

	/**
	 * Adds a slug to the values if needed
	 */
	const addSlugToValues = async <T extends TableInsertValues>(
		values: T
	): Promise<T> => {
		if (hasValidSlugField(values)) {
			return values;
		}

		const baseSlug = generateSlugValue(values, options);
		if (!baseSlug) {
			return values;
		}

		// Check for existing slugs with the same base
		const existingSlugs = await model
			.selectFrom()
			.selectAll()
			.where(
				options.field as keyof Table & string,
				'like' as any,
				(baseSlug + '%') as any
			)
			.execute();

		// If no existing slugs, use the base slug
		if (existingSlugs.length === 0) {
			return {
				...values,
				[options.field]: baseSlug,
			};
		}

		// Find the next available number suffix
		const slugPattern = new RegExp(`^${baseSlug}(?:-(\\d+))?$`);
		const numbers = existingSlugs
			.map((record) => {
				const match = String(record[options.field]).match(slugPattern);
				return match ? Number.parseInt(match[1] || '1', 10) : 0;
			})
			.filter((n) => !isNaN(n));

		const maxNumber = Math.max(0, ...numbers);
		const newSlug = `${baseSlug}-${maxNumber + 1}`;

		return {
			...values,
			[options.field]: newSlug,
		};
	};

	/**
	 * Converts a value to the appropriate column type for queries
	 *
	 * @param value - Value to convert
	 * @returns Value with the appropriate type for the column
	 */
	const convertToColumnValue = <TColumnName extends keyof Table & string>(
		value: string,
		column: TColumnName
	): Readonly<SelectType<Table[TColumnName]>> => {
		// For most cases, the string value can be directly used
		return value as unknown as Readonly<SelectType<Table[TColumnName]>>;
	};

	/**
	 * Safely converts values for insertion
	 *
	 * @param values - Values to convert
	 * @returns Values with the appropriate types for insertion
	 */
	const prepareForInsert = (
		values: TableInsertValues
	): InsertObject<TDatabase, TTableName> => {
		// This is a safer approach than using double type assertions
		return values as unknown as InsertObject<TDatabase, TTableName>;
	};

	return {
		...model,

		/**
		 * Finds a record by its slug
		 */
		async findBySlug(
			value: string,
			column: keyof Table & string = options.field
		): Promise<Selectable<TDatabase[TTableName]> | undefined> {
			return model.findOne(column, convertToColumnValue(value, column));
		},

		/**
		 * Processes data before insert to add slugs
		 */
		processDataBeforeInsert(
			data: InsertObjectOrList<TDatabase, TTableName>
		): InsertObjectOrList<TDatabase, TTableName> {
			// For arrays, process each item synchronously
			if (Array.isArray(data)) {
				return data.map((item) => {
					const baseSlug = generateSlugValue(
						item as TableInsertValues,
						options
					);
					if (!baseSlug || hasValidSlugField(item as TableInsertValues)) {
						return item;
					}
					return {
						...item,
						[options.field]: baseSlug,
					};
				}) as InsertObjectOrList<TDatabase, TTableName>;
			}

			// For single items, process synchronously
			const baseSlug = generateSlugValue(data as TableInsertValues, options);
			if (!baseSlug || hasValidSlugField(data as TableInsertValues)) {
				return data;
			}
			return {
				...data,
				[options.field]: baseSlug,
			} as InsertObjectOrList<TDatabase, TTableName>;
		},

		// Move the async slug generation to a separate method
		async generateUniqueSlug(
			values: TableValues<TDatabase, TTableName>
		): Promise<string | undefined> {
			if (hasValidSlugField(values)) {
				return values[options.field] as string;
			}

			const baseSlug = generateSlugValue(values, options);
			if (!baseSlug) {
				return undefined;
			}

			// Check for existing slugs with the same base
			const existingSlugs = await model
				.selectFrom()
				.selectAll()
				.where(
					options.field as keyof Table & string,
					'like' as any,
					(baseSlug + '%') as any
				)
				.execute();

			// If no existing slugs, use the base slug
			if (existingSlugs.length === 0) {
				return baseSlug;
			}

			// Find the next available number suffix
			const slugPattern = new RegExp(`^${baseSlug}(?:-(\\d+))?$`);
			const numbers = existingSlugs
				.map((record) => {
					const match = String(record[options.field]).match(slugPattern);
					return match ? Number.parseInt(match[1] || '1', 10) : 0;
				})
				.filter((n) => !isNaN(n));

			const maxNumber = Math.max(0, ...numbers);
			return `${baseSlug}-${maxNumber + 1}`;
		},

		/**
		 * Inserts a record with automatic slug generation
		 */
		async insertWithSlug(
			values: TableValues<TDatabase, TTableName>
		): Promise<Selectable<TDatabase[TTableName]>> {
			const slug = await this.generateUniqueSlug(values);
			const processedValues = slug
				? { ...values, [options.field]: slug }
				: values;

			const result = await model
				.insertInto()
				.values(prepareForInsert(processedValues))
				.returningAll()
				.executeTakeFirst();

			if (!result) {
				throw new Error(`Failed to insert record into ${model.table}`);
			}

			return result as Selectable<TDatabase[TTableName]>;
		},

		/**
		 * Inserts multiple records with slug generation
		 */
		async insertMany(
			values: Array<TableValues<TDatabase, TTableName>>
		): Promise<Array<Selectable<TDatabase[TTableName]>>> {
			const slugs = await Promise.all(
				values.map((value) => this.generateUniqueSlug(value))
			);

			const processedValues = values.map((value, index) =>
				slugs[index] ? { ...value, [options.field]: slugs[index] } : value
			);

			const results = await model
				.insertInto()
				.values(processedValues.map((value) => prepareForInsert(value)))
				.returningAll()
				.execute();

			return results as Array<Selectable<TDatabase[TTableName]>>;
		},
		/**
		 * Tries to insert a record, falling back to find if it already exists
		 */
		async insertIfNotExistsWithSlug(
			values: TableValues<TDatabase, TTableName>,
			uniqueColumn: keyof Table & string
		): Promise<Selectable<TDatabase[TTableName]> | undefined> {
			// First try to find by unique column
			const uniqueValue = values[uniqueColumn];
			if (uniqueValue === undefined) {
				throw new Error(
					`Missing required unique column value for '${String(uniqueColumn)}'`
				);
			}

			const existing = await model.findOne(
				uniqueColumn,
				uniqueValue as unknown as Readonly<
					SelectType<
						TDatabase[TTableName][keyof TDatabase[TTableName] & string]
					>
				>
			);

			if (existing) {
				return existing;
			}

			// If not found, insert with slug
			return this.insertWithSlug(values);
		},

		/**
		 * Updates a record if it exists, or inserts a new one with slug
		 */
		async upsertWithSlug(
			criteria: {
				column: keyof TDatabase[TTableName] & string;
				value: unknown;
			},
			insertValues: TableValues<TDatabase, TTableName>,
			updateValues?: TableValues<TDatabase, TTableName>
		): Promise<Selectable<TDatabase[TTableName]> | undefined> {
			// First try to find the record
			const existing = await model.findOne(
				criteria.column,
				criteria.value as unknown as Readonly<
					SelectType<
						TDatabase[TTableName][keyof TDatabase[TTableName] & string]
					>
				>
			);

			if (existing) {
				// Update it if it exists
				const result = await model
					.updateTable()
					.set(
						(updateValues || insertValues) as unknown as UpdateObject<
							TDatabase,
							TTableName,
							TTableName
						>
					)
					.where(
						criteria.column,
						'=',
						criteria.value as unknown as OperandValueExpressionOrList<
							TDatabase,
							TTableName,
							keyof TDatabase[TTableName] & string
						>
					)
					.returningAll()
					.executeTakeFirst();

				return result as Selectable<TDatabase[TTableName]>;
			}

			// Insert a new record with slug
			return this.insertWithSlug({
				...insertValues,
				[criteria.column]: criteria.value,
			});
		},
	};
}

// Make sure the withSlug function is exported both as default and named export
export default withSlug;
export { withSlug, Operation, generateSlugValue };

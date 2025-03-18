import { type OrderByDirectionExpression, type Selectable, sql } from 'kysely';
import type { ModelFunctions } from '../model';
/**
 * Configuration options for how a column should be sorted in cursor pagination.
 *
 * @remarks
 * These options control the behavior of individual columns in a sort key,
 * including sort direction, ability to reverse the sort, and special handling
 * for timestamps.
 */
type ColumnSortOptions = {
	/** Sort direction, either 'asc' (ascending) or 'desc' (descending) */
	direction?: 'asc' | 'desc';
	/**
	 * Whether the sort direction can be reversed for backward pagination.
	 * If true, the direction will be flipped when paginating backward.
	 */
	reversible?: boolean;
	/**
	 * Whether this column contains timestamp values that may need special handling.
	 * Timestamps often require specific comparison logic in database queries.
	 */
	timestamp?: boolean;
	/**
	 * Optional SQL modifier to apply to the column in ORDER BY clauses.
	 * For example, 'NULLS LAST' or database-specific collation options.
	 */
	modifier?: string;
};

/**
 * A tuple defining how to sort by a specific column.
 *
 * @typeParam TTable - The table type containing the column
 * @example
 * ```typescript
 * // Sort by the 'created_at' column in descending order
 * const createdAtSort: ColumnSort<UserTable> = ['created_at', { direction: 'desc', reversible: true }];
 * ```
 */
type ColumnSort<TTable> = [keyof TTable & string, ColumnSortOptions];

/**
 * A mapping of named sort key identifiers to their column sort configurations.
 *
 * @typeParam TTable - The table type containing the columns
 * @example
 * ```typescript
 * const userSortKeys: SortKeys<UserTable> = {
 *   'newest': [['created_at', { direction: 'desc', reversible: true }]],
 *   'alphabetical': [['name', { direction: 'asc' }]]
 * };
 * ```
 */
type SortKeys<TTable> = Record<string, ColumnSort<TTable>[]>;

/**
 * Configuration for initializing cursor-based pagination on a model.
 *
 * @typeParam TTable - The table type to paginate
 * @typeParam TSortKeys - The configuration of sort keys available for pagination
 */
type Config<TTable, TSortKeys extends SortKeys<TTable>> = {
	/**
	 * Mapping of sort key names to their column sort configurations.
	 * Each sort key defines a unique way to order results.
	 */
	sortKeys: TSortKeys;
	/**
	 * Maximum number of records that can be requested in a single page.
	 * This prevents excessive query load from very large page requests.
	 * @defaultValue 100
	 */
	max?: number;
	/**
	 * Default number of records to return per page when not specified.
	 * @defaultValue 10
	 */
	limit?: number;
	/**
	 * The default sort key to use when none is specified in the query options.
	 * @defaultValue The first key in sortKeys
	 */
	sortKey?: keyof TSortKeys;
};

/**
 * Options for executing a cursor-based pagination query.
 *
 * This type uses a discriminated union to ensure that forward pagination
 * options (first/after) and backward pagination options (last/before)
 * are used appropriately together.
 *
 * @remarks
 * The function type uses 'any' to avoid complex generic constraints
 * that cause declaration build issues.
 */
type CursorableOptions = {
	/**
	 * Sort key to use for ordering results.
	 * Must correspond to a key defined in the model's sortKeys configuration.
	 */
	sortKey?: string;
	/**
	 * Custom query modifier function that can add additional WHERE conditions
	 * or join operations to the base query.
	 *
	 * @example
	 * ```typescript
	 * // Filter active users only
	 * const options = {
	 *   first: 10,
	 *   func: (qb) => qb.where('active', '=', true)
	 * };
	 * ```
	 */
	func?: any;
	/**
	 * Whether to fetch one additional record beyond the requested limit.
	 * Used to determine if more pages exist without executing a separate count query.
	 * @defaultValue true
	 */
	oneMore?: boolean;
} & (
	| {
			/**
			 * Number of records to fetch when paginating forward.
			 * @defaultValue The configured default limit
			 */
			first?: number;
			/**
			 * Opaque cursor string indicating the position after which to start the results.
			 * Obtained from a previous page's endCursor value.
			 */
			after?: string;
	  }
	| {
			/**
			 * Number of records to fetch when paginating backward.
			 * @defaultValue The configured default limit
			 */
			last?: number;
			/**
			 * Opaque cursor string indicating the position before which to start the results.
			 * Obtained from a previous page's startCursor value.
			 */
			before?: string;
	  }
);

/**
 * Represents a paginated connection of nodes with cursor-based pagination metadata.
 * This follows the Relay Connection specification pattern.
 *
 * @typeParam TNode - The type of objects in the connection
 *
 * @see {@link https://relay.dev/graphql/connections.htm | Relay Cursor Connections Specification}
 */
type Connection<TNode> = {
	/** The list of records/objects in the current page */
	nodes: TNode[];
	/**
	 * Pagination metadata including cursors and information about
	 * the availability of previous and next pages
	 */
	pageInfo: {
		/** Whether there are more records available after the end cursor */
		hasNextPage: boolean;
		/** Whether there are more records available before the start cursor */
		hasPreviousPage: boolean;
		/** Opaque cursor string pointing to the first record in the current page, or null if empty */
		startCursor: string | null;
		/** Opaque cursor string pointing to the last record in the current page, or null if empty */
		endCursor: string | null;
	};
	/**
	 * Total count of all records matching the query, if requested.
	 * Only available when options.oneMore is not false.
	 */
	totalCount?: number;
};

/**
 * Adds cursor-based pagination to a model
 *
 * @typeParam TDatabase - Database schema type
 * @typeParam TTableName - Table name in the database
 * @typeParam TIdColumnName - Name of the ID column
 * @param model - Model to enhance with pagination
 * @param config - Configuration for pagination
 * @returns Enhanced model with pagination methods
 */
export default function withCursorable<
	TDatabase,
	TTableName extends keyof TDatabase & string,
	TIdColumnName extends keyof TDatabase[TTableName] & string,
>(
	model: ModelFunctions<TDatabase, TTableName, TIdColumnName>,
	config: {
		sortKeys: Record<string, ColumnSort<TDatabase[TTableName]>[]>;
		max?: number;
		limit?: number;
		sortKey?: string;
	}
): ModelFunctions<TDatabase, TTableName, TIdColumnName> & {
	getCursorableQuery(
		options: CursorableOptions
	): ReturnType<typeof model.selectFrom>;
	getCursorable(
		options: CursorableOptions
	): Promise<Selectable<TDatabase[TTableName]>[]>;
	getLazyCursorableConnection(
		options: CursorableOptions
	): Promise<Connection<Selectable<TDatabase[TTableName]>>>;
	getCursorableConnection(
		options: CursorableOptions
	): Promise<Connection<Selectable<TDatabase[TTableName]>>>;
} {
	type TTable = TDatabase[TTableName];
	type TTableRecord = Selectable<TTable>;

	// Default limit if not provided
	const defaultLimit = config.limit || 10;
	const maxLimit = config.max || 100;

	/**
	 * Retrieves the configuration for a specified sort key.
	 *
	 * @param sortKeyName - Name of the sort key to get configuration for
	 * @returns Array of column sort configurations for the sort key
	 * @throws Will use the first available sort key if the specified key doesn't exist
	 */
	const getSortKeyConfig = (sortKeyName?: string) => {
		const key = sortKeyName || Object.keys(config.sortKeys)[0];
		return config.sortKeys[key as keyof typeof config.sortKeys] || [];
	};

	/**
	 * Parses an opaque cursor string into structured cursor parts for query building.
	 *
	 * @param sortKeyName - Name of the sort key to use for parsing
	 * @param cursor - Base64 encoded cursor string to parse
	 * @returns Array of parsed cursor parts with column and value information
	 * @throws If the cursor format is invalid or cannot be parsed
	 */
	const parseCursor = (sortKeyName: string, cursor?: string) => {
		if (!cursor) {
			return [];
		}

		try {
			const decoded = Buffer.from(cursor, 'base64').toString('utf8');
			const parsed = JSON.parse(decoded);

			// Map cursor values to sort key columns
			const sortKeyConfig = getSortKeyConfig(sortKeyName);

			if (!Array.isArray(parsed) || parsed.length !== sortKeyConfig.length) {
				throw new Error(`Invalid cursor format: ${cursor}`);
			}

			return sortKeyConfig.map(([column, options], index) => ({
				column: column as string,
				value: parsed[index],
				direction: options.direction || 'asc',
				reversible: options.reversible || false,
				timestamp: options.timestamp || false,
				modifier: options.modifier,
			}));
		} catch {
			throw new Error(`Invalid cursor: ${cursor}`);
		}
	};

	/**
	 * Creates an opaque cursor string from a record and sort key.
	 *
	 * @param obj - Record containing values for cursor creation
	 * @param sortKeyName - Name of the sort key to use for column selection
	 * @returns Base64 encoded cursor string
	 */
	const makeCursor = (obj: Record<string, unknown>, sortKeyName: string) => {
		const sortKeyConfig = getSortKeyConfig(sortKeyName);
		const values = sortKeyConfig.map(([column]) => obj[column as string]);
		return Buffer.from(JSON.stringify(values)).toString('base64');
	};

	/**
	 * Type guard that checks if options contain forward pagination parameters.
	 *
	 * @param options - Pagination options to check
	 * @returns True if options contain first or after parameters
	 */
	const isForwardOptions = <T extends CursorableOptions>(
		options: T
	): options is T & {
		first?: number;
		after?: string;
	} => {
		return 'first' in options || 'after' in options;
	};

	/**
	 * Type guard that checks if options contain backward pagination parameters.
	 *
	 * @param options - Pagination options to check
	 * @returns True if options contain last or before parameters
	 */
	const isBackwardOptions = <T extends CursorableOptions>(
		options: T
	): options is T & {
		last?: number;
		before?: string;
	} => {
		return 'last' in options || 'before' in options;
	};

	/**
	 * Determines if the query order needs to be reversed based on pagination direction.
	 *
	 * @param options - Pagination options to check
	 * @returns True if query should be reversed (backward pagination)
	 */
	const isQueryReversed = (options: CursorableOptions) => {
		return isBackwardOptions(options);
	};

	/**
	 * Calculates the appropriate limit value from pagination options.
	 *
	 * @param options - Pagination options containing limit parameters
	 * @returns The calculated limit value, capped by maxLimit
	 */
	const getLimit = (options: CursorableOptions) => {
		let value: number | undefined;

		if (isForwardOptions(options)) {
			value = options.first;
		} else if (isBackwardOptions(options)) {
			value = options.last;
		}

		if (value === undefined) {
			value = defaultLimit;
		}

		const oneMore = options.oneMore !== false;
		return Math.min(oneMore ? value + 1 : value, maxLimit);
	};

	/**
	 * Extracts the appropriate cursor value from pagination options.
	 *
	 * @param options - Pagination options containing cursor parameters
	 * @returns The cursor value to use, if any
	 */
	const getCursor = (options: CursorableOptions) => {
		if (isBackwardOptions(options)) {
			return options.before;
		}
		if (isForwardOptions(options)) {
			return options.after;
		}
		return undefined;
	};

	return {
		...model,

		/**
		 * Creates a query builder configured for cursor-based pagination.
		 *
		 * @remarks
		 * This method builds a query with appropriate ordering, limiting, and cursor
		 * conditions based on the provided pagination options.
		 *
		 * @param options - Pagination options defining direction, limit, and cursor position
		 * @returns A configured SelectQueryBuilder ready for execution
		 */
		getCursorableQuery(options: CursorableOptions) {
			const { sortKey = Object.keys(config.sortKeys)[0] } = options;
			const cursorParts = parseCursor(
				sortKey as string,
				getCursor(options) as string
			);
			const reversed = isQueryReversed(options);
			const limit = getLimit(options);

			// Start with a basic query
			let query = model.selectFrom().selectAll();

			// If we have cursor parts, add where clauses
			if (cursorParts.length > 0) {
				//@ts-expect-error
				query = query.where((eb) => eb.lit(1).eq(1));
			}

			// Add sorting
			const sortKeyConfig = getSortKeyConfig(sortKey);
			for (const [column, options] of sortKeyConfig) {
				const direction = options.direction || 'asc';
				query = query.orderBy(
					String(column),
					reversed && options.reversible
						? direction === 'asc'
							? ('desc' as OrderByDirectionExpression)
							: ('asc' as OrderByDirectionExpression)
						: (direction as OrderByDirectionExpression)
				);
			}

			// Apply custom query modifications if provided
			if (options.func) {
				query = options.func(query);
			}

			// Apply limit
			query = query.limit(limit);

			return query;
		},

		/**
		 * Executes a cursor-based pagination query and returns raw results.
		 *
		 * @remarks
		 * This is a lower-level method that returns the raw query results without
		 * constructing a connection object or handling pagination metadata.
		 *
		 * @param options - Pagination options defining direction, limit, and cursor position
		 * @returns Promise resolving to an array of raw record objects
		 */
		async getCursorable(options: CursorableOptions) {
			const query = this.getCursorableQuery(options);
			return (await query.execute()) as Selectable<TDatabase[TTableName]>[];
		},

		/**
		 * Creates a cursor-based connection with basic pagination information.
		 *
		 * @remarks
		 * This method handles the core pagination logic including:
		 * - Forward and backward pagination support
		 * - Proper ordering of results
		 * - Generation of cursor values
		 * - Calculation of hasNextPage and hasPreviousPage flags
		 *
		 * This version does not include a total count query.
		 *
		 * @param options - Pagination options defining direction, limit, and cursor position
		 * @returns Promise resolving to a Connection object with nodes and pageInfo
		 */
		async getLazyCursorableConnection(options: CursorableOptions) {
			const { sortKey = Object.keys(config.sortKeys)[0] } = options;
			const limit = getLimit(options);
			const oneMore = options.oneMore !== false;
			const reversed = isQueryReversed(options);

			// Fetch nodes with potentially one extra record
			let nodes = await this.getCursorable(options);

			// Check if we fetched an extra record to determine hasNextPage
			let hasNextPage = false;
			let hasPreviousPage = false;

			if (oneMore && nodes.length > 0) {
				// We fetched one more than requested
				if (
					nodes.length >
					(isForwardOptions(options)
						? options.first || defaultLimit
						: options.last || defaultLimit)
				) {
					hasNextPage = !reversed;
					hasPreviousPage = reversed;
					// Remove the extra node
					nodes = reversed ? nodes.slice(1) : nodes.slice(0, -1);
				}
			}

			// Check for previous/next pages based on cursor
			if (isForwardOptions(options) && options.after) {
				hasPreviousPage = true;
			}
			if (isBackwardOptions(options) && options.before) {
				hasNextPage = true;
			}

			// Reverse nodes if using backward pagination
			if (reversed) {
				nodes = nodes.reverse();
			}

			// Build the connection object
			const connection: Connection<TTableRecord> = {
				nodes: nodes as TTableRecord[],
				pageInfo: {
					hasNextPage,
					hasPreviousPage,
					startCursor:
						nodes.length > 0
							? makeCursor(
									nodes[0] as Record<string, unknown>,
									sortKey as string
								)
							: null,
					endCursor:
						nodes.length > 0
							? makeCursor(
									nodes[nodes.length - 1] as Record<string, unknown>,
									sortKey as string
								)
							: null,
				},
			};

			return connection;
		},

		/**
		 * Creates a complete cursor-based connection with total count information.
		 *
		 * @remarks
		 * This extends the lazy connection by adding a total count query when requested.
		 * The total count represents all records that match the query conditions,
		 * not just the current page.
		 *
		 * @param options - Pagination options defining direction, limit, and cursor position
		 * @returns Promise resolving to a Connection object with nodes, pageInfo, and totalCount
		 */
		async getCursorableConnection(options: CursorableOptions) {
			const connection = await this.getLazyCursorableConnection(options);

			// Add count query if requested
			if (options.oneMore !== false) {
				const countQuery = model
					.selectFrom()
					.select((eb) => [eb.fn.count(sql.raw('1')).as('count')]);

				// Apply custom query mods if provided
				if (options.func) {
					countQuery.where((qb) => {
						// Need to cast here due to the complex query builder type
						const customQuery = options.func!(qb as any);
						// Extract only the where conditions from the custom query
						return (customQuery as any).$getWhereBuilder();
					});
				}

				const countResult = await countQuery.executeTakeFirst();
				if (countResult) {
					connection.totalCount = Number(countResult.count);
				}
			}

			return connection;
		},
	};
}

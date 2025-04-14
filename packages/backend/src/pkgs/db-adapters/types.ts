import type { EntityInput, EntityName } from '~/pkgs/data-model';
import type { C15TDBSchema } from '~/schema/definition';
import type { C15TOptions } from '~/types';
import type { KyselyDatabaseType } from './adapters';

/**
 * Type representing the fields of a database table for a specific entity
 */
export type TableFields<EntityType extends EntityName> =
  C15TDBSchema[EntityType]['fields'];

/**
 * Type representing the possible value types that can be used in query conditions
 */
export type Value =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | Date
  | null;

/**
 * Type representing the comparison operators available for query conditions
 */
export type ComparisonOperator =
  | 'eq' // Equal to
  | 'ne' // Not equal to
  | 'lt' // Less than
  | 'lte' // Less than or equal to
  | 'gt' // Greater than
  | 'gte' // Greater than or equal to
  | 'in' // In array
  | 'contains' // Contains substring
  | 'starts_with' // Starts with
  | 'ends_with' // Ends with
  | 'ilike'; // Case insensitive equality

/**
 * Type representing the logical connectors for combining query conditions
 */
export type LogicalConnector = 'AND' | 'OR';

/**
 * Type representing a single query condition
 */
export type WhereCondition<EntityType extends EntityName> = {
  /** The comparison operator to use (defaults to 'eq') */
  operator?: ComparisonOperator;
  /** The value to compare against */
  value: Value;
  /** The field to apply the condition to */
  field: keyof TableFields<EntityType> | 'id';
  /** The logical connector to use with previous conditions (defaults to 'AND') */
  connector?: LogicalConnector;
};

/**
 * Type representing a complete where clause for database queries
 */
export type Where<EntityType extends EntityName> = WhereCondition<EntityType>[];

/**
 * Type representing sorting options for queries
 */
export type SortOptions<EntityType extends EntityName> = {
  /** The field to sort by */
  field: keyof TableFields<EntityType> | 'id';
  /** The sort direction */
  direction: 'asc' | 'desc';
};

/**
 * Type representing the result of a schema creation operation
 */
export type AdapterSchemaCreation = {
  /** The code to be inserted into the file */
  code: string;
  /** The path to the file */
  path: string;
  /** Whether to append to existing file */
  append?: boolean;
  /** Whether to overwrite existing file */
  overwrite?: boolean;
};

/**
 * Interface defining the contract for database adapters
 */
export interface Adapter {
  /** Unique identifier for the adapter */
  id: string;

  /** Creates a new record in the database */
  create: <
    Model extends EntityName,
    Data extends Record<string, unknown>,
    Result extends TableFields<Model>,
  >(data: {
    model: Model;
    data: Data;
    select?: Array<keyof Result>;
  }) => Promise<Result>;

  /** Finds a single record matching the where conditions */
  findOne: <Model extends EntityName, Result extends TableFields<Model>>(data: {
    model: Model;
    where: Where<Model>;
    select?: Array<keyof Result>;
    sortBy?: SortOptions<Model>;
  }) => Promise<Result | null>;

  /** Finds multiple records matching the where conditions */
  findMany: <Model extends EntityName>(data: {
    model: Model;
    where?: Where<Model>;
    limit?: number;
    sortBy?: SortOptions<Model>;
    offset?: number;
  }) => Promise<TableFields<Model>[]>;

  /** Counts records matching the where conditions */
  count: <Model extends EntityName>(data: {
    model: Model;
    where?: Where<Model>;
  }) => Promise<number>;

  /** Updates a single record matching the where conditions */
  update: <Model extends EntityName, Result extends TableFields<Model>>(data: {
    model: Model;
    where: Where<Model>;
    update: EntityInput<Model>;
  }) => Promise<Result | null>;

  /** Updates multiple records matching the where conditions */
  updateMany: <
    Model extends EntityName,
    Result extends TableFields<Model>,
  >(data: {
    model: Model;
    where: Where<Model>;
    update: Partial<EntityInput<Model>>;
  }) => Promise<Result[]>;

  /** Deletes a single record matching the where conditions */
  delete: <Model extends EntityName>(data: {
    model: Model;
    where: Where<Model>;
  }) => Promise<void>;

  /** Deletes multiple records matching the where conditions */
  deleteMany: <Model extends EntityName>(data: {
    model: Model;
    where: Where<Model>;
  }) => Promise<number>;

  /**
   * Executes a function within a database transaction
   *
   * This method allows multiple database operations to be executed in a single atomic transaction.
   * If any operation within the transaction fails, all operations are rolled back.
   *
   * @typeParam ResultType - The type of data returned by the transaction
   * @param data - The transaction data containing the callback function
   * @returns A promise that resolves with the result of the callback function
   * @throws {Error} If the transaction fails to complete
   *
   * @example
   * ```typescript
   * const result = await adapter.transaction({
   *   callback: async (tx) => {
   *     const subject = await tx.create({
   *       model: 'subject',
   *       data: { name: 'John Doe' }
   *     });
   *     await tx.create({
   *       model: 'profile',
   *       data: { subjectId: subject.id, bio: 'Test bio' }
   *     });
   *     return subject;
   *   }
   * });
   * ```
   */
  transaction: <ResultType>(data: {
    callback: (transactionAdapter: Adapter) => Promise<ResultType>;
  }) => Promise<ResultType>;

  /** Optional method to create database schema */
  createSchema?: (
    options: C15TOptions,
    file?: string
  ) => Promise<AdapterSchemaCreation>;

  /** Optional adapter-specific configuration */
  // biome-ignore lint/suspicious/noExplicitAny: we might not know the type
  options?: Record<string, unknown> | KyselyAdapterConfig | any;
}

/**
 * Configuration options for the Kysely adapter
 */
export interface KyselyAdapterConfig {
  type?: KyselyDatabaseType;
}

/**
 * Type definition for an adapter factory function
 */
export type AdapterInstance = (options: C15TOptions) => Adapter;

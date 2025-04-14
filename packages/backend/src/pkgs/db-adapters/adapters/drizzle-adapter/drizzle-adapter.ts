//@ts-nocheck

import {
  type SQL,
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  like,
  or,
} from 'drizzle-orm';
import { type EntityName, generateId } from '~/pkgs/data-model';
import { DoubleTieError, ERROR_CODES } from '~/pkgs/results';
import type { Adapter, C15TOptions, Where } from '~/pkgs/types';
import { getConsentTables } from '~/schema/definition';
import { applyDefaultValue } from '../../utils';

/**
 * Database interface for Drizzle ORM integration
 *
 * This generic interface represents a Drizzle ORM database connection.
 * It allows the adapter to work with different Drizzle providers.
 *
 * @remarks
 * The interface uses an index signature to allow for dynamic access to
 * the database's properties and methods.
 */
export interface DB {
  [key: string]: unknown;
}

/**
 * Creates a transformer for converting between C15T data models and Drizzle schema
 *
 * This function creates an object with utility methods for converting data between
 * the C15T internal representation and the Drizzle ORM schema representation.
 *
 * @internal This function is primarily used internally by the drizzleAdapter
 * @param db - The Drizzle database instance
 * @param config - Configuration options for the Drizzle adapter
 * @param options - C15T options
 * @returns An object containing entity transformation utilities
 * @throws {DoubleTieError} If the schema is not found or if a model or field doesn't exist
 */
const createEntityTransformer = (
  db: DB,
  config: DrizzleAdapterConfig,
  options: C15TOptions
) => {
  const schema = getConsentTables(options);

  /**
   * Gets the field name in the database schema
   *
   * @internal
   * @param model - The model name
   * @param field - The field name in the C15T model
   * @returns The corresponding field name in the database schema
   */
  function getField(model: string, field: string) {
    if (field === 'id') {
      return field;
    }
    const f = schema[model].fields[field];
    return f.fieldName || field;
  }

  /**
   * Gets the schema model for a given entity name
   *
   * @internal
   * @param entityName - The entity name to get the schema for
   * @returns The schema model for the entity
   * @throws {DoubleTieError} If the schema is not found or the model doesn't exist in the schema
   */
  function getSchema(entityName: string) {
    const schema = config.schema || db._.fullSchema;
    if (!schema) {
      throw new DoubleTieError(
        'The schema could not be found. Please ensure the schema is properly configured in the adapter.',
        {
          code: ERROR_CODES.DATABASE_CONNECTION_ERROR,
          status: 500,
          meta: {
            provider: config.provider,
          },
        }
      );
    }
    const model = getEntityName(entityName);
    const schemaModel = schema[model];
    if (!schemaModel) {
      throw new DoubleTieError(
        `The model "${model}" does not exist in the schema. Please verify the model name and ensure it is defined in your schema.`,
        {
          code: ERROR_CODES.DATABASE_QUERY_ERROR,
          status: 404,
          meta: {
            model,
            availableModels: Object.keys(schema),
          },
        }
      );
    }
    return schemaModel;
  }

  /**
   * Converts a model name to its corresponding entity name in the database
   *
   * @internal
   * @param model - The model name to convert
   * @returns The database entity name
   */
  const getEntityName = (model: string) => {
    if (schema[model].entityName !== model) {
      return schema[model].entityName;
    }

    if (config.usePlural) {
      return `${model}s`;
    }

    return model;
  };

  /**
   * Converts C15T where clauses to Drizzle ORM conditions
   *
   * @internal
   * @typeParam EntityType - The type of entity being queried
   * @param where - Array of where conditions from C15T
   * @param model - The model name
   * @returns Array of Drizzle ORM conditions
   * @throws {DoubleTieError} If a field doesn't exist or if the operator value is invalid
   */
  function convertWhereClause<EntityType extends EntityName>(
    where: Where<EntityType>[],
    model: EntityType
  ) {
    const schemaModel = getSchema(model);
    if (!where) {
      return [];
    }
    if (where.length === 1) {
      const w = where[0];
      if (!w) {
        return [];
      }
      const field = getField(model, w.field);
      if (!schemaModel[field]) {
        throw new DoubleTieError(
          `The field "${field}" does not exist in model "${model}". Please verify the field name and ensure it is defined in your schema.`,
          {
            code: ERROR_CODES.DATABASE_QUERY_ERROR,
            status: 404,
            meta: {
              model,
              field,
              availableFields: Object.keys(schemaModel),
            },
          }
        );
      }
      if (w.operator === 'in') {
        if (!Array.isArray(w.value)) {
          throw new DoubleTieError(
            `The value for the field "${field}" must be an array when using the "in" operator.`,
            {
              code: ERROR_CODES.BAD_REQUEST,
              status: 400,
              meta: {
                field,
                operator: w.operator,
                expectedType: 'array',
                actualType: typeof w.value,
              },
            }
          );
        }
        return [inArray(schemaModel[field], w.value)];
      }

      if (w.operator === 'contains') {
        return [like(schemaModel[field], `%${w.value}%`)];
      }

      if (w.operator === 'starts_with') {
        return [like(schemaModel[field], `${w.value}%`)];
      }

      if (w.operator === 'ends_with') {
        return [like(schemaModel[field], `%${w.value}`)];
      }

      return [eq(schemaModel[field], w.value)];
    }
    const andGroup = where.filter((w) => w.connector === 'AND' || !w.connector);
    const orGroup = where.filter((w) => w.connector === 'OR');

    const andClause = and(
      ...andGroup.map((w) => {
        const field = getField(model, w.field);
        if (w.operator === 'in') {
          if (!Array.isArray(w.value)) {
            throw new DoubleTieError(
              `The value for the field "${field}" must be an array when using the "in" operator.`,
              {
                code: ERROR_CODES.BAD_REQUEST,
                status: 400,
                meta: {
                  field,
                  operator: w.operator,
                  expectedType: 'array',
                  actualType: typeof w.value,
                },
              }
            );
          }
          return inArray(schemaModel[field], w.value);
        }
        return eq(schemaModel[field], w.value);
      })
    );
    const orClause = or(
      ...orGroup.map((w) => {
        const field = getField(model, w.field);
        return eq(schemaModel[field], w.value);
      })
    );

    const clause: SQL<unknown>[] = [];
    if (andGroup.length && andClause) {
      clause.push(andClause);
    }
    if (orGroup.length && orClause) {
      clause.push(orClause);
    }
    return clause;
  }

  const useDatabaseGeneratedId = options?.advanced?.generateId === false;
  return {
    getSchema,
    /**
     * Transforms input data from C15T format to Drizzle format
     *
     * @internal
     * @param data - The data to transform
     * @param model - The model name
     * @param action - Whether this is a create or update operation
     * @returns Transformed data for Drizzle ORM
     */
    transformInput(
      data: Record<string, unknown>,
      model: string,
      action: 'create' | 'update'
    ) {
      const transformedData: Record<string, unknown> =
        useDatabaseGeneratedId || action === 'update'
          ? {}
          : {
              id: options.advanced?.generateId
                ? options.advanced.generateId({
                    model,
                  })
                : data.id || generateId(schema[model].entityPrefix),
            };
      const fields = schema[model].fields;
      for (const field in fields) {
        if (Object.hasOwn(fields, field)) {
          const value = data[field];
          if (value === undefined && !fields[field].defaultValue) {
            continue;
          }
          transformedData[fields[field].fieldName || field] = applyDefaultValue(
            value,
            fields[field],
            action
          );
        }
      }
      return transformedData;
    },
    /**
     * Transforms output data from Drizzle format to C15T format
     *
     * @internal
     * @param data - The data to transform
     * @param model - The model name
     * @param select - Optional array of fields to select
     * @returns Transformed data for C15T or null if no data
     */
    transformOutput(
      data: Record<string, unknown>,
      model: string,
      select: string[] = []
    ) {
      if (!data) {
        return null;
      }

      let transformedData: Record<string, unknown> = {};

      if (
        (data.id || data._id) &&
        (select.length === 0 || select.includes('id'))
      ) {
        transformedData = { id: data.id };
      }

      const tableSchema = schema[model].fields;
      for (const key in tableSchema) {
        if (select.length && !select.includes(key)) {
          continue;
        }
        const field = tableSchema[key];
        if (field) {
          transformedData[key] = data[field.fieldName || key];
        }
      }
      return transformedData;
    },
    convertWhereClause,
    /**
     * Helper for returning data from operations in MySQL
     *
     * @internal
     * @param model - The model name
     * @param builder - The query builder
     * @param data - The data being operated on
     * @param where - Optional where conditions
     * @returns The result of the operation
     */
    withReturning: async (
      model: string,
      builder: unknown,
      data: Record<string, unknown>,
      where?: Where<string>[]
    ) => {
      if (config.provider !== 'mysql') {
        const c = await builder.returning();
        return c[0];
      }

      await builder.execute();
      const schemaModel = getSchema(model);
      const builderVal = builder.config?.values;

      if (where?.length) {
        const clause = convertWhereClause(where, model);
        const res = await db
          .select()
          .from(schemaModel)
          .where(...clause);
        return res[0];
      }

      if (builderVal) {
        const tId = builderVal[0]?.id.value;
        const res = await db
          .select()
          .from(schemaModel)
          .where(eq(schemaModel.id, tId));
        return res[0];
      }

      if (data.id) {
        const res = await db
          .select()
          .from(schemaModel)
          .where(eq(schemaModel.id, data.id));
        return res[0];
      }
    },
    getField,
    getEntityName,
  };
};

/**
 * Configuration options for the Drizzle adapter
 *
 * @example
 * ```typescript
 * // Basic Drizzle adapter configuration
 * const config: DrizzleAdapterConfig = {
 *   provider: 'pg', // PostgreSQL
 *   usePlural: true // Use plural table names
 * };
 *
 * // Configuration with explicit schema
 * const configWithSchema: DrizzleAdapterConfig = {
 *   provider: 'mysql',
 *   schema: {
 *     subjects: subjects, // Drizzle schema objects
 *     consents: consents,
 *     purposes: purposes
 *   }
 * };
 * ```
 */
export interface DrizzleAdapterConfig {
  /**
   * The schema object that defines the tables and fields
   *
   * @remarks
   * If not provided, the adapter will attempt to use `db._.fullSchema`
   */
  schema?: Record<string, unknown>;

  /**
   * The database provider
   *
   * @remarks
   * Different providers have different SQL dialects and features
   */
  provider: 'pg' | 'mysql' | 'sqlite';

  /**
   * If the table names in the schema are plural
   * set this to true. For example, if the schema
   * has an object with a key "subjects" instead of "subject"
   *
   * @default false
   */
  usePlural?: boolean;
}

/**
 * Validates that the schema contains all required fields
 *
 * @internal
 * @param schema - The schema to check
 * @param model - The model name
 * @param values - The values to validate against the schema
 * @throws {DoubleTieError} If the schema is missing or a field doesn't exist
 */
function checkMissingFields(
  schema: Record<string, unknown>,
  model: string,
  values: Record<string, unknown>
) {
  if (!schema) {
    throw new DoubleTieError(
      'The schema could not be found. Please ensure the schema is properly configured in the adapter.',
      {
        code: ERROR_CODES.DATABASE_CONNECTION_ERROR,
        status: 500,
      }
    );
  }
  for (const key in values) {
    if (!schema[key]) {
      throw new DoubleTieError(
        `The field "${key}" does not exist in the "${model}" schema. Please update your drizzle schema or re-generate using "npx @c15t/cli generate".`
      );
    }
  }
}

/**
 * Creates a C15T adapter for Drizzle ORM
 *
 * This factory function creates an adapter that allows C15T to use Drizzle ORM
 * as its database layer. It supports PostgreSQL, MySQL, and SQLite.
 *
 * @param db - The Drizzle database instance
 * @param config - Configuration options for the Drizzle adapter
 * @returns A C15T adapter factory function
 *
 * @example
 * ```typescript
 * import { drizzle } from 'drizzle-orm/postgres-js';
 * import postgres from 'postgres';
 * import { drizzleAdapter } from '@c15t/db/adapters/drizzle';
 * import * as schema from './schema';
 * import { c15tInstance } from '@c15t/backend';
 *
 * // Create a Postgres connection
 * const connection = postgres('postgresql://user:password@localhost:5432/db');
 * const db = drizzle(connection, { schema });
 *
 * // Create the C15T instance with Drizzle adapter
 * const c15t = c15tInstance({
 *   storage: drizzleAdapter(db, {
 *     provider: 'pg',
 *     schema, // Pass your Drizzle schema
 *     usePlural: true
 *   }),
 *   // Other C15T options...
 *   secret: process.env.SECRET
 * });
 *
 * // Use in your application
 * export default c15tInstance.handler;
 * ```
 *
 * @example
 * ```typescript
 * // Using with MySQL
 * import { drizzle } from 'drizzle-orm/mysql2';
 * import mysql from 'mysql2/promise';
 * import { c15tInstance } from '@c15t/backend';
 *
 * const connection = await mysql.createConnection({
 *   host: 'localhost',
 *   user: 'root',
 *   database: 'c15t'
 * });
 *
 * const db = drizzle(connection);
 *
 * const c15t = c15tInstance({
 *   storage: drizzleAdapter(db, {
 *     provider: 'mysql'
 *   }),
 *   secret: process.env.SECRET
 * });
 * ```
 */
export const drizzleAdapter =
  (db: DB, config: DrizzleAdapterConfig) => (options: C15TOptions) => {
    const {
      transformInput,
      transformOutput,
      convertWhereClause,
      getSchema,
      withReturning,
      getField,
      getEntityName,
    } = createEntityTransformer(db, config, options);
    return {
      id: 'drizzle',
      /**
       * Creates a new record in the database
       *
       * @param data - The data for the create operation
       * @returns The created record
       * @throws {DoubleTieError} If the model or fields don't exist
       */
      async create(data) {
        const { model, data: values } = data;
        const transformed = transformInput(values, model, 'create');
        const schemaModel = getSchema(model);
        checkMissingFields(schemaModel, getEntityName(model), transformed);
        const builder = db.insert(schemaModel).values(transformed);
        const returned = await withReturning(model, builder, transformed);
        return transformOutput(returned, model);
      },
      /**
       * Finds a single record matching the where conditions
       *
       * @param data - The data for the find operation
       * @returns The found record or null if not found
       * @throws {DoubleTieError} If the model or fields don't exist
       */
      async findOne(data) {
        const { model, where, select } = data;
        const schemaModel = getSchema(model);
        const clause = convertWhereClause(where, model);
        const res = await db
          .select()
          .from(schemaModel)
          .where(...clause);

        if (!res.length) {
          return null;
        }
        return transformOutput(res[0], model, select);
      },
      /**
       * Finds multiple records matching the where conditions
       *
       * @param data - The data for the find operation
       * @returns Array of matching records
       * @throws {DoubleTieError} If the model or fields don't exist
       */
      async findMany(data) {
        const { model, where, sortBy, limit, offset } = data;
        const schemaModel = getSchema(model);
        const clause = where ? convertWhereClause(where, model) : [];

        const sortFn = sortBy?.direction === 'desc' ? desc : asc;
        const builder = db
          .select()
          .from(schemaModel)
          .limit(limit || 100)
          .offset(offset || 0);
        if (sortBy?.field) {
          builder.orderBy(sortFn(schemaModel[getField(model, sortBy?.field)]));
        }
        const res = await builder.where(...clause);
        return res.map((r) => transformOutput(r, model));
      },
      /**
       * Counts records matching the where conditions
       *
       * @param data - The data for the count operation
       * @returns The count of matching records
       * @throws {DoubleTieError} If the model or fields don't exist
       */
      async count(data) {
        const { model, where } = data;
        const schemaModel = getSchema(model);
        const clause = where ? convertWhereClause(where, model) : [];
        const res = await db
          .select({ count: count() })
          .from(schemaModel)
          .where(...clause);
        return res[0].count;
      },
      /**
       * Updates a single record matching the where conditions
       *
       * @param data - The data for the update operation
       * @returns The updated record
       * @throws {DoubleTieError} If the model or fields don't exist
       */
      async update(data) {
        const { model, where, update } = data;
        const schemaModel = getSchema(model);
        const clause = convertWhereClause(where, model);
        const transformed = transformInput(update, model, 'update');
        const result = await db
          .update(schemaModel)
          .set(transformed)
          .where(clause)
          .returning();
        return result.length ? transformOutput(result[0], model) : null;
      },
      /**
       * Updates multiple records matching the where conditions
       *
       * @param data - The data for the update operation
       * @returns The number of records updated
       * @throws {DoubleTieError} If the model or fields don't exist
       */
      async updateMany(data) {
        const { model, where, update: values } = data;
        const schemaModel = getSchema(model);
        const clause = convertWhereClause(where, model);
        const transformed = transformInput(values, model, 'update');
        const builder = db
          .update(schemaModel)
          .set(transformed)
          .where(...clause);
        const res = await builder;
        return res ? res.changes : 0;
      },
      /**
       * Deletes a single record matching the where conditions
       *
       * @param data - The data for the delete operation
       * @throws {DoubleTieError} If the model or fields don't exist
       */
      async delete(data) {
        const { model, where } = data;
        const schemaModel = getSchema(model);
        const clause = convertWhereClause(where, model);
        const builder = db.delete(schemaModel).where(...clause);
        await builder;
      },
      /**
       * Deletes multiple records matching the where conditions
       *
       * @param data - The data for the delete operation
       * @returns The number of records deleted
       * @throws {DoubleTieError} If the model or fields don't exist
       */
      async deleteMany(data) {
        const { model, where } = data;
        const schemaModel = getSchema(model);
        const clause = convertWhereClause(where, model);
        const result = await db.delete(schemaModel).where(clause);
        return result ? (result.rowCount as number) : 0;
      },
      /**
       * Executes a function within a database transaction
       *
       * This method wraps Drizzle's transaction functionality to provide a consistent interface
       * for executing multiple database operations atomically.
       *
       * @typeParam ResultType - The type of data returned by the transaction
       * @param data - The transaction data containing the callback function
       * @returns A promise that resolves with the result of the callback function
       * @throws {Error} If the transaction fails to complete
       */
      async transaction<ResultType>(data: {
        callback: (transactionAdapter: Adapter) => Promise<ResultType>;
      }): Promise<ResultType> {
        const { callback } = data;

        return await db.transaction(async (tx) => {
          // Create a new adapter instance that uses the transaction connection
          const transactionAdapter = drizzleAdapter(
            tx as unknown as DB,
            config
          )(options);

          // Execute the callback function with the transaction adapter
          return await callback(transactionAdapter);
        });
      },
      options: config,
    } satisfies Adapter;
  };

//@ts-nocheck

import {
	and,
	asc,
	count,
	desc,
	eq,
	inArray,
	like,
	or,
	type SQL,
} from 'drizzle-orm';
import { getConsentTables } from '../..';
import { C15TError } from '~/error';
import type { Adapter, C15TOptions, Where } from '~/types';
import { generateId } from '~/utils';
import { applyDefaultValue } from '../utils';
import type { EntityName } from '~/db/core/types';

export interface DB {
	[key: string]: any;
}

const createTransform = (
	db: DB,
	config: DrizzleAdapterConfig,
	options: C15TOptions
) => {
	const schema = getConsentTables(options);

	function getField(model: string, field: string) {
		if (field === 'id') {
			return field;
		}
		const f = schema[model].fields[field];
		return f.fieldName || field;
	}

	function getSchema(entityName: string) {
		const schema = config.schema || db._.fullSchema;
		if (!schema) {
			throw new C15TError(
				'Drizzle adapter failed to initialize. Schema not found. Please provide a schema object in the adapter options object.'
			);
		}
		const model = getEntityName(entityName);
		const schemaModel = schema[model];
		if (!schemaModel) {
			throw new C15TError(
				`[# Drizzle Adapter]: The model "${model}" was not found in the schema object. Please pass the schema directly to the adapter options.`
			);
		}
		return schemaModel;
	}

	const getEntityName = (model: string) => {
		if (schema[model].entityName !== model) {
			return schema[model].entityName;
		}

		if (config.usePlural) {
			return `${model}s`;
		}

		return model;
	};

	function convertWhereClause<T extends EntityName>(
		where: Where<T>[],
		model: T
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
				throw new C15TError(
					`The field "${w.field}" does not exist in the schema for the model "${model}". Please update your schema.`
				);
			}
			if (w.operator === 'in') {
				if (!Array.isArray(w.value)) {
					throw new C15TError(
						`The value for the field "${w.field}" must be an array when using the "in" operator.`
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
						throw new C15TError(
							`The value for the field "${w.field}" must be an array when using the "in" operator.`
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
		transformInput(
			data: Record<string, any>,
			model: string,
			action: 'create' | 'update'
		) {
			const transformedData: Record<string, any> =
				useDatabaseGeneratedId || action === 'update'
					? {}
					: {
							id: options.advanced?.generateId
								? options.advanced.generateId({
										model,
									})
								: data.id || generateId(),
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
		transformOutput(
			data: Record<string, any>,
			model: string,
			select: string[] = []
		) {
			if (!data) {
				return null;
			}

			let transformedData: Record<string, any> = {};

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
			return transformedData as any;
		},
		convertWhereClause,
		withReturning: async (
			model: string,
			builder: any,
			data: Record<string, any>,
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

export interface DrizzleAdapterConfig {
	/**
	 * The schema object that defines the tables and fields
	 */
	schema?: Record<string, any>;
	/**
	 * The database provider
	 */
	provider: 'pg' | 'mysql' | 'sqlite';
	/**
	 * If the table names in the schema are plural
	 * set this to true. For example, if the schema
	 * has an object with a key "users" instead of "user"
	 */
	usePlural?: boolean;
}

function checkMissingFields(
	schema: Record<string, any>,
	model: string,
	values: Record<string, any>
) {
	if (!schema) {
		throw new C15TError(
			'Drizzle adapter failed to initialize. Schema not found. Please provide a schema object in the adapter options object.'
		);
	}
	for (const key in values) {
		if (!schema[key]) {
			throw new C15TError(
				`The field "${key}" does not exist in the "${model}" schema. Please update your drizzle schema or re-generate using "npx @c15t/cli generate".`
			);
		}
	}
}

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
		} = createTransform(db, config, options);
		return {
			id: 'drizzle',
			async create(data) {
				const { model, data: values } = data;
				const transformed = transformInput(values, model, 'create');
				const schemaModel = getSchema(model);
				checkMissingFields(schemaModel, getEntityName(model), transformed);
				const builder = db.insert(schemaModel).values(transformed);
				const returned = await withReturning(model, builder, transformed);
				return transformOutput(returned, model);
			},
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
				const res = (await builder.where(...clause)) as any[];
				return res.map((r) => transformOutput(r, model));
			},
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
			async update(data) {
				const { model, where, update: values } = data;
				const schemaModel = getSchema(model);
				const clause = convertWhereClause(where, model);
				const transformed = transformInput(values, model, 'update');
				const builder = db
					.update(schemaModel)
					.set(transformed)
					.where(...clause);
				const returned = await withReturning(
					model,
					builder,
					transformed,
					where
				);
				return transformOutput(returned, model);
			},
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
			async delete(data) {
				const { model, where } = data;
				const schemaModel = getSchema(model);
				const clause = convertWhereClause(where, model);
				const builder = db.delete(schemaModel).where(...clause);
				await builder;
			},
			async deleteMany(data) {
				const { model, where } = data;
				const schemaModel = getSchema(model);
				const clause = convertWhereClause(where, model); //con
				const builder = db.delete(schemaModel).where(...clause);
				const res = await builder;
				return res ? res.length : 0;
			},
			options: config,
		} satisfies Adapter;
	};

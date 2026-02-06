import type { InferFumaDB } from 'fumadb';
import type { LatestDB } from './schema';

type ORM = ReturnType<InferFumaDB<typeof LatestDB>['orm']>;

const SCOPED_METHODS = new Set([
	'create',
	'createMany',
	'findFirst',
	'findMany',
	'count',
	'updateMany',
	'deleteMany',
	'upsert',
	'transaction',
]);

/**
 * Wraps a FumaDB ORM instance to automatically scope all queries to a specific tenant.
 *
 * Uses a Proxy so that any ORM method not explicitly handled will throw,
 * preventing future methods from silently bypassing tenant scoping.
 *
 * - `create`/`createMany`: Injects `tenantId` into the data
 * - `findFirst`/`findMany`/`count`: Adds `tenantId` filter to the `where` clause
 * - `updateMany`/`deleteMany`: Adds `tenantId` filter to the `where` clause
 * - `upsert`: Adds `tenantId` filter to the `where` clause and injects into create data
 * - `transaction`: Returns a tenant-scoped transaction
 *
 * When `tenantId` is not set, this function should not be called — the raw ORM is used directly.
 */
export function withTenantScope(db: ORM, tenantId: string): ORM {
	const scopeWhere = (originalWhere: ((b: any) => any) | undefined, b: any) => {
		const tenantFilter = b('tenantId', '=', tenantId);
		return originalWhere ? b.and(originalWhere(b), tenantFilter) : tenantFilter;
	};

	const scopedMethods: Record<string, (...args: any[]) => any> = {
		create: (table: any, data: any) => db.create(table, { ...data, tenantId }),

		createMany: (table: any, items: any[]) =>
			db.createMany(
				table,
				items.map((d: any) => ({ ...d, tenantId }))
			),

		findFirst: (table: any, opts: any) =>
			db.findFirst(table, {
				...opts,
				where: (b: any) => scopeWhere(opts?.where, b),
			}),

		findMany: (table: any, opts?: any) =>
			db.findMany(table, {
				...opts,
				where: (b: any) => scopeWhere(opts?.where, b),
			}),

		count: (table: any, opts?: any) =>
			db.count(table, {
				...opts,
				where: (b: any) => scopeWhere(opts?.where, b),
			}),

		updateMany: (table: any, opts: any) =>
			db.updateMany(table, {
				...opts,
				where: (b: any) => scopeWhere(opts?.where, b),
			}),

		deleteMany: (table: any, opts: any) =>
			db.deleteMany(table, {
				...opts,
				where: (b: any) => scopeWhere(opts?.where, b),
			}),

		upsert: (table: any, opts: any) =>
			db.upsert(table, {
				...opts,
				where: (b: any) => scopeWhere(opts?.where, b),
				create: { ...opts.create, tenantId },
			}),

		transaction: (fn: any) =>
			db.transaction((tx: any) => fn(withTenantScope(tx, tenantId))),
	};

	return new Proxy(db, {
		get(_target, prop, _receiver) {
			if (typeof prop === 'string' && SCOPED_METHODS.has(prop)) {
				return scopedMethods[prop];
			}
			// Allow symbol access (e.g. Symbol.toStringTag) and standard object props
			if (typeof prop === 'symbol') {
				return Reflect.get(db, prop);
			}
			throw new Error(
				`withTenantScope: method "${prop}" is not tenant-scoped. ` +
					'Add an explicit scoped wrapper before using it.'
			);
		},
	}) as ORM;
}

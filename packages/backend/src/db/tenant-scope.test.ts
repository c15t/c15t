import { describe, expect, it, vi } from 'vitest';
import { withTenantScope } from './tenant-scope';

/**
 * A minimal in-memory database that implements the ORM interface well enough
 * to prove real data isolation.  Records are stored in a flat Map<table, rows[]>
 * and the where-builder evaluates conditions against actual row data.
 */
function createInMemoryOrm() {
	const store = new Map<string, Record<string, any>[]>();

	const getTable = (table: string) => {
		if (!store.has(table)) store.set(table, []);
		return store.get(table)!;
	};

	// Minimal where-builder that evaluates conditions against a row
	const createBuilder = (row: Record<string, any>) => {
		const b: any = (col: string, op: string, val: any) => {
			if (op === '=') return row[col] === val;
			if (op === '!=') return row[col] !== val;
			return false;
		};
		b.and = (...conds: boolean[]) => conds.every(Boolean);
		b.or = (...conds: boolean[]) => conds.some(Boolean);
		return b;
	};

	const matchesWhere = (
		row: Record<string, any>,
		where?: (b: any) => boolean
	) => {
		if (!where) return true;
		return where(createBuilder(row));
	};

	const orm: any = {
		create: (table: string, data: any) => {
			getTable(table).push({ ...data });
			return Promise.resolve({ ...data });
		},

		createMany: (table: string, items: any[]) => {
			const rows = items.map((d) => ({ ...d }));
			getTable(table).push(...rows);
			return Promise.resolve(rows);
		},

		findFirst: (table: string, opts?: any) => {
			const rows = getTable(table);
			const found = rows.find((r) => matchesWhere(r, opts?.where));
			return Promise.resolve(found ?? null);
		},

		findMany: (table: string, opts?: any) => {
			const rows = getTable(table);
			return Promise.resolve(rows.filter((r) => matchesWhere(r, opts?.where)));
		},

		count: (table: string, opts?: any) => {
			const rows = getTable(table);
			return Promise.resolve(
				rows.filter((r) => matchesWhere(r, opts?.where)).length
			);
		},

		updateMany: (table: string, opts: any) => {
			const rows = getTable(table);
			let updated = 0;
			for (const row of rows) {
				if (matchesWhere(row, opts?.where)) {
					Object.assign(row, opts.set);
					updated++;
				}
			}
			return Promise.resolve(updated);
		},

		deleteMany: (table: string, opts: any) => {
			const rows = getTable(table);
			const remaining = rows.filter((r) => !matchesWhere(r, opts?.where));
			const deleted = rows.length - remaining.length;
			store.set(table, remaining);
			return Promise.resolve(deleted);
		},

		upsert: (table: string, opts: any) => {
			const rows = getTable(table);
			const existing = rows.find((r) => matchesWhere(r, opts?.where));
			if (existing) {
				Object.assign(existing, opts.update);
				return Promise.resolve(existing);
			}
			const created = { ...opts.create };
			rows.push(created);
			return Promise.resolve(created);
		},

		transaction: (fn: any) => fn(orm),
	};

	return { orm, store };
}

function createMockOrm() {
	return {
		create: vi.fn().mockResolvedValue({ id: 'test_1' }),
		createMany: vi.fn().mockResolvedValue([{ _id: 'test_1' }]),
		findFirst: vi.fn().mockResolvedValue({ id: 'test_1' }),
		findMany: vi.fn().mockResolvedValue([{ id: 'test_1' }]),
		count: vi.fn().mockResolvedValue(1),
		updateMany: vi.fn().mockResolvedValue(undefined),
		deleteMany: vi.fn().mockResolvedValue(undefined),
		upsert: vi.fn().mockResolvedValue(undefined),
		transaction: vi.fn().mockImplementation((fn: any) => fn(createMockOrm())),
	} as any;
}

// A minimal where builder mock that captures calls for assertion
function createWhereBuilder() {
	const builder: any = (col: string, op: string, val: any) => ({
		_type: 'condition',
		col,
		op,
		val,
	});
	builder.and = (...conditions: any[]) => ({
		_type: 'and',
		conditions,
	});
	builder.or = (...conditions: any[]) => ({
		_type: 'or',
		conditions,
	});
	builder.not = (v: any) => ({ _type: 'not', v });
	builder.isNull = (a: string) => ({ _type: 'isNull', a });
	builder.isNotNull = (a: string) => ({ _type: 'isNotNull', a });
	return builder;
}

describe('withTenantScope', () => {
	const tenantId = 'tenant_abc';

	describe('create', () => {
		it('should inject tenantId into created data', async () => {
			const db = createMockOrm();
			const scoped = withTenantScope(db, tenantId);

			await scoped.create('subject', {
				id: 'sub_1',
				externalId: null,
				identityProvider: 'anonymous',
				isIdentified: false,
			} as any);

			expect(db.create).toHaveBeenCalledWith('subject', {
				id: 'sub_1',
				externalId: null,
				identityProvider: 'anonymous',
				isIdentified: false,
				tenantId: 'tenant_abc',
			});
		});
	});

	describe('createMany', () => {
		it('should inject tenantId into all items', async () => {
			const db = createMockOrm();
			const scoped = withTenantScope(db, tenantId);

			await scoped.createMany('subject', [
				{ id: 'sub_1', isIdentified: false } as any,
				{ id: 'sub_2', isIdentified: true } as any,
			]);

			expect(db.createMany).toHaveBeenCalledWith('subject', [
				{ id: 'sub_1', isIdentified: false, tenantId: 'tenant_abc' },
				{ id: 'sub_2', isIdentified: true, tenantId: 'tenant_abc' },
			]);
		});
	});

	describe('findFirst', () => {
		it('should add tenantId filter to where clause', async () => {
			const db = createMockOrm();
			const scoped = withTenantScope(db, tenantId);

			const originalWhere = (b: any) => b('id', '=', 'sub_1');

			await scoped.findFirst('subject', {
				where: originalWhere,
			});

			expect(db.findFirst).toHaveBeenCalledTimes(1);
			const passedOpts = db.findFirst.mock.calls[0][1];

			// Verify the where clause includes tenantId
			const b = createWhereBuilder();
			const result = passedOpts.where(b);
			expect(result).toEqual({
				_type: 'and',
				conditions: [
					{ _type: 'condition', col: 'id', op: '=', val: 'sub_1' },
					{
						_type: 'condition',
						col: 'tenantId',
						op: '=',
						val: 'tenant_abc',
					},
				],
			});
		});

		it('should use only tenantId filter when no original where', async () => {
			const db = createMockOrm();
			const scoped = withTenantScope(db, tenantId);

			await scoped.findFirst('subject', {} as any);

			const passedOpts = db.findFirst.mock.calls[0][1];
			const b = createWhereBuilder();
			const result = passedOpts.where(b);
			expect(result).toEqual({
				_type: 'condition',
				col: 'tenantId',
				op: '=',
				val: 'tenant_abc',
			});
		});
	});

	describe('findMany', () => {
		it('should add tenantId filter to where clause', async () => {
			const db = createMockOrm();
			const scoped = withTenantScope(db, tenantId);

			await scoped.findMany('consent', {
				where: (b: any) => b('subjectId', '=', 'sub_1'),
			});

			const passedOpts = db.findMany.mock.calls[0][1];
			const b = createWhereBuilder();
			const result = passedOpts.where(b);
			expect(result).toEqual({
				_type: 'and',
				conditions: [
					{
						_type: 'condition',
						col: 'subjectId',
						op: '=',
						val: 'sub_1',
					},
					{
						_type: 'condition',
						col: 'tenantId',
						op: '=',
						val: 'tenant_abc',
					},
				],
			});
		});

		it('should handle findMany with no options', async () => {
			const db = createMockOrm();
			const scoped = withTenantScope(db, tenantId);

			await scoped.findMany('subject');

			const passedOpts = db.findMany.mock.calls[0][1];
			const b = createWhereBuilder();
			const result = passedOpts.where(b);
			expect(result).toEqual({
				_type: 'condition',
				col: 'tenantId',
				op: '=',
				val: 'tenant_abc',
			});
		});
	});

	describe('count', () => {
		it('should add tenantId filter to where clause', async () => {
			const db = createMockOrm();
			const scoped = withTenantScope(db, tenantId);

			await scoped.count('subject', {
				where: (b: any) => b('isIdentified', '=', true),
			});

			const passedOpts = db.count.mock.calls[0][1];
			const b = createWhereBuilder();
			const result = passedOpts.where(b);
			expect(result).toEqual({
				_type: 'and',
				conditions: [
					{
						_type: 'condition',
						col: 'isIdentified',
						op: '=',
						val: true,
					},
					{
						_type: 'condition',
						col: 'tenantId',
						op: '=',
						val: 'tenant_abc',
					},
				],
			});
		});
	});

	describe('updateMany', () => {
		it('should add tenantId filter to where clause', async () => {
			const db = createMockOrm();
			const scoped = withTenantScope(db, tenantId);

			await scoped.updateMany('subject', {
				where: (b: any) => b('id', '=', 'sub_1'),
				set: { identityProvider: 'google' },
			});

			const passedOpts = db.updateMany.mock.calls[0][1];

			// Verify set is preserved
			expect(passedOpts.set).toEqual({ identityProvider: 'google' });

			// Verify where includes tenantId
			const b = createWhereBuilder();
			const result = passedOpts.where(b);
			expect(result).toEqual({
				_type: 'and',
				conditions: [
					{ _type: 'condition', col: 'id', op: '=', val: 'sub_1' },
					{
						_type: 'condition',
						col: 'tenantId',
						op: '=',
						val: 'tenant_abc',
					},
				],
			});
		});
	});

	describe('deleteMany', () => {
		it('should add tenantId filter to where clause', async () => {
			const db = createMockOrm();
			const scoped = withTenantScope(db, tenantId);

			await scoped.deleteMany('consent', {
				where: (b: any) => b('id', '=', 'cns_1'),
			});

			const passedOpts = db.deleteMany.mock.calls[0][1];
			const b = createWhereBuilder();
			const result = passedOpts.where(b);
			expect(result).toEqual({
				_type: 'and',
				conditions: [
					{ _type: 'condition', col: 'id', op: '=', val: 'cns_1' },
					{
						_type: 'condition',
						col: 'tenantId',
						op: '=',
						val: 'tenant_abc',
					},
				],
			});
		});
	});

	describe('upsert', () => {
		it('should add tenantId to where clause and create data', async () => {
			const db = createMockOrm();
			const scoped = withTenantScope(db, tenantId);

			await scoped.upsert('subject', {
				where: (b: any) => b('externalId', '=', 'ext_1'),
				create: {
					id: 'sub_1',
					externalId: 'ext_1',
					isIdentified: true,
				} as any,
				update: { identityProvider: 'google' },
			});

			const passedOpts = db.upsert.mock.calls[0][1];

			// Verify create includes tenantId
			expect(passedOpts.create).toEqual({
				id: 'sub_1',
				externalId: 'ext_1',
				isIdentified: true,
				tenantId: 'tenant_abc',
			});

			// Verify update is preserved
			expect(passedOpts.update).toEqual({ identityProvider: 'google' });

			// Verify where includes tenantId
			const b = createWhereBuilder();
			const result = passedOpts.where(b);
			expect(result).toEqual({
				_type: 'and',
				conditions: [
					{
						_type: 'condition',
						col: 'externalId',
						op: '=',
						val: 'ext_1',
					},
					{
						_type: 'condition',
						col: 'tenantId',
						op: '=',
						val: 'tenant_abc',
					},
				],
			});
		});
	});

	describe('transaction', () => {
		it('should provide a tenant-scoped ORM inside transaction', async () => {
			const innerDb = createMockOrm();
			const db = createMockOrm();
			db.transaction.mockImplementation((fn: any) => fn(innerDb));

			const scoped = withTenantScope(db, tenantId);

			await scoped.transaction(async (tx) => {
				await tx.create('subject', {
					id: 'sub_1',
					isIdentified: false,
				} as any);
				await tx.findFirst('subject', {
					where: (b: any) => b('id', '=', 'sub_1'),
				});
			});

			// The inner db should have tenantId injected
			expect(innerDb.create).toHaveBeenCalledWith('subject', {
				id: 'sub_1',
				isIdentified: false,
				tenantId: 'tenant_abc',
			});

			const findOpts = innerDb.findFirst.mock.calls[0][1];
			const b = createWhereBuilder();
			const result = findOpts.where(b);
			expect(result).toEqual({
				_type: 'and',
				conditions: [
					{ _type: 'condition', col: 'id', op: '=', val: 'sub_1' },
					{
						_type: 'condition',
						col: 'tenantId',
						op: '=',
						val: 'tenant_abc',
					},
				],
			});
		});
	});

	describe('data isolation (mock)', () => {
		it('should scope different tenants to their own data', async () => {
			const db = createMockOrm();
			const tenantA = withTenantScope(db, 'tenant_a');
			const tenantB = withTenantScope(db, 'tenant_b');

			await tenantA.create('subject', { id: 'sub_1' } as any);
			await tenantB.create('subject', { id: 'sub_2' } as any);

			expect(db.create).toHaveBeenCalledWith('subject', {
				id: 'sub_1',
				tenantId: 'tenant_a',
			});
			expect(db.create).toHaveBeenCalledWith('subject', {
				id: 'sub_2',
				tenantId: 'tenant_b',
			});

			// Each tenant's findMany should have its own tenantId filter
			await tenantA.findMany('subject');
			await tenantB.findMany('subject');

			const b = createWhereBuilder();

			const tenantAOpts = db.findMany.mock.calls[0][1];
			expect(tenantAOpts.where(b)).toEqual({
				_type: 'condition',
				col: 'tenantId',
				op: '=',
				val: 'tenant_a',
			});

			const tenantBOpts = db.findMany.mock.calls[1][1];
			expect(tenantBOpts.where(b)).toEqual({
				_type: 'condition',
				col: 'tenantId',
				op: '=',
				val: 'tenant_b',
			});
		});
	});
});

// ===========================================================================
// Integration tests — real in-memory store proving row-level isolation
// ===========================================================================

describe('withTenantScope – row-level isolation (integration)', () => {
	it('tenant A cannot see subjects created by tenant B', async () => {
		const { orm } = createInMemoryOrm();
		const tenantA = withTenantScope(orm, 'tenant_a');
		const tenantB = withTenantScope(orm, 'tenant_b');

		await tenantA.create('subject', {
			id: 'sub_1',
			externalId: 'Alice',
		} as any);
		await tenantB.create('subject', { id: 'sub_2', externalId: 'Bob' } as any);

		const aSubjects = await tenantA.findMany('subject');
		const bSubjects = await tenantB.findMany('subject');

		expect(aSubjects).toHaveLength(1);
		expect(aSubjects[0]!.id).toBe('sub_1');
		expect(aSubjects[0]!.externalId).toBe('Alice');

		expect(bSubjects).toHaveLength(1);
		expect(bSubjects[0]!.id).toBe('sub_2');
		expect(bSubjects[0]!.externalId).toBe('Bob');
	});

	it('findFirst only returns records belonging to the querying tenant', async () => {
		const { orm } = createInMemoryOrm();
		const tenantA = withTenantScope(orm, 'tenant_a');
		const tenantB = withTenantScope(orm, 'tenant_b');

		await tenantA.create('consent', { id: 'cns_1', subjectId: 'sub_1' } as any);

		const fromA = await tenantA.findFirst('consent', {
			where: (b: any) => b('id', '=', 'cns_1'),
		});
		const fromB = await tenantB.findFirst('consent', {
			where: (b: any) => b('id', '=', 'cns_1'),
		});

		expect(fromA).not.toBeNull();
		expect(fromA!.id).toBe('cns_1');
		expect(fromB).toBeNull();
	});

	it('count only counts records belonging to the querying tenant', async () => {
		const { orm } = createInMemoryOrm();
		const tenantA = withTenantScope(orm, 'tenant_a');
		const tenantB = withTenantScope(orm, 'tenant_b');

		await tenantA.create('subject', { id: 'sub_1' } as any);
		await tenantA.create('subject', { id: 'sub_2' } as any);
		await tenantB.create('subject', { id: 'sub_3' } as any);

		expect(await tenantA.count('subject')).toBe(2);
		expect(await tenantB.count('subject')).toBe(1);
	});

	it("updateMany only affects the calling tenant's rows", async () => {
		const { orm } = createInMemoryOrm();
		const tenantA = withTenantScope(orm, 'tenant_a');
		const tenantB = withTenantScope(orm, 'tenant_b');

		await tenantA.create('subject', {
			id: 'sub_1',
			identityProvider: '1.1.1.1',
		} as any);
		await tenantB.create('subject', {
			id: 'sub_2',
			identityProvider: '2.2.2.2',
		} as any);

		// Tenant A updates all their subjects
		await tenantA.updateMany('subject', {
			where: (b: any) => b('id', '=', 'sub_1'),
			set: { identityProvider: '9.9.9.9' },
		});

		// Tenant A's row is updated
		const aRow = await tenantA.findFirst('subject', {
			where: (b: any) => b('id', '=', 'sub_1'),
		});
		expect(aRow!.identityProvider).toBe('9.9.9.9');

		// Tenant B's row is untouched
		const bRow = await tenantB.findFirst('subject', {
			where: (b: any) => b('id', '=', 'sub_2'),
		});
		expect(bRow!.identityProvider).toBe('2.2.2.2');
	});

	it("deleteMany only deletes the calling tenant's rows", async () => {
		const { orm } = createInMemoryOrm();
		const tenantA = withTenantScope(orm, 'tenant_a');
		const tenantB = withTenantScope(orm, 'tenant_b');

		await tenantA.create('domain', { id: 'dom_1', name: 'a.com' } as any);
		await tenantB.create('domain', { id: 'dom_2', name: 'b.com' } as any);

		// Tenant A deletes their domain
		await tenantA.deleteMany('domain', {
			where: (b: any) => b('id', '=', 'dom_1'),
		});

		expect(await tenantA.findMany('domain')).toHaveLength(0);
		expect(await tenantB.findMany('domain')).toHaveLength(1);
	});

	it('upsert creates with tenantId and only matches own rows', async () => {
		const { orm } = createInMemoryOrm();
		const tenantA = withTenantScope(orm, 'tenant_a');
		const tenantB = withTenantScope(orm, 'tenant_b');

		// Tenant A upserts — creates since row doesn't exist
		await tenantA.upsert('subject', {
			where: (b: any) => b('externalId', '=', 'ext_1'),
			create: {
				id: 'sub_1',
				externalId: 'ext_1',
				identityProvider: '1.1.1.1',
			} as any,
			update: { identityProvider: '9.9.9.9' },
		});

		// Tenant B upserts same externalId — should also CREATE (not update A's row)
		await tenantB.upsert('subject', {
			where: (b: any) => b('externalId', '=', 'ext_1'),
			create: {
				id: 'sub_2',
				externalId: 'ext_1',
				identityProvider: '2.2.2.2',
			} as any,
			update: { identityProvider: '8.8.8.8' },
		});

		const aRows = await tenantA.findMany('subject');
		const bRows = await tenantB.findMany('subject');

		// Each tenant has their own row, even though externalId is the same
		expect(aRows).toHaveLength(1);
		expect(aRows[0]!.id).toBe('sub_1');
		expect(aRows[0]!.identityProvider).toBe('1.1.1.1'); // unchanged

		expect(bRows).toHaveLength(1);
		expect(bRows[0]!.id).toBe('sub_2');
		expect(bRows[0]!.identityProvider).toBe('2.2.2.2'); // created, not updated from A
	});

	it("tenant A cannot update tenant B's row even with matching id", async () => {
		const { orm } = createInMemoryOrm();
		const tenantA = withTenantScope(orm, 'tenant_a');
		const tenantB = withTenantScope(orm, 'tenant_b');

		await tenantB.create('subject', {
			id: 'sub_1',
			identityProvider: '2.2.2.2',
		} as any);

		// Tenant A tries to update sub_1 which belongs to B
		await tenantA.updateMany('subject', {
			where: (b: any) => b('id', '=', 'sub_1'),
			set: { identityProvider: 'hacked' },
		});

		// B's row is still untouched
		const bRow = await tenantB.findFirst('subject', {
			where: (b: any) => b('id', '=', 'sub_1'),
		});
		expect(bRow!.identityProvider).toBe('2.2.2.2');
	});

	it("tenant A cannot delete tenant B's row even with matching id", async () => {
		const { orm } = createInMemoryOrm();
		const tenantA = withTenantScope(orm, 'tenant_a');
		const tenantB = withTenantScope(orm, 'tenant_b');

		await tenantB.create('domain', { id: 'dom_1', name: 'b.com' } as any);

		// Tenant A tries to delete dom_1 which belongs to B
		await tenantA.deleteMany('domain', {
			where: (b: any) => b('id', '=', 'dom_1'),
		});

		// B's row still exists
		expect(await tenantB.findMany('domain')).toHaveLength(1);
	});

	it('transaction inherits tenant scope', async () => {
		const { orm } = createInMemoryOrm();
		const tenantA = withTenantScope(orm, 'tenant_a');
		const tenantB = withTenantScope(orm, 'tenant_b');

		await tenantA.transaction(async (tx) => {
			await tx.create('subject', {
				id: 'sub_tx',
				externalId: 'TxAlice',
			} as any);
		});

		// Visible to tenant A
		const aResult = await tenantA.findFirst('subject', {
			where: (b: any) => b('id', '=', 'sub_tx'),
		});
		expect(aResult).not.toBeNull();
		expect(aResult!.externalId).toBe('TxAlice');

		// Invisible to tenant B
		const bResult = await tenantB.findFirst('subject', {
			where: (b: any) => b('id', '=', 'sub_tx'),
		});
		expect(bResult).toBeNull();
	});

	it('three tenants sharing same database are fully isolated', async () => {
		const { orm, store } = createInMemoryOrm();
		const t1 = withTenantScope(orm, 'inst_001');
		const t2 = withTenantScope(orm, 'inst_002');
		const t3 = withTenantScope(orm, 'inst_003');

		await t1.create('subject', { id: 'sub_1' } as any);
		await t2.create('subject', { id: 'sub_2' } as any);
		await t2.create('subject', { id: 'sub_3' } as any);
		await t3.create('subject', { id: 'sub_4' } as any);
		await t3.create('subject', { id: 'sub_5' } as any);
		await t3.create('subject', { id: 'sub_6' } as any);

		// Underlying store has all 6 rows
		expect(store.get('subject')).toHaveLength(6);

		// But each tenant only sees their own
		expect(await t1.count('subject')).toBe(1);
		expect(await t2.count('subject')).toBe(2);
		expect(await t3.count('subject')).toBe(3);

		expect(await t1.findMany('subject')).toHaveLength(1);
		expect(await t2.findMany('subject')).toHaveLength(2);
		expect(await t3.findMany('subject')).toHaveLength(3);
	});
});

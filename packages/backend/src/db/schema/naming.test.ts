import { describe, expect, it } from 'vitest';
import { v2 } from './2.0.0';
import {
	buildNamingVariants,
	compareNameVariants,
	exportNameVariantsForVersion,
	lowerCaseTables,
	NamingOptionsError,
	namingFingerprint,
	snakeCaseTables,
} from './naming';

describe('snakeCaseTables', () => {
	it('snake_cases every table and column found in the schema', () => {
		const tables = snakeCaseTables();

		expect(tables.consentPolicy?.name).toBe('consent_policy');
		expect(tables.runtimePolicyDecision?.name).toBe('runtime_policy_decision');
		expect(tables.consent?.fields?.subjectId).toBe('subject_id');
		expect(tables.consent?.fields?.tcString).toBe('tc_string');
	});

	it('emits an entry for every table and field in the latest schema', () => {
		const tables = snakeCaseTables();
		for (const [tableName, table] of Object.entries(v2.tables)) {
			expect(tables[tableName]).toBeDefined();
			for (const colName of Object.keys(table.columns)) {
				expect(tables[tableName]?.fields?.[colName]).toBeDefined();
			}
		}
	});

	it('returns the same shape as a manual override map', () => {
		const tables = snakeCaseTables();
		// shape check: every entry has at least `name`, with a non-null `fields`
		// object (buildTablesMap always assigns `fields: existing?.fields ?? {}`)
		for (const value of Object.values(tables)) {
			expect(typeof value.name).toBe('string');
			expect(value.fields).toBeDefined();
			expect(value.fields).not.toBeNull();
			expect(typeof value.fields).toBe('object');
		}
	});

	it('merges columns from older schema versions so legacy migrations rename them', () => {
		const tables = snakeCaseTables();
		// `consentRecord` only exists in v1.0.0 — it was removed in v2.0.0,
		// but Kysely-based legacy → latest migrations still need its DB
		// identifiers renamed so the DROP TABLE statement targets the right
		// SQL name.
		expect(tables.consentRecord?.name).toBe('consent_record');
		// `subject.lastIpAddress` is v1-only; same rationale.
		expect(tables.subject?.fields?.lastIpAddress).toBe('last_ip_address');
	});
});

describe('lowerCaseTables', () => {
	it('lowercases without inserting separators', () => {
		const tables = lowerCaseTables();
		expect(tables.consentPolicy?.name).toBe('consentpolicy');
		expect(tables.consent?.fields?.subjectId).toBe('subjectid');
	});
});

describe('buildNamingVariants', () => {
	it('returns null when options are omitted (backwards-compat fast path)', () => {
		expect(buildNamingVariants(undefined)).toBeNull();
	});

	it('returns null when tables is empty', () => {
		expect(buildNamingVariants({ tables: {} })).toBeNull();
	});

	it('returns null when overrides leave every name unchanged', () => {
		expect(
			buildNamingVariants({
				tables: { consent: { name: 'consent' } },
			})
		).toBeNull();
	});

	it('overrides both sql and mongodb so every adapter renames consistently', () => {
		const variants = buildNamingVariants({ tables: snakeCaseTables() });

		expect(variants?.consentPolicy).toEqual({
			sql: 'consent_policy',
			mongodb: 'consent_policy',
		});
		expect(variants?.['consent.subjectId']).toEqual({
			sql: 'subject_id',
			mongodb: 'subject_id',
		});
	});

	it('applies a manual per-table override', () => {
		const variants = buildNamingVariants({
			tables: {
				consentPolicy: {
					name: 'consent_policies',
				},
			},
		});

		expect(variants?.consentPolicy).toEqual({
			sql: 'consent_policies',
			mongodb: 'consent_policies',
		});
		expect(variants?.['consentPolicy.effectiveDate']).toBeUndefined();
	});

	it('applies a complete manual field override', () => {
		const tables = snakeCaseTables();
		const variants = buildNamingVariants({
			tables: {
				consentPolicy: {
					...tables.consentPolicy,
					fields: {
						...tables.consentPolicy?.fields,
						effectiveDate: 'policy_effective_date',
					},
				},
			},
		});

		expect(variants?.['consentPolicy.effectiveDate']).toEqual({
			sql: 'policy_effective_date',
			mongodb: 'policy_effective_date',
		});
	});

	it('lets a manual override win over a bulk-utility entry via spread', () => {
		const variants = buildNamingVariants({
			tables: {
				...snakeCaseTables(),
				auditLog: { name: 'audit_trail' },
			},
		});

		expect(variants?.auditLog).toEqual({
			sql: 'audit_trail',
			mongodb: 'audit_trail',
		});
		// other tables still snake_cased by the utility
		expect(variants?.consentPolicy).toEqual({
			sql: 'consent_policy',
			mongodb: 'consent_policy',
		});
	});

	it('lets a manual field override win over a bulk-utility field via spread', () => {
		const tables = snakeCaseTables();
		const variants = buildNamingVariants({
			tables: {
				...tables,
				consent: {
					...tables.consent,
					fields: {
						...tables.consent?.fields,
						subjectId: 'custom_subject_id',
					},
				},
			},
		});

		// manually overridden field wins
		expect(variants?.['consent.subjectId']).toEqual({
			sql: 'custom_subject_id',
			mongodb: 'custom_subject_id',
		});
		// sibling field on the same table still uses the utility's snake_case
		expect(variants?.['consent.tcString']).toEqual({
			sql: 'tc_string',
			mongodb: 'tc_string',
		});
	});

	it('throws for override keys that are not part of the schema', () => {
		expect(() =>
			buildNamingVariants({
				tables: {
					doesNotExist: { name: 'whatever' },
					consent: { fields: { alsoMissing: 'x' } },
				},
			})
		).toThrow(NamingOptionsError);
	});

	it('throws when a field map is missing known columns', () => {
		expect(() =>
			buildNamingVariants({
				tables: {
					consent: { fields: { subjectId: 'subject_id' } },
				},
			})
		).toThrow(/field map is missing/);
	});
});

describe('persisted naming variants', () => {
	it('exports the effective persisted shape for a schema version', () => {
		const exported = exportNameVariantsForVersion([v2], '2.0.0');

		expect(exported?.consent?.sql).toBe('consent');
		expect(exported?.['consent.subjectId']?.mongodb).toBe('subjectId');
		expect(exported?.runtimePolicyDecision?.sql).toBe('runtimePolicyDecision');
	});

	it('compares stored and current DB-side name variants', () => {
		const stored = exportNameVariantsForVersion([v2], '2.0.0');
		const current = exportNameVariantsForVersion([v2], '2.0.0');
		if (!(stored && current)) {
			throw new Error('expected test schema to export name variants');
		}
		current.consent = {
			...current.consent,
			sql: 'consents',
			mongodb: 'consents',
		};

		expect(compareNameVariants(stored, current)).toEqual([
			{
				path: 'consent',
				variant: 'sql',
				expected: 'consents',
				actual: 'consent',
			},
			{
				path: 'consent',
				variant: 'mongodb',
				expected: 'consents',
				actual: 'consent',
			},
		]);
	});

	it('builds a stable fingerprint for persisted naming maps', () => {
		const variants = exportNameVariantsForVersion([v2], '2.0.0');
		if (!variants) {
			throw new Error('expected test schema to export name variants');
		}

		expect(namingFingerprint(variants)).toBe(namingFingerprint(variants));
		expect(namingFingerprint(variants)).toMatch(/^[0-9a-f]{8}$/);
	});
});

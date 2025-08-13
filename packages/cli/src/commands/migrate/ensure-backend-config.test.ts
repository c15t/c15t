import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clack/prompts', () => {
	return {
		select: vi.fn(),
		confirm: vi.fn(),
		text: vi.fn(),
		isCancel: (value: unknown) => value === Symbol.for('CANCEL'),
	};
});

import * as prompts from '@clack/prompts';

import { ensureBackendConfig } from './ensure-backend-config';

const createMockContext = (cwd: string) => ({
	cwd,
	logger: {
		debug: vi.fn(),
		success: vi.fn(),
		note: vi.fn(),
	},
	error: {
		handleCancel: vi.fn(() => null),
	},
});

async function makeTmpDir(prefix: string): Promise<string> {
	const base = await fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
	return base;
}

function readGeneratedConfig(cwd: string): Promise<string> {
	const target = path.join(cwd, 'c15t-backend.config.ts');
	return fs.readFile(target, 'utf8');
}

beforeEach(() => {
	(prompts.select as unknown as ReturnType<typeof vi.fn>).mockReset();
	(prompts.confirm as unknown as ReturnType<typeof vi.fn>).mockReset();
	(prompts.text as unknown as ReturnType<typeof vi.fn>).mockReset();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('ensureBackendConfig generation', () => {
	it('generates Kysely (PostgreSQL) config with db prelude', async () => {
		const cwd = await makeTmpDir('c15t-kysely-pg');
		(
			prompts.select as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce('kyselyAdapter'); // adapter
		(
			prompts.select as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce('postgresql'); // provider
		(
			prompts.confirm as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce(true); // use env
		(prompts.text as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			'DATABASE_URL'
		); // env var name

		await ensureBackendConfig(
			createMockContext(cwd) as unknown as Parameters<
				typeof ensureBackendConfig
			>[0]
		);
		const content = await readGeneratedConfig(cwd);

		expect(content).toContain(
			"import { Kysely, PostgresDialect } from 'kysely'"
		);
		expect(content).toContain("import { Pool } from 'pg'");
		expect(content).toContain('connectionString: process.env.DATABASE_URL!');
		expect(content).toContain("kyselyAdapter({ provider: 'postgresql', db })");
	});

	it('generates Drizzle (SQLite) config with db prelude', async () => {
		const cwd = await makeTmpDir('c15t-drizzle-sqlite');
		(
			prompts.select as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce('drizzleAdapter'); // adapter
		(
			prompts.select as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce('sqlite'); // provider
		(prompts.text as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			'./db.sqlite'
		); // sqlite path

		await ensureBackendConfig(
			createMockContext(cwd) as unknown as Parameters<
				typeof ensureBackendConfig
			>[0]
		);
		const content = await readGeneratedConfig(cwd);

		expect(content).toContain(
			"import { drizzle } from 'drizzle-orm/better-sqlite3'"
		);
		expect(content).toContain('new Database("./db.sqlite")');
		expect(content).toContain("drizzleAdapter({ provider: 'sqlite', db })");
	});

	it('generates Prisma (MongoDB) config with prisma prelude', async () => {
		const cwd = await makeTmpDir('c15t-prisma-mongo');
		(
			prompts.select as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce('prismaAdapter'); // adapter
		(
			prompts.select as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce('mongodb'); // provider
		(
			prompts.confirm as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce(true); // use env
		(prompts.text as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			'MONGODB_URI'
		); // env var name

		await ensureBackendConfig(
			createMockContext(cwd) as unknown as Parameters<
				typeof ensureBackendConfig
			>[0]
		);
		const content = await readGeneratedConfig(cwd);

		expect(content).toContain("import { PrismaClient } from '@prisma/client'");
		expect(content).toContain('const prisma = new PrismaClient(');
		expect(content).toContain("prismaAdapter({ provider: 'mongodb', prisma })");
	});

	it('generates TypeORM (MySQL) config with source prelude', async () => {
		const cwd = await makeTmpDir('c15t-typeorm-mysql');
		(
			prompts.select as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce('typeormAdapter'); // adapter
		(
			prompts.select as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce('mysql'); // provider
		(
			prompts.confirm as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce(true); // use env
		(prompts.text as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			'DATABASE_URL'
		); // env var name

		await ensureBackendConfig(
			createMockContext(cwd) as unknown as Parameters<
				typeof ensureBackendConfig
			>[0]
		);
		const content = await readGeneratedConfig(cwd);

		expect(content).toContain("import { DataSource } from 'typeorm'");
		expect(content).toContain("type: 'mysql'");
		expect(content).toContain('url: process.env.DATABASE_URL!');
		expect(content).toContain("typeormAdapter({ provider: 'mysql', source })");
	});

	it('generates Mongo adapter config with client prelude', async () => {
		const cwd = await makeTmpDir('c15t-mongo');
		(
			prompts.select as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce('mongoAdapter'); // adapter
		// provider not asked (only one)
		(
			prompts.confirm as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce(true); // use env
		(prompts.text as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			'MONGODB_URI'
		); // env var name

		await ensureBackendConfig(
			createMockContext(cwd) as unknown as Parameters<
				typeof ensureBackendConfig
			>[0]
		);
		const content = await readGeneratedConfig(cwd);

		expect(content).toContain("import { MongoClient } from 'mongodb'");
		expect(content).toContain('new MongoClient(process.env.MONGODB_URI!)');
		expect(content).toContain('mongoAdapter({ client })');
	});
});

// (Removed duplicate block accidentally introduced)

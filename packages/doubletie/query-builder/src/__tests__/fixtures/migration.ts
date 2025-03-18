//@ts-ignore
import SQLiteDatabase from 'better-sqlite3';
import { type ColumnType, type Kysely, sql } from 'kysely';
import { SqliteDialect } from 'kysely';
import { createDatabase } from '../../database';

// Helper functions for date handling
export function toSqliteDate(date: Date | string): string {
	if (date instanceof Date) {
		return date.toISOString();
	}
	return date;
}

export function fromSqliteDate(dateStr: string): Date {
	return new Date(dateStr);
}

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
	? ColumnType<S, I | undefined, U>
	: ColumnType<T, T | undefined, T>;

export type Timestamp = ColumnType<Date, Date | string, Date | string>;

// Type definitions for the test database
export type Users = {
	id: Generated<string>;
	email: string;
	name: string;
	username: string;
	password: string;
	status: string;
	followersCount: number;
	updatedAt: Timestamp;
	createdAt: Generated<Timestamp>;
};

export type Comments = {
	id: Generated<string>;
	userId: string;
	message: string;
	updatedAt: Timestamp;
	createdAt: Generated<Timestamp>;
};

export type Quizzes = {
	id: Generated<string>;
	name: string;
	updatedAt: Timestamp;
	createdAt: Generated<Timestamp>;
};

export type Products = {
	id: Generated<string>;
	name: string;
	updatedAt: Timestamp;
	createdAt: Generated<Timestamp>;
};

export type Articles = {
	id: Generated<string>;
	title: string;
	slug: string;
	updatedAt: Timestamp;
	createdAt: Generated<Timestamp>;
};

export type DB = {
	users: Users;
	comments: Comments;
	quizzes: Quizzes;
	products: Products;
	articles: Articles;
};

// Create an in-memory SQLite database for tests
// This ensures we have isolation between test runs but still use a consistent approach
const sqliteDb = new SQLiteDatabase(':memory:');

// Setup a SQLite dialect with our database instance
const dialect = new SqliteDialect({
	database: sqliteDb,
});

// Create a proper database instance
export const db = createDatabase<DB>({
	dialect,
	debug: true, // Enable debug mode for tests
});

// Function to initialize the database schema
// This should be called before tests run
export async function initializeDatabase(): Promise<void> {
	try {
		console.log('Creating database tables...');

		// Run the up() function directly to create all tables
		await up(db.db());

		console.log('Database tables created successfully');
	} catch (err) {
		console.error('Failed to initialize database:', err);
		throw err;
	}
}

// Function to clean up the database after tests
export async function cleanupDatabase(): Promise<void> {
	try {
		console.log('Cleaning up database...');

		// Run the down() function to drop all tables
		await down(db.db());

		console.log('Database cleanup completed');
	} catch (err) {
		console.error('Failed to clean up database:', err);
		// Don't throw here, we don't want cleanup failures to break tests
	}
}

// This function resets the database by dropping and recreating all tables
// It's useful for isolating tests that need a clean database
export async function resetDatabase(): Promise<void> {
	try {
		console.log('Resetting database for next test...');

		// First clean up existing tables
		await cleanupDatabase();

		// Then recreate them
		await initializeDatabase();

		console.log('Database reset completed');
	} catch (err) {
		console.error('Failed to reset database:', err);
		throw err;
	}
}

export async function up(db: Kysely<any>): Promise<void> {
	// Drop tables if they exist to ensure a clean state
	await down(db).catch(() => {}); // Ignore errors if tables don't exist

	console.log('Creating users table...');
	await db.schema
		.createTable('users')
		.ifNotExists()
		.addColumn('id', 'integer', (col) => col.autoIncrement().primaryKey())
		.addColumn('email', 'varchar(255)', (col) => col.unique())
		.addColumn('name', 'varchar(255)')
		.addColumn('password', 'varchar(255)')
		.addColumn('status', 'varchar(50)', (col) =>
			col.notNull().defaultTo('active')
		)
		.addColumn('createdAt', 'datetime', (col) =>
			col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
		)
		.addColumn('updatedAt', 'datetime', (col) =>
			col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
		)
		.addColumn('username', 'varchar(255)', (col) => col.notNull())
		.addColumn('followersCount', 'integer', (col) =>
			col.unsigned().notNull().defaultTo(0)
		)
		.execute();

	console.log('Creating comments table...');
	await db.schema
		.createTable('comments')
		.ifNotExists()
		.addColumn('id', 'integer', (col) => col.autoIncrement().primaryKey())
		.addColumn('message', 'varchar(255)')
		.addColumn('userId', 'integer', (col) =>
			col.references('users.id').onDelete('cascade').notNull()
		)
		.addColumn('createdAt', 'datetime', (col) =>
			col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
		)
		.addColumn('updatedAt', 'datetime', (col) =>
			col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
		)
		.addColumn('count', 'integer', (col) =>
			col.unsigned().notNull().defaultTo(0)
		)
		.execute();

	// Add quizzes table creation
	console.log('Creating quizzes table...');
	await db.schema
		.createTable('quizzes')
		.ifNotExists()
		.addColumn('id', 'integer', (col) => col.autoIncrement().primaryKey())
		.addColumn('name', 'varchar(255)', (col) => col.notNull())
		.addColumn('createdAt', 'datetime', (col) =>
			col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
		)
		.addColumn('updatedAt', 'datetime', (col) =>
			col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
		)
		.execute();

	// Add products table creation
	console.log('Creating products table...');
	await db.schema
		.createTable('products')
		.ifNotExists()
		.addColumn('id', 'varchar(255)', (col) => col.primaryKey())
		.addColumn('name', 'varchar(255)', (col) => col.notNull())
		.addColumn('createdAt', 'datetime', (col) =>
			col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
		)
		.addColumn('updatedAt', 'datetime', (col) =>
			col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
		)
		.execute();

	// Add articles table creation
	console.log('Creating articles table...');
	await db.schema
		.createTable('articles')
		.ifNotExists()
		.addColumn('id', 'varchar(255)', (col) => col.primaryKey())
		.addColumn('title', 'varchar(255)', (col) => col.notNull())
		.addColumn('slug', 'varchar(255)', (col) => col.notNull().unique())
		.addColumn('createdAt', 'datetime', (col) =>
			col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
		)
		.addColumn('updatedAt', 'datetime', (col) =>
			col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
		)
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('articles').ifExists().execute();
	await db.schema.dropTable('products').ifExists().execute();
	await db.schema.dropTable('quizzes').ifExists().execute();
	await db.schema.dropTable('comments').ifExists().execute();
	await db.schema.dropTable('users').ifExists().execute();
}

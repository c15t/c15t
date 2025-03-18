//@ts-ignore
import { SQLite } from 'better-sqlite3';
import { Kysely, type LogEvent, SqliteDialect } from 'kysely';
import { createDatabase } from '../../database';
import type { Database } from '../../database.types';
import { cleanupDatabase, initializeDatabase } from './migration';

// Define TestDB types here
export type Generated<T> = T extends TestColumnType<infer S, infer I, infer U>
	? TestColumnType<S, I | undefined, U>
	: TestColumnType<T, T | undefined, T>;

export type Timestamp = TestColumnType<Date, Date | string, Date | string>;

// Define custom ColumnType to avoid import conflicts
interface TestColumnType<S, I, U> {
	/** The data type in the database. */
	dataType: S;
	/** The data type in the insert/update statements. */
	inputType: I;
	/** The data type in the select statements. */
	outputType: U;
}

// Define test database schema
export interface TestDB {
	users: {
		id: Generated<string>;
		email: string;
		name: string;
		username: string;
		password: string;
		followersCount: number;
		createdAt: Generated<Timestamp>;
		updatedAt: Timestamp;
	};
	posts: {
		id: Generated<string>;
		title: string;
		content: string;
		userId: string;
		status: 'draft' | 'published';
		createdAt: Generated<Timestamp>;
		updatedAt: Timestamp;
	};
	comments: {
		id: Generated<string>;
		userId: string;
		postId: string;
		content: string;
		createdAt: Generated<Timestamp>;
	};
}

/**
 * Creates an in-memory SQLite database for unit/integration tests
 */
export async function setupTestDatabase() {
	// Create an in-memory SQLite database
	const sqlite = new SQLite(':memory:');

	// Create Kysely instance with SQLite dialect
	const db = new Kysely<TestDB>({
		dialect: new SqliteDialect({
			database: sqlite,
		}),
	});

	return db;
}

/**
 * Tears down the test database after tests
 */
export async function teardownTestDatabase(db: Kysely<TestDB>) {
	// For in-memory SQLite, we can just destroy the connection
	// The database will be deleted automatically when the connection closes
	await db.destroy();
}

/**
 * Sets up a real database for testing
 * It initializes the database schema using the migration functions.
 */
export async function setupRealDatabase() {
	const sqlite = new SQLite(':memory:');

	const dialect = new SqliteDialect({ database: sqlite });

	const database = createDatabase<TestDB>({
		dialect,
		isolated: true,
		debug: true,
		log: (event: LogEvent) => console.log(event),
	});

	await initializeDatabase();

	return database;
}

/**
 * Tears down the real database after e2e tests.
 * It cleans up the database using the cleanupDatabase migration function.
 */

export async function teardownRealDatabase(database: Database<TestDB>) {
	await cleanupDatabase();
	await database.destroy();
}

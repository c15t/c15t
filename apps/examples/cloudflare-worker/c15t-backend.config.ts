import { defineConfig } from '@c15t/backend/v2';
import { drizzle } from 'drizzle-orm/node-postgres';

const db = drizzle('postgresql://postgres@localhost:5432/new-db');

export default defineConfig({
	adapter: 'drizzle',
	options: {
		db,
		provider: 'postgresql',
	},
});

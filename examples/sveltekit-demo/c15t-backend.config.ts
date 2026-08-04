/**
 * Used by `@c15t/cli self-host migrate` to create and upgrade the schema.
 *
 * No Kysely instance to build: c15t opens its own connection from this
 * description.
 */
import { defineConfig } from '@c15t/backend-next';

export default defineConfig({
	database: { dialect: 'sqlite', filename: 'c15t.db' },
	trustedOrigins: ['localhost'],
});

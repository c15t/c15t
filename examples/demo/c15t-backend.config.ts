import { defineConfig } from '@c15t/backend';
import { postgresDb } from './app/api/self-host/[...all]/route';

export default defineConfig({
	adapter: postgresDb,
	// namespace: 'schema1',
	// tablePrefix: 'schema1.'
});

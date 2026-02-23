import { defineConfig } from '@c15t/backend';
import { postgresDb } from './app/api/self-host/[[...all]]/route';
// import { tursoDb } from './app/api/self-host/[[...all]]/route';

export default defineConfig({
	// adapter: tursoDb,
	adapter: postgresDb,
	trustedOrigins: ['localhost', 'vercel.app'],
	// namespace: 'schema1',
	// tablePrefix: 'schema1.'
});

import { defineConfig } from '@c15t/backend';
import { postgresDb } from './app/api/self-host/[[...all]]/route';
import {
	DEMO_POLICY_SNAPSHOT_KEY,
	demoI18nMessages,
	demoPolicies,
} from './lib/policies';
// import { tursoDb } from './app/api/self-host/[[...all]]/route';

export default defineConfig({
	// adapter: tursoDb,
	adapter: postgresDb,
	trustedOrigins: ['localhost', 'vercel.app'],
	i18n: {
		defaultProfile: 'default',
		fallbackLanguage: 'en',
		messages: demoI18nMessages,
	},
	policyPacks: demoPolicies,
	policySnapshot: {
		signingKey: DEMO_POLICY_SNAPSHOT_KEY,
		ttlSeconds: 60 * 60,
	},
	// namespace: 'schema1',
	// tablePrefix: 'schema1.'
});

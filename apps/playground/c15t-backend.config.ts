/**
 * Used by `@c15t/cli self-host migrate` to create and upgrade the schema.
 *
 * Only `database` matters to the migrator; the rest is here so the config
 * stays a faithful description of the deployment.
 */
import { defineConfig } from '@c15t/backend';

import {
	DEMO_POLICY_SNAPSHOT_KEY,
	demoI18nMessages,
	demoPolicies,
} from './lib/scenarios';

export default defineConfig({
	database: {
		dialect: 'postgres',
		url: process.env.DATABASE_URL ?? '',
	},
	manifest: {
		appName: 'c15t-self-host',
		i18n: {
			defaultProfile: 'default',
			messages: demoI18nMessages,
		},
		policyRules: demoPolicies,
	},
	policySnapshot: {
		signingKey: DEMO_POLICY_SNAPSHOT_KEY,
		ttlSeconds: 60 * 60,
	},
	trustedOrigins: ['localhost', 'vercel.app'],
});

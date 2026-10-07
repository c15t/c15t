import { defineConfig, policyRulePresets } from '@c15t/backend';

import { database } from './lib/database';

export default defineConfig({
	database,
	manifest: { policyRules: [policyRulePresets.europeOptIn()] },
	// Hosts whose browsers may call the backend. Add your production host.
	trustedOrigins: ['localhost'],
});

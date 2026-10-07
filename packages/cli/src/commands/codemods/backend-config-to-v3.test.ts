import { afterEach, describe, expect, it } from 'vitest';

import {
	cleanupProjects,
	transformFile,
	transformTwice,
} from './__tests__/helpers';
import { runBackendConfigToV3Codemod as codemod } from './backend-config-to-v3';

// Each run builds a TypeScript program, which is slow on a busy machine.
describe('backend-config-to-v3 codemod', { timeout: 20_000 }, () => {
	afterEach(cleanupProjects);

	it('moves manifest options under manifest and marks removed options', async () => {
		const { result, updated } = await transformFile(
			codemod,
			`import { defineConfig, policyPackPresets } from '@c15t/backend';
import { kyselyAdapter } from '@c15t/backend/db/adapters/kysely';

export default defineConfig({
	// Storage
	adapter: kyselyAdapter({ db }),
	trustedOrigins: ['https://example.com'],
	appName: 'Example',
	branding: 'none',
	policyPacks: [
		policyPackPresets.europeOptIn(),
		policyPackPresets.worldNoBanner(),
	],
	disableGeoLocation: true,
});
`,
			{ fileName: 'c15t-backend.config.ts' }
		);

		expect(result.errors).toEqual([]);
		expect(updated)
			.toBe(`import { defineConfig, policyPackPresets } from '@c15t/backend';
// TODO(c15t v3): This @c15t/backend entry was removed. Import defineConfig, createMigrator and policyRulePresets from @c15t/backend.
import { kyselyAdapter } from '@c15t/backend/db/adapters/kysely';

export default defineConfig({
	// Storage
	// TODO(c15t v3): adapter was removed. Point database at the same SQL database, such as database: { dialect: 'postgres', url: process.env.DATABASE_URL }, then run c15t self-host migrate. See https://c15t.com/docs/self-host/guides/database-setup
	adapter: kyselyAdapter({ db }),
	trustedOrigins: ['https://example.com'],
	manifest: {
		appName: 'Example',
		branding: 'none',
		policyRules: [
			policyPackPresets.europeOptIn(),
			policyPackPresets.worldNoBanner(),
		],
	},
	// TODO(c15t v3): disableGeoLocation was removed. To show every visitor the same banner, configure one policy rule with match: { isDefault: true }.
	disableGeoLocation: true,
});
`);
		expect(result.changedFiles[0]?.summaries).toEqual(
			expect.arrayContaining([
				'appName -> manifest.appName',
				'policyPacks -> manifest.policyRules',
				'TODO: adapter',
				'TODO: disableGeoLocation',
			])
		);
	});

	it('merges into an existing manifest and flags hand-written policy packs', async () => {
		const { updated } = await transformFile(
			codemod,
			`import { c15tInstance } from '@c15t/backend';

const config = {
	manifest: {
		vendors: [],
	},
	customTranslations: { en: {} },
	i18n,
	policyPacks: [{ id: 'eu', match: { regions: ['eu'] }, consent: { model: 'opt-in' } }],
};

export const instance = c15tInstance(config);
`,
			{ fileName: 'instance.ts' }
		);

		expect(updated).toBe(`import { c15tInstance } from '@c15t/backend';

const config = {
	manifest: {
		vendors: [],
		customTranslations: { en: {} },
		i18n,
		// TODO(c15t v3): v3 policy rules are flat ({ id, match, model, prompt, ... }) instead of { consent, ui }. Rewrite hand-written rules; preset calls need no change.
		policyRules: [{ id: 'eu', match: { regions: ['eu'] }, consent: { model: 'opt-in' } }],
	},
};

export const instance = c15tInstance(config);
`);
	});

	it('rewrites the removed define-config entry and single-line configs', async () => {
		const { updated } = await transformFile(
			codemod,
			`import { defineConfig } from "@c15t/backend/define-config";

export default defineConfig({ trustedOrigins: [], branding: "c15t", tablePrefix: "c15t_" });
`,
			{ fileName: 'c15t.config.ts' }
		);
		expect(updated).toBe(`import { defineConfig } from "@c15t/backend";

export default defineConfig({ trustedOrigins: [], manifest: { branding: "c15t" }, /* TODO(c15t v3): tablePrefix was removed. Rename prefixed c15t tables before you run the migration. */ tablePrefix: "c15t_" });
`);
	});

	it('marks the split iab option and leaves a non-literal manifest to the user', async () => {
		const { updated } = await transformFile(
			codemod,
			`import { defineConfig, type C15TOptions } from '@c15t/backend';

const options: C15TOptions = {
	manifest: sharedManifest,
	appName: 'x',
	iab: { enabled: true, cmpId: 5, vendorIds: [1] },
};
`,
			{ fileName: 'config.ts' }
		);
		expect(updated).toContain(
			"\t// TODO(c15t v3): Move appName into manifest, renaming policyPacks to policyRules.\n\tappName: 'x',"
		);
		expect(updated).toContain(
			'\t// TODO(c15t v3): iab was split. enabled, cmpId and customVendors move to manifest.iab; vendorIds and endpoint move to gvl; bundled was removed.'
		);
	});

	it('leaves other configs and v3 configs alone', async () => {
		const unrelated = await transformFile(
			codemod,
			`import { defineConfig } from 'vite';
export default defineConfig({ appName: 'x', adapter: 'y' });
`,
			{ fileName: 'vite.config.ts' }
		);
		expect(unrelated.result.changedFiles).toEqual([]);

		const migrated = await transformFile(
			codemod,
			`import { defineConfig, policyRulePresets } from '@c15t/backend';
export default defineConfig({
	database: { dialect: 'postgres', url: process.env.DATABASE_URL! },
	manifest: { appName: 'x', policyRules: [policyRulePresets.worldOptOutNoPrompt()] },
});
`,
			{ fileName: 'c15t.config.ts' }
		);
		expect(migrated.result.changedFiles).toEqual([]);
	});

	it('is idempotent and writes nothing in a dry run', async () => {
		const source = `import { defineConfig } from '@c15t/backend';
export default defineConfig({
	adapter,
	branding: 'none',
	i18n: { defaultProfile: 'default' },
});
`;
		const { first, second, secondResult } = await transformTwice(
			codemod,
			source,
			'c15t.config.ts'
		);
		expect(second).toBe(first);
		expect(secondResult.changedFiles).toEqual([]);

		const dry = await transformFile(codemod, source, {
			dryRun: true,
			fileName: 'c15t.config.ts',
		});
		expect(dry.updated).toBe(source);
		expect(dry.result.changedFiles[0]?.after).toBe(first);
	});
});

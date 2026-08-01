import { builtInScriptIntegrations } from '@c15t/scripts/registry';
import { describe, expect, it } from 'vitest';
import {
	generateScriptsConfig,
	generateScriptsImport,
	SCRIPT_SNIPPETS,
} from './scripts';

describe('script snippets', () => {
	it('covers every built-in script integration', () => {
		for (const integration of builtInScriptIntegrations) {
			expect(
				SCRIPT_SNIPPETS[integration.packageSubpath],
				`missing SCRIPT_SNIPPETS entry for ${integration.packageSubpath}`
			).toBeDefined();
		}
	});

	it('renders every example with its own import name', () => {
		for (const [subpath, snippet] of Object.entries(SCRIPT_SNIPPETS)) {
			expect(
				snippet.example.startsWith(`${snippet.importName}(`),
				`example for ${subpath} must call ${snippet.importName}()`
			).toBe(true);
		}
	});

	it('generates matching imports and config calls', () => {
		const selected = ['microsoft-clarity', 'segment', 'logrocket'];

		expect(generateScriptsImport(selected)).toBe(
			[
				"import { clarity } from '@c15t/scripts/microsoft-clarity';",
				"import { segment } from '@c15t/scripts/segment';",
				"import { logRocket } from '@c15t/scripts/logrocket';",
			].join('\n')
		);

		const config = generateScriptsConfig(selected);
		expect(config).toContain("clarity({ id: 'YOUR_PROJECT_ID' })");
		expect(config).toContain("segment({ writeKey: 'YOUR_WRITE_KEY' })");
		expect(config).toContain("logRocket({ appId: 'org-slug/app-slug' })");
	});
});

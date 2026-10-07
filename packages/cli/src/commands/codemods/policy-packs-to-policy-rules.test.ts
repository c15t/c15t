import { afterEach, describe, expect, it } from 'vitest';

import {
	cleanupProjects,
	transformFile,
	transformTwice,
} from './__tests__/helpers';
import { runPolicyPacksToPolicyRulesCodemod as codemod } from './policy-packs-to-policy-rules';

// Each run builds a TypeScript program, which is slow on a busy machine.
describe('policy-packs-to-policy-rules codemod', { timeout: 20_000 }, () => {
	afterEach(cleanupProjects);

	it('renames the presets and worldNoBanner in the c15t package', async () => {
		const { result, updated } = await transformFile(
			codemod,
			`import { offline, policyPackPresets } from 'c15t';

// EU opt-in, nothing elsewhere.
export const rules = [
	policyPackPresets.europeOptIn(),
	policyPackPresets.worldNoBanner(),
];
`,
			{ fileName: 'rules.ts' }
		);

		expect(updated).toBe(`import { offline, policyRulePresets } from 'c15t';

// EU opt-in, nothing elsewhere.
export const rules = [
	policyRulePresets.europeOptIn(),
	policyRulePresets.worldNone(),
];
`);
		expect(result.changedFiles[0]?.summaries).toEqual([
			'policyPackPresets -> policyRulePresets',
			'worldNoBanner -> worldNone',
		]);
	});

	it('moves React and Next.js imports to the entry that still exports presets', async () => {
		const umbrella = await transformFile(
			codemod,
			`import { ConsentProvider, policyPackPresets } from 'c15t/next';

const rules = [policyPackPresets.californiaOptOut()];
`
		);
		expect(umbrella.updated).toBe(`import { ConsentProvider } from 'c15t/next';
import { policyRulePresets } from 'c15t';

const rules = [policyRulePresets.californiaOptOut()];
`);

		const scoped = await transformFile(
			codemod,
			`import { policyPackPresets } from '@c15t/react';

const rules = [policyPackPresets.worldNoBanner()];
`
		);
		expect(scoped.updated).toBe(`import { policyRulePresets } from '@c15t/core';

const rules = [policyRulePresets.worldNone()];
`);
	});

	it('keeps an alias and renames destructured presets', async () => {
		const { updated } = await transformFile(
			codemod,
			`import { policyPackPresets as presets, type PolicyPackPresets } from '@c15t/backend';

const { europeOptIn, worldNoBanner } = presets;
const { worldNoBanner: none } = presets;
type Presets = PolicyPackPresets;
export const policyPacks = [europeOptIn(), worldNoBanner(), none()];
`,
			{ fileName: 'backend.ts' }
		);

		expect(updated)
			.toBe(`import { policyRulePresets as presets, type PolicyRulePresets } from '@c15t/backend';

const { europeOptIn, worldNone: worldNoBanner } = presets;
const { worldNone: none } = presets;
type Presets = PolicyRulePresets;
export const policyPacks = [europeOptIn(), worldNoBanner(), none()];
`);
	});

	it('renames access through a namespace import', async () => {
		const { updated } = await transformFile(
			codemod,
			`import * as c15t from 'c15t';

export const rule = c15t.policyPackPresets.worldNoBanner();
`,
			{ fileName: 'rules.ts' }
		);
		expect(updated).toContain('c15t.policyRulePresets.worldNone()');
	});

	it('leaves unrelated and migrated code alone, and is idempotent', async () => {
		const unrelated = await transformFile(
			codemod,
			`import { policyPackPresets } from './presets';
export const rule = policyPackPresets.worldNoBanner();
`,
			{ fileName: 'rules.ts' }
		);
		expect(unrelated.result.changedFiles).toEqual([]);

		const migrated = await transformFile(
			codemod,
			`import { policyRulePresets } from 'c15t';
export const rule = policyRulePresets.worldNone();
`,
			{ fileName: 'rules.ts' }
		);
		expect(migrated.result.changedFiles).toEqual([]);

		const { first, second } = await transformTwice(
			codemod,
			`import { ConsentProvider, policyPackPresets } from '@c15t/nextjs';
const rules = [policyPackPresets.europeIab(), policyPackPresets.worldNoBanner()];
`
		);
		expect(second).toBe(first);
	});

	it('writes nothing in a dry run', async () => {
		const source = `import { policyPackPresets } from 'c15t';
export const rule = policyPackPresets.quebecOptIn();
`;
		const { result, updated } = await transformFile(codemod, source, {
			dryRun: true,
			fileName: 'rules.ts',
		});
		expect(updated).toBe(source);
		expect(result.changedFiles).toHaveLength(1);
	});
});

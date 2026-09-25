import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runUseConsentManagerToHooksCodemod } from './use-consent-manager-to-hooks';

const createdDirs: string[] = [];

const transform = async function transform(content: string) {
	const rootDir = await mkdtemp(join(tmpdir(), 'c15t-codemod-'));
	createdDirs.push(rootDir);
	const filePath = join(rootDir, 'consent.tsx');
	await writeFile(filePath, content, 'utf-8');
	const result = await runUseConsentManagerToHooksCodemod({
		dryRun: false,
		projectRoot: rootDir,
	});
	return { result, updated: await readFile(filePath, 'utf-8') };
};

describe('use-consent-manager-to-hooks codemod', () => {
	afterEach(async () => {
		await Promise.all(
			createdDirs
				.splice(0)
				.map((dir) => rm(dir, { force: true, recursive: true }))
		);
	});

	it('rewrites common fields to one hook call each', async () => {
		const { result, updated } = await transform(`
import { ConsentBanner, useConsentManager } from '@c15t/react';

export const Banner = () => {
	const { activeUI, setActiveUI, consents, has, saveConsents } =
		useConsentManager();
	if (activeUI === 'none' || !has('marketing')) {
		return null;
	}
	return (
		<div data-measurement={has('measurement')} data-marketing={has('marketing')}>
			<button onClick={() => saveConsents('all')}>Accept</button>
			<button onClick={() => saveConsents('necessary')}>Reject</button>
			<button onClick={() => setActiveUI('dialog')}>{String(consents.marketing)}</button>
			<ConsentBanner />
		</div>
	);
};
`);

		expect(result.errors).toEqual([]);
		expect(result.changedFiles).toHaveLength(1);
		expect(updated).not.toContain('useConsentManager');
		expect(updated).toContain(
			"import { ConsentBanner, useActiveUI, useConsent, useConsents, useSetActiveUI } from '@c15t/react';"
		);
		expect(updated).toContain(
			"import { useHeadlessConsentUI } from '@c15t/react/headless';"
		);
		expect(updated).toContain("const activeUI = useActiveUI() ?? 'none';");
		expect(updated).toContain('const setActiveUI = useSetActiveUI();');
		expect(updated).toContain('const consents = useConsents();');
		expect(updated).toContain("const hasMarketing = useConsent('marketing');");
		expect(updated).toContain(
			"const hasMeasurement = useConsent('measurement');"
		);
		expect(updated).toContain("activeUI === 'none' || !hasMarketing");
		expect(updated).toContain('data-measurement={hasMeasurement}');
		expect(updated).toContain(
			'const { saveCustomPreferences: saveConsents } = useHeadlessConsentUI();'
		);
		expect(updated).toContain("saveConsents('all')");
		expect(updated).toContain("saveConsents('none')");
		expect(updated).not.toContain('ConsentDraftProvider');
	});

	it('moves draft fields to useConsentDraft and flags the shared draft', async () => {
		const { updated } = await transform(`
import { useConsentManager as useManager } from 'c15t/next/headless';

export const Preferences = () => {
	const { selectedConsents, setSelectedConsent: select, saveConsents } =
		useManager();
	return (
		<button
			onClick={() => {
				select('marketing', !selectedConsents.marketing);
				void saveConsents('custom');
			}}
		/>
	);
};
`);

		expect(updated).not.toContain('useManager');
		expect(updated).toContain(
			'const { values: selectedConsents, set: select } = useConsentDraft();'
		);
		expect(updated).toContain('void saveConsents();');
		expect(updated).toContain("import { useConsentDraft } from 'c15t/next';");
		expect(updated).toContain(
			"import { useHeadlessConsentUI } from 'c15t/next/headless';"
		);
		expect(updated).toContain('<ConsentDraftProvider>');
	});

	it('keeps fields without a one-call replacement on a marked residual call', async () => {
		const { result, updated } = await transform(`
import { useConsentManager } from '@c15t/nextjs';

export const Labels = ({ category }: { category: 'marketing' }) => {
	const { consentTypes, has, model } = useConsentManager();
	return <p data-model={model}>{consentTypes.length} {String(has(category))}</p>;
};
`);

		expect(updated).toContain("const model = useModel() ?? 'opt-in';");
		expect(updated).toContain(
			'TODO(c15t v3): useConsentManager() was removed. Migrate these fields by hand:'
		);
		expect(updated).toContain('// - consentTypes:');
		expect(updated).toContain('// - has: useConsent(category)');
		expect(updated).toContain(
			'const { consentTypes, has } = useConsentManager();'
		);
		expect(updated).toContain(
			"import { useConsentManager, useModel } from '@c15t/nextjs';"
		);
		expect(result.changedFiles[0]?.summaries).toEqual(
			expect.arrayContaining(['TODO: consentTypes', 'TODO: has'])
		);
	});

	it('marks a call it cannot destructure', async () => {
		const { result, updated } = await transform(`
import { useConsentManager } from 'c15t/react';

export const Status = () => {
	const manager = useConsentManager();
	return <p>{manager.activeUI}</p>;
};
`);

		expect(updated).toContain(
			'// TODO(c15t v3): useConsentManager() was removed. Read each field through its own hook'
		);
		expect(updated).toContain('const manager = useConsentManager();');
		expect(result.changedFiles[0]?.summaries).toEqual([
			'TODO: useConsentManager() without destructuring',
		]);
	});

	it('ignores a useConsentManager that is not imported from c15t', async () => {
		const { result } = await transform(`
import { useConsentManager } from './local-store';

export const Local = () => {
	const { activeUI } = useConsentManager();
	return <p>{activeUI}</p>;
};
`);

		expect(result.changedFiles).toEqual([]);
	});
});

import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runActiveUiApiCodemod } from './active-ui-api';
import { runComponentRenamesCodemod } from './component-renames';
import { runGdprTypesToConsentCategoriesCodemod } from './gdpr-types-to-consent-categories';
import { runIgnoreGeoLocationToOverridesCodemod } from './ignore-geo-location-to-overrides';
import { runC15tModeToHostedCodemod } from './mode-c15t-to-hosted';
import { runReactOptionsToTopLevelCodemod } from './react-options-to-top-level';
import { runTrackingBlockerToNetworkBlockerCodemod } from './tracking-blocker-to-network-blocker';
import { runTranslationsToI18nCodemod } from './translations-to-i18n';

const createdDirs: string[] = [];

async function copyV1Fixture(): Promise<{ rootDir: string; appFile: string }> {
	const tempRoot = await mkdtemp(join(tmpdir(), 'c15t-v1-app-'));
	const projectRoot = join(tempRoot, 'v1-app');
	const fixtureRoot = new URL(
		'../../../test/fixtures/v1-app/',
		import.meta.url
	);
	await cp(fixtureRoot, projectRoot, { recursive: true });
	createdDirs.push(tempRoot);
	return {
		rootDir: projectRoot,
		appFile: join(projectRoot, 'src/app.tsx'),
	};
}

describe('v1 app codemod migration', () => {
	afterEach(async () => {
		for (const dir of createdDirs.splice(0, createdDirs.length)) {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('migrates fixture app from v1-style APIs to v2-style APIs', async () => {
		const { rootDir, appFile } = await copyV1Fixture();

		await runC15tModeToHostedCodemod({ projectRoot: rootDir, dryRun: false });
		await runTrackingBlockerToNetworkBlockerCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});
		await runIgnoreGeoLocationToOverridesCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});
		await runComponentRenamesCodemod({ projectRoot: rootDir, dryRun: false });
		await runActiveUiApiCodemod({ projectRoot: rootDir, dryRun: false });
		await runGdprTypesToConsentCategoriesCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});
		await runReactOptionsToTopLevelCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});
		await runTranslationsToI18nCodemod({ projectRoot: rootDir, dryRun: false });

		const updated = await readFile(appFile, 'utf-8');

		expect(updated).toContain("mode: 'hosted'");
		expect(updated).toContain('NetworkBlockerConfig');
		expect(updated).toContain('networkBlocker: trackingBlockerConfig');
		expect(updated).toContain("overrides: { country: 'DE' }");
		expect(updated).toContain('ConsentBanner');
		expect(updated).toContain('ConsentDialog');
		expect(updated).toContain('ConsentWidget');
		expect(updated).toContain('activeUI: showPopup');
		expect(updated).toContain('setActiveUI: setShowPopup');
		expect(updated).toContain("consentCategories: ['necessary', 'marketing']");
		expect(updated).toContain("consentCategories: ['necessary']");
		expect(updated).toContain('i18n: {');
		expect(updated).toContain("locale: 'en'");
		expect(updated).toContain('detectBrowserLanguage: false');
		expect(updated).toContain('messages: {');

		expect(updated).not.toContain('trackingBlockerConfig: {');
		expect(updated).not.toContain('ignoreGeoLocation');
		expect(updated).not.toContain('CookieBanner');
		expect(updated).not.toContain('ConsentManagerDialog');
		expect(updated).not.toContain('ConsentManagerWidget');
		expect(updated).not.toContain('showPopup && !isPrivacyDialogOpen');
		expect(updated).not.toContain('gdprTypes:');
		expect(updated).not.toContain('initialGDPRTypes:');
		expect(updated).not.toContain('translations: {');
		expect(updated).not.toContain('options.trackingBlockerConfig');
	});
});

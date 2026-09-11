import path from 'node:path';

import type { DevelopmentEnvironment } from '~/context/framework-detection';

import type { StorageMode } from '../../../../constants';
import type { ExpandedTheme, UIStyle } from '../../prompts';
import { getEnvVarPrefix } from '../env';
import { generateConsentComponent } from './components';
import { getComponentsDirectory } from './directory';
import {
	generateExpandedThemeTemplate,
	generateExpandedProviderTemplate,
	generateExpandedConsentBannerTemplate,
	generateExpandedConsentDialogTemplate,
} from './expanded-components';
import fs, { createFile } from './file-plan';
import { REACT_CONFIG, NEXTJS_CONFIG } from './framework-config';
import type { FrameworkConfig } from './framework-config';
import { generateOptionsText } from './options';
import { generateSimpleWrapperComponent } from './server-components';

interface ComponentFilePaths {
	consentManager: string;
	consentManagerDir?: string;
}

export const createConsentManagerComponent =
	async function createConsentManagerComponent(
		projectRoot: string,
		sourceDir: string,
		mode: StorageMode,
		backendURL?: string,
		useEnvFile?: boolean,
		selectedScripts?: string[],
		enableDevTools?: boolean,
		expandedTheme?: ExpandedTheme,
		developmentEnvironment?: DevelopmentEnvironment,
		uiStyle: UIStyle = 'prebuilt',
		framework: FrameworkConfig = REACT_CONFIG
	): Promise<ComponentFilePaths> {
		const hasTheme =
			uiStyle === 'expanded' || (expandedTheme && expandedTheme !== 'none');

		// Detect or create components directory
		const componentsDir = await getComponentsDirectory(projectRoot, sourceDir);
		const consentManagerDirPath = path.join(
			projectRoot,
			componentsDir,
			'consent-manager'
		);

		// Generate component file content
		const optionsText = generateOptionsText(
			mode,
			backendURL,
			useEnvFile,
			undefined,
			true,
			getEnvVarPrefix(
				framework === NEXTJS_CONFIG ? 'c15t/next' : 'c15t/react',
				developmentEnvironment
			)
		);
		const providerContent =
			uiStyle === 'expanded'
				? generateExpandedProviderTemplate({
						developmentEnvironment,
						enableDevTools: Boolean(enableDevTools),
						enableSSR: false,
						framework,
						optionsText,
						selectedScripts,
					})
				: generateConsentComponent({
						defaultExport: true,
						devToolsImportSource: framework.devToolsImportSource,
						developmentEnvironment,
						docsSlug: framework.docsSlug,
						enableDevTools,
						importSource: framework.importSource,
						includeTheme: Boolean(hasTheme),
						optionsText,
						selectedScripts,
						useClientDirective: true,
					});
		const indexContent = generateSimpleWrapperComponent(
			framework.frameworkName,
			framework.docsSlug
		);

		// Define file paths
		const indexPath = path.join(consentManagerDirPath, 'index.tsx');
		const providerPath = path.join(consentManagerDirPath, 'provider.tsx');

		// Create directory and write files
		await fs.mkdir(consentManagerDirPath, { recursive: true });
		const writePromises: Promise<void>[] = [
			createFile(indexPath, indexContent, 'utf-8'),
			createFile(providerPath, providerContent, 'utf-8'),
		];

		// Generate theme file when a theme is selected
		if (hasTheme) {
			const themeContent = generateExpandedThemeTemplate(
				expandedTheme ?? 'none',
				framework
			);
			const themePath = path.join(consentManagerDirPath, 'theme.ts');
			writePromises.push(createFile(themePath, themeContent, 'utf-8'));
		}

		if (uiStyle === 'expanded') {
			writePromises.push(
				createFile(
					path.join(consentManagerDirPath, 'consent-banner.tsx'),
					generateExpandedConsentBannerTemplate(framework),
					'utf-8'
				)
			);
			writePromises.push(
				createFile(
					path.join(consentManagerDirPath, 'consent-dialog.tsx'),
					generateExpandedConsentDialogTemplate(framework),
					'utf-8'
				)
			);
		}
		await Promise.all(writePromises);

		return {
			consentManager: indexPath,
			consentManagerDir: consentManagerDirPath,
		};
	};

// scripts/generate-readmes.ts

import * as fssync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default support and contributing sections
const DEFAULT_SUPPORT_SECTIONS = [
	'Join our [Discord community](https://c15t.link/discord)',
	'Open an issue on our [GitHub repository](https://github.com/c15t/c15t/issues)',
	'Visit [consent.io](https://consent.io) and use the chat widget',
	'Contact our support team via email [support@consent.io](mailto:support@consent.io)',
];

const DEFAULT_CONTRIBUTING_SECTIONS = [
	"We're open to all community contributions!",
	'Read our [Contribution Guidelines](https://c15t.com/docs/oss/contributing)',
	'Review our [Code of Conduct](https://c15t.com/docs/oss/code-of-conduct)',
	'Fork the repository',
	'Create a new branch for your feature',
	'Submit a pull request',
	'**All contributions, big or small, are welcome and appreciated!**',
];

const DEFAULT_SECURITY_SECTION = `## Security

If you believe you have found a security vulnerability in c15t, we encourage you to **_responsibly disclose this and NOT open a public issue_**. We will investigate all legitimate reports.

Our preference is that you make use of GitHub's private vulnerability reporting feature to disclose potential security vulnerabilities in our Open Source Software. To do this, please visit [https://github.com/c15t/c15t/security](https://github.com/c15t/c15t/security) and click the "Report a vulnerability" button.

### Security Policy

- Please do not share security vulnerabilities in public forums, issues, or pull requests
- Provide detailed information about the potential vulnerability
- Allow reasonable time for us to address the issue before any public disclosure
- We are committed to addressing security concerns promptly and transparently`;

// Types
interface PackageReadmeConfig {
	packageName: string;
	title: string;
	description: string;
	features?: string[];
	prerequisites?: string[];
	installation?: string[];
	manualInstallation?: string[];
	usage?: string[]; // items may include fenced code blocks as strings beginning with ```
	commands?: Array<{
		name: string;
		description: string;
	}>;
	globalFlags?: Array<{
		flag: string;
		description: string;
	}>;
	telemetry?: {
		description: string;
		details?: string[];
		disableMethods?: string[];
	};
	support?: string[];
	contributing?: string[];
	security?: string;
	docsLink?: string;
	quickStartLink?: string;
	showCLIGeneration?: boolean;
	customSections?: Record<string, string>;
}

// Helpers
const isNonEmpty = (v?: string) => Boolean(v && v.trim().length > 0);

const encodeNpmName = (name: string) => encodeURIComponent(name);

// Modify the renderNumberedWithCodeBlocks function to add blank lines around code blocks and lists
const renderNumberedWithCodeBlocks = (items: string[]) => {
	let i = 1;
	const lines: string[] = [];
	for (const raw of items) {
		const item = raw.trim();
		if (item.startsWith('```')) {
			// Add blank lines before and after code blocks
			lines.push('');
			lines.push(item);
			lines.push('');
		} else if (item.startsWith('- ')) {
			// Add blank lines before and after lists
			if (lines.length === 0 || lines[lines.length - 1] !== '') {
				lines.push('');
			}
			lines.push(`${i}. ${item.slice(2)}`);
			i += 1;
			lines.push('');
		} else {
			lines.push(`${i}. ${item}`);
			i += 1;
		}
	}
	return `${lines
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim()}\n\n\n\n`;
};

// Modify the addSection function to ensure blank lines around sections
const addSection = (
	header: string,
	content: string[] | undefined,
	formatter: (item: string, index?: number) => string = (item) => `- ${item}`
) => {
	if (!content || content.length === 0) return '';
	const body = content.map(formatter).join('\n');
	return `${header}\n\n\n\n\n${body}\n\n\n\n`.replace(/\n{3,}/g, '\n\n').trim();
};

const baseReadmeTemplate = (rawConfig: PackageReadmeConfig) => {
	const config: PackageReadmeConfig = { ...rawConfig };

	// Defaults
	if (!config.support || config.support.length === 0) {
		config.support = DEFAULT_SUPPORT_SECTIONS;
	}
	if (!config.contributing || config.contributing.length === 0) {
		config.contributing = DEFAULT_CONTRIBUTING_SECTIONS;
	}
	if (!isNonEmpty(config.security)) {
		config.security = DEFAULT_SECURITY_SECTION;
	}

	// npm badge name: ensure scoped packages are encoded
	const npmBadgeName = encodeNpmName(config.packageName);
	const npmPackageLink = `https://www.npmjs.com/package/${config.packageName}`;

	// Build sections
	const bannerBlock = `<p align="center">
  <a href="https://c15t.com?utm_source=github&utm_medium=repopage_${npmBadgeName}" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="../../docs/assets/c15t-banner-readme-dark.svg" type="image/svg+xml">
      <img src="../../docs/assets/c15t-banner-readme-light.svg" alt="c15t Banner" type="image/svg+xml">
    </picture>
  </a>
  <br />
  <h1 align="center">${config.title}</h1>
</p>

[![GitHub stars](https://img.shields.io/github/stars/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
[![CI](https://img.shields.io/github/actions/workflow/status/c15t/c15t/ci.yml?style=flat-square)](https://github.com/c15t/c15t/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg?style=flat-square)](https://github.com/c15t/c15t/blob/main/LICENSE.md)
[![Discord](https://img.shields.io/discord/1312171102268690493?style=flat-square)](https://c15t.link/discord)
[![npm version](https://img.shields.io/npm/v/${npmBadgeName}?style=flat-square)](${npmPackageLink})
[![Top Language](https://img.shields.io/github/languages/top/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t)
[![Last Commit](https://img.shields.io/github/last-commit/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t/commits/main)
[![Open Issues](https://img.shields.io/github/issues/c15t/c15t?style=flat-square)](https://github.com/c15t/c15t/issues)`;

	let featuresBlock = '';
	if (config.features && config.features.length > 0) {
		featuresBlock = `## Key Features

${config.features.map((f) => `- ${f}`).join('\n')}`;
	}

	const prerequisitesBlock = addSection(
		'## Prerequisites',
		config.prerequisites
	);

	let quickStartBlock = '';
	if (config.showCLIGeneration) {
		quickStartBlock = `## Quick Start

Easiest setup with @c15t/cli:

\`\`\`bash
# Generate schema and code
pnpm dlx @c15t/cli generate
# Alternatives:
# npx @c15t/cli generate
# bunx --bun @c15t/cli generate
\`\`\`

The CLI will:

- Install necessary packages
- Configure your c15t instance
- Set up environment variables
- Add consent management components to your app
`;
	}

	const manualInstallationBlock = config.manualInstallation?.length
		? `## Manual Installation

${config.manualInstallation.map((step) => `${step}`).join('\n')}`
		: '';

	const installationBlock = config.installation?.length
		? `## Installation

${config.installation.map((step) => `${step}`).join('\n')}`
		: '';

	let usageBlock = '';
	if (config.usage && config.usage.length > 0) {
		usageBlock = `## Usage

${renderNumberedWithCodeBlocks(config.usage)}`;
	}

	let commandsBlock = '';
	if (config.commands && config.commands.length > 0) {
		commandsBlock = `## Available Commands

${config.commands.map((cmd) => `- \`${cmd.name}\`: ${cmd.description}`).join('\n')}`;
	}

	let globalFlagsBlock = '';
	if (config.globalFlags && config.globalFlags.length > 0) {
		globalFlagsBlock = `## Global Flags

${config.globalFlags.map((flag) => `- \`${flag.flag}\`: ${flag.description}`).join('\n')}`;
	}

	let telemetryBlock = '';
	if (config.telemetry) {
		let detailsSection = '';
		if (config.telemetry.details && config.telemetry.details.length > 0) {
			detailsSection = config.telemetry.details
				.map((detail) => `- ${detail}`)
				.join('\n');
		}

		let disableMethodsSection = '';
		if (
			config.telemetry.disableMethods &&
			config.telemetry.disableMethods.length > 0
		) {
			disableMethodsSection = `Disable telemetry by:

${config.telemetry.disableMethods.map((method) => `- ${method}`).join('\n')}`;
		}

		telemetryBlock = `## Telemetry

${config.telemetry.description}

${detailsSection}

${disableMethodsSection}`;
	}

	let docsBlock = '';
	if (config.docsLink) {
		docsBlock = `## Documentation

For further information, guides, and examples visit the [reference documentation](${config.docsLink}).`;
	}

	let customSectionsBlock = '';
	if (config.customSections) {
		customSectionsBlock = Object.entries(config.customSections)
			.map(([heading, content]) => `## ${heading}\n\n${content}`)
			.join('\n');
	}

	const supportBlock = addSection('## Support', config.support);
	const contributingBlock = addSection('## Contributing', config.contributing);

	const licenseBlock = `## License

[GNU General Public License v3.0](https://github.com/c15t/c15t/blob/main/LICENSE.md)

---

**Built with ❤️ by the [consent.io](https://www.consent.io?utm_source=github&utm_medium=repopage_${npmBadgeName}) team**`;

	const readmeContent = [
		bannerBlock,
		config.description,
		featuresBlock,
		prerequisitesBlock,
		quickStartBlock,
		manualInstallationBlock,
		installationBlock,
		usageBlock,
		commandsBlock,
		globalFlagsBlock,
		telemetryBlock,
		docsBlock,
		customSectionsBlock,
		supportBlock,
		contributingBlock,
		config.security || DEFAULT_SECURITY_SECTION,
		licenseBlock,
	]
		.filter((section) => isNonEmpty(section))
		.join('\n\n')
		.replace(/\n{3,}/g, '\n\n')
		.replace(/\n{2,}$/, '\n'); // Remove multiple trailing newlines

	return `${readmeContent.trim()}\n`;
};

/**
 * Generates README files for all packages with readme.json configurations
 * @throws {Error} If packages directory doesn't exist
 * @throws {SyntaxError} If readme.json or package.json contains invalid JSON
 * @throws {Error} If file write operations fail
 */
async function generateReadmes() {
	const packagesDir = path.resolve(__dirname, '../packages');

	if (!fssync.existsSync(packagesDir)) {
		console.error(`Packages directory not found at ${packagesDir}`);
		process.exit(1);
	}

	const entries = await fs.readdir(packagesDir, { withFileTypes: true });
	const packageDirs = entries
		.filter((d) => d.isDirectory())
		.map((d) => d.name)
		.filter((dir) =>
			fssync.existsSync(path.join(packagesDir, dir, 'readme.json'))
		);

	for (const packageName of packageDirs) {
		try {
			const readmeConfigPath = path.join(
				packagesDir,
				packageName,
				'readme.json'
			);
			const packageJsonPath = path.join(
				packagesDir,
				packageName,
				'package.json'
			);

			const raw = await fs.readFile(readmeConfigPath, 'utf8');
			const readmeConfig = JSON.parse(raw) as PackageReadmeConfig;

			// Read package.json to supplement missing details
			const packageJson = JSON.parse(
				await fs.readFile(packageJsonPath, 'utf8')
			);

			// Set package name
			readmeConfig.packageName = packageJson.name || packageName;

			// Set description from package.json if not in readme.json
			if (!readmeConfig.description) {
				readmeConfig.description = packageJson.description || '';
			}

			const content = baseReadmeTemplate(readmeConfig);
			const readmePath = path.join(packagesDir, packageName, 'README.md');

			await fs.writeFile(readmePath, content, 'utf8');
			console.log(`Generated README for ${packageName}`);
		} catch (error) {
			console.error(`Error generating README for ${packageName}:`, error);
		}
	}
}

generateReadmes().catch((err) => {
	console.error('Fatal error generating READMEs:', err);
	process.exit(1);
});

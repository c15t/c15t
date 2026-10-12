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
	'Visit [inth.com](https://inth.com) and use the chat widget',
	'Contact our support team via email [support@inth.com](mailto:support@inth.com)',
];

const DEFAULT_CONTRIBUTING_SECTIONS = [
	'Read the [contribution guidelines](https://c15t.com/docs/oss/contributing) before you open a pull request',
	'Follow the [code of conduct](https://c15t.com/docs/oss/code-of-conduct)',
];

const DEFAULT_SECURITY_SECTION = `## Security

Do not open a public issue for a security vulnerability. Report it privately through [GitHub's vulnerability reporting](https://github.com/c15t/c15t/security/advisories/new). We examine every valid report.

- Do not share the vulnerability in public forums, issues, or pull requests
- Give the steps to reproduce it and the versions it affects
- Give us time to release a fix before you disclose it`;

const SOCIAL_PROOF_LINE =
	'c15t is used by [2,100+ sites](https://www.wappalyzer.com/technologies/cookie-compliance/c15t/), including expo.dev, zed.dev, unkey.dev, mintlify.com, and sazabi.com.';

/**
 * Renders the shared hosting section with Inth links tagged for one package.
 *
 * @param npmBadgeName - URL-encoded package name used as the UTM content.
 * @returns The Markdown for the Hosting section.
 */
const renderHostingSection = (npmBadgeName: string) => `## Hosting

c15t needs somewhere to keep policies and consent records. Pick one:

- **Hosted on [Inth](https://inth.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=${npmBadgeName})**: Inth runs the backend for you. You get policy storage, consent records, audit history, and a dashboard, with no database or server to run. Sign-up is free.
- **Self-hosted**: Run [\`@c15t/backend\`](https://www.npmjs.com/package/@c15t/backend) on your own server with PostgreSQL, MySQL, or SQLite. You own migrations, backups, and uptime. See the [self-hosting guide](https://c15t.com/docs/self-host/quickstart).
- **Offline**: Choices stay in the browser, with no consent records. Use it for local development, previews, and demos, not production.

The frontend code is the same for Inth and a self-hosted backend. Only the backend URL changes.`;

// Types
interface PackageReadmeConfig {
	packageName: string;
	title: string;
	description: string;
	features?: string[];
	prerequisites?: string[];
	installation?: string[];
	manualInstallation?: string[];
	// items may include fenced code blocks as strings beginning with ```
	usage?: string[];
	commands?: {
		name: string;
		description: string;
	}[];
	globalFlags?: {
		flag: string;
		description: string;
	}[];
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
	/** Sections rendered directly after Key Features, before setup steps. */
	leadSections?: Record<string, string>;
	/**
	 * Renders the shared Hosting section: `'lead'` places it after Key
	 * Features, `true` places it after Usage.
	 */
	showHosting?: boolean | 'lead';
	/** Set from package.json: true when the published tarball includes AGENTS.md. */
	shipsAgentDocs?: boolean;
}

// Helpers
const isNonEmpty = (v?: string) => Boolean(v && v.trim().length > 0);

const encodeNpmName = (name: string) => encodeURIComponent(name);

const INTH_ICON_LOGO =
	'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAzOTMgNDAwIj48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTgyLjY2MiAwdjM2Ljg5NWgtNTkuMDMxdjgyLjczM2g1OS4wMzF2MzYuODkzSDI3LjQ4MnYtMzYuODkzaDU5LjAzVjM2Ljg5NWgtNTkuMDNWMHpNMzIxLjk0MSA4OS44NVYwaDM1LjM1NXYxNTYuNTIxaC0yNS43MTNsLTg2LjEzNy05MC4zNjR2OTAuMzY0aC0zNS4zNTVWMGgyNi4zNTV6Ii8+PHBhdGggZmlsbD0iIzAwMCIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMzE4LjU3MSAxODUuNzE0aDc0LjI4NlY0MDBIMFYxODUuNzE0aDI3Mi44NTd2LTQ3LjE0M3ptLTI5MS4wOSAyOC45Njl2MzcuMTE4aDU4LjEzN3YxMTkuNjI4aDM2Ljg5NVYyNTEuODAxaDU4LjU4NHYtMzcuMTE4em0xODIuNjEuMjI0djE1Ni41MjJoMzYuODk0VjMxMy41OWg3My4zNDF2NTcuODM5aDM3LjExOFYyMTQuOTA3aC0zNy4xMTh2NjEuNzg4aC03My4zNDF2LTYxLjc4OHoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg==';

const INTH_BADGE_QUERY = new URLSearchParams({
	color: 'ffc803',
	labelTextColor: '000000',
	logo: INTH_ICON_LOGO,
	valueColor: '000000',
}).toString();

/**
 * Appends a ShieldCN color mode query parameter to a badge URL.
 *
 * @param url - Badge URL that may already include query parameters.
 * @param mode - Color mode to request from ShieldCN.
 * @returns The badge URL with the mode query parameter appended.
 *
 * Uses `&` instead of `?` when the URL already has query parameters.
 */
const withBadgeMode = (url: string, mode: 'light' | 'dark'): string => {
	const separator = url.includes('?') ? '&' : '?';
	return `${url}${separator}mode=${mode}`;
};

/**
 * Renders a badge link that switches image sources with the user's color scheme.
 *
 * @param badge.alt - Accessible text for the badge image.
 * @param badge.href - Destination URL for the badge link.
 * @param badge.src - Base ShieldCN badge image URL before color mode is added.
 * @returns The HTML anchor and picture markup for a theme-aware badge.
 */
const renderThemeAwareBadge = ({
	alt,
	href,
	src,
}: {
	alt: string;
	href: string;
	src: string;
}): string =>
	`<a href="${href}"><picture><source media="(prefers-color-scheme: dark)" srcset="${withBadgeMode(src, 'dark')}"><img src="${withBadgeMode(src, 'light')}" alt="${alt}"></picture></a>`;
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
		.replace(/\n{3,}/gu, '\n\n')
		.trim()}\n\n\n\n`;
};

// Modify the addSection function to ensure blank lines around sections
const addSection = (
	header: string,
	content: string[] | undefined,
	formatter: (item: string, index?: number) => string = (item) => `- ${item}`
) => {
	if (!content || content.length === 0) {
		return '';
	}
	const body = content.map(formatter).join('\n');
	return `${header}\n\n\n\n\n${body}\n\n\n\n`
		.replace(/\n{3,}/gu, '\n\n')
		.trim();
};

// oxlint-disable-next-line complexity -- Preserve established branch order and control flow.
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
	const madeByInthBadgeUrl = `https://shieldcn.dev/badge/Made%20By-Inth-ffc803.svg?${INTH_BADGE_QUERY}`;
	const badgeBlock = `<p>
${[
	renderThemeAwareBadge({
		alt: 'Latest NPM Version',
		href: npmPackageLink,
		src: `https://shieldcn.dev/npm/${npmBadgeName}.svg?variant=outline`,
	}),
	renderThemeAwareBadge({
		alt: 'Stars',
		href: 'https://github.com/c15t/c15t',
		src: 'https://shieldcn.dev/github/c15t/c15t/stars.svg?variant=outline',
	}),
	renderThemeAwareBadge({
		alt: 'License',
		href: 'https://github.com/c15t/c15t/blob/main/LICENSE.md',
		src: 'https://shieldcn.dev/github/c15t/c15t/license.svg?variant=outline',
	}),
	renderThemeAwareBadge({
		alt: 'Discord',
		href: 'https://c15t.link/discord',
		src: 'https://shieldcn.dev/discord/1312171102268690493.svg?variant=outline',
	}),
	renderThemeAwareBadge({
		alt: 'Skills',
		href: 'https://skills.sh/c15t/skills/c15t',
		src: 'https://shieldcn.dev/skills/c15t/skills/c15t.svg?variant=outline',
	}),
	renderThemeAwareBadge({
		alt: 'Made by Inth',
		href: `https://inth.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=${npmBadgeName}`,
		src: madeByInthBadgeUrl,
	}),
].join('\n')}
</p>`;

	// Build sections
	const bannerBlock = `<p align="center">
  <a href="https://c15t.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=${npmBadgeName}" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="../../docs/assets/c15t-banner-readme-dark.svg" type="image/svg+xml">
      <img src="../../docs/assets/c15t-banner-readme-light.svg" alt="c15t Banner" type="image/svg+xml">
    </picture>
  </a>
</p>

# ${config.title}

${badgeBlock}`;

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
# Set up c15t in your project
pnpm dlx @c15t/cli@alpha setup
# Alternatives:
# npx @c15t/cli@alpha setup
# bunx --bun @c15t/cli@alpha setup
\`\`\`

The CLI will:

- Install necessary packages
- Configure your c15t instance
- Set up environment variables
- Add consent management components to your app
`;
	}

	const manualInstallationBlock = config.manualInstallation?.length
		? `## ${config.showCLIGeneration ? 'Manual Installation' : 'Installation'}

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

See the [documentation](${config.docsLink}) for guides, API reference, and examples.`;
	}

	let leadSectionsBlock = '';
	if (config.leadSections) {
		leadSectionsBlock = Object.entries(config.leadSections)
			.map(([heading, content]) => `## ${heading}\n\n${content}`)
			.join('\n\n');
	}

	let agentDocsBlock = '';
	if (config.shipsAgentDocs) {
		agentDocsBlock = `## Docs for AI Agents

This package ships its documentation as Markdown, matched to the installed version. After you install it, point your coding agent at \`node_modules/${config.packageName}/AGENTS.md\`. It indexes every guide in \`node_modules/${config.packageName}/docs/\`.

On the web, every page of the [c15t docs](https://c15t.com/docs) has a Markdown version, and [llms.txt](https://c15t.com/docs/llms.txt) lists them all. Install the c15t agent skills with \`npx skills add c15t/skills\`.`;
	}

	const hostingBlock = config.showHosting
		? renderHostingSection(npmBadgeName)
		: '';

	let customSectionsBlock = '';
	if (config.customSections) {
		customSectionsBlock = Object.entries(config.customSections)
			.map(([heading, content]) => `## ${heading}\n\n${content}`)
			.join('\n\n');
	}

	const supportBlock = addSection('## Support', config.support);
	const contributingBlock = addSection('## Contributing', config.contributing);

	const licenseBlock = `## License

[Apache License 2.0](https://github.com/c15t/c15t/blob/main/LICENSE.md)

---

**Built by [Inth](https://inth.com?utm_source=npm&utm_medium=readme&utm_campaign=oss_readme&utm_content=${npmBadgeName})**`;

	const readmeContent = [
		bannerBlock,
		config.description,
		SOCIAL_PROOF_LINE,
		featuresBlock,
		leadSectionsBlock,
		config.showHosting === 'lead' ? hostingBlock : '',
		prerequisitesBlock,
		quickStartBlock,
		manualInstallationBlock,
		installationBlock,
		usageBlock,
		config.showHosting === true ? hostingBlock : '',
		commandsBlock,
		globalFlagsBlock,
		telemetryBlock,
		docsBlock,
		customSectionsBlock,
		agentDocsBlock,
		supportBlock,
		contributingBlock,
		config.security || DEFAULT_SECURITY_SECTION,
		licenseBlock,
	]
		.filter((section) => isNonEmpty(section))
		.join('\n\n')
		.replace(/\n{3,}/gu, '\n\n')
		// Remove multiple trailing newlines
		.replace(/\n{2,}$/u, '\n');

	return `${readmeContent.trim()}\n`;
};

/**
 * Generates README files for all packages with readme.json configurations
 * @throws {Error} If packages directory doesn't exist
 * @throws {SyntaxError} If readme.json or package.json contains invalid JSON
 * @throws {Error} If file write operations fail
 */
const generateReadmes = async function generateReadmes() {
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

	await packageDirs.reduce<Promise<void>>(async (previous, packageName) => {
		await previous;
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

			readmeConfig.shipsAgentDocs = Array.isArray(packageJson.files)
				? packageJson.files.includes('AGENTS.md')
				: false;

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
	}, Promise.resolve());
};

try {
	await generateReadmes();
} catch (error) {
	console.error('Fatal error generating READMEs:', error);
	process.exit(1);
}

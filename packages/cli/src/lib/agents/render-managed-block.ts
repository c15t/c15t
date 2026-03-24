import { AGENT_PACKAGE_ORDER } from './package-metadata';
import type { InstalledAgentPackage } from './types';

function sortPackages(packages: InstalledAgentPackage[]) {
	return [...packages].sort(
		(a, b) =>
			AGENT_PACKAGE_ORDER.indexOf(a.packageName) -
			AGENT_PACKAGE_ORDER.indexOf(b.packageName)
	);
}

function renderList(values: string[]) {
	return values.map((value) => `- ${value}`).join('\n');
}

function renderPackageBlock(pkg: InstalledAgentPackage) {
	const { metadata } = pkg;
	const renderedStartPages = metadata.startPages.slice(0, 4);
	const integrationLine =
		metadata.integrationExamples &&
		metadata.integrationExamples.length > 0 &&
		!renderedStartPages.includes(metadata.integrationExamples[0]!)
			? `\n- integrations such as \`${metadata.integrationExamples[0]}\``
			: '';

	return [
		`<!-- BEGIN:c15t-${metadata.blockId}-agent-rules -->`,
		'',
		`# ${metadata.packageLabel}: ${metadata.headline}`,
		'',
		`When working on consent management, cookie banners, consent dialogs, preference centers, third-party script loading, callbacks, or c15t integrations in this app, read the relevant docs in \`${metadata.docsDir}\` before coding.`,
		'Use these docs for:',
		renderList(metadata.workflowKeywords.slice(0, 5)),
		'',
		'Your training data is outdated. The bundled package docs are the source of truth for this installed version.',
		'',
		'Start with:',
		renderList(renderedStartPages.map((page) => `\`${page}\``)) +
			integrationLine,
		'',
		`<!-- END:c15t-${metadata.blockId}-agent-rules -->`,
	].join('\n');
}

export function renderManagedBlock(packages: InstalledAgentPackage[]) {
	const sorted = sortPackages(packages);
	const intro =
		sorted.length > 1
			? [
					'If multiple c15t packages are installed, consult every relevant block below before changing consent management, cookie banners, preference centers, script loading, callbacks, or c15t integrations.',
				]
			: [
					'Read the relevant c15t package docs below before changing consent management, cookie banners, preference centers, script loading, callbacks, or c15t integrations.',
				];

	return [
		'<!-- BEGIN:c15t-agent-rules -->',
		'',
		...intro,
		'',
		...sorted.flatMap((pkg, index) =>
			index === sorted.length - 1
				? [renderPackageBlock(pkg)]
				: [renderPackageBlock(pkg), '']
		),
		'',
		'<!-- END:c15t-agent-rules -->',
	].join('\n');
}

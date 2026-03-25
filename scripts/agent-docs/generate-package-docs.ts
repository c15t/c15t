#!/usr/bin/env bun

import { join } from 'node:path';
import {
	ensureCleanAgentDocsDir,
	getAgentDocsDir,
	ROOT_DIR,
	resolvePackagePages,
	writeText,
} from './config';
import { convertMdxFile } from './convert';
import { remarkCalloutToMarkdown } from './mdx-components/components/callout/callout.remark';
import { remarkCardsToMarkdown } from './mdx-components/components/card/remark-cards';
import { remarkPackageCommandTabsToMarkdown } from './mdx-components/components/code-blocks/package-command-tabs.remark';
import { remarkMermaidToMarkdown } from './mdx-components/components/mermaid/mermaid.remark';
import { remarkStepsToMarkdown } from './mdx-components/components/steps/steps.remark';
import { remarkTabsToMarkdown } from './mdx-components/components/tabs/tabs.remark';
import { remarkTypeTableToMarkdown } from './mdx-components/components/type-table/type-table.remark';
import { remarkInclude } from './remark-include';
import { remarkUnwrapSections } from './remark-unwrap-sections';

const remarkPlugins = [
	remarkInclude,
	remarkUnwrapSections,
	remarkCalloutToMarkdown,
	remarkCardsToMarkdown,
	remarkMermaidToMarkdown,
	remarkPackageCommandTabsToMarkdown,
	remarkStepsToMarkdown,
	remarkTabsToMarkdown,
	[remarkTypeTableToMarkdown, { basePath: ROOT_DIR }],
];

export async function generatePackageDocs(packageName: string) {
	ensureCleanAgentDocsDir(packageName);
	const docsDir = getAgentDocsDir(packageName);
	for (const page of resolvePackagePages(packageName)) {
		const { markdown } = await convertMdxFile(page.sourcePath, remarkPlugins);
		writeText(join(docsDir, page.outputPath), markdown);
	}
}

if (import.meta.main) {
	const packageName = process.argv[2];
	if (!packageName) {
		console.error(
			'Usage: bun scripts/agent-docs/generate-package-docs.ts <package-name>'
		);
		process.exit(1);
	}
	generatePackageDocs(packageName).catch((error) => {
		console.error(error);
		process.exit(1);
	});
}

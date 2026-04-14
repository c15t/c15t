#!/usr/bin/env bun

import { join } from 'node:path';
import {
	ensureCleanAgentDocsDir,
	getAgentDocsDir,
	resolvePackagePages,
	writeText,
} from './config';
import { convertMdxFile } from './convert';
import {
	renderPackageDocsReadme,
	type SupportedDocsPackage,
} from './package-rules';
import { createAgentDocsRemarkPlugins } from './remark-pipeline';

const remarkPlugins = createAgentDocsRemarkPlugins();

export async function generatePackageDocs(packageName: string) {
	ensureCleanAgentDocsDir(packageName);
	const docsDir = getAgentDocsDir(packageName);
	const pages = resolvePackagePages(packageName);
	for (const page of pages) {
		const { markdown } = await convertMdxFile(page.sourcePath, remarkPlugins);
		writeText(join(docsDir, page.outputPath), markdown);
	}

	const readme = renderPackageDocsReadme(packageName as SupportedDocsPackage, [
		...pages.map((page) => page.outputPath),
		'README.md',
	]);
	writeText(join(docsDir, 'README.md'), readme);
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

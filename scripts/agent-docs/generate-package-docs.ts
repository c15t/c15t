#!/usr/bin/env bun

import { join } from 'node:path';
import {
	ensureCleanAgentDocsDir,
	getAgentDocsDir,
	resolvePackagePages,
	writeText,
} from './config';
import { convertMdxFile } from './convert';

export function generatePackageDocs(packageName: string) {
	ensureCleanAgentDocsDir(packageName);
	const docsDir = getAgentDocsDir(packageName);
	for (const page of resolvePackagePages(packageName)) {
		const { markdown } = convertMdxFile(page.sourcePath);
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
	generatePackageDocs(packageName);
}

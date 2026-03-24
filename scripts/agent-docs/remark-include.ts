import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const FRONTMATTER_REGEX = /^---\n[\s\S]*?\n---\n?/;
const IMPORT_REGEX = /<import\s+src=["']([^"']+)["']\s*\/>/g;

function stripFrontmatter(content: string) {
	return content.replace(FRONTMATTER_REGEX, '');
}

function extractSection(content: string, sectionId: string) {
	const sectionPattern = new RegExp(
		`<section[^>]*id=["']${sectionId}["'][^>]*>([\\s\\S]*?)<\\/section>`,
		'm'
	);
	const match = content.match(sectionPattern);
	return match?.[1] ?? null;
}

function parseImportTarget(target: string) {
	const [filePath, section] = target.split('#');
	return { filePath, section };
}

export function resolveImports(content: string, baseFilePath: string): string {
	return content.replace(IMPORT_REGEX, (_match, rawTarget: string) => {
		const target = parseImportTarget(rawTarget);
		const resolvedPath = resolve(dirname(baseFilePath), target.filePath);
		const imported = stripFrontmatter(readFileSync(resolvedPath, 'utf8'));
		const selected = target.section
			? (extractSection(imported, target.section) ?? '')
			: imported;
		return resolveImports(selected, resolvedPath);
	});
}

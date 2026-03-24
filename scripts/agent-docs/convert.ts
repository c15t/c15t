import { readFileSync } from 'node:fs';
import { resolveImports } from './remark-include';

const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n?/;
const EMPTY_LINES_REGEX = /\n{3,}/g;

function stripWrapperTags(content: string) {
	const cleanedLines: string[] = [];
	let inCodeFence = false;

	for (const line of content.split('\n')) {
		const trimmed = line.trim();
		if (trimmed.startsWith('```')) {
			inCodeFence = !inCodeFence;
			cleanedLines.push(line);
			continue;
		}

		if (inCodeFence) {
			cleanedLines.push(line);
			continue;
		}

		if (trimmed.startsWith('{/*') && trimmed.endsWith('*/}')) {
			continue;
		}

		if (
			/^<section\b[^>]*>$/.test(trimmed) ||
			trimmed === '</section>' ||
			/^<[A-Z][\w.:-]*\b[^>]*\/>$/.test(trimmed) ||
			/^<[A-Z][\w.:-]*\b[^>]*>$/.test(trimmed) ||
			/^<\/[A-Z][\w.:-]*>$/.test(trimmed)
		) {
			continue;
		}

		cleanedLines.push(line);
	}

	return cleanedLines.join('\n').replace(EMPTY_LINES_REGEX, '\n\n').trim();
}

export function convertMdxFile(sourcePath: string) {
	const raw = readFileSync(sourcePath, 'utf8');
	const frontmatterMatch = raw.match(FRONTMATTER_REGEX);
	const frontmatter = frontmatterMatch?.[1] ?? '';
	const content = raw.replace(FRONTMATTER_REGEX, '');
	const resolved = resolveImports(content, sourcePath);
	const cleaned = stripWrapperTags(resolved);
	const markdown =
		frontmatter.length > 0
			? `---\n${frontmatter}\n---\n\n${cleaned}\n`
			: `${cleaned}\n`;
	return {
		markdown,
		frontmatter,
	};
}

import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';

const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
const HEADING_REGEX = /^#\s+(.+)$/m;
const YAML_QUOTE_REGEX = /["\\]/g;
const TABLE_DIVIDER_REGEX = /^:?-{2,}:?$/;

let cachedProcessor: ReturnType<typeof remark> | null = null;
let cachedPluginIds: unknown[] = [];

function createRemarkProcessor(additionalPlugins: unknown[] = []) {
	if (
		cachedProcessor &&
		cachedPluginIds.length === additionalPlugins.length &&
		additionalPlugins.every(
			(plugin, index) => plugin === cachedPluginIds[index]
		)
	) {
		return cachedProcessor;
	}

	let processor = remark().use(remarkMdx).use(remarkGfm).data('settings', {
		tableCellPadding: false,
		tablePipeAlign: false,
	});
	for (const plugin of additionalPlugins) {
		if (Array.isArray(plugin)) {
			const [pluginFactory, ...pluginArgs] = plugin;
			processor = processor.use(pluginFactory as never, ...(pluginArgs as []));
			continue;
		}
		processor = processor.use(plugin as never);
	}

	cachedProcessor = processor;
	cachedPluginIds = additionalPlugins.slice(0);
	return processor;
}

function toYamlScalar(value: string) {
	return `"${value.replace(YAML_QUOTE_REGEX, '\\$&')}"`;
}

function titleFromFileName(sourcePath: string) {
	const fileName = basename(sourcePath, '.mdx').replace(/[-_]+/g, ' ').trim();
	return fileName.replace(/\b\w/g, (match) => match.toUpperCase());
}

function synthesizeFrontmatter(sourcePath: string, markdown: string) {
	const title =
		markdown.match(HEADING_REGEX)?.[1]?.trim() ?? titleFromFileName(sourcePath);

	const lines = markdown.split('\n');
	const paragraphLines: string[] = [];
	let insideFence = false;

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (line.startsWith('```')) {
			insideFence = !insideFence;
			continue;
		}
		if (insideFence || line.length === 0) {
			if (paragraphLines.length > 0) {
				break;
			}
			continue;
		}
		if (
			line.startsWith('#') ||
			line.startsWith('>') ||
			line.startsWith('|') ||
			line.startsWith('<') ||
			line.startsWith('- ') ||
			line.startsWith('* ') ||
			/^\d+\.\s/.test(line)
		) {
			if (paragraphLines.length > 0) {
				break;
			}
			continue;
		}
		paragraphLines.push(line);
	}

	const description = paragraphLines.join(' ').trim();
	const frontmatterLines = [`title: ${toYamlScalar(title)}`];

	if (description.length > 0) {
		frontmatterLines.push(`description: ${toYamlScalar(description)}`);
	}

	return frontmatterLines.join('\n');
}

function compactTableCell(cell: string) {
	const trimmed = cell.trim();
	if (TABLE_DIVIDER_REGEX.test(trimmed)) {
		const leftAligned = trimmed.startsWith(':');
		const rightAligned = trimmed.endsWith(':');
		return `${leftAligned ? ':' : ''}--${rightAligned ? ':' : ''}`;
	}
	return trimmed;
}

function compactMarkdownTables(markdown: string) {
	const lines = markdown.split('\n');
	const compacted: string[] = [];
	let insideFence = false;

	for (const rawLine of lines) {
		if (rawLine.trim().startsWith('```')) {
			insideFence = !insideFence;
			compacted.push(rawLine);
			continue;
		}

		const trimmed = rawLine.trim();
		const isTableLine =
			!insideFence &&
			trimmed.startsWith('|') &&
			trimmed.endsWith('|') &&
			trimmed.slice(1, -1).includes('|');

		if (!isTableLine) {
			compacted.push(rawLine);
			continue;
		}

		const indent = rawLine.match(/^\s*/)?.[0] ?? '';
		const cells = trimmed
			.slice(1, -1)
			.split('|')
			.map((cell) => compactTableCell(cell));
		compacted.push(`${indent}|${cells.join('|')}|`);
	}

	return compacted.join('\n');
}

export async function convertMdxFile(
	sourcePath: string,
	remarkPlugins: unknown[] = []
) {
	const raw = await readFile(sourcePath, 'utf8');
	const processor = createRemarkProcessor(remarkPlugins);
	const frontmatterMatch = raw.match(FRONTMATTER_REGEX);
	let frontmatter = '';
	let content = raw;

	if (frontmatterMatch) {
		frontmatter = frontmatterMatch[1] ?? '';
		content = frontmatterMatch[2] ?? '';
	}

	const processed = await processor.process({
		value: content,
		path: sourcePath,
	});

	const markdown = compactMarkdownTables(String(processed));
	const resolvedFrontmatter =
		frontmatter.trim().length > 0
			? frontmatter
			: synthesizeFrontmatter(sourcePath, markdown);

	return resolvedFrontmatter
		? {
				markdown: `---\n${resolvedFrontmatter}\n---\n${markdown}`,
				frontmatter: resolvedFrontmatter,
			}
		: {
				markdown,
				frontmatter: resolvedFrontmatter,
			};
}

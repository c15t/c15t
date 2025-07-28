import type { source } from '@/lib/source';
import type { InferPageType } from 'fumadocs-core/source';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';

// Note: remarkInclude from fumadocs-mdx/config would be ideal but has module resolution issues
// For now, we'll proceed without it as the core functionality still works

/**
 * Remark processor configured for processing MDX content into LLM-friendly format
 *
 * Includes:
 * - MDX support for parsing JSX components in markdown
 * - GitHub Flavored Markdown for tables, strikethrough, task lists, etc.
 *
 * @internal
 */
const processor = remark().use(remarkMdx).use(remarkGfm);

/**
 * Converts a fumadocs page into LLM-friendly text format
 *
 * This function processes the page content through remark to:
 * - Parse MDX components and convert them to readable text
 * - Handle GitHub Flavored Markdown features
 * - Generate a standardized format for AI consumption
 *
 * @param page - The fumadocs page to convert
 * @returns A formatted string containing the page title, URL, description, and processed content
 *
 * @example
 * ```ts
 * const page = source.getPage(['introduction']);
 * if (page) {
 *   const llmText = await getLLMText(page);
 *   console.log(llmText);
 * }
 * ```
 *
 * @throws {Error} When the content cannot be processed by remark
 */
export async function getLLMText(
	page: InferPageType<typeof source>
): Promise<string> {
	const processed = await processor.process({
		path: page.data._file.absolutePath,
		value: page.data.content,
	});

	return `# ${page.data.title}
URL: ${page.url}
Source: ${page.data._file.absolutePath}

${page.data.description || ''}

${processed.value}`;
}

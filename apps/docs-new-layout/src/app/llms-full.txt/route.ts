import { getLLMText } from '@/lib/get-llm-text';
import { source } from '@/lib/source';

/**
 * Route configuration for static generation
 *
 * Content is cached forever since documentation changes infrequently
 * and we want maximum performance for AI tools accessing this endpoint
 */
export const revalidate = false;

/**
 * GET handler for the comprehensive LLM text endpoint
 *
 * This route provides the complete documentation in a format optimized
 * for large language models and AI tools. It processes all pages through
 * the getLLMText function and combines them into a single response.
 *
 * @returns A plain text response containing all documentation content
 *
 * @example
 * ```
 * GET /llms-full.txt
 * Content-Type: text/plain
 *
 * # Page Title 1
 * URL: /docs/page1
 * Source: /path/to/page1.mdx
 *
 * Page content here...
 *
 * # Page Title 2
 * URL: /docs/page2
 * Source: /path/to/page2.mdx
 *
 * Page content here...
 * ```
 */
export async function GET(): Promise<Response> {
	try {
		// Get all pages from the source and map them through getLLMText
		const pages = source.getPages();
		const scanPromises = pages.map(getLLMText);
		const scannedContent = await Promise.all(scanPromises);

		// Join all content with double newlines for better readability
		const fullContent = scannedContent.join('\n\n');

		return new Response(fullContent, {
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
			},
		});
	} catch (error) {
		console.error('Failed to generate llms-full.txt:', error);
		return new Response('Internal Server Error', {
			status: 500,
			headers: {
				'Content-Type': 'text/plain',
			},
		});
	}
}

import { getLLMText } from '@/lib/get-llm-text';
import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Route configuration for caching
 *
 * Static generation caching is disabled since we want to serve
 * the most up-to-date content for AI tools and LLMs
 */
export const revalidate = false;

/**
 * GET handler for MDX route requests
 *
 * This route handles requests for individual page content in MDX format.
 * It serves LLM-friendly text content that can be consumed by AI tools
 * like ChatGPT, Claude, or other language models.
 *
 * @param _req - The Next.js request object (unused in this implementation)
 * @param context - Route context containing the dynamic slug parameters
 * @returns A response containing the processed page content as plain text
 *
 * @example
 * ```
 * GET /llms.mdx/introduction -> Returns the introduction page content
 * GET /llms.mdx/components/buttons -> Returns the buttons component page content
 * ```
 *
 * @throws {404} When the requested page is not found
 */
export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ slug?: string[] }> }
) {
	const { slug } = await params;
	const page = source.getPage(slug);

	if (!page) {
		notFound();
	}

	const llmText = await getLLMText(page);

	return new NextResponse(llmText, {
		headers: {
			'Content-Type': 'text/plain',
		},
	});
}

/**
 * Generate static parameters for all available pages
 *
 * This function tells Next.js which routes should be pre-generated
 * at build time. It generates parameters for all pages in the source.
 *
 * @returns An array of parameter objects for static generation
 */
export function generateStaticParams() {
	return source.generateParams();
}

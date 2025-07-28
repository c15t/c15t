import { source } from '@/lib/source';

/**
 * Route configuration for static generation
 *
 * Content is cached forever for optimal performance
 */
export const revalidate = false;

/**
 * GET handler for the summary LLM text endpoint
 *
 * This route provides a structured overview of the documentation
 * in a format optimized for AI tools and LLMs. Unlike llms-full.txt,
 * this provides a summary with links rather than full content.
 *
 * @returns A plain text response containing documentation overview
 */
export async function GET(): Promise<Response> {
	try {
		// Generate introduction content
		const introduction = generateIntroduction();

		// Get all pages and generate summary
		const pages = source.getPages();
		const documentationLinks = generateDocumentationLinks(pages);

		// Combine content
		const content = `${introduction}\n\n## Documentation\n\n${documentationLinks}`;

		return new Response(content, {
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
			},
		});
	} catch (error) {
		console.error('Failed to generate llms.txt:', error);
		return new Response('Internal Server Error', {
			status: 500,
			headers: {
				'Content-Type': 'text/plain',
			},
		});
	}
}

/**
 * Generates the introduction section for the LLM text
 */
function generateIntroduction(): string {
	return `# c15t Documentation

> Transform privacy consent from a compliance checkbox into a fully observable system. Built for modern development teams, c15t unifies analytics, consent tracking, and privacy controls into a single performant solution.

## What is c15t?

c15t (Consent Management) is an open-source platform that provides:

- **Analytics integration** - Connect with your existing analytics tools
- **Consent management** - Handle user privacy preferences elegantly  
- **Privacy controls** - Complete consent state visibility
- **Developer experience** - TypeScript-first APIs with full type safety
- **Performance focused** - Minimal bundle impact and optimized patterns

## Core Principles

1. **Open Source First** - Building in public for transparency and community collaboration
2. **Developer Experience** - Privacy management that feels natural in your workflow
3. **Performance as Standard** - Every byte matters, built with performance in mind
4. **Privacy by Design** - GDPR-compliant by default with granular controls

## Get Started

Ready to modernize your privacy infrastructure? Choose your path based on your stack and needs.`;
}

/**
 * Generates documentation links from pages
 */
function generateDocumentationLinks(
	pages: ReturnType<typeof source.getPages>
): string {
	const links: string[] = [];

	// Sort pages by URL for consistent ordering
	const sortedPages = pages.sort((a, b) => a.url.localeCompare(b.url));

	for (const page of sortedPages) {
		const title = page.data.title || 'Untitled';
		const description = page.data.description || 'No description available';
		const url = `https://c15t.com${page.url}`;

		links.push(`- [${title}](${url}): ${description}`);
	}

	return links.join('\n');
}

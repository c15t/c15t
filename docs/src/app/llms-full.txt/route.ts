import * as fs from 'node:fs/promises';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkStringify from 'remark-stringify';

export const revalidate = false;

export async function GET() {
	// all scanned content
	const files = await fg(['./src/content/**/*.mdx']);

	const scan = files.map(async (file) => {
		try {
			const stats = await fs.stat(file);
			if (stats.size > 5_000_000) {
				// 5MB limit
				throw new Error(`File ${file} exceeds size limit`);
			}
			const fileContent = await fs.readFile(file);
			const { content, data } = matter(fileContent.toString());

			const processed = await processContent(content);
			return `file: ${file}
meta: ${JSON.stringify(data, null, 2)}
        
${processed}`;
		} catch (error: unknown) {
			if (error instanceof Error) {
				console.error(`Error processing file ${file}:`, error);
				return `Error processing file ${file}: ${error.message}`;
			}
			console.error(`Error processing file ${file}:`, error);
			return `Error processing file ${file}: Unknown error occurred`;
		}
	});

	const scanned = await Promise.all(scan);

	return new Response(scanned.join('\n\n'));
}

async function processContent(content: string): Promise<string> {
	const file = await remark()
		.use(remarkMdx)
		.use(remarkGfm)
		.use(remarkStringify)
		.process(content);

	return String(file);
}

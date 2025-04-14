import * as fs from 'node:fs/promises';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkStringify from 'remark-stringify';

export const revalidate = false;

export async function GET() {
  // Fetch all documents
  const files = await fg(['./src/content/**/*.mdx']);

  const scannedDocuments = await Promise.all(
    files.map(async (file) => {
      try {
        const fileContent = await fs.readFile(file);
        const { content, data } = matter(fileContent.toString());
        return {
          file: file,
          meta: data,
          content: await processContent(content),
        };
      } catch (error) {
        // biome-ignore lint/suspicious/noConsole: debug error
        console.error(`Error processing file ${file}:`, error);
        return null; // Handle error appropriately
      }
    })
  );

  // Generate llms.txt content
  const llmsContent = generateLlmsTxtContent(scannedDocuments);

  // Return llms.txt content as plain text
  return new Response(llmsContent, {
    headers: { 'Content-Type': 'text/plain' },
  });
}

// Function to generate the content for llms.txt
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function generateLlmsTxtContent(documents: any[]): string {
  let content =
    "# Introduction to Consent Management (c15t)\n\n> Transform privacy consent from a compliance checkbox into a fully observable system. Built for modern development teams, c15t unifies analytics, consent tracking, and privacy controls into a single performant solution - no more slow cookie banners or blind spots in user privacy choices.\n\n## What is Consent Management?\n\nConsent Management (c15t) is an open-source platform that transforms privacy consent from a compliance checkbox into a fully observable system. Built for modern development teams, it provides a unified solution for:\n\n- Analytics integration\n- Consent management\n- Privacy controls\n- Complete consent state visibility\n\nGone are the days of:\n\n- Cookie banners slowing down your site\n- Blind spots in consent tracking\n- Complex multi-vendor implementations\n- Uncertainty about privacy policy changes\n- Poor visibility into consent states\n\n## Core Principles\n\n1. Open Source First\n   - Building in public isn't just about transparency - it's about creating better tools through community collaboration. Our open-source foundation means you can:\n     - Inspect and understand the code handling user consent\n     - Contribute improvements and fixes\n     - Self-host for complete control\n     - Trust through transparency\n2. Developer Experience\n   - Privacy management should feel natural in your development workflow:\n     - TypeScript-first APIs with full type safety\n     - Modern React patterns and hooks\n     - Intuitive state management\n     - Comprehensive documentation\n3. Performance as Standard\n   - Every byte matters. c15t is built with performance in mind:\n     - Minimal bundle impact\n     - Efficient state management\n     - Optimized server/client patterns\n     - Smart code splitting\n4. Privacy by Design\n   - Privacy isn't an afterthought - it's a core part of modern web development:\n     - GDPR-compliant by default\n     - Granular consent controls\n     - Complete audit trail\n     - Privacy-first architecture\n\n## Get Started\n\nReady to modernize your privacy infrastructure? Choose your path\n\n## Main Documentation\n";

  // biome-ignore lint/complexity/noForEach: <explanation>
  documents.forEach((doc) => {
    if (doc) {
      // Construct the slug based on the file path
      const slug = doc.file
        .replace('./src/content/', '')
        .replace('.mdx', '')
        .replace('/index', '');
      const externalLink = `https://c15t.com/docs/${slug}`;
      content += `- [${doc.meta.title || 'Untitled'}](${externalLink}): ${doc.meta.description || 'No description available'}\n`;
    }
  });

  content +=
    '\n## Optional Resources\n- [Advanced Topics](https://c15t.com/docs/advanced): In-depth guides\n- [Examples](https://c15t.com/docs/examples): Code samples\n';
  return content;
}

// Function to process content
async function processContent(content: string): Promise<string> {
  const file = await remark()
    .use(remarkMdx)
    .use(remarkGfm)
    .use(remarkStringify)
    .process(content);

  return String(file);
}

import { customDarkTheme, customTheme } from '@/mdx-plugins/theme';
import {
	defineConfig,
	defineDocs,
	frontmatterSchema,
	metaSchema,
} from 'fumadocs-mdx/config';

// You can customise Zod schemas for frontmatter and `meta.json` here
// see https://fumadocs.vercel.app/docs/mdx/collections#define-docs
export const docs = defineDocs({
	docs: {
		schema: frontmatterSchema,
	},
	meta: {
		schema: metaSchema,
	},
});

export default defineConfig({
	mdxOptions: {
		// MDX options
		rehypeCodeOptions: {
			langs: ['python', 'javascript', 'typescript'],
			themes: {
				light: customTheme,
				dark: customDarkTheme,
			},
		},
	},
});

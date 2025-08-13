import { remarkInstall } from 'fumadocs-docgen';
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { createGenerator, remarkAutoTypeTable } from 'fumadocs-typescript';

const generator = createGenerator();

export const docs = defineDocs({
	dir: 'content',
});

export default defineConfig({
	mdxOptions: {
		remarkPlugins: [remarkInstall, [remarkAutoTypeTable, { generator }]],
	},
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Runnable files whose contents are also published in documentation. */
export const exampleDocSources = [
	{
		destination: 'docs/shared/examples/nextjs-scripts.mdx',
		source: 'examples/nextjs/lib/scripts.ts',
		title: 'lib/scripts.ts',
	},
	{
		destination: 'docs/shared/examples/react-scripts.mdx',
		source: 'examples/react/src/scripts.ts',
		title: 'src/scripts.ts',
	},
	{
		destination: 'docs/shared/examples/vue-scripts.mdx',
		source: 'examples/vue/src/scripts.ts',
		title: 'src/scripts.ts',
	},
	{
		destination: 'docs/shared/examples/svelte-scripts.mdx',
		source: 'examples/svelte/src/scripts.ts',
		title: 'src/scripts.ts',
	},
	{
		destination: 'docs/shared/examples/javascript-scripts.mdx',
		source: 'examples/javascript/src/scripts.ts',
		title: 'src/scripts.ts',
	},
	{
		destination: 'docs/shared/examples/nuxt-scripts.mdx',
		source: 'examples/nuxt/app/example-scripts.ts',
		title: 'app/example-scripts.ts',
	},
	{
		destination: 'docs/shared/examples/tanstack-start-scripts.mdx',
		source: 'examples/tanstack-start/src/example-scripts.ts',
		title: 'src/example-scripts.ts',
	},
	{
		destination: 'docs/shared/examples/astro-scripts.mdx',
		source: 'examples/astro-demo/src/example-scripts.ts',
		title: 'src/example-scripts.ts',
	},
	{
		destination: 'docs/shared/examples/sveltekit-scripts.mdx',
		source: 'examples/sveltekit-demo/src/lib/example-scripts.ts',
		title: 'src/lib/example-scripts.ts',
	},
] as const;

/** Creates a code fence from the exact runnable file, without rewriting imports. */
export const renderExampleSource = (
	root: string,
	entry: (typeof exampleDocSources)[number]
): string => {
	const source = readFileSync(resolve(root, entry.source), 'utf8').trimEnd();
	return `{/* Generated from ${entry.source} by scripts/sync-example-docs.ts. */}\n\n\`\`\`ts title="${entry.title}"\n${source}\n\`\`\`\n`;
};

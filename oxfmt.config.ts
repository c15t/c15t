import { defineConfig } from 'oxfmt';
import ultracite from 'ultracite/oxfmt';

export default defineConfig({
	...ultracite,
	ignorePatterns: [
		...ultracite.ignorePatterns,
		'.agents/**',
		'.claude/**',
		'.codex/**',
		'.cursor/**',
		'.repos/**',
		'.tmp-bun/**',
		'**/*.md',
		'**/*.mdx',
		// Registry sources and vendored shadcn ui keep upstream shadcn formatting.
		'apps/shadcn-registry/registry/**',
		'apps/shadcn-registry/vendor/**',
		'packages/c15t/shims/**',
		'packages/ui/types/**',
	],
	jsxSingleQuote: false,
	printWidth: 80,
	semi: true,
	singleAttributePerLine: true,
	singleQuote: true,
	sortImports: {
		ignoreCase: true,
		newlinesBetween: true,
		order: 'asc',
	},
	sortPackageJson: {
		sortScripts: true,
	},
	sortTailwindcss: {
		functions: ['clsx', 'cva', 'tw', 'twMerge', 'cn', 'twJoin', 'tv'],
	},
	svelte: true,
	tabWidth: 2,
	trailingComma: 'es5',
	useTabs: true,
});

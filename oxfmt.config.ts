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
		'packages/c15t/shims/**',
		'packages/ui/types/**',
	],
	jsxSingleQuote: false,
	printWidth: 80,
	semi: true,
	singleAttributePerLine: true,
	singleQuote: true,
	sortImports: false,
	sortPackageJson: false,
	sortTailwindcss: false,
	svelte: true,
	tabWidth: 2,
	trailingComma: 'es5',
	useTabs: true,
});

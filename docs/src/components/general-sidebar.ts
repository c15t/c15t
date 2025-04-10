import type { PageTree } from 'fumadocs-core/server';
import type { Option } from './layout/root-toggle';

// Framework options for the dropdown selector
export const frameworkOptions: Option[] = [
	{
		title: 'Next.js',
		url: '/docs/nextjs',
		icon: 'next',
	},
	{
		title: 'React',
		url: '/docs/react',
		icon: 'react',
	},
	{
		title: 'Javascript',
		url: '/docs/javascript',
		icon: 'js',
	},
];

// Create lookup maps for framework identification
const frameworkPaths = frameworkOptions.map(
	(option) => option.url.split('/').pop() || ''
);
const FRAMEWORK_STORAGE_KEY = 'activeFramework';

/**
 * Determines which framework is active based on the URL path
 * @param path Current URL path
 * @returns Framework identifier (e.g., 'nextjs', 'react', 'javascript')
 */
export function determineActiveFramework(path: string): string {
	// First check if the current path exactly matches a specific framework path
	for (const frameworkPath of frameworkPaths) {
		// Check for exact framework match (/docs/react) but not within component paths
		const exactPathMatch = path.match(
			new RegExp(`\\/docs\\/${frameworkPath}(?:\\/|$)`)
		);
		if (exactPathMatch) {
			// During client-side rendering, we can store this preference
			if (typeof window !== 'undefined') {
				try {
					localStorage.setItem(FRAMEWORK_STORAGE_KEY, frameworkPath);
				} catch {
					// Ignore localStorage errors (private browsing, etc.)
				}
			}
			return frameworkPath;
		}
	}

	// Special handling for shared pages (/general, /styling, etc.)
	// and for component paths that should retain the current framework
	if (
		path.includes('/general') ||
		path.includes('/components/react') ||
		path.includes('/styling') ||
		path.includes('/hooks')
	) {
		// During client-side hydration/rendering, we can check localStorage
		// But this must happen AFTER initial hydration to prevent mismatches
		// We put this in a try/catch to handle private browsing mode
		// biome-ignore lint/nursery/useCollapsedIf: <explanation>
		if (
			typeof window !== 'undefined' &&
			window.document?.readyState === 'complete'
		) {
			try {
				const storedFramework = localStorage.getItem(FRAMEWORK_STORAGE_KEY);
				if (storedFramework && frameworkPaths.includes(storedFramework)) {
					return storedFramework;
				}
			} catch {
				// Ignore localStorage errors
			}
		}
	}

	// Default to first framework if no stored preference or during SSR
	return frameworkPaths[0];
}

// Shared general pages that will be displayed under all frameworks
// const generalPages: PageTree.Node[] = [
// 	{
// 		$id: 'general-separator',
// 		type: 'separator',
// 		name: 'General',
// 	},
// 	{
// 		$id: 'general/hello-world',
// 		type: 'page',
// 		name: 'Hello World',
// 		description: 'Your first document',
// 		url: '/docs/general',
// 		$ref: {
// 			file: 'nextjs/index.mdx',
// 		},
// 	},
// ];

// Next.js specific framework pages
const nextjsPages: PageTree.Node[] = [
	// {
	// 	$id: 'nextjs/index',
	// 	type: 'page',
	// 	name: 'Getting Started',
	// 	url: '/docs/nextjs',
	// },
	// {
	// 	$id: 'nextjs/installation',
	// 	type: 'page',
	// 	name: 'Installation',
	// 	url: '/docs/nextjs/installation',
	// },
];

// Next.js specific framework pages
const hooksPages: PageTree.Node[] = [
	{
		$id: 'hooks-seperator',
		type: 'separator',
		name: 'Hooks',
	},
	{
		$id: 'hooks/index',
		type: 'page',
		name: 'useConsentManager()',
		url: '/docs/hooks/use-consent-manager',
	},
	{
		$id: 'hooks/useFocusTrap',
		type: 'page',
		name: 'useFocusTrap()',
		url: '/docs/hooks/use-focus-trap',
	},
];

// Styling guides pages
const stylingPages: PageTree.Node[] = [
	{
		$id: 'styling-separator',
		type: 'separator',
		name: 'Styling',
	},
	{
		$id: 'styling/general',
		type: 'page',
		name: 'General Styling',
		description: 'Core concepts of the theming system',
		url: '/docs/styling',
	},
	{
		$id: 'styling/classnames',
		type: 'page',
		name: 'CSS Classes',
		description: 'Styling with CSS class names',
		url: '/docs/styling/classnames',
	},
	{
		$id: 'styling/tailwind',
		type: 'page',
		name: 'Tailwind CSS',
		description: 'Styling with Tailwind utility classes',
		url: '/docs/styling/tailwind',
	},
	{
		$id: 'styling/css-variables',
		type: 'page',
		name: 'CSS Variables',
		description: 'Styling with CSS custom properties',
		url: '/docs/styling/css-variables',
	},
	{
		$id: 'styling/inline-styles',
		type: 'page',
		name: 'Inline Styles',
		description: 'Styling with JavaScript style objects',
		url: '/docs/styling/inline-styles',
	},
];

// Backend pages
const backendPages: PageTree.Node[] = [
	{
		$id: 'backend-separator',
		type: 'separator',
		name: 'Backend',
	},
	{
		$id: 'backend/index',
		type: 'page',
		name: 'Overview',
		description: 'Backend integration overview',
		url: '/docs/backend',
	},
	{
		$id: 'backend/core-concepts',
		type: 'page',
		name: 'Core Concepts',
		description: 'Fundamental backend concepts',
		url: '/docs/backend/core-concepts',
	},
	{
		$id: 'backend/database-adapters',
		type: 'page',
		name: 'Database Adapters',
		description: 'Overview of database adapters',
		url: '/docs/backend/database-adapters',
	},
	{
		$id: 'backend/plugins',
		type: 'page',
		name: 'Plugins',
		description: 'Backend plugin system',
		url: '/docs/backend/plugins',
	},
	{
		$id: 'backend-databases-separator',
		type: 'separator',
		name: 'Databases',
	},
	{
		$id: 'backend/databases/postgres',
		type: 'page',
		name: 'PostgreSQL',
		description: 'PostgreSQL integration',
		url: '/docs/backend/databases/postgres',
	},
	{
		$id: 'backend/databases/mysql',
		type: 'page',
		name: 'MySQL',
		description: 'MySQL integration',
		url: '/docs/backend/databases/mysql',
	},
	{
		$id: 'backend/databases/sqlite',
		type: 'page',
		name: 'SQLite',
		description: 'SQLite integration',
		url: '/docs/backend/databases/sqlite',
	},
	{
		$id: 'backend-adapters-separator',
		type: 'separator',
		name: 'Database Adapters',
	},
	{
		$id: 'backend/adapters/memory',
		type: 'page',
		name: 'Memory',
		description: 'In-memory database adapter',
		url: '/docs/backend/adapters/memory',
	},
	{
		$id: 'backend/adapters/kysely',
		type: 'page',
		name: 'Kysely',
		description: 'Kysely database adapter',
		url: '/docs/backend/adapters/kysely',
	},
	{
		$id: 'backend/adapters/prisma',
		type: 'page',
		name: 'Prisma',
		description: 'Prisma database adapter',
		url: '/docs/backend/adapters/prisma',
	},
	{
		$id: 'backend/adapters/drizzle',
		type: 'page',
		name: 'Drizzle',
		description: 'Drizzle database adapter',
		url: '/docs/backend/adapters/drizzle',
	},
];

// React specific framework pages
// const reactPages: PageTree.Node[] = [
// 	{
// 		$id: 'react/index',
// 		type: 'page',
// 		name: 'Overview',
// 		url: '/docs/react',
// 	},
// ];

// JavaScript specific framework pages
const javascriptPages: PageTree.Node[] = [
	{
		$id: 'javascript/index',
		type: 'page',
		name: 'Overview',
		url: '/docs/javascript',
	},
	{
		$id: 'javascript/how-it-works',
		type: 'page',
		name: 'How it works',
		url: '/docs/javascript/how-it-works',
	},
	{
		$id: 'javascript/auto-detect',
		type: 'page',
		name: 'Auto Detect',
		url: '/docs/javascript/auto-detect',
	},
	{
		$id: 'javascript/api-reference',
		type: 'page',
		name: 'API Reference',
		url: '/docs/javascript/api-reference',
	},
];

export const reactComponentsNavigation: PageTree.Node[] = [
	// {
	// 	$id: 'react-components',
	// 	type: 'separator',
	// 	name: 'React Components',
	// },
	{
		$id: 'react-components/cookie-banner',
		type: 'page',
		name: 'Cookie Banner',
		url: '/docs/components/react/cookie-banner',
	},
	{
		$id: 'react-components/consent-manager-dialog',
		type: 'page',
		name: 'Consent Manager Dialog',
		url: '/docs/components/react/consent-manager-dialog',
	},
	{
		$id: 'react-components/consent-manager-widget',
		type: 'page',
		name: 'Consent Manager Widget',
		url: '/docs/components/react/consent-manager-widget',
	},

	{
		$id: 'react-components/dev-tool',
		type: 'page',
		name: 'Dev Tool',
		url: '/docs/components/react/dev-tool',
	},
];

// Create a navigation tree for each framework
export const nextjsNavigation: PageTree.Root = {
	$id: 'nextjs-root',
	name: 'Next.js Documentation',
	children: [
		{
			$id: 'nextjs-pages',
			type: 'separator',
			name: 'Next.js',
		},
		...nextjsPages,
		...reactComponentsNavigation,
		...hooksPages,
		...stylingPages,
		...backendPages,
	],
};

export const reactNavigation: PageTree.Root = {
	$id: 'react-root',
	name: 'React Documentation',
	children: [
		// {
		// 	$id: 'react-pages',
		// 	type: 'separator',
		// 	name: 'React',
		// },
		// ...reactPages,
		...reactComponentsNavigation,
		...hooksPages,
		...stylingPages,
	],
};

// Create a navigation tree for JavaScript
export const javascriptNavigation: PageTree.Root = {
	$id: 'javascript-root',
	name: 'JavaScript Documentation',
	children: [
		{
			$id: 'javascript-pages',
			type: 'separator',
			name: 'JavaScript',
		},
		...javascriptPages,
	],
};

// The sidebar navigation tree will dynamically select the appropriate framework tree
export const sidebarNavigation: PageTree.Root = {
	$id: 'root',
	name: 'Documentation',
	children: [], // Will be populated dynamically based on the active framework
};

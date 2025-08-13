import { PreviewClient } from './client';
import type { PreviewProps, SandboxFiles, SandboxTemplate } from './types';

// ----- Constants -----
/**
 * TypeScript config used in sandboxes
 */
const tsconfig = `{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}`;

/**
/**
 * Utility functions used in sandboxes
 */
const utils = `
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function setupDarkMode() {
	if (typeof window !== 'undefined') {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
			document.documentElement.classList.toggle('dark', e.matches);
			document.documentElement.classList.toggle('light', !e.matches);
		};

		handleChange(mediaQuery);
		mediaQuery.addEventListener('change', handleChange);
		return () => mediaQuery.removeEventListener('change', handleChange);
	}
}

export function clearLocalStorage() {
	if (typeof window !== 'undefined') {
		try {
			localStorage.clear();
		} catch (error) {
			console.warn('Error during cleanup:', error);
		}
	}
}
`;

// ----- Utility Functions -----

/**
 * Prepare sandbox files from code input
 */
function prepareSandboxFiles(
	code: string | Record<string, string>,
	defaultFile: string
): SandboxFiles {
	const baseFiles = {
		'/tsconfig.json': tsconfig,
		'/lib/utils.ts': utils,
	};

	if (typeof code === 'string') {
		const normalizedDefaultFile = defaultFile.startsWith('/')
			? defaultFile
			: `/${defaultFile}`;

		return Object.assign({}, baseFiles, {
			[normalizedDefaultFile]: code,
		});
	}

	const codeFiles = Object.entries(code).reduce(
		(acc, [filename, content]) => {
			const normalizedFilename = filename.startsWith('/')
				? filename
				: `/${filename}`;
			acc[normalizedFilename] = content;
			return acc;
		},
		{} as Record<string, string>
	);

	return Object.assign({}, baseFiles, codeFiles);
}

/**
 * Get external resources based on template
 */
function getExternalResources(template: SandboxTemplate): string[] {
	const resources: string[] = [];

	// Add Tailwind for React TS templates
	if (template === 'react-ts') {
		resources.push('https://unpkg.com/@tailwindcss/browser@4');
	}

	// Add fonts for all templates
	resources.push(
		'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap'
	);

	return resources;
}

/**
 * Get dependencies based on template and user-provided dependencies
 */
function getDependencies(
	template: SandboxTemplate,
	userDependencies: Record<string, string> = {}
): Record<string, string> {
	const dependencies = Object.assign({}, userDependencies);

	// Add template-specific dependencies
	if (template === 'react-ts') {
		dependencies['@c15t/react'] = 'latest';
	}

	// Add common dependencies
	dependencies['@c15t/dev-tools'] = 'latest';

	return dependencies;
}

/**
 * Code preview component - Server Component
 *
 * Renders a live preview of code with editor, preview, and console tabs
 */
export const Preview = (props: PreviewProps) => {
	// Prepare static data on the server
	const {
		code,
		defaultFile = '/App.tsx',
		template = 'react-ts',
		dependencies: demoDependencies,
	} = props;

	// Prepare files for the sandbox
	const files = prepareSandboxFiles(code, defaultFile);

	// Get dependencies based on template and user deps
	const dependencies = getDependencies(
		template as SandboxTemplate,
		demoDependencies || {}
	);

	// Get external resources based on template
	const externalResources = getExternalResources(template as SandboxTemplate);

	// Pass the prepared data to the client component
	return (
		<PreviewClient
			{...props}
			files={files}
			dependencies={dependencies}
			externalResources={externalResources}
		/>
	);
};

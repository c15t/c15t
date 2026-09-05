import type { DevelopmentEnvironment } from '~/context/framework-detection';

/** Generate a development-only lazy import using the project's build-time flag. */
export const generateDevToolsImport = (
	source: string,
	environment: DevelopmentEnvironment = 'node'
): string => {
	const developmentGuard = {
		manual:
			"false /* Replace false with your bundler's build-time development flag. */",
		node: "process.env.NODE_ENV !== 'production'",
		vite: 'import.meta.env.DEV',
	}[environment];
	return `import { lazy, Suspense } from 'react';

const DevTools = ${developmentGuard}
	? lazy(() => import('${source}').then(({ DevTools }) => ({ default: DevTools })))
	: () => null;
`;
};

export const DEVTOOLS_COMPONENT =
	'<Suspense fallback={null}><DevTools /></Suspense>';

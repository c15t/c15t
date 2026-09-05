/** Generate a development-only lazy import for a framework DevTools adapter. */
export const generateDevToolsImport = (source: string): string => {
	const isNext =
		source === 'c15t/next/devtools' || source === '@c15t/nextjs/devtools';
	const developmentGuard = isNext
		? "process.env.NODE_ENV !== 'production'"
		: 'import.meta.env.DEV';
	return `import { lazy, Suspense } from 'react';

const DevTools = ${developmentGuard}
	? lazy(() => import('${source}').then(({ DevTools }) => ({ default: DevTools })))
	: () => null;
`;
};

export const DEVTOOLS_COMPONENT =
	'<Suspense fallback={null}><DevTools /></Suspense>';

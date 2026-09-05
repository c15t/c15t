/** Generate a development-only lazy import for a framework DevTools adapter. */
export const generateDevToolsImport = (
	source: string
): string => `import { lazy, Suspense } from 'react';

const DevTools = process.env.NODE_ENV !== 'production'
	? lazy(() => import('${source}').then(({ DevTools }) => ({ default: DevTools })))
	: () => null;
`;

export const DEVTOOLS_COMPONENT =
	'<Suspense fallback={null}><DevTools /></Suspense>';

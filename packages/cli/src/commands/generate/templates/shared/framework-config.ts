/**
 * Framework configuration for parameterized template generation
 * Allows server component and expanded file generators to work across
 * different React Server Component frameworks (Next.js, TanStack Start, etc.)
 */

export interface FrameworkConfig {
	importSource: string;
	devToolsImportSource: string;
	consentBannerImport: string;
	consentDialogImport: string;
	frameworkName: string;
	ssrMechanism: string;
	docsSlug: string;
	envVarPrefix: string;
	hasSSRProps: boolean;
}

export const NEXTJS_CONFIG: FrameworkConfig = {
	consentBannerImport: 'c15t/next/v3',
	consentDialogImport: 'c15t/next/v3',
	devToolsImportSource: 'c15t/next/v3/devtools',
	docsSlug: 'next',
	envVarPrefix: 'NEXT_PUBLIC',
	frameworkName: 'Next.js App Router',
	hasSSRProps: true,
	importSource: 'c15t/next/v3',
	ssrMechanism: 'Next.js headers() API',
};

export const REACT_CONFIG: FrameworkConfig = {
	consentBannerImport: 'c15t/react/v3',
	consentDialogImport: 'c15t/react/v3',
	devToolsImportSource: 'c15t/react/v3/devtools',
	docsSlug: 'react',
	envVarPrefix: '',
	frameworkName: 'React',
	hasSSRProps: false,
	importSource: 'c15t/react/v3',
	ssrMechanism: '',
};

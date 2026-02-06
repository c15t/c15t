/**
 * Framework configuration for parameterized template generation
 * Allows server component and expanded file generators to work across
 * different React Server Component frameworks (Next.js, TanStack Start, etc.)
 */

export interface FrameworkConfig {
	importSource: string;
	consentBannerImport: string;
	consentDialogImport: string;
	frameworkName: string;
	ssrMechanism: string;
	docsSlug: string;
	envVarPrefix: string;
}

export const NEXTJS_CONFIG: FrameworkConfig = {
	importSource: '@c15t/nextjs',
	consentBannerImport: '@c15t/nextjs/consent-banner',
	consentDialogImport: '@c15t/nextjs/consent-dialog',
	frameworkName: 'Next.js App Router',
	ssrMechanism: 'Next.js headers() API',
	docsSlug: 'nextjs',
	envVarPrefix: 'NEXT_PUBLIC',
};

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
	hasSSRProps: boolean;
	/** CSS stylesheet import path for prebuilt (styled) components, or null for unstyled. */
	stylesheetImport: string | null;
	/** CSS stylesheet import path for IAB components, or null if IAB is not applicable. */
	iabStylesheetImport: string | null;
}

export const NEXTJS_CONFIG: FrameworkConfig = {
	importSource: '@c15t/nextjs',
	consentBannerImport: '@c15t/nextjs',
	consentDialogImport: '@c15t/nextjs',
	frameworkName: 'Next.js App Router',
	ssrMechanism: 'Next.js headers() API',
	docsSlug: 'nextjs',
	envVarPrefix: 'NEXT_PUBLIC',
	hasSSRProps: true,
	stylesheetImport: '@c15t/nextjs/styles.css',
	iabStylesheetImport: '@c15t/nextjs/iab/styles.css',
};

export const REACT_CONFIG: FrameworkConfig = {
	importSource: '@c15t/react',
	consentBannerImport: '@c15t/react',
	consentDialogImport: '@c15t/react',
	frameworkName: 'React',
	ssrMechanism: '',
	docsSlug: 'react',
	envVarPrefix: '',
	hasSSRProps: false,
	stylesheetImport: '@c15t/react/styles.css',
	iabStylesheetImport: '@c15t/react/iab/styles.css',
};

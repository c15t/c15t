/**
 * Available branding options for the consent banner
 * "consent" is kept as a deprecated alias for "inth"
 * This is a runtime-safe constant that can be imported without Zod
 */
export const brandingValues = ['c15t', 'inth', 'consent', 'none'] as const;

/**
 * Who runs the backend that served a consent decision: inth's hosted
 * platform, or the site's own `@c15t/backend`.
 * This is a runtime-safe constant that can be imported without Valibot
 */
export const hostingValues = ['inth', 'self-hosted'] as const;

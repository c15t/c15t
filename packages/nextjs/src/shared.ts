// Shared Exports between all directories

// Export everything from @c15t/react
// Note: ConsentManagerProvider will be overridden by the Next.js-specific
// implementation exported from index.ts
export * from '@c15t/react';

// Export ConsentManagerProvider with client-specific name for internal use
export { ConsentManagerProvider as ClientConsentManagerProvider } from '@c15t/react';

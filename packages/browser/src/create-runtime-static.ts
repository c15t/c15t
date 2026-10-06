/**
 * The page runtime for the script-tag builds, with every module imported
 * statically. Replaces `create-runtime.ts` there (see `rslib.config.ts`).
 */
// oxlint-disable-next-line oxc/no-barrel-file -- One renamed re-export, so the script tag carries no wrapper.
export { createConsentRuntime as createBrowserRuntime } from '@c15t/core/runtime';

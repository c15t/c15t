// #region docs:consent-options
// The policy withConsentManifest in next.config.ts downloaded. Server code
// only: importing it from a client component fails the build.
import { snapshot } from 'c15t/generated';
import type { ResolveConsentOptions } from 'c15t/next/server';

export const consentOptions = { snapshot } satisfies ResolveConsentOptions;
// #endregion docs:consent-options

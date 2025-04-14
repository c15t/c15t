/**
 * Public API Types
 *
 * This file exports all the types needed by client applications to interact with the API.
 * It contains request and response type definitions for all public endpoints.
 */

// Import route definitions to extract their types
import type { z } from 'zod';
import type { RouteResponseType } from './pkgs/api-router/utils/define-route';
import type { setConsent } from './routes/set-consent';
import type { showConsentBanner } from './routes/show-consent-banner';
import type { verifyConsent } from './routes/verify-consent';

// Export the schemas
import type { SetConsentRequestBody as SetConsentRequestBodyZod } from './routes/set-consent';
import type { VerifyConsentRequestBody as VerifyConsentRequestBodyZod } from './routes/verify-consent';

// Export response types extracted directly from route definitions
export type SetConsentResponse = RouteResponseType<typeof setConsent>;
export type ShowConsentBannerResponse = RouteResponseType<
  typeof showConsentBanner
>;
export type VerifyConsentResponse = RouteResponseType<typeof verifyConsent>;

export type SetConsentRequestBody = z.infer<typeof SetConsentRequestBodyZod>;
export type VerifyConsentRequestBody = z.infer<
  typeof VerifyConsentRequestBodyZod
>;

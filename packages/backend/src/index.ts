/**
 * c15t Consent Management System
 *
 * This is the main entry point for the c15t library, exporting all public APIs,
 * components, and types needed to implement consent management in your application.
 */

//------------------------------------------------------------------------------
// Core API
//------------------------------------------------------------------------------
export { c15tInstance, type C15TInstance } from './core';

//------------------------------------------------------------------------------
// Types
//------------------------------------------------------------------------------
export * as Types from './pkgs/types';

export type {
  C15TContext,
  C15TOptions,
  C15TPlugin,
  InferPluginContexts,
  ApiPathBase,
  ApiPath,
} from './types';

// Export all the response types to make them available for client applications
export type {
  SetConsentResponse,
  ShowConsentBannerResponse,
  VerifyConsentResponse,
  SetConsentRequestBody,
  VerifyConsentRequestBody,
} from './response-types';

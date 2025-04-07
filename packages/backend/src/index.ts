/**
 * c15t Consent Management System
 *
 * This is the main entry point for the c15t library, exporting all public APIs,
 * components, and types needed to implement consent management in your application.
 */

//------------------------------------------------------------------------------
// Core API
//------------------------------------------------------------------------------

/**
 * Core factory function and types for creating c15t instances
 */
export { c15tInstance, type C15TInstance } from './core';

//------------------------------------------------------------------------------
// Types
//------------------------------------------------------------------------------
/**
 * All system types bundled under a namespace to avoid conflicts
 */
export * as Types from './pkgs/types';

// Export all the response types to make them available for client applications
export type {
	SetConsentResponse,
	ShowConsentBannerResponse,
	VerifyConsentResponse,
	SetConsentRequestBody,
	VerifyConsentRequestBody,
} from './response-types';

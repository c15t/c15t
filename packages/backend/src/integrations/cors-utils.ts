import type { C15TInstance } from '~/core';

/**
 * CORS utilities for framework integrations
 * 
 * This module provides shared CORS functionality that can be used
 * across different framework integrations like Next.js, Hono, and Express.
 */

/**
 * Standard CORS headers configuration
 */
export const DEFAULT_CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '600',
};

/**
 * Check if an origin is trusted based on the c15t instance configuration
 * 
 * @param origin - The origin to check
 * @param trustedOrigins - List of trusted origins from c15t config
 * @returns Whether the origin is trusted
 */
export function isTrustedOrigin(origin: string, trustedOrigins: string[]): boolean {
  // Debug info
  console.log(`[CORS] Checking if origin "${origin}" is trusted among:`, trustedOrigins);
  
  // Allow all origins if the list is empty or includes "*"
  if (trustedOrigins.length === 0 || trustedOrigins.includes('*')) {
    console.log('[CORS] All origins are trusted (empty list or contains "*")');
    return true;
  }
  
  // Check exact match
  if (trustedOrigins.includes(origin)) {
    console.log(`[CORS] Origin "${origin}" found in trusted list`);
    return true;
  }
  
  // Check for wildcard domain patterns (*.example.com)
  for (const trusted of trustedOrigins) {
    if (trusted.startsWith('*.') && origin.endsWith(trusted.substring(1))) {
      console.log(`[CORS] Origin "${origin}" matches wildcard pattern "${trusted}"`);
      return true;
    }
  }
  
  console.log(`[CORS] Origin "${origin}" is not trusted`);
  return false;
}

/**
 * Get CORS headers for a response based on the request origin
 * 
 * @param origin - The requesting origin
 * @param instance - The c15t instance with configuration
 * @returns Headers object with appropriate CORS headers
 */
export function getCorsHeaders(origin: string | null, instance: C15TInstance): Headers {
  const headers = new Headers(DEFAULT_CORS_HEADERS);
  
  // If no origin, no CORS headers needed
  if (!origin) {
    return headers;
  }
  
  // Check if the origin is trusted
  const trustedOrigins = instance.options?.trustedOrigins || [];
  const isTrusted = isTrustedOrigin(origin, trustedOrigins);
  
  // Set origin and credentials headers
  headers.set('Access-Control-Allow-Origin', isTrusted ? origin : '');
  
  if (isTrusted) {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  return headers;
}

/**
 * Check if a request is a CORS preflight (OPTIONS) request
 */
export function isPreflightRequest(method: string): boolean {
  return method === 'OPTIONS';
}

/**
 * Create a preflight response for a CORS request
 * 
 * @param origin - The requesting origin
 * @param instance - The c15t instance with configuration
 * @returns A 204 No Content response with CORS headers
 */
export function createPreflightResponse(origin: string | null, instance: C15TInstance): Response {
  const headers = getCorsHeaders(origin, instance);
  
  // Debug response headers
  console.log('[CORS] Preflight response headers:', Object.fromEntries([...headers.entries()]));
  
  // In development, always allow the requesting origin
  if (origin) {
    console.log('[CORS] Setting Access-Control-Allow-Origin for preflight');
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
    
    // Add complete set of required CORS headers
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }
  
  return new Response(null, { status: 204, headers });
} 
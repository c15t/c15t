import type { Context as HonoContext } from 'hono';
import type { StatusCode } from 'hono/utils/http-status';
import type { C15TInstance } from '~/core';
import { ERROR_CODES } from '~/pkgs/results';
import type { C15TContext } from '~/types';

/**
 * Convert a c15t handler to a Hono middleware.
 *
 * This adapter converts between Hono and c15t, letting c15t/H3 handle
 * all the HTTP logic including CORS.
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono';
 * import { toHonoHandler } from '@c15t/backend/integrations';
 * import { c15t } from './c15t';
 * 
 * const app = new Hono();
 * 
 * // Mount c15t at /api/c15t
 * // This will handle all HTTP methods: GET, POST, PUT, DELETE, OPTIONS
 * app.all('/api/c15t/*', toHonoHandler(c15t));
 * 
 * export default app;
 * ```
 * 
 * @param instance - The c15t instance to adapt
 * @returns A Hono middleware function
 */
export function toHonoHandler(instance: C15TInstance) {
  return async (c: HonoContext) => {
    try {
      const basePath: string = instance.options?.basePath as string || '/api/c15t';
      
      // Parse the request URL
      const req = c.req;
      const originalUrl = new URL(req.url);
      let pathWithoutBase = originalUrl.pathname;
      
      // Extract the path without basePath for route matching
      if (pathWithoutBase.startsWith(basePath)) {
        pathWithoutBase = pathWithoutBase.substring(basePath.length);
        if (!pathWithoutBase.startsWith('/')) {
          pathWithoutBase = `/${pathWithoutBase}`;
        }
      }
      
      // Create a new URL with the rewritten path
      const rewrittenUrl = new URL(originalUrl.toString());
      rewrittenUrl.pathname = pathWithoutBase;
      
      // Create a new request with the rewritten URL
      const requestInit = {
        method: req.method,
        headers: req.raw.headers,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.arrayBuffer() : undefined
      };
      
      const rewrittenRequest = new Request(rewrittenUrl.toString(), requestInit);
      
      // Update baseURL for proper URL generation in responses
      await updateBaseUrl(rewrittenUrl, basePath);
      
      // Let c15t handle the request
      const result = await instance.handler(rewrittenRequest);
      
      // Convert c15t response to Hono response
      return await result.match(
        async (response) => {
          // Get response data
          const body = response.body ? await response.arrayBuffer() : null;
          
          // Set status code and headers
          c.status(response.status as StatusCode);
          
          // Copy all headers from the response
          for (const [key, value] of response.headers.entries()) {
            c.header(key, value);
          }
          
          // Set the body and return a Response object
          if (body) {
            return c.body(body);
          }
            return c.body(null);
        },
        (error) => {
          // Handle error response
          const status = error.statusCode || 500;
          const message = error.message || ERROR_CODES.INTERNAL_SERVER_ERROR;
          
          c.status(status as StatusCode);
          c.header('Content-Type', 'application/json');
          
          return c.json({
            error: true,
            code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
            message,
            meta: error.meta,
          });
        }
      );
    } catch (error) {
      // Basic error handling
      c.status(500 as StatusCode);
      c.header('Content-Type', 'application/json');
      
      return c.json({
        error: true,
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
        meta: { error: String(error) },
      });
    }
  };
  
  async function updateBaseUrl(
    url: URL, 
    basePath: string
  ): Promise<void> {
    if (!instance.$context) { return; }
    
    try {
      const contextResult = await instance.$context;
      
      contextResult.match(
        (context: C15TContext) => {
          const baseURL = `${url.protocol}//${url.host}${basePath}`;
          
          if (!context.baseURL || context.baseURL !== baseURL) {
            context.baseURL = baseURL;
            if (context.options) {
              context.options.baseURL = baseURL;
            }
          }
        },
        () => {} // Ignore errors
      );
    } catch {
      // Ignore errors
    }
  }
} 
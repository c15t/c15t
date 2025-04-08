import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import type { C15TInstance } from '~/core';
import { ERROR_CODES } from '~/pkgs/results';
import type { C15TContext } from '~/types';

/**
 * Convert a c15t handler to an Express middleware.
 *
 * This adapter converts between Express and c15t, letting c15t/H3 handle
 * all the HTTP logic including CORS.
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { toExpressHandler } from '@c15t/backend/integrations';
 * import { c15t } from './c15t';
 * 
 * const app = express();
 * 
 * // Mount c15t at /api/c15t
 * app.use('/api/c15t', toExpressHandler(c15t));
 * 
 * app.listen(3000, () => {
 *   console.log('Server running on port 3000');
 * });
 * ```
 * 
 * @param instance - The c15t instance to adapt
 * @returns An Express middleware function
 */
export function toExpressHandler(instance: C15TInstance) {
  return async (
    req: ExpressRequest, 
    res: ExpressResponse, 
    next: NextFunction
  ) => {
    try {
      const basePath: string = instance.options?.basePath as string || '/api/c15t';
      
      // Construct the full URL for the request
      const protocol = (req.headers['x-forwarded-proto'] || req.protocol || 'http') as string;
      const host = (req.headers['x-forwarded-host'] || req.headers.host || 'localhost') as string;
      const originalUrl = new URL(`${protocol}://${host}${req.originalUrl}`);
      
      // Create a new URL with the rewritten path
      // Express already has the path without the mounting point in req.path
      const rewrittenUrl = new URL(originalUrl.toString());
      rewrittenUrl.pathname = req.path;
      
      // Create a new request with the rewritten URL
      const headersObj: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) {
          headersObj[key] = Array.isArray(value) ? value[0] || '' : String(value);
        }
      }
      
      const requestInit = {
        method: req.method,
        headers: headersObj,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined
      };
      
      const rewrittenRequest = new Request(rewrittenUrl.toString(), requestInit);
      
      // Update baseURL for proper URL generation in responses
      await updateBaseUrl(rewrittenUrl, basePath);
      
      // Let c15t handle the request
      const result = await instance.handler(rewrittenRequest);
      
      // Convert c15t response to Express response
      await result.match(
        async (response) => {
          // Set status code
          res.status(response.status);
          
          // Copy all headers from the response
          for (const [key, value] of response.headers.entries()) {
            res.setHeader(key, value);
          }
          
          // Send body
          if (response.body) {
            const buffer = Buffer.from(await response.arrayBuffer());
            res.end(buffer);
          } else {
            res.end();
          }
        },
        (error) => {
          // Handle error response
          const status = error.statusCode || 500;
          const message = error.message || ERROR_CODES.INTERNAL_SERVER_ERROR;
          
          res.status(status);
          res.setHeader('Content-Type', 'application/json');
          res.json({
            error: true,
            code: error.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
            message,
            meta: error.meta,
          });
        }
      );
    } catch (error) {
      // Try to send an error response
      try {
        if (res.headersSent) {
          // If headers were already sent, we can only end the response
          res.end();
        } else {
          res.status(500);
          res.setHeader('Content-Type', 'application/json');
          res.json({
            error: true,
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: 'An unexpected error occurred',
            meta: { error: String(error) },
          });
        }
      } catch {
        // If we can't send a response, pass the error to Express
        next(error);
      }
    }
  };
  
  async function updateBaseUrl(
    url: URL,
    basePath: string
  ): Promise<void> {
    if (!instance.$context) return;
    
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
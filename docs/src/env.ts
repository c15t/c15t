import { createEnv } from '@t3-oss/env-nextjs';
import { vercel } from '@t3-oss/env-nextjs/presets-zod';
import { z } from 'zod';

/**
 * Environment variable configuration for the dashboard application.
 * Uses t3-env for type-safe environment variables with runtime validation.
 *
 * Variables are split into two categories:
 * 1. server - Only available on the server-side
 * 2. client - Available on both client and server-side (prefixed with NEXT_PUBLIC_)
 */
export const env = createEnv({
  /**
   * Server-side environment variables schema.
   * These variables are only available on the server and are not exposed to the client.
   */
  server: {
    /**
     * Application environment
     * @default "development"
     */
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
  },

  /**
   * Client-side environment variables schema.
   * These variables are available in the browser and must be prefixed with NEXT_PUBLIC_.
   * Be careful not to expose sensitive information here.
   */
  client: {
    /**
     * PostHog API key
     */
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
    NEXT_PUBLIC_C15T_URL: z.string().optional(),
  },

  /**
   * Runtime environment mapping
   * Maps environment variables to their runtime values and handles defaults
   */
  runtimeEnv: {
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_C15T_URL:
      process.env.NEXT_PUBLIC_C15T_URL ?? 'http://localhost:8787/',
    NODE_ENV: process.env.NODE_ENV,
  },
  /**
   * Treats empty strings as undefined for better type safety
   */
  emptyStringAsUndefined: true,
  extends: [vercel()],
});

// #region docs:next-config
import { withConsentManifest } from 'c15t/next/build';
import type { NextConfig } from 'next';

// #hide docs
// The demo project, so the example runs without a .env.local.
process.env.NEXT_PUBLIC_C15T_BACKEND_URL ??= 'https://benchmarks-inth.inth.app';
// #endhide docs

const nextConfig = {} satisfies NextConfig;

// Reads NEXT_PUBLIC_C15T_BACKEND_URL, like defineConsentConfig.
export default withConsentManifest(nextConfig);
// #endregion docs:next-config

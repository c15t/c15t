// #region docs:quickstart-next-config title="next.config.ts"
import { withConsentManifest } from 'c15t/next/build';
import type { NextConfig } from 'next';

// #hide docs
// The demo project, so the example runs without a .env.local.
process.env.NEXT_PUBLIC_C15T_BACKEND_URL ??= 'https://benchmarks-inth.inth.app';
// #endhide docs

const nextConfig = {} satisfies NextConfig;

export default withConsentManifest(nextConfig);
// #endregion docs:quickstart-next-config

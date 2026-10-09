// #region docs:quickstart-next-config title="next.config.ts"
import { withConsentManifest } from 'c15t/next/build';
import type { NextConfig } from 'next';

const nextConfig = {} satisfies NextConfig;

export default withConsentManifest(nextConfig);
// #endregion docs:quickstart-next-config

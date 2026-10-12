// #region docs:static-export-next-config title="next.config.ts"
import { withConsentManifest } from 'c15t/next/build';
import type { NextConfig } from 'next';

const nextConfig = { output: 'export' } satisfies NextConfig;

// Finds c15t.config.ts. A static export skips the manifest download.
export default withConsentManifest(nextConfig);
// #endregion docs:static-export-next-config

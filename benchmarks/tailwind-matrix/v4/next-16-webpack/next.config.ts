import type { NextConfig } from 'next';

/** A static export, so the matrix can serve `out/` as files. */
const config: NextConfig = { output: 'export' };

export default config;

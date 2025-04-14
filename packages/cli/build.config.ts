import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  outDir: 'dist',
  externals: ['@c15t/backend', 'better-call'],
  entries: ['./src/index.ts'],
});

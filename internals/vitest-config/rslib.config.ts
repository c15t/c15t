import { defineConfig } from '@rslib/core';

export default defineConfig({
  source: {
    entry: {
      'base-config': './src/base-config.ts',
      'ui-config': './src/ui-config.ts',
    },
  },
  lib: [
    {
      bundle: false,
      dts: true,
      format: 'esm',
    },
  ],
  output: {
    target: 'node',
    cleanDistPath: true,
  },
});

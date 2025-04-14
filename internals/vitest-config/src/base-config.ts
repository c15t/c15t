import { defineConfig } from 'vitest/config';

// Configure proper output structure for coverage files
export const baseConfig = defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
      reporter: [
        'text',
        [
          'json-summary',
          {
            file: 'coverage-summary.json', // This is needed for the GitHub action
          },
        ],
        [
          'json',
          {
            file: 'coverage-final.json', // This contains line-by-line coverage info
          },
        ],
        // Add HTML reporter for local viewing
        [
          'html',
          {
            subdir: 'html',
          },
        ],
      ],
      reportOnFailure: true,
      enabled: true,
      reportsDirectory: './coverage', // Output to ./coverage
      // Set standard directory structure for different report types
      all: true, // Make sure all files are included
      include: ['**/*.{ts,tsx,js,jsx}', '!**/*.d.ts', '!**/node_modules/**'],
    },
  },
});

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Relative on purpose: the suite must load from the workspace source, not
// from the packed copy of the shared package under node_modules.
import { createCompatVitestConfig } from '../shared/src/suite/vitest-config';

export default createCompatVitestConfig(
	dirname(fileURLToPath(import.meta.url))
);

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createCompatVitestConfig } from '@c15t/next-compat-shared/vitest';

export default createCompatVitestConfig(
	dirname(fileURLToPath(import.meta.url))
);
